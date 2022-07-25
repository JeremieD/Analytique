const fs = require("fs").promises;
const static = require("../static.js");
const account = require("../account.js");
const uri = require("../utilities/uri.js");
const heuristics = require("../utilities/heuristics.js");
require("../../common/JDDate.js");
require("../utilities/misc.js");

const config = require("../config.js").origins;

const dataRoot = "./data/";
const viewsRoot = origin => dataRoot + origin + "/views/";
const sessionsRoot = origin => dataRoot + origin + "/sessions/";
const statsRoot = origin => dataRoot + origin + "/stats/";


/*
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

    if (allowedOrigins.length === 0) {
      allowedOrigins = { error: "noOrigins" };
    }

    const eTag = static.getETagFrom(JSON.stringify(allowedOrigins) + user);

    static.serve(req, res, allowedOrigins, "application/json", "auto", "private", eTag);
    return;
  }

  // Check API options.
  let origin, range, filter;

  // Check that requested origin exists and that the user is allowed to see it.
  origin = path.parameters?.origin;
  if (origin === undefined || !config.hasOwnProperty(origin) ||
    !config[origin].allowedUsers.includes(user)) {
    static.serve(req, res, { error: "unknownOrigin" },
      "application/json", "auto", "private");
    return;
  }

  // Respond with the available range for that origin.
  if (path.filename === "available") {
    fs.readdir(viewsRoot(origin)).then(files => {
      files = files.filter(filename => filename[0] !== ".").sort();

      if (files.length === 0) {
        static.serve(req, res, { error: "noData" },
          "application/json", "auto", "private");
        return;
      }

      const earliestMonth = new JDDate(files[0].split(".")[0]);
      const lowerBound = getBeacons(origin, earliestMonth).then(views => {
        const firstView = views[0];
        const viewTime = parseInt(firstView[1]) - parseInt(firstView[2]) * 60 * 1000;
        return new JDDate(new Date(viewTime));
      });

      const latestMonth = new JDDate(files.at(-1).split(".")[0]);
      const upperBound = getBeacons(origin, latestMonth).then(views => {
        const lastView = views.at(-1);
        const viewTime = parseInt(lastView[1]) - parseInt(lastView[2]) * 60 * 1000;
        return new JDDate(new Date(viewTime));
      });

      Promise.all([lowerBound, upperBound]).then(bounds => {
        const range = new JDDateRange(bounds[0], bounds[1]);
        const rangeShortForm = range.shortForm;
        const eTag = static.getETagFrom(rangeShortForm + origin + user);
        static.serve(req, res, `"${rangeShortForm}"`,
          "application/json", "auto", "private", eTag);
        return;
      });

    }).catch(() => {
      static.serve(req, res, { error: "noData" },
        "application/json", "auto", "private");
      return;
    });
    return;
  }

  // Respond with stats for the given origin and range.
  if (path.filename === "stats") {
    if (!("range" in path.parameters) || path.parameters.range === undefined) {
      static.serve(req, res, { error: "missingRange" },
        "application/json", "auto", "private");
      return;
    }

    try {
      range = new JDDateRange(path.parameters.range);
    } catch (e) {
      static.serve(req, res, { error: e },
        "application/json", "auto", "private");
      return;
    }

    if ("filter" in path.parameters) {
      filter = path.parameters.filter;
    }

    getStats(origin, range, filter).then(data => {
      const eTag = static.getETagFrom(JSON.stringify(data) + path.query + user);
      static.serve(req, res, data, "application/json", "auto", "private", eTag);
    })
    .catch(console.log);

  } else {
    static.serveError(res);
  }
}


/*
 * Checks the cache for the requested stats.
 * Returns data from cache, or calls buildStats(range) and returns that.
 */
async function getStats(origin, range, filter) {
  // If filter is defined, ignore cache and build from scratch.
  if (filter !== undefined) {
    return buildStats(origin, range, filter);
  }

  const lastMonth = range.to.shortForm;
  const viewsFilePath = viewsRoot(origin) + lastMonth + ".tsv";
  const viewsFileMetadata = fs.stat(viewsFilePath);

  const statsFilePath = statsRoot(origin) + range.mode + "/" + range.shortForm + ".json";
  const statsFileMetadata = fs.stat(statsFilePath);

  return Promise.all([statsFileMetadata, viewsFileMetadata]).then(metadata => {
    statsMetadata = metadata[0];
    viewsMetadata = metadata[1];

    if (viewsMetadata.mtimeMs > statsMetadata.mtimeMs ||
      Date.now() - 3600000 * 24 * 30 > statsMetadata.mtimeMs) {
      return buildStats(origin, range);

    } else {
      return fs.readFile(statsFilePath, "utf8").then(JSON.parse);
    }
  }).catch(() => buildStats(origin, range));
}


/*
 * Compiles and returns stats from sessions.
 * Also stores the result in cache.
 *
 * A stats file is as follows:
 * version              The version of Analytique.
 * viewTotal            The total number of views in this range before filter.
 * sessionTotal         The total number of sessions in this range.
 * avgSessionLength     Average number of page views per session.
 * pageViews            Number of views per page.
 * errorViews           Number of views per error page.
 * acquisitionChannels  Number of sessions per acquisition channel.
 * referrerOrigins      Number of landings per referrer origin.
 * landings             Number of landings per URL.
 * bilingualismClasses  Number of sessions per bilingualism class.
 * countries            Number of sessions per country.
 * regions              Number of sessions per region.
 * cities               Number of sessions per city, for some countries.
 * oses                 Number of sessions per OS.
 * renderingEngines     Number of sessions per rendering engine.
 * screenBreakpoints    Number of sessions per breakpoint.
 * excludedTraffic      Number of views per exclusion motive.
 *
 * Most of these data fields use a sort of associative array solution that uses
 * an array of object. Each object has a "key" and "value" property.
 */
async function buildStats(origin, range, filter) {
  return getSessions(origin, range).then(sessions => {

    if (sessions.error !== undefined) return sessions;

    const stats = {
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
      regions: {},
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
      const views = {
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
          if (filterKey === "regions" &&
            filterValue !== session.region) {
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

      // Regions
      if (stats.regions[session.region] === undefined) {
        stats.regions[session.region] = 0;
      }
      stats.regions[session.region]++;

      // Cities
      if (stats.cities[session.city] === undefined) {
        stats.cities[session.city] = 0;
      }
      stats.cities[session.city]++;

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

    if (stats.sessionTotal === 0) {
      return { error: "noMatchingSessions" };
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
    stats.regions = stats.regions.sortedAssociativeArray();
    stats.cities = stats.cities.sortedAssociativeArray();
    stats.oses = stats.oses.sortedAssociativeArray();
    stats.renderingEngines = stats.renderingEngines.sortedAssociativeArray();
    stats.screenBreakpoints = stats.screenBreakpoints.sortedAssociativeArray();
    stats.excludedTraffic = stats.excludedTraffic.sortedAssociativeArray();

    // Save stats to cache, except for filtered data, and some range modes.
    if (filter === undefined && (range.mode === "year" ||
        range.mode === "month" || range.mode === "week")) {
      const dirPath = statsRoot(origin) + range.mode;
      const filePath = dirPath + "/" + range.shortForm + ".json";
      fs.mkdir(dirPath, { recursive: true }).then(() => {
        fs.writeFile(filePath, JSON.stringify(stats));
      });
    }

    return stats;
  }).catch(console.log);
}


/*
 * Checks the cache for the requested sessions.
 * Returns data from cache, or calls buildSessions(range) and returns that.
 */
async function getSessions(origin, range) {
  const lastMonth = range.to.shortForm;
  const viewsFilePath = viewsRoot(origin) + lastMonth + ".tsv";
  const viewsFileMetadata = fs.stat(viewsFilePath);

  const sessionsFilePath = sessionsRoot(origin) + range.mode + "/" + range.shortForm + ".json";
  const sessionsFileMetadata = fs.stat(sessionsFilePath);

  return Promise.all([sessionsFileMetadata, viewsFileMetadata]).then(metadata => {
    sessionsMetadata = metadata[0];
    viewsMetadata = metadata[1];

    if (viewsMetadata.mtimeMs > sessionsMetadata.mtimeMs ||
      Date.now() - 3600000*24*30 > sessionsMetadata.mtimeMs) {
      return buildSessions(origin, range);

    } else {
      return fs.readFile(sessionsFilePath, "utf8")
        .then(contents => JSON.parse(contents));
    }
  }).catch(() => buildSessions(origin, range));
}


/*
 * Aggregates and returns sessions from views.
 * Also stores the result in cache.
 *
 * A sessions file or "container" is as follows:
 * version              The version of Analytique.
 * viewTotal            Total number of views processed before filter.
 * excludedTraffic      An object with stats about the data that was filtered out.
 *   excludedTests      Number of views excluded because the IP was from a dev.
 *   excludedBots       Number of views excluded because it was from a bot.
 *   excludedSpam       Number of views excluded because it was illegitimate.
 * sessions             This is the array of sessions.
 *   earliestTime       The first time collected for that page.
 *   referrerOrigin
 *   acquisitionChannel
 *   languages          Array of strings of language codes.
 *   country            2-letter country code.
 *   region             Region name.
 *   city               City name.
 *   os
 *   renderingEngine
 *   screenBreakpoint
 *   views              Array of view objects.
 *    title             Page title.
 *    url               Page URL.
 *    error             Whether title matches an error pattern in origin’s config.
 *
 * → See the View documentation for more detais.
 * Timestamps are in milliseconds since 1 January 1970 UTC.
 */
async function buildSessions(origin, range) {
  return getBeacons(origin, range).then(async views => {
    if (views.error !== undefined) return views;

    const aggregates = []; // Intermediate object. List of lists of views.
    const sessions = {
      version: 1,
      viewTotal: 0,
      excludedTraffic: {
        tests: 0,
        bots: 0,
        spam: 0
      },
      sessions: []
    };

    // First, aggregate views into sessions.
    for (const view of views) {
      let sessionFound = false;

      sessions.viewTotal++;

      // Check if view matches an open session.
      for (let i = aggregates.length - 1; i >= 0; i--) {
        if (aggregates.length === 0) break;

        const lastView = aggregates[i].at(-1);

        // Continue if lastView was more than an hour before this view.
        if (view[1] - lastView[1] > 1000*60*60) continue;

        // Continue if lastView doesn't have the same IP address.
        if (view[11] !== lastView[11]) continue;

        // Continue if lastView doesn't have the same user-agent string.
        if (view[10] !== lastView[10]) continue;

        // Skip identical page views (most likely page refreshes).
        if (view[4] === lastView[4] && view[5] === lastView[5]) {
          sessionFound = true;
          break;
        }

        // The view matches this session.
        sessionFound = true;

        aggregates[i].push(view);
        break;
      }

      // Create a new view aggregate if no match was found.
      if (!sessionFound) {
        aggregates.push([view]);
      }
    }

    // Then, extract common info into the sessions object.
    for (const aggregate of aggregates) {
      const currentSession = { views: [] };

      // Filter out some IP addresses.
      if (config[origin].excludeClientIPs.includes(aggregate[0][11])) {
        sessions.excludedTraffic.tests += aggregate.length;
        continue;
      }

      // Filter out bots.
      if (heuristics.inferIfBot(aggregate[0][10])) {
        sessions.excludedTraffic.bots += aggregate.length;
        continue;
      }

      // Compile basic session info from the first view.

      currentSession.earliestTime = aggregate[0][1];

      currentSession.referrerOrigin = aggregate[0][5];
      currentSession.acquisitionChannel = heuristics.inferAcquisitionChannel(aggregate[0][5]);

      currentSession.languages = [];
      if (aggregate[0][6] !== "") {
        currentSession.languages.push(aggregate[0][6]);
      }
      if (aggregate[0][7] !== "") {
        currentSession.languages.push(...aggregate[0][7].split(","));
      }
      currentSession.languages = currentSession.languages.unique();

      // Get location info.
      const location = await heuristics.inferLocation(aggregate[0][11]);
      if (location.error) {
        return { error: "ipGeoUnavailable" };
      }
      currentSession.country = location.country;
      currentSession.region = location.region;
      currentSession.city = location.city;

      // Filter out some countries.
      if (config[origin].excludeCountries.includes(currentSession.country)) {
        sessions.excludedTraffic.spam += aggregate.length;
        continue;
      }

      currentSession.os = heuristics.inferOS(aggregate[0][10]);
      currentSession.renderingEngine = heuristics.inferRenderingEngine(aggregate[0][10]);
      currentSession.screenBreakpoint = heuristics.inferScreenBreakpoint(aggregate[0][8]);

      currentSession.userAgent = aggregate[0][10];
      currentSession.ipAddress = aggregate[0][11];

      // Push the rest of the views with minimal data.
      for (const view of aggregate) {
        // True if the view is on an error page.
        const isErrorView = view[3].includesAny(config[origin].errorPagePatterns);

        currentSession.views.push({
          title: view[3],
          url: view[4].replace(/https?:\/\//, "").substr(origin.length),
          error: isErrorView
        });
      }

      sessions.sessions.push(currentSession);
    }

    // Save data to cache, except if empty or range mode is plural.
    if (sessions.sessions.length > 0 && !range.plural) {
      const folder = sessionsRoot(origin) + range.mode;
      const filePath = folder + "/" + range.shortForm + ".json";
      fs.mkdir(folder, { recursive: true }).then(() => {
        fs.writeFile(filePath, JSON.stringify(sessions));
      });
    }

    return sessions;
  }).catch(console.log);
}


/*
 * Returns the view beacons as an array of arrays.
 *
 * Each view consists of the following fields:
 * [0]  version         The integer version of the analytics format.
 * [1]  earliestTime    The first time collected for that page.
 * [2]  timezoneOffset  Offset from UTC in minutes of the client’s time.
 * [3]  pageTitle       Title of the viewed page.
 * [4]  pageURL         URL of the viewed page.
 * [5]  referrerURL     Referrer URL or “” if empty.
 * [6]  language        Single language code of preference.
 * [7]  languages       Ordered list of language codes.
 * [8]  windowInnerSize Inner size of the page in the format “WxH”.
 * [9]  windowOuterSize Outer size of the page in the format “WxH”.
 * [10] userAgent       The browser user-agent string of the request.
 * [11] ipAddress       The IP address of the client.
 *
 * Timestamps are in milliseconds since 1 January 1970 UTC.
 */
async function getBeacons(origin, range) {
  const fileReadPromises = [];

  const firstMillisecond = range.firstMillisecond;
  const lastMillisecond = range.lastMillisecond;

  // Issue a promise for each month-file.
  for (const month of range.monthRange()) {
    const promise = fs.readFile(viewsRoot(origin) + month + ".tsv", "utf8")
    .then(rawBeacons => {
      const beacons = [];

      for (const rawBeacon of rawBeacons.trim().split("\n")) {
        // Format the view.
        const beacon = rawBeacon.split("\t").map(decodeURI);

        if (beacon.length !== 12) {
          return { error: "malformedBeacon" };
        }

        const beaconTime = parseInt(beacon[1]) - parseInt(beacon[2]*60*1000);
        if (beaconTime < firstMillisecond) continue;
        if (beaconTime > lastMillisecond) break;

        beacons.push(beacon);
      }

      return beacons;

    }).catch(() => {
      return { error: "noData" };
    });

    fileReadPromises.push(promise);
  }

  return Promise.all(fileReadPromises).then(beacons => {
    const flatBeacons = [];
    const errors = [];

    for (const month of beacons) {
      if (month.error !== undefined) {
        errors.push(month.error);

      } else {
        flatBeacons.push(...month);
      }
    }

    if (errors.length === beacons.length) {
      return { error: errors[0] };
    }

    return flatBeacons;
  });
}


module.exports = { processRequest };
