const http = require("http");
require("./misc.js");

const config = require("../config.js").analytics;

const ipGeoCountryCache = {};
const ipGeoCityCache = {};
const ipGeoCacheTTL = 3600000*24*7; // 7 days.
const ipGeoAddress = "http://ipinfo.io/";
const ipGeoCountryParameters = "/country?token=" + config.ipGeoToken;
const ipGeoCityParameters = "/city?token=" + config.ipGeoToken;

const botPatterns = [ "bot", "Bot", "spider", "BingPreview", "Slurp", "facebookexternalhit", "ia_archiver", "Dataprovider.com" ];
const socialNetworkDomains = [
	"12seconds.tv", "t.163.com", "4travel.jp", "advogato.org", "ameba.jp", "anobii.com", "asmallworld.net", "avforums.com", "backtype.com", "badoo.com", "bebo.com", "bigadda.com", "bigtent.com", "biip.no", "blackplanet.com", "blogspot.com", "blogster.com", "blomotion.jp", "bolt.com", "brightkite.com", "buzznet.com", "cafemom.com", "care2.com", "classmates.com", "cloob.com", "collegeblender.com", "cyworld.co.kr", "cyworld.com.cn", "dailymotion.com", "yozm.daum.net", "delicious.com", "deviantart.com", "digg.com", "diigo.com", "disqus.com", "draugiem.lv", "facebook.com", "faceparty.com", "fc2.com", "flickr.com", "flixster.com", "fotolog.com", "foursquare.com", "friendfeed.com", "friendsreunited.com", "friendsreunited.co.uk", "friendster.com", "fubar.com", "gaiaonline.com", "geni.com", "goodreads.com", "plus.google.com", "plus.url.google.com", "grono.net", "habbo.com", "hatena.ne.jp", "t.hexun.com", "hi5.com", "hyves.nl", "ibibo.com", "identi.ca", "t.ifeng.com", "imeem.com", "hotnews.infoseek.co.jp", "instagram.com", "intensedebate.com", "irc-galleria.net", "iwiw.hu", "jaiku.com", "kaixin001.com", "kaixin002.com", "kakaku.com", "kanshin.com", "kozocom.com", "last.fm", "linkedin.com", "livejournal.com", "lnkd.in", "me2day.net", "meetup.com", "mister-wong.com", "mixi.jp", "mixx.com", "mouthshut.com", "multiply.com", "mumsnet.com", "myheritage.com", "mylife.com", "myspace.com", "myyearbook.com", "nasza-klasa.pl", "matome.naver.jp", "netlog.com", "nettby.no", "netvibes.com", "nextdoor.com", "nicovideo.jp", "ning.com", "odnoklassniki.ru", "ok.ru", "orkut.com", "pakila.jp", "t.people.com.cn", "photobucket.com", "pinterest.com", "pinterest.de", "pinterest.ca", "pinterest.co.uk", "pinterest.pt", "pinterest.jp", "pinterest.co.kr", "pinterest.se", "pinterest.fr", "pinterest.au", "pinterest.ch", "pinterest.be", "pinterest.it", "pinterest.nz", "pinterest.ru", "pinterest.es", "plaxo.com", "plurk.com", "po.st", "t.qq.com", "mp.weixin.qq.com", "boards.qwant.com", "reddit.com", "renren.com", "blog.seesaa.jp", "t.sina.com.cn", "skyrock.com", "slideshare.net", "smcb.jp", "smugmug.com", "t.sohu.com", "sonico.com", "studivz.net", "stumbleupon.com", "t.co", "tabelog.com", "tagged.com", "taringa.net", "thefancy.com", "toutiao.com", "tripit.com", "trombi.com", "trytrend.jp", "tuenti.com", "tumblr.com", "twine.com", "twitter.com", "uhuru.jp", "viadeo.com", "vimeo.com", "vk.com", "wayn.com", "weibo.com", "weourfamily.com", "wer-kennt-wen.de", "wordpress.com", "xanga.com", "xing.com", "answers.yahoo.com", "yammer.com", "yaplog.jp", "yelp.com", "yelp.co.uk", "youku.com", "youtube.com", "yuku.com", "zooomr.com", "zhihu.com"
];
const searchEnginesDomains = [
	"searchengines.com", "4loot.com", "alhea.com", "alot.com", "aol.com", "aolsearch.com", "ask.com", "avg.com", "b1.org", "babylon.com", "baidu.cn", "baidu.co.th", "baidu.com", "bing.com", "blackle.com", "blekko.com", "blindsearch.fejus.com", "bt.com", "centurylink.net", "charter.net", "clearch.org", "cnn.com", "daum.net", "devilfinder.com", "dmoz.org", "dogpile.com", "duckduckgo.com", "ekolay.net", "entireweb.com", "excite.com", "fast.ng", "findgala.com", "findsmarter.com", "findsmarter.ru", "g.cn", "genieo.com", "go.speedbit.com", "goofram.com", "google.ac", "google.ad", "google.ae", "google.al", "google.am", "google.as", "google.at", "google.az", "google.ba", "google.be", "google.bf", "google.bg", "google.bi", "google.bj", "google.bs", "google.bt", "google.by", "google.ca", "google.cat", "google.cc", "google.cd", "google.cf", "google.cg", "google.ch", "google.ci", "google.cl", "google.cm", "google.cn", "google.co.ao", "google.co.bw", "google.co.ck", "google.co.cr", "google.co.id", "google.co.il", "google.co.in", "google.co.jp", "google.co.ke", "google.co.kr", "google.co.ls", "google.co.ma", "google.co.mz", "google.co.nz", "google.co.th", "google.co.tz", "google.co.ug", "google.co.uk", "google.co.uz", "google.co.ve", "google.co.vi", "google.co.za", "google.co.zm", "google.co.zw", "google.com", "google.cv", "google.cz", "google.de", "google.dj", "google.dk", "google.dm", "google.dz", "google.ee", "google.es", "google.fi", "google.fm", "google.fr", "google.ga", "google.gd", "google.ge", "google.gf", "google.gg", "google.gl", "google.gm", "google.gp", "google.gr", "google.gy", "google.hn", "google.hr", "google.ht", "google.hu", "google.ie", "google.im", "google.io", "google.iq", "google.is", "google.it", "google.it.ao", "google.je", "google.jo", "google.kg", "google.ki", "google.kz", "google.la", "google.li", "google.lk", "google.lt", "google.lu", "google.lv", "google.md", "google.me", "google.mg", "google.mk", "google.ml", "google.mn", "google.ms", "google.mu", "google.mv", "google.mw", "google.ne", "google.nl", "google.no", "google.nr", "google.nu", "google.pl", "google.pn", "google.ps", "google.pt", "google.ro", "google.rs", "google.ru", "google.rw", "google.sc", "google.se", "google.sh", "google.si", "google.sk", "google.sm", "google.sn", "google.so", "google.st", "google.td", "google.tg", "google.tk", "google.tl", "google.tm", "google.tn", "google.to", "google.tt", "google.us", "google.vg", "google.vu", "google.ws", "heapr.com", "hotbot.com", "iboogie.com", "inbox.com", "incredibar.com", "info.com", "infospace.com", "isearch-123.com", "iseek.com", "izito.com", "k9safesearch.com", "kidrex.org", "kvasir.no", "lycos.com", "mamma.com", "monstercrawler.com", "myallsearch.com", "mynet.com", "mysearchresults.com", "myway.com", "mywebsearch.com", "naver.com", "out1000.com", "pageset.com", "portal.tds.net", "qone8.com", "qrobe.it", "rambler.ru", "redz.com", "safehomepage.com", "safesearch.net", "search-results.com", "search.centurylink.com", "search.com", "search.comcast.net", "search.earthlink.net", "search.frontier.com", "search.iminent.com", "search.incredimail.com", "search.juno.com", "search.mail.com", "search.orange.co.uk", "search.pch.com", "search.peoplepc.com", "search.quebles.com", "search.snap.do", "search.snapdo.com", "search.sweetim.com", "search.thunderstone.com", "search.toolbars.alexa.com", "search.twcc.com", "search.walla.co.il", "search.zonealarm.com", "searchalot.com", "searchassist.verizon.com", "searchfunmoods.com", "searchlock.com", "searchresults.verizon.com", "searchtool.com", "seznam.cz", "similarsitesearch.com", "so.com", "sogou.com", "spacetime3d.com", "spezify.com", "start.funmoods.com", "start.iminent.com", "start.toshiba.com", "startgoogle.startpagina.nl", "startpage.com", "startsiden.no", "surfcanyon.com", "swagbucks.com", "terra.com", "thenet1.com", "torcho.com", "tuvaro.com", "ustart.org", "virgilio.it", "voila.fr", "web.canoe.ca", "webcache.googleusercontent.com", "webcrawler.com", "webhelper.centurylink.com", "webssearches.com", "windstream.net", "wolframalpha.com", "wow.com", "wowway.net", "wp.pl", "www1.dlinksearch.com", "yabigo.com", "yahoo.co.jp", "yahoo.com", "yaimo.com", "yam.com", "yandex.by", "yandex.com", "yandex.com.tr", "yandex.kz", "yandex.ru", "yandex.ua", "yippy.com", "zapmeta.com", "ecosia.org"
];
const oses = {
	"Android": [ "Android" ],
	"Linux": [ "linux", "Linux" ],
	"iOS": [ "like Mac OS X" ],
	"macOS": [ "Macintosh", "Mac OS X" ],
	"Windows": [ "Windows NT", "win32" ],
	"Windows Phone": [ "Windows Phone" ],
	"Chrome OS": [ "CrOS" ]
};
const renderingEngines = {
	"Goanna": [ "Goanna/" ],
	"Gecko": [ "Gecko/" ],
	"Blink": [ "Chrome/" ],
	"WebKit": [ "AppleWebKit/" ],
	"Presto": [ "Opera/" ],
	"Trident": [ "Trident/" ],
	"EdgeHTML": [ "Edge/" ]
};


/**
 * Query ipinfo.io for the country of the given IP address. Caches the result.
 * WARNING: Very slow.
 */
async function inferCountry(ipAddress) {
	return new Promise(function(resolve, reject) {

		// Use the cached result if it is fresh.
		if (ipGeoCountryCache[ipAddress]?.time + ipGeoCacheTTL > Date.now()) {
			return resolve(ipGeoCountryCache[ipAddress].countryCode);
		}

		http.get(ipGeoAddress + ipAddress + ipGeoCountryParameters, res => {
			let rawData = "";

			res.on("data", chunk => {
				rawData += chunk;
			});

			res.on("end", () => {
				ipGeoCountryCache[ipAddress] = {
					countryCode: rawData.trim(),
					time: Date.now()
				}
				resolve(rawData.trim());
			});
		});
	});
}


/**
 * Query ipinfo.io for the city of the given IP address. Caches the result.
 * WARNING: Very slow.
 */
async function inferCity(ipAddress) {
	return new Promise(function(resolve, reject) {

		// Use the cached result if it is fresh.
		if (ipGeoCityCache[ipAddress]?.time + ipGeoCacheTTL > Date.now()) {
			return resolve(ipGeoCityCache[ipAddress].countryCode);
		}

		http.get(ipGeoAddress + ipAddress + ipGeoCityParameters, res => {
			let rawData = "";

			res.on("data", chunk => {
				rawData += chunk;
			});

			res.on("end", () => {
				ipGeoCityCache[ipAddress] = {
					countryCode: rawData.trim(),
					time: Date.now()
				}
				resolve(rawData.trim());
			});
		});
	});
}


/**
 * Return if user agent contains a known bot-identifying string.
 */
function inferIfBot(userAgent) {
	return userAgent.includesAny(botPatterns);
}


/**
 * Given the referrer URL, return the acquisition channel.
 *
 * direct	The user typed in the address manually, or the browser did not include a referrer.
 * social	The user comes from a social media website.
 * organic	The user comes from a search engine.
 * other	The user comes from another website.
 */
function inferAcquisitionChannel(referrerURL) {

	if (referrerURL === "") {
		return "direct";
	} else if (referrerURL.includesAny(socialNetworkDomains)) {
		return "social";
	} else if (referrerURL.includesAny(searchEnginesDomains)) {
		return "organic";
	} else {
		// console.log(referrerURL);
		return "other";
	}
}


/**
 * Returns the OS name, given a user-agent string.
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
 * Returns the rendering engine name, given a user-agent string.
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
 * Returns the *screen size class*, given a WxH pixel size.
 * This is a 1:1 correspondance to the CSS breakpoints in the main stylesheet,
 * and is not meant to be a good approximation of the actual form factor.
 *
 * xsmall		The smallest mobile phones, like the original iPhone SE.
 * mobile		Less than 801 pixels wide.
 * tablet		Less than 1081 pixels wide.
 * desktop		Wider than 1081 pixels.
 *
 * Note that the "laptop" breakpoint is treated as part of "desktop" since
 * the styles are almost the same.
 */
function inferScreenBreakpoint(size) {
	const width = parseInt(size.split("x")[0]);

	if (width <= 360) {
		return "xsmall";
	} else if (width <= 800) {
		return "mobile";
	} else if (width <= 1080) {
		return "tablet";
	}

	return "desktop";
}


/**
 * Returns the *bilingualism class*, given an array of language codes.
 *
 * fr+	Bilingual, French before English.
 * en+	Bilingual, English before French.
 * fr	French, no English.
 * en	English, no French.
 * al	Other languages only.
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

	let isBilingual = hasFR && hasEN;

	if (isBilingual) {
		if (preferred == "fr") {
			return "fr+";
		} else if (preferred == "en") {
			return "en+";
		}
	} else if (hasFR) {
		return "fr";
	} else if (hasEN) {
		return "en";
	} else {
		// console.log(languages);
		return "al";
	}
}


/**
 * Simplifies referrer URLs.
 */
function normalizeOriginURL(rawURL) {
	return rawURL.replace(/\/$/, "");
}


module.exports = { inferCountry, inferCity, inferIfBot, inferAcquisitionChannel,
				   inferOS, inferRenderingEngine, inferScreenBreakpoint,
				   inferBilingualismClass, normalizeOriginURL };
