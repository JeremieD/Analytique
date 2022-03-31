const fs = require("fs").promises;
const uri = require("../utilities/uri.js");
const heuristics = require("../utilities/heuristics.js");
const dateRange = require("../utilities/dateRange.js");
require("../utilities/misc.js");

const dataRoot = "./data/";
const viewsRoot = dataRoot + "views/";
const sessionsRoot = dataRoot + "sessions/";
const statsRoot = dataRoot + "stats/";


/**
 * An object describing what data will be filtered out.
 *
 * excludeClientIPs		Page views from IPs listed here will be excluded.
 * requiredHostnames	Page views that do *not* include one of these will be excluded.
 * excludeBotUserAgents	Page views containing a matching user-agent will be excluded.
 */
const filter = {
	excludeClientIPs: [ "104.221.122.236", "173.177.95.199" ],
	requiredHostnames: [ "jeremiedupuis.com" ],
	excludeBotUserAgents: [ "bot", "Bot", "spider", "BingPreview", "Slurp", "facebookexternalhit", "ia_archiver" ]
};


/**
 * The front-end is asking for JSON stats.
 * The server calls this function with the *req*uest and *res*ponse context.
 */
function processRequest(req, res) {
	const path = new uri.URIPath(req.url);

	let range;

	if (path.parameters?.range) {
		range = new dateRange.DateRange(path.parameters.range);
	}

	if (path.filename === "stats") {
		getStats(range).then(data => {
			res.setHeader("Content-Type", "application/json");
			res.writeHead(200);
			res.end(JSON.stringify(data));
		});

	} else {
		res.writeHead(404);
		res.end("404");
	}
}


/**
 * Checks the cache for the requested stats.
 * Returns data from cache, or calls buildStats(range) and returns that.
 */
async function getStats(range) {
	const to = range.to();
	const lastMonth = to.year + "-" + to.month.toString().padStart(2, "0");
	const viewsFilePath = viewsRoot + lastMonth + ".tsv";
	const viewsFileMetadata = fs.stat(viewsFilePath);

	const statsFilePath = statsRoot + range.type + "/" + range.value + ".json";
	const statsFileMetadata = fs.stat(statsFilePath);

	return Promise.all([statsFileMetadata, viewsFileMetadata]) .then(metadata => {
		statsMetadata = metadata[0];
		viewsMetadata = metadata[1];

		if (viewsMetadata.mtimeMs > statsMetadata.mtimeMs
			|| Date.now() - 3600000 > statsMetadata.mtimeMs) {
			return buildStats(range);

		} else {
			return fs.readFile(statsFilePath, "utf8")
				.then(contents => JSON.parse(contents));
		}
	})
	.catch((e) => {
		return buildStats(range);
	});
}


/**
 * Builds and returns stats from a call to getSessions(range).
 * Also stores the result in cache.
 *
 * A stats file or "container" is as follows:
 * version	The version of Analytique.
 * filter	An object describing what data was filtered out.
 * stats		The object containing the stats.
 *   viewTotal				The total number of views in this range before filter.
 *   sessionTotal			The total number of sessions in this range.
 *   avgSessionLength		Average number of page views per session.
 *   pageViews				Number of views per page.
 *   acquisitionChannels	Number of sessions per acquisition channel.
 *   referrerOrigins		Number of landings per referrer origin.
 *   landingPages			Number of landings per page.
 *   bilingualismClasses	Number of sessions per bilingualism class.
 *   countries				Number of sessions per country.
 *   oses					Number of sessions per OS.
 *   browsers				Number of sessions per browser.
 *   screenBreakpoints		Number of sessions per breakpoint.
 *   excludedTraffic		Number of views per exclusion motive.
 *
 * Most of these data fields use a sort of associative array solution that uses
 * an array of object. Each object has a "key" and "value" property.
 */
async function buildStats(range) {
	return getSessions(range).then(sessions => {

		let stats = {
			version: 1,
			filter: sessions.filter,
			stats: {
				viewTotal: sessions.viewTotal,
				sessionTotal: 0,
				avgSessionLength: undefined,
				pageViews: {},
				acquisitionChannels: {},
				referrerOrigins: {},
				landingPages: {},
				bilingualismClasses: {},
				countries: {},
				oses: {},
				browsers: {},
				screenBreakpoints: {},
				excludedTraffic: sessions.excludedTraffic
			}
		};

		// Holds the total number of page views for all sessions in the range.
		let pageViewTotal = 0;

		// For every session in the range...
		for (const session of sessions.sessions) {

			// Increment number of sessions.
			stats.stats.sessionTotal++;

			let landingPageSet = false;

			// For every page view in this session...
			for (let pageView of session.pageViews) {

				// Increment number of page views in the range.
				pageViewTotal++;

				const normalizedViewURL = (new uri.URIPath(pageView[1])).pathname;

				// Landing Page
				if (!landingPageSet) {
					if (stats.stats.landingPages[normalizedViewURL] === undefined) {
						stats.stats.landingPages[normalizedViewURL] = 0;
					}
					stats.stats.landingPages[normalizedViewURL]++;
					landingPageSet = true;
				}

				// Page Views
				if (stats.stats.pageViews[normalizedViewURL] === undefined) {
					stats.stats.pageViews[normalizedViewURL] = 0;
				}
				stats.stats.pageViews[normalizedViewURL]++;
			}

			// Acquisition Channels
			if (stats.stats.acquisitionChannels[session.acquisitionChannel] === undefined) {
				stats.stats.acquisitionChannels[session.acquisitionChannel] = 0;
			}
			stats.stats.acquisitionChannels[session.acquisitionChannel]++;

			// Referrer Origins
			if (session.referrerOrigin !== "") {
				if (stats.stats.referrerOrigins[session.referrerOrigin] === undefined) {
					stats.stats.referrerOrigins[session.referrerOrigin] = 0;
				}
				stats.stats.referrerOrigins[session.referrerOrigin]++;
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
		stats.stats.avgSessionLength = pageViewTotal / stats.stats.sessionTotal;

		// For sorting, convert "associative arrays" (objects) to flat arrays.
		// The result is an array of objects, each containing the key and value
		// of what was previously a single object field.
		stats.stats.pageViews = stats.stats.pageViews.sortedAssociativeArray();
		stats.stats.landingPages = stats.stats.landingPages.sortedAssociativeArray();
		stats.stats.acquisitionChannels = stats.stats.acquisitionChannels.sortedAssociativeArray();
		stats.stats.referrerOrigins = stats.stats.referrerOrigins.sortedAssociativeArray();
		stats.stats.bilingualismClasses = stats.stats.bilingualismClasses.sortedAssociativeArray();
		stats.stats.countries = stats.stats.countries.sortedAssociativeArray();
		stats.stats.oses = stats.stats.oses.sortedAssociativeArray();
		stats.stats.browsers = stats.stats.browsers.sortedAssociativeArray();
		stats.stats.screenBreakpoints = stats.stats.screenBreakpoints.sortedAssociativeArray();
		stats.stats.excludedTraffic = stats.stats.excludedTraffic.sortedAssociativeArray();

		// Save stats to cache.
		const filePath = statsRoot + range.type + "/" + range.value + ".json";
		fs.mkdir(statsRoot + range.type, { recursive: true }).then(() => {
			fs.writeFile(filePath, JSON.stringify(stats));
		});

		return stats;
	});
}


/**
 * Checks the cache for the requested sessions.
 * Returns data from cache, or calls buildSessions(range) and returns that.
 */
async function getSessions(range) {
	const to = range.to();
	const lastMonth = to.year + "-" + to.month.toString().padStart(2, "0");
	const viewsFilePath = viewsRoot + lastMonth + ".tsv";
	const viewsFileMetadata = fs.stat(viewsFilePath);

	const sessionsFilePath = sessionsRoot + range.type + "/" + range.value + ".json";
	const sessionsFileMetadata = fs.stat(sessionsFilePath);

	return Promise.all([sessionsFileMetadata, viewsFileMetadata]) .then(metadata => {
		sessionsMetadata = metadata[0];
		viewsMetadata = metadata[1];

		if (viewsMetadata.mtimeMs > sessionsMetadata.mtimeMs
			|| Date.now() - 3600000 > sessionsMetadata.mtimeMs) {
			return buildSessions(range);

		} else {
			return fs.readFile(sessionsFilePath, "utf8")
				.then(contents => JSON.parse(contents));
		}
	})
	.catch((e) => {
		return buildSessions(range);
	});
}


/**
 * Builds and returns sessions from a call to getViews(range).
 * Also stores the result in cache.
 *
 * A sessions file or "container" is as follows:
 * version			The version of Analytique.
 * filter			The filter that was used to exclude views.
 * viewTotal		Total number of views processed before filter.
 * excludedTraffic	An object with stats about the data that was filtered out.
 *   excludedTests		Number of views excluded because the IP was from a dev.
 *   excludedBots		Number of views excluded because it was from a bot.
 *   excludedAttacks	Number of views excluded because it was illegitimate.
 * sessions				This is the array of sessions.
 *   earliestTime		The first time collected for that page.
 *   referrerOrigin
 *   acquisitionChannel
 *   languages			Array of strings of language codes.
 *   country
 *   os
 *   browser
 *   screenBreakpoint
 *   pageViews			Array of arrays, each with the title and URL of the page.
 *
 * → See the View documentation for more detais.
 * Timestamps are in milliseconds since 1 January 1970 UTC.
 */
async function buildSessions(range) {
	return getViews(range).then(async (views) => {

		let sessions = {
			version: 1,
			filter: filter,
			viewTotal: 0,
			excludedTraffic: {
				excludedTests: 0,
				excludedBots: 0,
				excludedAttacks: 0
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

			// If view is part of the same session, it must...
			if (previousView !== undefined
				&& view[12] === previousView[12] // have the same IP address.
				&& view[11] === previousView[11] // have the same user-agent string.
				&& view[2] === previousView[2] // be in the same timezone.
				&& (view[5] === previousView[4] // follow previous view.
				|| view[5] === "")) { // or have no referrer.

				currentSession.pageViews.push([view[3], view[4].substr(25)]);
				currentSession.latestTime = view[10];

			} else { // Otherwise, begin a new session.

				// Close previous session.
				if (previousView !== undefined) {
					_closeSession();
				}

				// Filter out some IP addresses.
				if (filter.excludeClientIPs.includes(view[12])) {
					sessions.excludedTraffic.excludedTests++;
					continue;
				}

				// Filter out all hostnames except the ones specified.
				// TODO: Refactor this into a more thorough beacon authentication.
				let hostnameFound = undefined;
				for (const hostname of filter.requiredHostnames) {
					if (view[4].includes(hostname)) {
						hostnameFound = hostname;
					}
				}
				if (!hostnameFound) {
					continue;
				}

				// Filter out bots.
				if (view[11].includesAny(filter.excludeBotUserAgents)) {
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

				currentSession.os = heuristics.inferOS(view[11]);
				currentSession.browser = heuristics.inferBrowser(view[11]);
				currentSession.screenBreakpoint = heuristics.inferScreenBreakpoint(view[8]);

				currentSession.pageViews = [[view[3], view[4].substr(25)]];
			}

			previousView = view;
		}

		if (currentSession.pageViews?.length > 0) {
			_closeSession();
		}

		// Save data to cache.
		const filePath = sessionsRoot + range.type + "/" + range.value + ".json";
		fs.mkdir(sessionsRoot + range.type, { recursive: true }).then(() => {
			fs.writeFile(filePath, JSON.stringify(sessions));
		});

		return sessions;
	});
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
async function getViews(range) {
	let fileReadPromises = [];

	// Issue a promise for each month-file.
	for (const month of range.monthRange()) {
		fileReadPromises.push(

			fs.readFile(dataRoot + "views/" + month + ".tsv", "utf8")
			.then(rawView => {
				// Format the view.
				return rawView.trim().split("\n")
					.map(rawView => rawView.split("\t")
						.map(rawField => decodeURI(rawField)));
			})
		);
	}

	return Promise.all(fileReadPromises).then(views => views.flat(1));
}


module.exports = { processRequest };
