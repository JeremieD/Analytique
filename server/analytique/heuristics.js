const http = require("http");
require("../util/misc.js");
require("../../shared/time.js");
const Logs = require("../util/log.js");

const config = require("../util/config.js").analytique.global;

const ipGeoCache = {};
const ipGeoCacheTTL = time("7d");
const ipGeoAddress = "http://ipinfo.io/";
const ipGeoParameters = "/json?token=" + config.ipGeoToken;

const botPatterns = [ "bot", "spider", "crawler", "BingPreview", "Slurp", "facebookexternalhit", "ia_archiver", "Dataprovider.com", "woorankreview" ];
const socialNetworks = {
  "Facebook": "facebook.com",
  "LinkedIn": {
    "linkedin.com": "linkedin.com",
    "lnkd.in": "lnkd.in"
  },
  "Instagram": "instagram.com",
  "Pinterest": {
    "pinterest.com": "pinterest.com",
    "pinterest.de": "pinterest.de",
    "pinterest.ca": "pinterest.ca",
    "pinterest.co.uk": "pinterest.co.uk",
    "pinterest.pt": "pinterest.pt",
    "pinterest.jp": "pinterest.jp",
    "pinterest.co.kr": "pinterest.co.kr",
    "pinterest.se": "pinterest.se",
    "pinterest.fr": "pinterest.fr",
    "pinterest.au": "pinterest.au",
    "pinterest.ch": "pinterest.ch",
    "pinterest.be": "pinterest.be",
    "pinterest.it": "pinterest.it",
    "pinterest.nz": "pinterest.nz",
    "pinterest.ru": "pinterest.ru",
    "pinterest.es": "pinterest.es"
  },
  "Twitter": {
    "twitter.com": "twitter.com",
    "t.co": "t.co"
  },
  "Tumblr": "tumblr.com",
  "Vimeo": "vimeo.com",
  "Dailymotion": "dailymotion.com",
  "YouTube": "youtube.com",
  "VK": "vk.com",
  "OK.ru": "ok.ru",
  "MySpace": "myspace.com",
  "StumbleUpon": "stumbleupon.com",
  "Classmates": "classmates.com",
  "DeviantArt": "deviantart.com",
  "Goodreads": "goodreads.com",
  "12seconds": "12seconds.tv",
  "Four Travel": "4travel.jp",
  "Anobii": "anobii.com",
  "ASMALLWORLD": "asmallworld.net",
  "AVForums": "avforums.com",
  "BlackPlanet": "blackplanet.com",
  "cyworld": "cyworld.co.kr",
  "Draugiem": "draugiem.lv",
  "hi5": "hi5.com",
  "pump.io": "pump.io",
  "QQ": "qq.com",
  "Reddit": "reddit.com",
  "Sina Weibo": "weibo.com"
};
const searchEngines = {
  "All the Internet": "alltheinternet.com",
  "Aol": {
    "aol.com": "aol.com",
    "aolsearch.com": "aolsearch.com"
  },
  "Baidu": {
    "baidu.cn": "baidu.cn",
    "baidu.co.th": "baidu.co.th",
    "baidu.com": "baidu.com"
  },
  "Ask": "ask.com",
  "Bing": "bing.com",
  "Blackle": "blackle.com",
  "CenturyLink": {
    "centurylink.net": "centurylink.net",
    "centurylink.com": "centurylink.com"
  },
  "Clean Search": "clearch.org",
  "Dogpile": "dogpile.com",
  "DuckDuckGo": "duckduckgo.com",
  "Ecosia": "ecosia.org",
  "Entireweb": "entireweb.com",
  "Excite": "excite.com",
  "Goofram": "goofram.com",
  "Google": {
    "android-app://com.google.android.googlequicksearchbox": "android-app://com.google.android.googlequicksearchbox",
    "g.cn": "g.cn",
    "google.ac": "google.ac",
    "google.ad": "google.ad",
    "google.ae": "google.ae",
    "google.al": "google.al",
    "google.am": "google.am",
    "google.as": "google.as",
    "google.at": "google.at",
    "google.az": "google.az",
    "google.ba": "google.ba",
    "google.be": "google.be",
    "google.bf": "google.bf",
    "google.bg": "google.bg",
    "google.bi": "google.bi",
    "google.bj": "google.bj",
    "google.bs": "google.bs",
    "google.bt": "google.bt",
    "google.by": "google.by",
    "google.ca": "google.ca",
    "google.cat": "google.cat",
    "google.cc": "google.cc",
    "google.cd": "google.cd",
    "google.cf": "google.cf",
    "google.cg": "google.cg",
    "google.ch": "google.ch",
    "google.ci": "google.ci",
    "google.cl": "google.cl",
    "google.cm": "google.cm",
    "google.cn": "google.cn",
    "google.co.ao": "google.co.ao",
    "google.co.bw": "google.co.bw",
    "google.co.ck": "google.co.ck",
    "google.co.cr": "google.co.cr",
    "google.co.id": "google.co.id",
    "google.co.il": "google.co.il",
    "google.co.in": "google.co.in",
    "google.co.jp": "google.co.jp",
    "google.co.ke": "google.co.ke",
    "google.co.kr": "google.co.kr",
    "google.co.ls": "google.co.ls",
    "google.co.ma": "google.co.ma",
    "google.co.mz": "google.co.mz",
    "google.co.nz": "google.co.nz",
    "google.co.th": "google.co.th",
    "google.co.tz": "google.co.tz",
    "google.co.ug": "google.co.ug",
    "google.co.uk": "google.co.uk",
    "google.co.uz": "google.co.uz",
    "google.co.ve": "google.co.ve",
    "google.co.vi": "google.co.vi",
    "google.co.za": "google.co.za",
    "google.co.zm": "google.co.zm",
    "google.co.zw": "google.co.zw",
    "google.com": "google.com",
    "google.cv": "google.cv",
    "google.cz": "google.cz",
    "google.de": "google.de",
    "google.dj": "google.dj",
    "google.dk": "google.dk",
    "google.dm": "google.dm",
    "google.dz": "google.dz",
    "google.ee": "google.ee",
    "google.es": "google.es",
    "google.fi": "google.fi",
    "google.fm": "google.fm",
    "google.fr": "google.fr",
    "google.ga": "google.ga",
    "google.gd": "google.gd",
    "google.ge": "google.ge",
    "google.gf": "google.gf",
    "google.gg": "google.gg",
    "google.gl": "google.gl",
    "google.gm": "google.gm",
    "google.gp": "google.gp",
    "google.gr": "google.gr",
    "google.gy": "google.gy",
    "google.hn": "google.hn",
    "google.hr": "google.hr",
    "google.ht": "google.ht",
    "google.hu": "google.hu",
    "google.ie": "google.ie",
    "google.im": "google.im",
    "google.io": "google.io",
    "google.iq": "google.iq",
    "google.is": "google.is",
    "google.it": "google.it",
    "google.it.ao": "google.it.ao",
    "google.je": "google.je",
    "google.jo": "google.jo",
    "google.kg": "google.kg",
    "google.ki": "google.ki",
    "google.kz": "google.kz",
    "google.la": "google.la",
    "google.li": "google.li",
    "google.lk": "google.lk",
    "google.lt": "google.lt",
    "google.lu": "google.lu",
    "google.lv": "google.lv",
    "google.md": "google.md",
    "google.me": "google.me",
    "google.mg": "google.mg",
    "google.mk": "google.mk",
    "google.ml": "google.ml",
    "google.mn": "google.mn",
    "google.ms": "google.ms",
    "google.mu": "google.mu",
    "google.mv": "google.mv",
    "google.mw": "google.mw",
    "google.ne": "google.ne",
    "google.nl": "google.nl",
    "google.no": "google.no",
    "google.nr": "google.nr",
    "google.nu": "google.nu",
    "google.pl": "google.pl",
    "google.pn": "google.pn",
    "google.ps": "google.ps",
    "google.pt": "google.pt",
    "google.ro": "google.ro",
    "google.rs": "google.rs",
    "google.ru": "google.ru",
    "google.rw": "google.rw",
    "google.sc": "google.sc",
    "google.se": "google.se",
    "google.sh": "google.sh",
    "google.si": "google.si",
    "google.sk": "google.sk",
    "google.sm": "google.sm",
    "google.sn": "google.sn",
    "google.so": "google.so",
    "google.st": "google.st",
    "google.td": "google.td",
    "google.tg": "google.tg",
    "google.tk": "google.tk",
    "google.tl": "google.tl",
    "google.tm": "google.tm",
    "google.tn": "google.tn",
    "google.to": "google.to",
    "google.tt": "google.tt",
    "google.us": "google.us",
    "google.vg": "google.vg",
    "google.vu": "google.vu",
    "google.ws": "google.ws",
    "webcache.googleusercontent.com": "webcache.googleusercontent.com"
  },
  "HotBot": "hotbot.com",
  "info.com": "info.com",
  "InfoSpace": "infospace.com",
  "iseek": "iseek.com",
  "iZito": "izito.com",
  "Kvasir": "kvasir.no",
  "Lycos": "lycos.com",
  "OneSearch": "onesearch.com",
  "MyAllSearch": "myallsearch.com",
  "TDS": "portal.tds.net",
  "Rambler": "rambler.ru",
  "search.com": "search.com",
  "EarthLink": "search.earthlink.net",
  "Frontier Search": "search.frontier.com",
  "Juno": "junosearch.net",
  "mail.com": "search.mail.com",
  "Thunderstone": "search.thunderstone.com",
  "ZoneAlarm": "search.zonealarm.com",
  "Searchalot": "searchalot.com",
  "SearchLock": "searchlock.com",
  "Startpage": "startpage.com",
  "startsiden.no": "startsiden.no",
  "WebCrawler": "webcrawler.com",
  "Yandex": {
    "yandex.by": "yandex.by",
    "yandex.com": "yandex.com",
    "yandex.com.tr": "yandex.com.tr",
    "yandex.kz": "yandex.kz",
    "yandex.ru": "yandex.ru",
    "yandex.ua": "yandex.ua"
  },
  "Yahoo": {
    "yahoo.co.jp": "yahoo.co.jp",
    "yahoo.com": "yahoo.com"
  },
  "Kinetic": "windstream.net",
  "Wow": "wow.com",
  "ZapMeta": "zapmeta.com"
};
const oses = {
  "Android": "Android",
  "Linux": {
    "Ubuntu": "ubuntu",
    "Debian": "debian",
    "Fedora": "Fedora",
    "Linux": "linux"
  },
  "BSD": {
    "FreeBSD": "FreeBSD",
    "OpenBSD": "OpenBSD",
    "NetBSD": "NetBSD",
    "DragonFly BSD": "DragonFly",
    "Darwin": "darwin",
    "PlayStation OS": "PlayStation",
    "BSD": "BSD"
  },
  "iOS": {
    "iPadOS": "iPad",
    "iOS": [ "iPhone", "like Mac OS X" ]
  },
  "macOS": [ "Macintosh", "Mac OS X" ],
  "Xbox": "Xbox",
  "Windows": {
    "Windows Mobile": [ "Windows Mobile", "WindowsMobile", "Windows CE" ],
    "Windows Phone": [ "Windows Phone", "WPDesktop" ],
    "Windows": [ "Windows", "win32", "win16", "Win95" ]
  },
  "BlackBerry": [ "blackberry", "BB10;" ],
  "Chrome OS": "CrOS",
  "Nintendo": {
    "Nintendo Switch": "Nintendo Switch",
    "Nintendo Wii U": "Nintendo WiiU",
    "Nintendo Wii": "Nintendo Wii",
    "Nintendo DSi": "Nintendo DSi",
    "Nintendo 3DS": "Nintendo 3DS"
  },
  "OS/2": "OS/2"
};
const browsers = {
  "Edge": {
    "Edge Legacy": "Edge/",
    "Edge": "Edg/",
    "Edge Mobile": [ "EdgA/", "EdgiOS" ]
  },
  "Internet Explorer": [ "msie", "Trident/" ],
  "Yandex Browser": "YaBrowser/",
  "Konqueror": "konqueror/",
  "Lynx": "Lynx/",
  "Epiphany": "Epiphany/",
  "Vivaldi": "Vivaldi/",
  "K-Ninja": "K-Ninja/",
  "Opera": {
    "Opera": "OPR/",
    "Opera Touch": "OPT/"
  },
  "Firefox": {
   "Firefox": "Firefox/",
   "Firefox iOS": "FxiOS"
  },
  "Chrome": {
    "Chrome": "Chrome/",
    "Chromium": "Chromium/"
  },
  "Safari": {
    "Safari": "Safari/",
    "iOS In-App Browser": [ "iPhone", "iPad" ]
  }
}
const renderingEngines = {
  "Goanna": "Goanna/",
  "Gecko": "Gecko/",
  "Blink": "Chrome/",
  "WebKit": "AppleWebKit/",
  "Presto": "Presto/",
  "Trident": [ "Trident/", "MSIE 6.0" ],
  "EdgeHTML": "Edge/",
  "KHTML": "KHTML/"
};

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
  return userAgent.includesAny(botPatterns);
}


/**
 * Infers the acquisition channel from a URL.
 * @param {string} url - Referrer URL.
 * @returns {string} One of the following:
 *  - direct   User typed in the address manually, or the browser did not include a referrer.
 *  - social   User comes from a social media website.
 *  - organic  User comes from a search engine.
 *  - other    User comes from another website.
 */
function inferReferralChannel(url) {
  if (url === "") return "direct";
  if (categoryMatch(url, socialNetworks)) return "social";
  if (categoryMatch(url, searchEngines)) return "organic";
  Logs.log("heuristics", `Could not infer referral channel from url: “${url}”`);
  return "other";
}


/**
 * Infers the OS name from a user-agent string.
 * @param {string} userAgent - A user-agent string.
 * @returns {string} The proper name of the OS. An empty string if the OS could not be determined.
 */
function inferOS(userAgent) {
  const match = categoryMatch(userAgent, oses);
  if (match === undefined) {
    Logs.log("heuristics", `Could not infer OS from user-agent: “${userAgent}”`);
  }
  return match;
}

/**
 * Infers the browser name from a user-agent string.
 * @param {string} userAgent - A user-agent string.
 * @returns {string} The proper name of the browser. An empty string if the browser could not be determined.
 */
function inferBrowser(userAgent) {
  const match = categoryMatch(userAgent, browsers);
  if (match === undefined) {
    Logs.log("heuristics", `Could not infer browser from user-agent: “${userAgent}”`);
  }
  return match;
}


/**
 * Infers rendering engine name from a user-agent string.
 * @param {string} userAgent - A user-agent string.
 * @returns {string} The proper name of the rendering engine. An empty string if the engine could not be determined.
 */
function inferRenderingEngine(userAgent) {
  const match = categoryMatch(userAgent, renderingEngines);
  if (match === undefined) {
    Logs.log("heuristics", `Could not infer rendering engine from user-agent: “${userAgent}”`);
  }
  return match;
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


/**
 * Simplifies referrer URLs.
 * @param {string} rawURL
 * @returns {string} The URL without trailing slash.
 */
function normalizeOriginURL(rawURL) {
  const url = rawURL.replace(/\/$/, "");
  const socialNetworkMatch = categoryMatch(url, socialNetworks);
  if (socialNetworkMatch) return socialNetworkMatch;
  const searchEngineMatch = categoryMatch(url, searchEngines);
  if (searchEngineMatch) return searchEngineMatch;
  return { val: url };
}


module.exports = {
  inferLocation,
  inferIfBot,
  inferReferralChannel,
  inferOS,
  inferBrowser,
  inferRenderingEngine,
  inferScreenBreakpoint,
  inferBilingualismClass,
  inferIfTouchScreen,
  normalizeOriginURL
};
