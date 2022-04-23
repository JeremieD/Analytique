const fs = require("fs").promises;
const uri = require("./utilities/uri.js");
const compress = require("./utilities/compress.js");

const mimeTypes = {
	html: "text/html",
	css: "text/css",
	js: "application/javascript",
	svg: "image/svg+xml",
	woff2: "font/woff2"
}
const cachePolicies = {
	html: "no-cache, private",
	css: "no-cache",
	js: "no-cache",
	svg: "no-cache",
	woff2: "no-cache"
}

/* Structure for fileCache:
 * {
 * 	filePath: {
 *		eTag: "",
 * 		modTime: "",
 *		encodings: {
 *			identity: "",
 * 			gzip: "",
 * 			deflate: "",
 *			br: ""
 *		}
 *	}
 * }
 */
const fileCache = {};


/*
 * Serves the requested file, either from cache or from disk,
 * compressing it if appropriate.
 */
function serveFile(req, res, urlOverride) {
	const path = new uri.URIPath(urlOverride ?? req.url);
	const pathname = path.pathname; // Path without the query.
	const extension = path.extension; // Just the file extension.
	// Determine real path on disk.
	let realPath = "." + pathname;
	if (!pathname.startsWith("/lib/")) {
		realPath = "./client" + pathname;
	}

	// If the file extension is unknown, return 404.
	if (mimeTypes[extension] === undefined) {
		serveError(res, "Can’t serve file of type “" + extension + "”");
		return;
	}

	// Fetch stats for file, checking that it exists.
	fs.stat(realPath).then(stats => {

		// Determine the best compression method.
		const requestedEncodings = req.headers["accept-encoding"];
		const encoding = compress.getBestEncoding(requestedEncodings, stats.size);

		let fileCacheIsStale = false;

		// If cache is fresh...
		if (stats.mtimeMs <= fileCache[pathname]?.modTime) {

			// If requested ETag corresponds to the one in cache, respond 304.
			if (eTagMatches(req, res, fileCache[pathname].eTag)) {
				return;
			}

			// If not, then check file cache for the right encoding.
			if (fileCache[pathname].encodings[encoding]) {
				serve(req, res, fileCache[pathname].encodings[encoding],
					  mimeTypes[extension], encoding,
					  cachePolicies[extension], fileCache[pathname].eTag);
				return;
			}

		} else {
			fileCacheIsStale = true;
		}

		// Ensure safe access.
		if (fileCache[pathname] === undefined) {
			fileCache[pathname] = {};
		}

		// If the cache is stale, reset cache.
		if (fileCacheIsStale) {
			fileCache[pathname].modTime = stats.mtimeMs;
			fileCache[pathname].eTag = getETagFrom(pathname + stats.mtimeMs);
			fileCache[pathname].encodings = {};
		}

		// Finally, encode, return and cache file.
		res.setHeader("ETag", fileCache[pathname].eTag);

		fs.readFile(realPath).then(contents => {
			fileCache[pathname].encodings[encoding] = compress.encode(contents, encoding);

			serve(req, res, fileCache[pathname].encodings[encoding],
				  mimeTypes[extension], encoding,
				  fileCache[pathname].eTag);
			return;

		})
		.catch(e => {
			serveError(res, "Could not read file: " + e);
		});

	})
	.catch(() => {
		serveError(res, "Can’t find file “" + pathname + "”");
	});
}


/*
 * Respond 200 with the given content and headers.
 */
function serve(req, res, content, mimeType, encoding = "identity", cachePolicy, eTag) {
	if (eTagMatches(req, res, eTag)) {
		return;
	}

	if (mimeType === "application/json" && typeof content === "object") {
		content = JSON.stringify(content);
	}

	if (cachePolicy !== undefined) {
		res.setHeader("Cache-Control", cachePolicy);
	}

	res.setHeader("Vary", "Accept-Encoding");
	if (encoding === "auto" && content.length) {
		encoding = compress.getBestEncoding(req.headers["accept-encoding"], content.length * 8);
		content = compress.encode(content, encoding);
	}
	if (encoding !== "identity") {
		res.setHeader("Content-Encoding", encoding);
	}
	res.setHeader("Content-Type", mimeType);

	if (eTag !== undefined) {
		res.setHeader("ETag", eTag);
	}

	res.writeHead(200);
	res.end(content);
}


/*
 * Serves an error with an optional log to the console.
 */
function serveError(res, msg = "", code = 404) {
	if (msg !== "") {
		console.error(msg);
	}
	res.writeHead(code);
	res.end();
}


/*
 * Compares a given ETag with the requested one and short-circuits
 * the request if they match, responding 304.
 */
function eTagMatches(req, res, eTag = "") {
	const requestedETag = req.headers["if-none-match"];

	if (eTag === requestedETag) {
		res.setHeader("ETag", eTag);
		res.writeHead(304);
		res.end();
		return true;

	} else {
		return false;
	}
}


/*
 * Returns the ETag for the given value.
 * This Etag is based on a simple hash of the passed value.
 */
function getETagFrom(value) {
	let hash;

	for (let i = 0; i < value.length; i++) {
		hash = Math.imul(31, hash) + value.charCodeAt(i) | 0;
	}

	return Math.abs(hash).toString(36);
}


module.exports = { serveFile, serve, serveError, getETagFrom };
