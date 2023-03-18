const http = require("http");
require("../util/misc.js");
require("../../shared/time.js");
const Logs = require("../util/log.js");

const config = require("../util/config.js").analytique.heuristics;


// Looks for match in the passed category definition.
// Returns the category name if found, false otherwise.
function categorize(str, definition) {
  if (config[definition] === undefined) throw new Error(`Unknown definition ${definition}`);
  if (config[definition].categories === undefined) throw new Error(`Unknown definition “${definition}”`);
  for (const cat of Object.keys(config[definition].categories)) {
    if (str.includesAny(config[definition].categories[cat])) return cat;
  }
  return false;
}

// Returns an object containing the passed string value (val) and,
// if applicable, the group (grp) to which it belongs.
function group(str, definition) {
  if (typeof str !== "string") return { val: "" };
  if (definition === undefined) return { val: str };
  if (config[definition] === undefined) throw new Error(`Unknown definition ${definition}`);
  if (config[definition].groups === undefined) throw new Error(`Unknown definition “${definition}”`);
  for (const key of Object.keys(config[definition].groups)) {
    if (str.includesAny(config[definition].groups[key])) return { grp: key, val: str };
  }
  return { val: str };
}


const ipGeoCache = {};
const ipGeoCacheTTL = time(config.ipGeo.cacheTTL);
const ipGeoAddress = "http://ipinfo.io/";
const ipGeoParameters = "/json?token=" + config.ipGeo.token;

/**
 * Queries ipinfo.io for the location of the given IP address. Caches the result.
 * WARNING: Very slow.
 * @param {string} ipAddress - The IP address.
 * @returns {Promise<object>} A promise to an object containing the country code, region and city.
 */
async function inferLocation(ipAddress) {
  return new Promise(function(resolve, reject) {

    // Use the cached result if it is fresh.
    if (ipGeoCache[ipAddress]?.time + ipGeoCacheTTL > Date.now()) {
      return resolve(ipGeoCache[ipAddress].data);
    }

    http.get(ipGeoAddress + ipAddress + ipGeoParameters, res => {
      let rawData = "";

      res.on("data", chunk => {
        rawData += chunk;
      });

      res.on("end", () => {
        rawData = JSON.parse(rawData);

        if (rawData.error) {
          resolve(rawData);
          return;
        }

        const data = {
          country: rawData.country,
          region: rawData.region,
          city: rawData.city
        };

        ipGeoCache[ipAddress] = {
          data: data,
          time: Date.now()
        }
        resolve(data);
      });

    }).on("error", e => {
      resolve({ error: e });
    });
  });
}

/**
 * Infers whether user is a bot from the user-agent string using simple patterns.
 * @param {string} userAgent - A user-agent string.
 * @returns {boolean} Whether the user-agent is a bot.
 */
function inferIfBot(userAgent) {
  return userAgent.includesAny(config.bots);
}

/**
 * Infers the acquisition channel from a URL.
 * @param {string} url - Referrer URL.
 * @param {string} originDomain - Domain of the current origin. Determines internal traffic.
 * @returns {string} One of the following:
 *  - direct   User typed in the address manually, or the browser did not include a referrer.
 *  - social   User comes from a social media website.
 *  - organic  User comes from a search engine.
 *  - internal User comes from inside the site, maybe because they left a page opened for a long time.
 *  - other    User comes from another website.
 */
function inferReferralChannel(url, originDomain) {
  if (url === "") return "direct";
  if (url.includes(originDomain)) return "internal";
  const match = categorize(url, "referralChannel");
  if (!match) {
    // Logs.log("heuristics", `Could not infer referral channel from url: “${url}”`);
    return "other";
  }
  return match;
}

function groupReferrerURL(url) {
  return group(url.replace(/\/$/, ""), "referrerURL");
}

/**
 * Infers the OS name from a user-agent string.
 * @param {string} userAgent - A user-agent string.
 * @returns {string} The proper name of the OS. An empty string if the OS could not be determined.
 */
function inferOS(userAgent) {
  const match = categorize(userAgent, "os");
  if (!match) Logs.log("heuristics", `Could not infer OS from user-agent: “${userAgent}”`);
  return group(match, "os");
}

/**
 * Infers the browser name from a user-agent string.
 * @param {string} userAgent - A user-agent string.
 * @returns {string} The proper name of the browser. An empty string if the browser could not be determined.
 */
function inferBrowser(userAgent) {
  const match = categorize(userAgent, "browser");
  if (!match) Logs.log("heuristics", `Could not infer browser from user-agent: “${userAgent}”`);
  return group(match, "browser");
}

/**
 * Infers rendering engine name from a user-agent string.
 * @param {string} userAgent - A user-agent string.
 * @returns {string} The proper name of the rendering engine. An empty string if the engine could not be determined.
 */
function inferRenderingEngine(userAgent) {
  const match = categorize(userAgent, "renderingEngine");
  if (!match) Logs.log("heuristics", `Could not infer rendering engine from user-agent: “${userAgent}”`);
  return group(match);
}

/**
 * Infers the screen size class, given a WxH pixel size.
 *
 * These correspond to the CSS breakpoints in the main stylesheet,
 * and are not meant to be a good approximation of the physical form factor.
 * Note that the "laptop" breakpoint is treated as part of "desktop" since
 * the styles are almost the same.
 * TODO: Generalize to read breakpoints from origin config
 *
 * @param {string} screenSize - A screen size in the format "WxH".
 * @returns {string} One of the following:
 *  - xsmall   Less than or equal to 360 pixels wide.
 *  - mobile   Less than or equal to 800 pixels wide.
 *  - tablet   Less than or equal to 1080 pixels wide.
 *  - desktop  Wider than 1080 pixels wide.
 */
function inferScreenBreakpoint(size) {
  size = size.split("x");
  if (size[0] <= 360) return "xsmall";
  if (size[0] <= 800) return "mobile";
  if (size[0] <= 1080) return "tablet";
  return "desktop";
}

/**
 * Infers the bilingualism class from an array of language codes.
 * TODO: Generalize to use any two language from origin config.
 * @param {string[]} languages - List of language codes.
 * @returns {string} One of the following:
 *  - fr+  Bilingual, French before English.
 *  - en+  Bilingual, English before French.
 *  - fr   French, no English.
 *  - en   English, no French.
 *  - al   Other languages only.
 */
function inferBilingualismClass(languages) {
  let hasFR = false;
  let hasEN = false;
  let preferred;

  for (let i = 0; i < languages.length; i++) {
    if (languages[i].includes("fr")) {
      hasFR = true;
      if (!preferred) {
        preferred = "fr";
      }
    } else if (languages[i].includes("en")) {
      hasEN = true;
      if (!preferred) {
        preferred = "en";
      }
    }
  }

  // If is bilingual.
  if (hasFR && hasEN) {
    if (preferred === "fr") return "fr+";
    if (preferred === "en") return "en+";
  }

  if (hasFR) return "fr";
  if (hasEN) return "en";

  return "al";
}

function inferIfTouchScreen(canHover, ptrPrecision) {
  return !canHover && ptrPrecision === 1;
}


module.exports = {
  inferLocation,
  inferIfBot,
  inferReferralChannel,
  groupReferrerURL,
  inferOS,
  inferBrowser,
  inferRenderingEngine,
  inferScreenBreakpoint,
  inferBilingualismClass,
  inferIfTouchScreen
};
