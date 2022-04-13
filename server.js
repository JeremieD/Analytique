const http = require("http");
const fs = require("fs").promises;
const uri = require("./server/utilities/uri.js");

const config = require("./server/config.js").server;

const beaconReceiver = require("./server/api/beaconReceiver.js");
const api = require("./server/api/processor.js");
const static = require("./server/static.js");
const account = require("./server/account.js");


// Configure these depending on way the server is run.
const hostname = config.hostname;
const port = config.port;


const requestListener = function(req, res) {
	const pathname = new uri.URIPath(req.url).pathname;

	switch (req.method) {
		case "GET":
			if (pathname === "/") { // Request for client interface.
				if (account.sessionIsValid(req, res)) {
					static.serveFile(req, res, "/interface.html");
				}

			} else if (req.url.startsWith("/resources/")) { // The front-end requests files
				static.serveFile(req, res);

			} else if (pathname === "/send") { // An origin is trying to send a beacon
				res.setHeader("Access-Control-Allow-Origin", "*");
				static.serveFile(req, res, "/beaconSender.js");

			} else if (req.url.startsWith("/api/")) { // Request for data
				if (account.sessionIsValid(req, res)) {
					api.processRequest(req, res);
				}
			} else {
				static.serveError(res);
			}

			break;

		case "POST":
			if (req.url === "/") { // An origin is presumably sending a beacon.
				beacon.receiveBeacon(req, res);

			} else if (req.url === "/login") { // Login attempt
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

server.listen(port, hostname, () => {
	console.log(`Server is running on http://${hostname}:${port}`);
});
