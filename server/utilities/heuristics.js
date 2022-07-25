const http = require("http");
require("./misc.js");

const config = require("../config.js").analytics;

const ipGeoCache = {};
const ipGeoCacheTTL = 3600000*24*7; // 7 days.
const ipGeoAddress = "http://ipinfo.io/";
const ipGeoParameters = "/json?token=" + config.ipGeoToken;

const botPatterns = [ "bot", "Bot", "spider", "BingPreview", "Slurp", "facebookexternalhit", "ia_archiver", "Dataprovider.com" ];
const socialNetworkDomains = [
  "12seconds.tv", "t.163.com", "4travel.jp", "advogato.org", "ameba.jp", "anobii.com", "asmallworld.net", "avforums.com", "backtype.com", "badoo.com", "bebo.com", "bigadda.com", "bigtent.com", "biip.no", "blackplanet.com", "blogspot.com", "blogster.com", "blomotion.jp", "bolt.com", "brightkite.com", "buzznet.com", "cafemom.com", "care2.com", "classmates.com", "cloob.com", "collegeblender.com", "cyworld.co.kr", "cyworld.com.cn", "dailymotion.com", "yozm.daum.net", "delicious.com", "deviantart.com", "digg.com", "diigo.com", "disqus.com", "draugiem.lv", "facebook.com", "faceparty.com", "fc2.com", "flickr.com", "flixster.com", "fotolog.com", "foursquare.com", "friendfeed.com", "friendsreunited.com", "friendsreunited.co.uk", "friendster.com", "fubar.com", "gaiaonline.com", "geni.com", "goodreads.com", "plus.google.com", "plus.url.google.com", "grono.net", "habbo.com", "hatena.ne.jp", "t.hexun.com", "hi5.com", "hyves.nl", "ibibo.com", "identi.ca", "t.ifeng.com", "imeem.com", "hotnews.infoseek.co.jp", "instagram.com", "intensedebate.com", "irc-galleria.net", "iwiw.hu", "jaiku.com", "kaixin001.com", "kaixin002.com", "kakaku.com", "kanshin.com", "kozocom.com", "last.fm", "linkedin.com", "livejournal.com", "lnkd.in", "me2day.net", "meetup.com", "mister-wong.com", "mixi.jp", "mixx.com", "mouthshut.com", "multiply.com", "mumsnet.com", "myheritage.com", "mylife.com", "myspace.com", "myyearbook.com", "nasza-klasa.pl", "matome.naver.jp", "netlog.com", "nettby.no", "netvibes.com", "nextdoor.com", "nicovideo.jp", "ning.com", "odnoklassniki.ru", "ok.ru", "orkut.com", "pakila.jp", "t.people.com.cn", "photobucket.com", "pinterest.com", "pinterest.de", "pinterest.ca", "pinterest.co.uk", "pinterest.pt", "pinterest.jp", "pinterest.co.kr", "pinterest.se", "pinterest.fr", "pinterest.au", "pinterest.ch", "pinterest.be", "pinterest.it", "pinterest.nz", "pinterest.ru", "pinterest.es", "plaxo.com", "plurk.com", "po.st", "t.qq.com", "mp.weixin.qq.com", "boards.qwant.com", "reddit.com", "renren.com", "blog.seesaa.jp", "t.sina.com.cn", "skyrock.com", "slideshare.net", "smcb.jp", "smugmug.com", "t.sohu.com", "sonico.com", "studivz.net", "stumbleupon.com", "t.co", "tabelog.com", "tagged.com", "taringa.net", "thefancy.com", "toutiao.com", "tripit.com", "trombi.com", "trytrend.jp", "tuenti.com", "tumblr.com", "twine.com", "twitter.com", "uhuru.jp", "viadeo.com", "vimeo.com", "vk.com", "wayn.com", "weibo.com", "weourfamily.com", "wer-kennt-wen.de", "wordpress.com", "xanga.com", "xing.com", "answers.yahoo.com", "yammer.com", "yaplog.jp", "yelp.com", "yelp.co.uk", "youku.com", "youtube.com", "yuku.com", "zooomr.com", "zhihu.com"
];
const searchEnginesDomains = [
  "android-app://com.google.android.googlequicksearchbox", "searchengines.com", "4loot.com", "alhea.com", "alot.com", "aol.com", "aolsearch.com", "ask.com", "avg.com", "b1.org", "babylon.com", "baidu.cn", "baidu.co.th", "baidu.com", "bing.com", "blackle.com", "blekko.com", "blindsearch.fejus.com", "bt.com", "centurylink.net", "charter.net", "clearch.org", "cnn.com", "daum.net", "devilfinder.com", "dmoz.org", "dogpile.com", "duckduckgo.com", "ekolay.net", "entireweb.com", "excite.com", "fast.ng", "findgala.com", "findsmarter.com", "findsmarter.ru", "g.cn", "genieo.com", "go.speedbit.com", "goofram.com", "google.ac", "google.ad", "google.ae", "google.al", "google.am", "google.as", "google.at", "google.az", "google.ba", "google.be", "google.bf", "google.bg", "google.bi", "google.bj", "google.bs", "google.bt", "google.by", "google.ca", "google.cat", "google.cc", "google.cd", "google.cf", "google.cg", "google.ch", "google.ci", "google.cl", "google.cm", "google.cn", "google.co.ao", "google.co.bw", "google.co.ck", "google.co.cr", "google.co.id", "google.co.il", "google.co.in", "google.co.jp", "google.co.ke", "google.co.kr", "google.co.ls", "google.co.ma", "google.co.mz", "google.co.nz", "google.co.th", "google.co.tz", "google.co.ug", "google.co.uk", "google.co.uz", "google.co.ve", "google.co.vi", "google.co.za", "google.co.zm", "google.co.zw", "google.com", "google.cv", "google.cz", "google.de", "google.dj", "google.dk", "google.dm", "google.dz", "google.ee", "google.es", "google.fi", "google.fm", "google.fr", "google.ga", "google.gd", "google.ge", "google.gf", "google.gg", "google.gl", "google.gm", "google.gp", "google.gr", "google.gy", "google.hn", "google.hr", "google.ht", "google.hu", "google.ie", "google.im", "google.io", "google.iq", "google.is", "google.it", "google.it.ao", "google.je", "google.jo", "google.kg", "google.ki", "google.kz", "google.la", "google.li", "google.lk", "google.lt", "google.lu", "google.lv", "google.md", "google.me", "google.mg", "google.mk", "google.ml", "google.mn", "google.ms", "google.mu", "google.mv", "google.mw", "google.ne", "google.nl", "google.no", "google.nr", "google.nu", "google.pl", "google.pn", "google.ps", "google.pt", "google.ro", "google.rs", "google.ru", "google.rw", "google.sc", "google.se", "google.sh", "google.si", "google.sk", "google.sm", "google.sn", "google.so", "google.st", "google.td", "google.tg", "google.tk", "google.tl", "google.tm", "google.tn", "google.to", "google.tt", "google.us", "google.vg", "google.vu", "google.ws", "heapr.com", "hotbot.com", "iboogie.com", "inbox.com", "incredibar.com", "info.com", "infospace.com", "isearch-123.com", "iseek.com", "izito.com", "k9safesearch.com", "kidrex.org", "kvasir.no", "lycos.com", "mamma.com", "monstercrawler.com", "myallsearch.com", "mynet.com", "mysearchresults.com", "myway.com", "mywebsearch.com", "naver.com", "out1000.com", "pageset.com", "portal.tds.net", "qone8.com", "qrobe.it", "rambler.ru", "redz.com", "safehomepage.com", "safesearch.net", "search-results.com", "search.centurylink.com", "search.com", "search.comcast.net", "search.earthlink.net", "search.frontier.com", "search.iminent.com", "search.incredimail.com", "search.juno.com", "search.mail.com", "search.orange.co.uk", "search.pch.com", "search.peoplepc.com", "search.quebles.com", "search.snap.do", "search.snapdo.com", "search.sweetim.com", "search.thunderstone.com", "search.toolbars.alexa.com", "search.twcc.com", "search.walla.co.il", "search.zonealarm.com", "searchalot.com", "searchassist.verizon.com", "searchfunmoods.com", "searchlock.com", "searchresults.verizon.com", "searchtool.com", "seznam.cz", "similarsitesearch.com", "so.com", "sogou.com", "spacetime3d.com", "spezify.com", "start.funmoods.com", "start.iminent.com", "start.toshiba.com", "startgoogle.startpagina.nl", "startpage.com", "startsiden.no", "surfcanyon.com", "swagbucks.com", "terra.com", "thenet1.com", "torcho.com", "tuvaro.com", "ustart.org", "virgilio.it", "voila.fr", "web.canoe.ca", "webcache.googleusercontent.com", "webcrawler.com", "webhelper.centurylink.com", "webssearches.com", "windstream.net", "wolframalpha.com", "wow.com", "wowway.net", "wp.pl", "www1.dlinksearch.com", "yabigo.com", "yahoo.co.jp", "yahoo.com", "yaimo.com", "yam.com", "yandex.by", "yandex.com", "yandex.com.tr", "yandex.kz", "yandex.ru", "yandex.ua", "yippy.com", "zapmeta.com", "ecosia.org"
];
const oses = {
  "Android": [ "Android" ],
  "Linux": [ "linux", "Linux" ],
  "iOS": [ "like Mac OS X" ],
  "macOS": [ "Macintosh", "Mac OS X" ],
  "Windows": [ "Windows NT", "win32" ],
  "Windows Phone": [ "Windows Phone" ],
  "Chrome OS": [ "CrOS"]
};
const renderingEngines = {
  "Goanna": [ "Goanna/" ],
  "Gecko": [ "Gecko/" ],
  "Blink": [ "Chrome/" ],
  "WebKit": [ "AppleWebKit/" ],
  "Presto": [ "Opera/" ],
  "Trident": [ "Trident/" ],
  "EdgeHTML": [ "Edge/ "]
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
 * @param {string} referrerURL
 * @returns {string} One of the following:
 *  - direct   User typed in the address manually, or the browser did not include a referrer.
 *  - social   User comes from a social media website.
 *  - organic  User comes from a search engine.
 *  - other    User comes from another website.
 */
function inferAcquisitionChannel(referrerURL) {
  if (referrerURL === "") return "direct";
  if (referrerURL.includesAny(socialNetworkDomains)) return "social";
  if (referrerURL.includesAny(searchEnginesDomains)) return "organic";

  // console.log(referrerURL);
  return "other";
}


/**
 * Infers the OS name from a user-agent string.
 * @param {string} userAgent - A user-agent string.
 * @returns {string} The proper name of the OS. An empty string if the OS could not be determined.
 */
function inferOS(userAgent) {
  for (const os of Object.keys(oses)) {
    if (userAgent.includesAny(oses[os])) {
      return os;
    }
  }

  // console.log(userAgent);
  return "";
}


/**
 * Infers rendering engine name from a user-agent string.
 * @param {string} userAgent - A user-agent string.
 * @returns {string} The proper name of the rendering engine. An empty string if the engine could not be determined.
 */
function inferRenderingEngine(userAgent) {
  for (const renderingEngine of Object.keys(renderingEngines)) {
    if (userAgent.includesAny(renderingEngines[renderingEngine])) {
      return renderingEngine;
    }
  }

  // console.log(userAgent);
  return "";
}


/**
 * Infers the screen size class, given a WxH pixel size.
 *
 * These correspond to the CSS breakpoints in the main stylesheet,
 * and are not meant to be a good approximation of the physical form factor.
 * Note that the "laptop" breakpoint is treated as part of "desktop" since
 * the styles are almost the same.
 *
 * @param {string} screenSize - A screen size in the format "WxH".
 * @returns {string} One of the following:
 *  - xsmall   Less than or equal to 360 pixels wide.
 *  - mobile   Less than or equal to 800 pixels wide.
 *  - tablet   Less than or equal to 1080 pixels wide.
 *  - desktop  Wider than 1080 pixels wide.
 */
function inferScreenBreakpoint(screenSize) {
  const width = parseInt(screenSize.split("x")[0]);

  if (width <= 360) return "xsmall";
  if (width <= 800) return "mobile";
  if (width <= 1080) return "tablet";

  return "desktop";
}


/**
 * Infers the bilingualism class from an array of language codes.
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

  // console.log(languages);
  return "al";
}


/**
 * Simplifies referrer URLs.
 * @param {string} rawURL
 * @returns {string} The URL without trailing slash.
 */
function normalizeOriginURL(rawURL) {
  return rawURL.replace(/\/$/, "");
}


module.exports = {
  inferLocation,
  inferIfBot,
  inferAcquisitionChannel,
  inferOS,
  inferRenderingEngine,
  inferScreenBreakpoint,
  inferBilingualismClass,
  normalizeOriginURL
};
