const http = require("http");
const fs = require("fs").promises;

const beacon = require("./back/beacon.js");
const api = require("./back/api.js");
const staticFile = require("./staticFile.js");

const host = "localhost";
const port = 8000;

const requestListener = function(req, res) {
	switch (req.method) {
		case "GET":
			if (req.url == "/") {
				staticFile.serveStaticFile(req, res, "/interface.html");

			} else if (req.url.startsWith("/resources/")) {
				staticFile.serveStaticFile(req, res);

			} else if (req.url.startsWith("/api/")) {
				api.processRequest(req, res);

			} else {
				res.writeHead(404);
				res.end("404");
			}
			break;

		case "POST":
			if (req.url == "/") {
				beacon.receiveBeacon(req, res);

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
