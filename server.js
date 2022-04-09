const http = require("http");
const fs = require("fs").promises;
const uri = require("./utilities/uri.js");

const beacon = require("./back/beacon.js");
const api = require("./back/api.js");
const static = require("./static.js");
const account = require("./account.js");

const host = "localhost";
const port = 8000;

const requestListener = function(req, res) {
	const pathname = new uri.URIPath(req.url).pathname;

	switch (req.method) {
		case "GET":
			if (pathname === "/") {
				if (account.sessionIsValid(req, res)) {
					static.serveFile(req, res, "/interface.html");
				}

			} else if (req.url.startsWith("/resources/")) {
				static.serveFile(req, res);

			} else if (req.url.startsWith("/api/")) {
				if (account.sessionIsValid(req, res)) {
					api.processRequest(req, res);
				}
			} else {
				static.serveError(res);
			}

			break;

		case "POST":
			if (req.url === "/") {
				beacon.receiveBeacon(req, res);

			} else if (req.url === "/login") {
				account.login(req, res);

			} else {
				static.serveError(res);
			}
			break;

		default:
			static.serveError(res, "", 405);
	}
};

const server = http.createServer(requestListener);

server.listen(port, host, () => {
	console.log(`Server is running on http://${host}:${port}`);
});
