const fs = require("fs").promises;
const static = require("../static.js");
const account = require("../account.js");
const uri = require("../utilities/uri.js");
const heuristics = require("../utilities/heuristics.js");
const dateRange = require("../utilities/dateRange.js");
require("../utilities/misc.js");

const config = require("../config.js").origins;

const dataRoot = "./data/";
function viewsRoot(origin) { return dataRoot + origin + "/views/"; }
function sessionsRoot(origin) { return dataRoot + origin + "/sessions/"; }
function statsRoot(origin) { return dataRoot + origin + "/stats/"; }


/**
 * The front-end is asking for JSON stats.
 * The server calls this function with the *req*uest and *res*ponse context.
 */
function processRequest(req, res) {
	const path = new uri.URIPath(req.url);

	const user = account.getUser(req);

	// Respond with array of allowed origins for the logged in user.
	if (path.filename === "origins") {

		let allowedOrigins = [];
		for (const originHostname of Object.keys(config)) {
			if (config[originHostname].allowedUsers.includes(user)) {
				allowedOrigins.push(originHostname)
			}
		}

		const eTag = static.getETagFrom(JSON.stringify(allowedOrigins) + user);

		static.serve(req, res, JSON.stringify(allowedOrigins), "application/json", "auto", "private", eTag);
		return;
	}

	// Check API options.
	let range, origin, filter;
	if ("range" in path.parameters) {
		range = new dateRange.DateRange(path.parameters.range);
	}
	if ("filter" in path.parameters) {
		filter = path.parameters.filter;
	}

	// Check that requested origin exists and that the user is allowed to see it.
	origin = path.parameters?.origin;
	if (origin === undefined || !config.hasOwnProperty(origin) ||
		!config[origin].allowedUsers.includes(user)) {
		serveError(res, "The logged in user is not allowed to see the requested origin.", 400);
		return;
	}

	// Respond with stats for the given origin and range.
	if (path.filename === "stats") {
		getStats(origin, range, filter).then(data => {
			data = JSON.stringify(data);

			const eTag = static.getETagFrom(data + user);
			static.serve(req, res, data, "application/json", "auto", "private", eTag);
		})
		.catch(e => console.log(e));

	// Respond with the earliest available data for that origin.
	} else if (path.filename === "earliest") {
		fs.readdir(viewsRoot(origin)).then(files => {
			files = files.filter(filename => filename[0] !== ".").sort();
			const value = files[0].split(".")[0];

			const eTag = static.getETagFrom(value + origin + user);
			static.serve(req, res, value, "text/plain", "auto", "private", eTag);
		})
		.catch(e => console.log(e));

	} else {
		static.serveError(res);
	}
}


/**
 * Checks the cache for the requested stats.
 * Returns data from cache, or calls buildStats(range) and returns that.
 */
async function getStats(origin, range, filter) {
	// If filter is defined, ignore cache and build from scratch.
	if (filter !== undefined) {
		return buildStats(origin, range, filter);
	}

	const to = range.to();
	const lastMonth = to.year + "-" + to.month.toString().padStart(2, "0");
	const viewsFilePath = viewsRoot(origin) + lastMonth + ".tsv";
	const viewsFileMetadata = fs.stat(viewsFilePath);

	const statsFilePath = statsRoot(origin) + range.type + "/" + range.value + ".json";
	const statsFileMetadata = fs.stat(statsFilePath);

	return Promise.all([statsFileMetadata, viewsFileMetadata]).then(metadata => {
		statsMetadata = metadata[0];
		viewsMetadata = metadata[1];

		if (viewsMetadata.mtimeMs > statsMetadata.mtimeMs
			|| Date.now() - 3600000*24*30 > statsMetadata.mtimeMs) {
			return buildStats(origin, range);

		} else {
			return fs.readFile(statsFilePath, "utf8")
				.then(contents => JSON.parse(contents));
		}
	})
	.catch(() => buildStats(origin, range));
}


/**
 * Builds and returns stats from a call to getSessions(range).
 * Also stores the result in cache.
 *
 * A stats file or "container" is as follows:
 * version				The version of Analytique.
 * viewTotal			The total number of views in this range before filter.
 * sessionTotal			The total number of sessions in this range.
 * avgSessionLength		Average number of page views per session.
 * pageViews			Number of views per page.
 * errorViews			Number of views per error page.
 * acquisitionChannels	Number of sessions per acquisition channel.
 * referrerOrigins		Number of landings per referrer origin.
 * landings				Number of landings per URL.
 * bilingualismClasses	Number of sessions per bilingualism class.
 * countries			Number of sessions per country.
 * cities				Number of sessions per city, for some countries.
 * oses					Number of sessions per OS.
 * renderingEngines		Number of sessions per rendering engine.
 * screenBreakpoints	Number of sessions per breakpoint.
 * excludedTraffic		Number of views per exclusion motive.
 *
 * Most of these data fields use a sort of associative array solution that uses
 * an array of object. Each object has a "key" and "value" property.
 */
async function buildStats(origin, range, filter) {
	return getSessions(origin, range).then(sessions => {

		let stats = {
			version: 1,
			viewTotal: sessions.viewTotal,
			sessionTotal: 0,
			avgSessionLength: 0,
			pageViews: {},
			errorViews: {},
			acquisitionChannels: {},
			referrerOrigins: {},
			landings: {},
			bilingualismClasses: {},
			countries: {},
			cities: {},
			oses: {},
			renderingEngines: {},
			screenBreakpoints: {},
			excludedTraffic: sessions.excludedTraffic
		};

		// Holds the total number of page views for all sessions in the range.
		let viewTotal = 0;

		// For every session in the range...
		for (const session of sessions.sessions) {

			const referrerOrigin = heuristics.normalizeOriginURL(session.referrerOrigin);
			const bilingualismClass = heuristics.inferBilingualismClass(session.languages);

			let landing;
			let views = {
				pageViews: [],
				errorViews: []
			}

			// For every view in this session...
			for (let view of session.views) {
				const normalizedURL = (new uri.URIPath(view.url)).pathname;

				if (landing === undefined) {
					landing = normalizedURL;
				}

				// Page and Error Views
				const viewArray = view.error ? "errorViews" : "pageViews";
				views[viewArray].push(normalizedURL);
			}

			// Filter sessions.
			if (filter !== undefined) {
				const [filterKey, filterValue] = filter.split(":").map(decodeURIComponent);

				if (filterKey === "pageViews" &&
					!views.pageViews.includes(filterValue)) {
					continue;
				}
				if (filterKey === "errorViews" &&
					!views.errorViews.includes(filterValue)) {
					continue;
				}
				if (filterKey === "acquisitionChannels" &&
					filterValue !== session.acquisitionChannel) {
					continue;
				}
				if (filterKey === "referrerOrigins" &&
					filterValue !== referrerOrigin) {
					continue;
				}
				if (filterKey === "landings" &&
					filterValue !== landing) {
					continue;
				}
				if (filterKey === "bilingualismClasses" &&
					filterValue !== bilingualismClass) {
					continue;
				}
				if (filterKey === "countries" &&
					filterValue !== session.country) {
					continue;
				}
				if (filterKey === "cities" &&
					filterValue !== session.city) {
					continue;
				}
				if (filterKey === "oses" &&
					filterValue !== session.os) {
					continue;
				}
				if (filterKey === "renderingEngines" &&
					filterValue !== session.renderingEngine) {
					continue;
				}
				if (filterKey === "screenBreakpoints" &&
					filterValue !== session.screenBreakpoint) {
					continue;
				}
			}

			for (const url of views.pageViews) {
				if (stats.pageViews[url] === undefined) {
					stats.pageViews[url] = 0;
				}
				stats.pageViews[url]++;
				viewTotal++;
			}

			for (const url of views.errorViews) {
				if (stats.errorViews[url] === undefined) {
					stats.errorViews[url] = 0;
				}
				stats.errorViews[url]++;
				viewTotal++;
			}

			if (stats.landings[landing] === undefined) {
				stats.landings[landing] = 0;
			}
			stats.landings[landing]++;

			// Acquisition Channels
			if (stats.acquisitionChannels[session.acquisitionChannel] === undefined) {
				stats.acquisitionChannels[session.acquisitionChannel] = 0;
			}
			stats.acquisitionChannels[session.acquisitionChannel]++;

			// Referrer Origins
			if (session.referrerOrigin !== "") {
				if (stats.referrerOrigins[referrerOrigin] === undefined) {
					stats.referrerOrigins[referrerOrigin] = 0;
				}
				stats.referrerOrigins[referrerOrigin]++;
			}

			// Bilingualism
			if (stats.bilingualismClasses[bilingualismClass] === undefined) {
				stats.bilingualismClasses[bilingualismClass] = 0;
			}
			stats.bilingualismClasses[bilingualismClass]++;

			// Countries
			if (stats.countries[session.country] === undefined) {
				stats.countries[session.country] = 0;
			}
			stats.countries[session.country]++;

			// Cities
			if (session.city !== undefined) {
				if (stats.cities[session.city] === undefined) {
					stats.cities[session.city] = 0;
				}
				stats.cities[session.city]++;
			}

			// OSes
			if (stats.oses[session.os] === undefined) {
				stats.oses[session.os] = 0;
			}
			stats.oses[session.os]++;

			// Rendering engines
			if (stats.renderingEngines[session.renderingEngine] === undefined) {
				stats.renderingEngines[session.renderingEngine] = 0;
			}
			stats.renderingEngines[session.renderingEngine]++;

			// Screen Breakpoints
			if (stats.screenBreakpoints[session.screenBreakpoint] === undefined) {
				stats.screenBreakpoints[session.screenBreakpoint] = 0;
			}
			stats.screenBreakpoints[session.screenBreakpoint]++;

			// Increment number of sessions.
			stats.sessionTotal++;
		}

		// Average number of page views per session.
		stats.avgSessionLength = viewTotal / stats.sessionTotal;

		// For sorting, convert "associative arrays" (objects) to flat arrays.
		// The result is an array of objects, each containing the key and value
		// of what was previously a single object field.
		stats.pageViews = stats.pageViews.sortedAssociativeArray();
		stats.errorViews = stats.errorViews.sortedAssociativeArray();
		stats.landings = stats.landings.sortedAssociativeArray();
		stats.acquisitionChannels = stats.acquisitionChannels.sortedAssociativeArray();
		stats.referrerOrigins = stats.referrerOrigins.sortedAssociativeArray();
		stats.bilingualismClasses = stats.bilingualismClasses.sortedAssociativeArray();
		stats.countries = stats.countries.sortedAssociativeArray();
		stats.cities = stats.cities.sortedAssociativeArray();
		stats.oses = stats.oses.sortedAssociativeArray();
		stats.renderingEngines = stats.renderingEngines.sortedAssociativeArray();
		stats.screenBreakpoints = stats.screenBreakpoints.sortedAssociativeArray();
		stats.excludedTraffic = stats.excludedTraffic.sortedAssociativeArray();

		// Save stats to cache, except for filtered data.
		if (filter === undefined) {
			const dirPath = statsRoot(origin) + range.type;
			const filePath = dirPath + "/" + range.value + ".json";
			fs.mkdir(dirPath, { recursive: true }).then(() => {
				fs.writeFile(filePath, JSON.stringify(stats));
			});
		}

		return stats;
	})
	.catch(e => console.log(e));
}


/**
 * Checks the cache for the requested sessions.
 * Returns data from cache, or calls buildSessions(range) and returns that.
 */
async function getSessions(origin, range) {
	const to = range.to();
	const lastMonth = to.year + "-" + to.month.toString().padStart(2, "0");
	const viewsFilePath = viewsRoot(origin) + lastMonth + ".tsv";
	const viewsFileMetadata = fs.stat(viewsFilePath);

	const sessionsFilePath = sessionsRoot(origin) + range.type + "/" + range.value + ".json";
	const sessionsFileMetadata = fs.stat(sessionsFilePath);

	return Promise.all([sessionsFileMetadata, viewsFileMetadata]) .then(metadata => {
		sessionsMetadata = metadata[0];
		viewsMetadata = metadata[1];

		if (viewsMetadata.mtimeMs > sessionsMetadata.mtimeMs
			|| Date.now() - 3600000*24*30 > sessionsMetadata.mtimeMs) {
			return buildSessions(origin, range);

		} else {
			return fs.readFile(sessionsFilePath, "utf8")
				.then(contents => JSON.parse(contents));
		}
	})
	.catch(() => buildSessions(origin, range));
}


/**
 * Builds and returns sessions from a call to getBeacons(range).
 * Also stores the result in cache.
 *
 * A sessions file or "container" is as follows:
 * version				The version of Analytique.
 * viewTotal			Total number of views processed before filter.
 * excludedTraffic		An object with stats about the data that was filtered out.
 *   excludedTests		Number of views excluded because the IP was from a dev.
 *   excludedBots		Number of views excluded because it was from a bot.
 *   excludedSpam		Number of views excluded because it was illegitimate.
 * sessions				This is the array of sessions.
 *   earliestTime		The first time collected for that page.
 *   referrerOrigin
 *   acquisitionChannel
 *   languages			Array of strings of language codes.
 *   country
 *   city				City name iff the country is Canada.
 *   os
 *   renderingEngine
 *   screenBreakpoint
 *   views				Array of view objects.
 *      title			Page title.
 *      url				Page URL.
 *      error			Whether title matches an error pattern in origin’s config.
 *
 * → See the View documentation for more detais.
 * Timestamps are in milliseconds since 1 January 1970 UTC.
 */
async function buildSessions(origin, range) {
	return getBeacons(origin, range).then(async (views) => {

		let sessions = {
			version: 1,
			viewTotal: 0,
			excludedTraffic: {
				tests: 0,
				bots: 0,
				spam: 0
			},
			sessions: []
		};
		let currentSession = {};
		let previousView;

		// Inlinable in-loop function that clears the current session.
		const _closeSession = () => {
			sessions.sessions.push(currentSession);
			currentSession = {};
			previousView = undefined;
		}

		for (const view of views) {

			sessions.viewTotal++;

			// True if the view is on an error page.
			const isErrorView = view[3].includesAny(config[origin].errorPagePatterns);

			// If view is part of the same session, it must...
			if (previousView !== undefined
				&& view[11] === previousView[11] // have the same IP address.
				&& view[10] === previousView[10] // have the same user-agent string.
				&& view[2] === previousView[2] // be in the same timezone.
				&& (view[5] === previousView[4] // follow previous view.
				|| view[5] === "")) { // or have no referrer.

				// Skip identical page views (most likely page refreshes).
				if (view[3] === previousView[3] && view[4] === previousView[4]) {
					continue;
				}

				currentSession.views.push({
					title: view[3],
					url: view[4].replace(/https?:\/\//, "").substr(origin.length),
					error: isErrorView
				});

			} else { // Otherwise, begin a new session.

				// Close previous session.
				if (previousView !== undefined) {
					_closeSession();
				}

				// Filter out some IP addresses.
				if (config[origin].excludeClientIPs.includes(view[11])) {
					sessions.excludedTraffic.tests++;
					continue;
				}

				// Filter out bots.
				if (heuristics.inferIfBot(view[10])) {
					sessions.excludedTraffic.bots++;
					continue;
				}

				currentSession.earliestTime = view[1];

				currentSession.referrerOrigin = view[5];
				currentSession.acquisitionChannel = heuristics.inferAcquisitionChannel(view[5]);

				currentSession.languages = [];
				if (view[6] !== "") {
					currentSession.languages.push(view[6]);
				}
				if (view[7] !== "") {
					currentSession.languages.push(...view[7].split(","));
				}
				currentSession.languages = currentSession.languages.unique();

				currentSession.country = await heuristics.inferCountry(view[11]);

				// Filter out some countries.
				if (config[origin].excludeCountries.includes(currentSession.country)) {
					sessions.excludedTraffic.spam++;
					continue;
				}

				// Get some cities according to config.
				if (config[origin].focusCountries.includes(currentSession.country)) {
					const city = await heuristics.inferCity(view[11]);
					if (city !== undefined) {
						currentSession.city = city;
					}
				}

				currentSession.os = heuristics.inferOS(view[10]);
				currentSession.renderingEngine = heuristics.inferRenderingEngine(view[10]);
				currentSession.screenBreakpoint = heuristics.inferScreenBreakpoint(view[8]);

				currentSession.views = [];

				currentSession.views.push({
					title: view[3],
					url: view[4].replace(/https?:\/\//, "").substr(origin.length),
					error: isErrorView
				});
			}

			previousView = view;
		}

		if (currentSession.views?.length > 0) {
			_closeSession();
		}

		// Save data to cache.
		const folder = sessionsRoot(origin) + range.type
		const filePath = folder + "/" + range.value + ".json";
		fs.mkdir(folder, { recursive: true }).then(() => {
			fs.writeFile(filePath, JSON.stringify(sessions));
		});

		return sessions;
	})
	.catch(e => console.log(e));
}


/**
 * Returns the view beacons as an array of arrays.
 *
 * Each view consists of the following fields:
 * [0]	version				The integer version of the analytics format.
 * [1]	earliestTime		The first time collected for that page.
 * [2]	timezoneOffset		Offset from UTC in minutes of the client’s time.
 * [3]	pageTitle			Title of the viewed page.
 * [4]	pageURL				URL of the viewed page.
 * [5]	referrerURL			Referrer URL or “” if empty.
 * [6]	language			Single language code of preference.
 * [7]	languages			Ordered list of language codes.
 * [8]	windowInnerSize		Inner size of the page in the format “WxH”.
 * [9]	windowOuterSize		Outer size of the page in the format “WxH”.
 * [10]	userAgent			The browser user-agent string of the request.
 * [11]	ipAddress			The IP address of the client.
 *
 * Timestamps are in milliseconds since 1 January 1970 UTC.
 */
async function getBeacons(origin, range) {
	const fileReadPromises = [];

	// Issue a promise for each month-file.
	for (const month of range.monthRange()) {
		const promise = fs.readFile(viewsRoot(origin) + month + ".tsv", "utf8")
			.then(rawBeacon => {
				// Format the view.
				return rawBeacon.trim().split("\n")
					.map(rawBeacon => rawBeacon.split("\t")
					.map(rawField => decodeURI(rawField)));
			})
			.catch(e => console.log(e));

		fileReadPromises.push(promise);
	}

	return Promise.all(fileReadPromises).then(beacons => beacons.flat(1))
		.catch(e => console.log(e));
}


module.exports = { processRequest };
