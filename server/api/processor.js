const fs = require("fs").promises;
const static = require("../static.js");
const account = require("../account.js");
const uri = require("../utilities/uri.js");
const heuristics = require("../utilities/heuristics.js");
const dateRange = require("../utilities/dateRange.js");
require("../utilities/misc.js");

const origins = require("../config.js").origins;

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
		for (const originHostname of Object.keys(origins)) {
			if (origins[originHostname].allowedUsers.includes(user)) {
				allowedOrigins.push(originHostname)
			}
		}

		static.serve(req, res, JSON.stringify(allowedOrigins), "application/json", "auto");
		return;
	}


	let range, origin;

	if ("range" in path.parameters) {
		range = new dateRange.DateRange(path.parameters.range);
	}

	// Check that requested origin exists and that the user is allowed to see it.
	origin = path.parameters?.origin;
	if (origin === undefined || !origins.hasOwnProperty(origin) ||
		!origins[origin].allowedUsers.includes(user)) {
		res.writeHead(400);
		res.end();
		return;
	}

	// Respond with stats for the given origin and range.
	if (path.filename === "stats") {
		getStats(origin, range).then(data => {
			data = JSON.stringify(data);
			static.serve(req, res, data, "application/json", "auto");
		})
		.catch(e => console.log(e));

	// Respond with the earliest available data for that origin.
	} else if (path.filename === "earliest") {
		fs.readdir(viewsRoot(origin)).then(files => {
			files = files.filter(filename => filename[0] !== ".").sort();
			const value = files[0].split(".")[0];
			static.serve(req, res, value, "text/plain", "auto");
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
async function getStats(origin, range) {
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
 * version	The version of Analytique.
 * stats		The object containing the stats.
 *   viewTotal				The total number of views in this range before filter.
 *   sessionTotal			The total number of sessions in this range.
 *   avgSessionLength		Average number of page views per session.
 *   pageViews				Number of views per page.
 *   errorViews				Number of views per error page.
 *   acquisitionChannels	Number of sessions per acquisition channel.
 *   referrerOrigins		Number of landings per referrer origin.
 *   landings				Number of landings per URL.
 *   bilingualismClasses	Number of sessions per bilingualism class.
 *   countries				Number of sessions per country.
 *   cities					Number of sessions per Canadian city.
 *   oses					Number of sessions per OS.
 *   browsers				Number of sessions per browser.
 *   screenBreakpoints		Number of sessions per breakpoint.
 *   excludedTraffic		Number of views per exclusion motive.
 *
 * Most of these data fields use a sort of associative array solution that uses
 * an array of object. Each object has a "key" and "value" property.
 */
async function buildStats(origin, range) {
	return getSessions(origin, range).then(sessions => {

		let stats = {
			version: 1,
			stats: {
				viewTotal: sessions.viewTotal,
				sessionTotal: 0,
				avgSessionLength: undefined,
				pageViews: {},
				errorViews: {},
				acquisitionChannels: {},
				referrerOrigins: {},
				landings: {},
				bilingualismClasses: {},
				countries: {},
				cities: {},
				oses: {},
				browsers: {},
				screenBreakpoints: {},
				excludedTraffic: sessions.excludedTraffic
			}
		};

		// Holds the total number of page views for all sessions in the range.
		let viewTotal = 0;

		// For every session in the range...
		for (const session of sessions.sessions) {

			// Increment number of sessions.
			stats.stats.sessionTotal++;

			let landingSet = false;

			// For every view in this session...
			for (let view of session.views) {

				// Increment number of views in the range.
				viewTotal++;

				const normalizedURL = (new uri.URIPath(view.url)).pathname;

				// Landing View
				if (!landingSet) {
					if (stats.stats.landings[normalizedURL] === undefined) {
						stats.stats.landings[normalizedURL] = 0;
					}
					stats.stats.landings[normalizedURL]++;
					landingSet = true;
				}

				// Page and Error Views
				const viewArray = view.error ? "errorViews" : "pageViews";
				if (stats.stats[viewArray][normalizedURL] === undefined) {
					stats.stats[viewArray][normalizedURL] = 0;
				}
				stats.stats[viewArray][normalizedURL]++;
			}

			// Acquisition Channels
			if (stats.stats.acquisitionChannels[session.acquisitionChannel] === undefined) {
				stats.stats.acquisitionChannels[session.acquisitionChannel] = 0;
			}
			stats.stats.acquisitionChannels[session.acquisitionChannel]++;

			// Referrer Origins
			if (session.referrerOrigin !== "") {
				const referrerOrigin = heuristics.normalizeOriginURL(session.referrerOrigin);
				if (stats.stats.referrerOrigins[referrerOrigin] === undefined) {
					stats.stats.referrerOrigins[referrerOrigin] = 0;
				}
				stats.stats.referrerOrigins[referrerOrigin]++;
			}

			// Bilingualism
			const bilingualismClass = heuristics.inferBilingualismClass(session.languages);
			if (stats.stats.bilingualismClasses[bilingualismClass] === undefined) {
				stats.stats.bilingualismClasses[bilingualismClass] = 0;
			}
			stats.stats.bilingualismClasses[bilingualismClass]++;

			// Countries
			if (stats.stats.countries[session.country] === undefined) {
				stats.stats.countries[session.country] = 0;
			}
			stats.stats.countries[session.country]++;

			// Cities
			if (session.city !== undefined) {
				if (stats.stats.cities[session.city] === undefined) {
					stats.stats.cities[session.city] = 0;
				}
				stats.stats.cities[session.city]++;
			}

			// OSes
			if (stats.stats.oses[session.os] === undefined) {
				stats.stats.oses[session.os] = 0;
			}
			stats.stats.oses[session.os]++;

			// Browsers
			if (stats.stats.browsers[session.browser] === undefined) {
				stats.stats.browsers[session.browser] = 0;
			}
			stats.stats.browsers[session.browser]++;

			// Screen Breakpoints
			if (stats.stats.screenBreakpoints[session.screenBreakpoint] === undefined) {
				stats.stats.screenBreakpoints[session.screenBreakpoint] = 0;
			}
			stats.stats.screenBreakpoints[session.screenBreakpoint]++;
		}

		// Average number of page views per session.
		stats.stats.avgSessionLength = viewTotal / stats.stats.sessionTotal;

		// For sorting, convert "associative arrays" (objects) to flat arrays.
		// The result is an array of objects, each containing the key and value
		// of what was previously a single object field.
		stats.stats.pageViews = stats.stats.pageViews.sortedAssociativeArray();
		stats.stats.errorViews = stats.stats.errorViews.sortedAssociativeArray();
		stats.stats.landings = stats.stats.landings.sortedAssociativeArray();
		stats.stats.acquisitionChannels = stats.stats.acquisitionChannels.sortedAssociativeArray();
		stats.stats.referrerOrigins = stats.stats.referrerOrigins.sortedAssociativeArray();
		stats.stats.bilingualismClasses = stats.stats.bilingualismClasses.sortedAssociativeArray();
		stats.stats.countries = stats.stats.countries.sortedAssociativeArray();
		stats.stats.cities = stats.stats.cities.sortedAssociativeArray();
		stats.stats.oses = stats.stats.oses.sortedAssociativeArray();
		stats.stats.browsers = stats.stats.browsers.sortedAssociativeArray();
		stats.stats.screenBreakpoints = stats.stats.screenBreakpoints.sortedAssociativeArray();
		stats.stats.excludedTraffic = stats.stats.excludedTraffic.sortedAssociativeArray();

		// Save stats to cache.
		const dirPath = statsRoot(origin) + range.type;
		const filePath = dirPath + "/" + range.value + ".json";
		fs.mkdir(dirPath, { recursive: true }).then(() => {
			fs.writeFile(filePath, JSON.stringify(stats));
		});

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
 * Builds and returns sessions from a call to getViews(range).
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
 *   browser
 *   screenBreakpoint
 *   views			Array of objects, each with page title, URL, and whether it’s an error.
 *
 * → See the View documentation for more detais.
 * Timestamps are in milliseconds since 1 January 1970 UTC.
 */
async function buildSessions(origin, range) {
	return getViews(origin, range).then(async (views) => {

		let sessions = {
			version: 1,
			viewTotal: 0,
			excludedTraffic: {
				excludedTests: 0,
				excludedBots: 0,
				excludedSpam: 0
			},
			sessions: []
		};
		let currentSession = {};
		let previousView;

		// Inlinable in-loop function that clears the current session.
		function _closeSession() {
			sessions.sessions.push(currentSession);
			currentSession = {};
			previousView = undefined;
		}

		for (const view of views) {
			sessions.viewTotal++;

			// True if the view is on an error page.
			const isErrorView = view[3].includesAny(origins[origin].errorPagePatterns);

			// If view is part of the same session, it must...
			if (previousView !== undefined
				&& view[12] === previousView[12] // have the same IP address.
				&& view[11] === previousView[11] // have the same user-agent string.
				&& view[2] === previousView[2] // be in the same timezone.
				&& (view[5] === previousView[4] // follow previous view.
				|| view[5] === "")) { // or have no referrer.

				currentSession.views.push({
					title: view[3],
					url: view[4].replace(/https?:\/\//, "").substr(origin.length),
					error: isErrorView
				});
				currentSession.latestTime = view[10];

			} else { // Otherwise, begin a new session.

				// Close previous session.
				if (previousView !== undefined) {
					_closeSession();
				}

				// Filter out some IP addresses.
				if (origins[origin].excludeClientIPs.includes(view[12])) {
					sessions.excludedTraffic.excludedTests++;
					continue;
				}

				// Filter out bots.
				if (heuristics.inferIfBot(view[11])) {
					sessions.excludedTraffic.excludedBots++;
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

				currentSession.country = await heuristics.inferCountry(view[12]);

				// Filter out some countries.
				if (origins[origin].excludeCountries.includes(currentSession.country)) {
					sessions.excludedTraffic.excludedSpam++;
					continue;
				}

				// Get cities if country is Canada.
				if (currentSession.country === "CA") {
					const city = await heuristics.inferCity(view[12]);
					if (city !== undefined) {
						currentSession.city = city;
					}
				}

				currentSession.os = heuristics.inferOS(view[11]);
				currentSession.browser = heuristics.inferBrowser(view[11]);
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
		const filePath = sessionsRoot(origin) + range.type + "/" + range.value + ".json";
		fs.mkdir(sessionsRoot(origin) + range.type, { recursive: true }).then(() => {
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
 * [10]	latestTime			The time collected when the beacon was received.
 * [11]	userAgent			The browser user-agent string of the request.
 * [12]	ipAddress			The IP address of the client.
 *
 * Timestamps are in milliseconds since 1 January 1970 UTC.
 */
async function getViews(origin, range) {
	let fileReadPromises = [];

	// Issue a promise for each month-file.
	for (const month of range.monthRange()) {
		const promise = fs.readFile(viewsRoot(origin) + month + ".tsv", "utf8")
			.then(rawView => {
				// Format the view.
				return rawView.trim().split("\n")
					.map(rawView => rawView.split("\t")
					.map(rawField => decodeURI(rawField)));
			})
			.catch(e => console.log(e));

		fileReadPromises.push(promise);
	}

	return Promise.all(fileReadPromises).then(views => views.flat(1))
		.catch(e => console.log(e));
}


module.exports = { processRequest };
