const fs = require("fs").promises;
const zlib = require("zlib");
const uri = require("./utilities/uri.js");

const mimeTypes = {
	html: "text/html",
	css: "text/css",
	js: "application/javascript",
	svg: "image/svg+xml",
	woff2: "font/woff2"
}

const fileCache = {};
const fileCacheModTime = {};

//
// TODO:
// 1. Check that file exists and that the MIME type can be served.
// 2. Verify the real file for modification time and refresh the cache if necessary.
// 3. Determine the best Content-Encoding for the response and refresh the cache if necessary.
// 4. Return the responde in the determined, refreshed format.
//
// Proposed structure for fileCache:
// {
// 	fileName: {
// 		uncompressed: {
// 			content: "",
// 			modTime: ""
// 		},
// 		gzip: {
// 			content: "",
// 			modTime: ""
// 		},
// 		deflate: {
// 			content: "",
// 			modTime: ""
// 		}
// 	}
// }
//
function serveStaticFile(req, res, urlOverride = undefined) {
	const path = new uri.URIPath(urlOverride ?? req.url);

	if (mimeTypes[path.extension] !== undefined) {

		res.setHeader('Vary', 'Accept-Encoding');
		const acceptEncoding = req.headers['accept-encoding'] ?? "";

		fs.stat("./front" + path.pathname)
			.then(stats => {

				if (fileCache[path.pathname] == undefined || stats.mtimeMs > fileCacheModTime[path.pathname]) {
					fs.readFile("./front" + path.pathname)
						.then(contents => {
							fileCache[path.pathname] = contents;

							res.setHeader("Content-Type", mimeTypes[path.extension]);
							res.writeHead(200);
							res.end(fileCache[path.pathname]);

							fs.stat("./front" + path.pathname)
								.then(stats => {
									fileCacheModTime[path.pathname] = stats.mtimeMs;
								});
						})
						.catch(err => {
							console.error("Could not read file: " + err);
							res.writeHead(404);
							res.end("404");
						});
				} else {
					res.setHeader("Content-Type", mimeTypes[path.extension]);
					res.writeHead(200);
					res.end(fileCache[path.pathname]);
				}
			})
			.catch(err => {
				console.error("Could not read file: " + err);
				res.writeHead(404);
				res.end("404");
			});
	} else {
		res.setHeader("Content-Type", mimeTypes["html"]);
		res.writeHead(404);
		res.end("404");
	}

}

module.exports = { serveStaticFile };
