const http = require("http");
const fs = require("fs").promises;
const uri = require("./utilities/uri.js");

const beacon = require("./back/beacon.js");
const api = require("./back/api.js");
const staticFile = require("./staticFile.js");
const account = require("./account.js");

const host = "localhost";
const port = 8000;

const requestListener = function(req, res) {
	const pathname = new uri.URIPath(req.url).pathname;

	switch (req.method) {
		case "GET":
			if (pathname === "/") {
				if (account.sessionIsValid(req, res)) {
					staticFile.serveStaticFile(req, res, "/interface.html");
				}

			} else if (req.url.startsWith("/resources/")) {
				staticFile.serveStaticFile(req, res);

			} else if (req.url.startsWith("/api/")) {
				if (account.sessionIsValid(req, res)) {
					api.processRequest(req, res);
				}
			} else {
				res.writeHead(404);
				res.end("404");
			}

			break;

		case "POST":
			if (req.url === "/") {
				beacon.receiveBeacon(req, res);

			} else if (req.url === "/login") {
				account.login(req, res);

			} else {
				res.writeHead(404);
				res.end();
			}
			break;

		default:
			res.writeHead(405);
			res.end();
	}
};

const server = http.createServer(requestListener);

server.listen(port, host, () => {
	console.log(`Server is running on http://${host}:${port}`);
});
