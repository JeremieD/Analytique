const fs = require("fs").promises;
const uri = require("../util/uri.js");
const config = require("../util/config.js").server;
const compress = require("./compress.js");
require("../util/misc.js");

const mimeTypes = config.mimeTypes;
const cachePolicies = config.cachePolicies;

/*
 * Structure for fileCache:
 * {
 *   filePath: {
 *     eTag: "",
 *     modTime: "",
 *     encodings: {
 *     identity: "",
 *   gzip: "",
 *     deflate: "",
 *     br: ""
 *   }
 *   }
 * }
 */
const fileCache = {};


/**
 * Serves the requested file, either from cache or from disk,
 * compressing it if appropriate.
 * @param req - The request object from the HTTP server.
 * @param res - The response object from the HTTP server.
 * @param {string} urlOverride - If set, will be used as the file path.
 */
function serveFile(req, res, urlOverride) {
  const path = new uri.URIPath(urlOverride ?? req.url);
  const pathname = path.pathname; // Path without the query.
  const extension = path.extension; // Just the file extension.

  // Determine real path on disk.
  let realPath = "." + pathname;
  if (!pathname.startsWith("/shared/")) {
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
      if (eTagMatches(req, res, fileCache[pathname].eTag)) return;

      // If not, then check file cache for the right encoding.
      if (fileCache[pathname].encodings[encoding]) {
        serve(req, res, fileCache[pathname].encodings[encoding], mimeTypes[extension],
          encoding, cachePolicies[extension], fileCache[pathname].eTag);
        return;
      }

    } else {
      fileCacheIsStale = true;
    }

    // Ensure safe access.
    fileCache[pathname] ??= {};

    // If the cache is stale, reset cache.
    if (fileCacheIsStale) {
      fileCache[pathname].modTime = stats.mtimeMs;
      fileCache[pathname].eTag = hash(pathname + stats.mtimeMs);
      fileCache[pathname].encodings = {};
    }

    // Finally, encode, return and cache file.
    res.setHeader("ETag", fileCache[pathname].eTag);

    fs.readFile(realPath).then(contents => {
      fileCache[pathname].encodings[encoding] = compress.encode(contents, encoding);

      serve(req, res, fileCache[pathname].encodings[encoding],
        mimeTypes[extension], encoding, cachePolicies[extension], fileCache[pathname].eTag);
      return;

    }).catch(e => {
      serveError(res, "Could not read file: " + e);
    });

  }).catch(e => {
    console.log(e);
    serveError(res, "Can’t find file “" + pathname + "”");
  });
}


/**
 * Respond 200 with the given content and headers.
 * @param req - The request object from the HTTP server.
 * @param res - The response object from the HTTP server.
 * @param {string|object} content - The data to serve. If content is an object and mimeType is "application/json", the object will be automatically stringified.
 * @param {string} mimeType - The MIME type of the data.
 * @param {string} [encoding="identity"] - The compression algorithm to use.
 * @param {string} [cachePolicy] - The cache policy to serve the content with.
 * @param {string} [eTag] - The pre-generated ETag of the content.
 */
function serve(req, res, content, mimeType, encoding = "identity", cachePolicy = "no-cache, private", eTag) {
  if (eTagMatches(req, res, eTag)) return;

  if (mimeType === "application/json" && typeof content === "object") {
    content = JSON.stringify(content);
  }

  if (cachePolicy !== "") {
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
  res.setHeader("Content-Type", mimeType + "; charset=utf-8");

  if (eTag !== undefined) {
    res.setHeader("ETag", eTag);
  }

  res.writeHead(200);
  res.end(content);
}


/**
 * Serves an error with an optional log to the console.
 * @param res - The response object from the HTTP server.
 * @param {string} [message=""] - A message to log to the server console.
 * @param {number} [code=404] - The HTTP error code to throw.
 */
function serveError(res, message = "", code = 404) {
  if (message !== "") {
    console.error(message);
  }
  res.writeHead(code);
  res.end();
}


/**
 * Compares a given ETag with the one in the request and short-circuits
 * the request if they match, responding 304.
 * @param req - The request object from the HTTP server.
 * @param res - The response object from the HTTP server.
 * @param {string} eTag - An ETag of some data that is cached on the server, to compare against the request.
 * @returns {boolean} Whether eTag matches the ETag in the If-None-Match HTTP request header.
 */
function eTagMatches(req, res, eTag = "") {
  const requestedETag = req.headers["if-none-match"];

  if (eTag === requestedETag) {
    res.setHeader("ETag", eTag);
    res.writeHead(304);
    res.end();
    return true;
  }

  return false;
}

module.exports = { serveFile, serve, serveError };
