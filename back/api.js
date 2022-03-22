const fs = require("fs").promises;
const uri = require("../utilities/uri.js");
const heuristics = require("../utilities/heuristics.js");
const dateRange = require("../utilities/dateRange.js");
const obj = require("../utilities/associativeArray.js");

function processRequest(req, res) {
	const path = new uri.URIPath(req.url);

	if (path.filename == "stats") {

		let range;

		if (path.parameters?.range !== undefined) {
			range = new dateRange.DateRange(path.parameters.range);
		}

		getStats().then(stats => {
			res.setHeader("Content-Type", "application/json");
			res.writeHead(200);
			res.end(JSON.stringify(stats));
		});

	} else {
		res.writeHead(404);
		res.end();
	}
}

function getStats(range) { // Digest sessions into stats.
	return getSessions()
		.then(sessions => {
			let stats = { data: {} };
			stats.data.sessionsTotal = 0;
			stats.data.viewsPerPage =  {};
			stats.data.landingsPerPage = {};
			stats.data.sessionsPerAcquisitionChannel = {};
			stats.data.sessionsPerReferrerOrigin = {};
			stats.data.bilingualism = { "en": 0, "en+": 0, "fr": 0, "fr+": 0, "al": 0 };
			stats.data.sessionsPerCountry = {};
			stats.data.sessionsPerOS = {};
			stats.data.sessionsPerBrowser = {};
			stats.data.sessionsPerFormFactor = {};

			stats.version = 1;
			stats.filter = filter;

			let _totalSessionsLength = 0;

			for (const session of sessions.sessions) {

				stats.data.sessionsTotal++;

				const normalizedLandingURL = (new uri.URIPath(session.pagesViewed[0][1])).pathname;
				if (stats.data.landingsPerPage[normalizedLandingURL] === undefined) {
					stats.data.landingsPerPage[normalizedLandingURL] = 0;
				}
				stats.data.landingsPerPage[normalizedLandingURL]++;

				for (let pageView of session.pagesViewed) {
					_totalSessionsLength++;
					const normalizedViewURL = (new uri.URIPath(pageView[1])).pathname;
					if (stats.data.viewsPerPage[normalizedViewURL] === undefined) {
						stats.data.viewsPerPage[normalizedViewURL] = 0;
					}
					stats.data.viewsPerPage[normalizedViewURL]++;
				}

				if (stats.data.sessionsPerAcquisitionChannel[session.acquisitionChannel] === undefined) {
					stats.data.sessionsPerAcquisitionChannel[session.acquisitionChannel] = 0;
				}
				stats.data.sessionsPerAcquisitionChannel[session.acquisitionChannel]++;

				if (stats.data.sessionsPerReferrerOrigin[session.referrerOrigin] === undefined) {
					stats.data.sessionsPerReferrerOrigin[session.referrerOrigin] = 0;
				}
				stats.data.sessionsPerReferrerOrigin[session.referrerOrigin]++;

				if (stats.data.sessionsPerCountry[session.country] === undefined) {
					stats.data.sessionsPerCountry[session.country] = 0;
				}
				stats.data.sessionsPerCountry[session.country]++;

				if (stats.data.sessionsPerOS[session.os] === undefined) {
					stats.data.sessionsPerOS[session.os] = 0;
				}
				stats.data.sessionsPerOS[session.os]++;

				if (stats.data.sessionsPerBrowser[session.browser] === undefined) {
					stats.data.sessionsPerBrowser[session.browser] = 0;
				}
				stats.data.sessionsPerBrowser[session.browser]++;

				if (stats.data.sessionsPerFormFactor[session.formFactor] === undefined) {
					stats.data.sessionsPerFormFactor[session.formFactor] = 0;
				}
				stats.data.sessionsPerFormFactor[session.formFactor]++;

				let _fr = false;
				let _en = false;
				let _first = undefined;
				for (let i = 0; i < session.languages.length; i++) {
					if (session.languages[i].includes("fr")) {
						_fr = true;
						if (i === 0) {
							_first = "fr";
						}
					} else if (session.languages[i].includes("en")) {
						_en = true;
						if (i === 0) {
							_first = "en";
						}
					}
				}

				let _bilingual = _fr && _en;

				if (_bilingual) {
					if (_first == "fr") {
						stats.data.bilingualism["fr+"]++;
					} else if (_first == "en") {
						stats.data.bilingualism["en+"]++;
					} else {
						stats.data.bilingualism["al"]++;
					}
				} else if (_fr) {
						stats.data.bilingualism["fr"]++;
				} else if (_en) {
					stats.data.bilingualism["en"]++;
				} else {
					stats.data.bilingualism["al"]++;
				}

			}

			stats.data.averageSessionLength = _totalSessionsLength / stats.data.sessionsTotal;

			stats.data.viewsPerPage = obj.toSortedAssociativeArray(stats.data.viewsPerPage);
			stats.data.landingsPerPage = obj.toSortedAssociativeArray(stats.data.landingsPerPage);
			stats.data.sessionsPerAcquisitionChannel = obj.toSortedAssociativeArray(stats.data.sessionsPerAcquisitionChannel);
			delete stats.data.sessionsPerReferrerOrigin[""];
			stats.data.sessionsPerReferrerOrigin = obj.toSortedAssociativeArray(stats.data.sessionsPerReferrerOrigin);
			stats.data.bilingualism = obj.toSortedAssociativeArray(stats.data.bilingualism);
			stats.data.sessionsPerCountry = obj.toSortedAssociativeArray(stats.data.sessionsPerCountry);
			stats.data.sessionsPerOS = obj.toSortedAssociativeArray(stats.data.sessionsPerOS);
			stats.data.sessionsPerBrowser = obj.toSortedAssociativeArray(stats.data.sessionsPerBrowser);
			stats.data.sessionsPerFormFactor = obj.toSortedAssociativeArray(stats.data.sessionsPerFormFactor);

			return stats;
		});
}

async function getSessions(range) { // Assembles views into sessions.
	return fs.readFile("./back/data/views/2022-03.tsv", "utf8")
		.then(async (rawViews) => {
			const views = rawViews.trim().split("\n");

			let sessions = {
				sessions: []
			};
			let currentSession = {};
			let previousView;

			for (const rawView of views) {
				const view = rawView.split("\t").map(x => decodeURI(x));

				if (previousView !== undefined &&
					view[12] === previousView[12] &&
					view[11] === previousView[11] &&
					view[6] === previousView[6] &&
					view[2] === previousView[2] &&
					(view[5] === previousView[4] || view[5] === "")) { // Same session

					currentSession.pagesViewed.push([view[3], view[4].substr(25)]);
					currentSession.latestTime = view[10];

				} else { // New session
					if (previousView !== undefined) { // Close previous session.
						sessions.sessions.push(currentSession);
						currentSession = {};
						previousView = undefined;
					}

					if (filter.excludeClientIPs.includes(view[12])) { // Exclude some IPs.
						continue;
					}

					let hostnameFound = undefined;
					for (const hostname of filter.includeHostnames) { // Exclude all hostnames but those specified.
						if (view[4].includes(hostname)) {
							hostnameFound = hostname;
						}
					}
					if (!hostnameFound) {
						continue;
					}

					currentSession.earliestTime = view[1];

					currentSession.referrerOrigin = view[5];
					currentSession.acquisitionChannel = heuristics.inferReferrerType(currentSession.referrerOrigin);

					currentSession.languages = [];
					if (view[6] != "") {
						currentSession.languages.push(view[6]);
					}
					if (view[7] != "") {
						currentSession.languages.push(...view[7].split(","));
					}
					currentSession.languages = currentSession.languages.unique();
					currentSession.country = await heuristics.inferCountry(view[12]);

					currentSession.os = heuristics.inferOS(view[11]);
					currentSession.browser = heuristics.inferBrowser(view[11]);
					currentSession.formFactor = heuristics.inferFormFactor(view[8]);

					currentSession.pagesViewed = [[view[3], view[4].substr(25)]];
				}

				previousView = view;
			}

			return sessions;
		})
		.catch(error => {
			console.error(error);
		});
}

const filter = {
	excludeClientIPs: [ "104.221.122.236" ],
	includeHostnames: [ "jeremiedupuis.com" ]
};

Array.prototype.unique = function() {
	return this.filter((element, index) => {
		return this.indexOf(element) === index;
	});
};

module.exports = { processRequest };
