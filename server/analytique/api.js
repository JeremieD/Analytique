const fs = require("fs").promises;
fs.readdirSync = require("fs").readdirSync;
fs.mkdirSync = require("fs").mkdirSync;
const static = require("../web/static.js");
const account = require("../web/account.js");
const uri = require("../util/uri.js");
const Heuristics = require("./heuristics.js");
require("../../shared/JDDate.js");
require("../../shared/time.js");
require("../util/misc.js");

const config = require("../util/config.js").analytique.origins;

const dataRoot = "./data/";
const sessionsRoot = origin => dataRoot + origin + "/sessions/";
const statsRoot = origin => dataRoot + origin + "/stats/";

/*
 * The front-end is calling the API.
 * The server calls this function with the *req*uest and *res*ponse context.
 */
function processRequest(req, res) {
  const path = new uri.URIPath(req.url);
  const user = account.getUser(req);

  // Calls for array of allowed origins for the logged in user.
  if (path.filename === "origins") {
    let allowedOrigins = [];
    for (const originHostname of Object.keys(config)) {
      if (config[originHostname].allowedUsers.includes(user)) {
        allowedOrigins.push(originHostname)
      }
    }

    if (allowedOrigins.length === 0) allowedOrigins = { error: "noOrigins" };

    const eTag = hash(JSON.stringify(allowedOrigins) + user);
    static.serve(req, res, allowedOrigins, "application/json", "auto", "private", eTag);
    return;
  }

  // Check API options.
  let origin, range;
  let filter = [];

  // Check origin permissions and existence.
  origin = path.parameters?.origin;
  if (origin === undefined || !config.hasOwnProperty(origin) ||
    !config[origin].allowedUsers.includes(user)) {
    static.serve(req, res, { error: "unknownOrigin" },
      "application/json", "auto", "private");
    return;
  }

  // Calls for the available range for that origin.
  if (path.filename === "available") {
    fs.mkdirSync(sessionsRoot(origin), { recursive: true });
    let years = fs.readdirSync(sessionsRoot(origin));
    years = years.filter(name => name[0] !== ".").sort();

    if (years.length === 0) {
      static.serve(req, res, { error: "noData" }, "application/json", "auto", "private");
      return;
    }

    // Start bound
    const startYear = years[0];
    const startBound = fs.readdir(sessionsRoot(origin) + startYear).then(months => {
      months = months.filter(name => name[0] !== ".").sort();
      return months[0];
    }).then(startMonth => {
      return fs.readdir(sessionsRoot(origin) + startYear + "/" + startMonth).then(days => {
        days = days.filter(name => name[0] !== ".").sort();
        return new JDDate(parseInt(startYear), parseInt(startMonth), parseInt(days[0]));
      });
    });

    // End bound
    const endYear = years.at(-1);
    const endBound = fs.readdir(sessionsRoot(origin) + endYear).then(months => {
      months = months.filter(name => name[0] !== ".").sort();
      return months.at(-1);
    }).then(endMonth => {
      return fs.readdir(sessionsRoot(origin) + endYear + "/" + endMonth).then(days => {
        days = days.filter(name => name[0] !== ".").sort();
        return new JDDate(parseInt(endYear), parseInt(endMonth), parseInt(days.at(-1)));
      });
    });

    Promise.all([startBound, endBound]).then(([start, end]) => {
      const range = (new JDDateInterval(start, end)).canonicalForm;
      const eTag = hash(range + origin + user);
      static.serve(req, res, `"${range}"`,
        "application/json", "auto", "private", eTag);
      return;
    }).catch(console.error);

    return;
  }

  // Check range parameter
  try {
    if (path.parameters.range) {
      range = new JDDateInterval(path.parameters.range);
    }
  } catch (e) {

    static.serve(req, res, { error: e },
      "application/json", "auto", "private");
    return;
  }

  // Calls for the annotation list for that origin.
  if (path.filename === "annotations") {
    let annotations = config[origin].annotations;

    if (range) {
      let inRangeAnnotations = [];
      for (const annotation of annotations) {
        if (range.intersects(new JDDateInterval(annotation.date))) {
          inRangeAnnotations.push(annotation);
        }
      }
      annotations = inRangeAnnotations;
    }

    const eTag = hash(JSON.stringify(annotations) + (path.parameters.range ?? "") + user);
    static.serve(req, res, annotations, "application/json", "auto", "private", eTag);
    return;
  }

  // Calls for stats for the given origin and range.
  if (path.filename === "stats") {
    if (!("range" in path.parameters) || path.parameters.range === undefined) {
      static.serve(req, res, { error: "missingRange" },
        "application/json", "auto", "private");
      return;
    }

    if ("filter" in path.parameters) {
      filter = path.parameters.filter.split(";").map(item => {
        item = item.split(":").map(decodeURIComponent);
        const negated = item[0].startsWith("!");
        const key = negated ? item[0].slice(1) : item[0];
        return {
          negated: negated,
          key: key,
          value: item[1]
        };
      });
    }

    getStats(origin, range, filter).then(data => {
      const eTag = hash(JSON.stringify(data) + path.query + user);
      static.serve(req, res, data, "application/json", "auto", "private", eTag);
    }).catch(console.error);

  } else {
    static.serveError(res);
  }
}


async function getStats(origin, range, filter) {
  if (filter !== undefined || range.intersects(JDDate.today())) {
    return buildStats(origin, range, filter);
  }

  const statsFilePath = `${statsRoot(origin)}${range.unit}/${range.canonicalForm}.json`;
  return fs.readFile(statsFilePath, "utf8").then(JSON.parse).catch(() => {
    return buildStats(origin, range, filter);
  });
}


async function buildStats(origin, range, filter) {
  return getSessions(origin, range).then(async sessions => {
    if (sessions.error !== undefined) return sessions;

    const stats = {
      viewTotal: 0,
      sessionTotal: 0,
      avgSessionLength: 0,
      pageViews: {},
      errorViews: {},
      referralChannel: {},
      referralOrigin: {},
      entryPage: {},
      exitPage: {},
      languages: {},
      bilingualism: {},
      country: {},
      region: {},
      city: {},
      os: {},
      renderingEngine: {},
      screenBreakpoint: {},
      touchScreen: 0,
      preferences: {},
      excludedTraffic: {
        spam: 0,
        bots: 0,
        dev: 0
      }
    };

    for (const session of sessions) {
      // Exclude devs
      if (config[origin].excludeIPsAsDev.includes(session.ip) ||
          session.ip.startsWith("192.168.")) {
        stats.excludedTraffic.dev++;
        continue;
      }

      // Exclude bots
      if (Heuristics.inferIfBot(session.ua)) {
        stats.excludedTraffic.bots++;
        continue;
      }

      // Exclude spam
      const location = await Heuristics.inferLocation(session.ip);
      if (location.error) return { error: "ipGeoUnavailable" };
      if (config[origin].excludeIPsAsSpam.includes(session.ip) ||
          config[origin].excludeCountriesAsSpam.includes(session.country)) {
        stats.excludedTraffic.spam++;
        continue;
      }

      const sessionStats = {
        viewTotal: 0,
        pageViews: [],
        errorViews: [],
        entryPage: undefined,
        exitPage: undefined,
        referralChannel: undefined,
        referralOrigin: undefined,
        languages: session.l,
        bilingualism: Heuristics.inferBilingualismClass(session.l),
        country: location.country,
        region: location.region,
        city: location.city,
        os: Heuristics.inferOS(session.ua),
        renderingEngine: Heuristics.inferRenderingEngine(session.ua),
        screenBreakpoint: Heuristics.inferScreenBreakpoint(session.inS),
        touchScreen: Heuristics.inferIfTouchScreen(session.ptrHover, session.ptrPrec),
        darkMode: !!session.darkMode,
        moreContrast: !!session.moreContrast,
        lessMotion: !!session.lessMotion
      };

      for (const event of session.events) {
        if (event.e === "pageView") {
          sessionStats.viewTotal++;
          const url = (new URL(event.pu)).pathname;
          if (sessionStats.entryPage === undefined) {
            sessionStats.entryPage = url;
            sessionStats.referralOrigin = Heuristics.normalizeOriginURL(event.pr);
            sessionStats.referralChannel = Heuristics.inferReferralChannel(event.pr);
          }
          sessionStats.exitPage = url;
          if (event.pt.includesAny(config[origin].errorPagePatterns)) {
            sessionStats.errorViews.push(url);
          } else {
            sessionStats.pageViews.push(url);
          }
        } // @TODO: custom events
      }

      // Filter
      let score = 0;
      for (const item of filter) {
        switch (item.key) {
          case "pageViews":
          case "errorViews":
          case "languages":
            if (sessionStats[item.key].includes(item.value) === !item.negated) score++;
            break;
          case "preferences":
            if (sessionStats[item.value] === !item.negated) score++;
            break;
          case "referralChannel":
          case "referralOrigin":
          case "entryPage":
          case "exitPage":
          case "bilingualism":
          case "country":
          case "region":
          case "city":
          case "os":
          case "renderingEngine":
          case "screenBreakpoint":
          case "touchScreen":
            if ((sessionStats[item.key] === item.value) === !item.negated) score++;
            break;
        }
      }
      if (score !== filter.length) continue;

      // Dissolve session into aggregate stats
      stats.viewTotal += sessionStats.viewTotal;
      stats.sessionTotal++;

      for (const pageView of sessionStats.pageViews) {
        stats.pageViews[pageView] ??= 0;
        stats.pageViews[pageView]++;
      }
      for (const errorView of sessionStats.errorViews) {
        stats.errorViews[errorView] ??= 0;
        stats.errorViews[errorView]++;
      }

      stats.referralChannel[sessionStats.referralChannel] ??= 0;
      stats.referralChannel[sessionStats.referralChannel]++;
      stats.referralOrigin[sessionStats.referralOrigin] ??= 0;
      stats.referralOrigin[sessionStats.referralOrigin]++;

      stats.entryPage[sessionStats.entryPage] ??= 0;
      stats.entryPage[sessionStats.entryPage]++;
      stats.exitPage[sessionStats.exitPage] ??= 0;
      stats.exitPage[sessionStats.exitPage]++;

      for (lang of sessionStats.languages) {
        stats.languages[lang] ??= 0;
        stats.languages[lang]++;
      }
      stats.bilingualism[sessionStats.bilingualism] ??= 0;
      stats.bilingualism[sessionStats.bilingualism]++;

      stats.country[sessionStats.country] ??= 0;
      stats.country[sessionStats.country]++;
      stats.region[sessionStats.region] ??= 0;
      stats.region[sessionStats.region]++;
      stats.city[sessionStats.city] ??= 0;
      stats.city[sessionStats.city]++;

      stats.os[sessionStats.os] ??= 0;
      stats.os[sessionStats.os]++;
      stats.renderingEngine[sessionStats.renderingEngine] ??= 0;
      stats.renderingEngine[sessionStats.renderingEngine]++;
      stats.screenBreakpoint[sessionStats.screenBreakpoint] ??= 0;
      stats.screenBreakpoint[sessionStats.screenBreakpoint]++;

      if (sessionStats.touchScreen) stats.touchScreen++;
      const preferences = [ "darkMode", "moreContrast", "lessMotion" ];
      for (pref of preferences) {
        stats.preferences[pref] ??= 0;
        if (sessionStats[pref]) stats.preferences[pref]++;
      }
    }

    if (stats.sessionTotal === 0) return { error: "noMatchingSessions" };

    if (stats.sessionTotal > 0) {
      stats.avgSessionLength = stats.viewTotal / stats.sessionTotal;
    }

    // For sorting, convert "associative arrays" (objects) to flat arrays.
    // The result is an array of objects, each containing the key and value
    // of what was previously a single object field.
    const associativeArrayFields = [ "pageViews", "errorViews", "referralChannel", "referralOrigin", "entryPage", "exitPage", "languages", "bilingualism", "country", "region", "city", "os", "renderingEngine", "screenBreakpoint", "preferences", "excludedTraffic" ];
    for (field of associativeArrayFields) {
      stats[field] = stats[field].sortedAssociativeArray();
    }

    // Save stats to cache, except for filtered data, and some range modes.
    if (filter.length === 0 && range.isSingular && range.unit !== "day") {
      const dirPath = statsRoot(origin) + range.unit;
      const filePath = dirPath + "/" + range.canonicalForm + ".json";
      fs.mkdir(dirPath, { recursive: true }).then(() => {
        fs.writeFile(filePath, JSON.stringify(stats));
      });
    }

    return stats;
  }).catch(console.error);
}


async function getSessions(origin, range) {
  const promises = [];
  for (date of range.each("day")) {
    const dayDir = `${sessionsRoot(origin)}${date.formatted("short", { unitSeparator:"/" })}/`;
    sessionFiles = [];
    try {
      sessionFiles = fs.readdirSync(dayDir);
    } catch (e) {}
    for (file of sessionFiles) {
      if (file.startsWith(".")) continue;
      promises.push(fs.readFile(dayDir + file, "utf8").then(JSON.parse));
    }
  }
  return Promise.all(promises).then(sessions => {
    if (sessions.length === 0 ) return { error: "noData" };
    // return sessions.sort((a, b) => b.startT - a.startT);
    return sessions;
  });
}


module.exports = { processRequest };
