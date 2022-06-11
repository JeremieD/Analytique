const http = require("http");
const fs = require("fs").promises;
const uri = require("./server/utilities/uri.js");

const config = require("./server/config.js").server;

const beaconReceiver = require("./server/api/beaconReceiver.js");
const api = require("./server/api/processor.js");
const static = require("./server/static.js");
const account = require("./server/account.js");

const hostname = config.hostname;
const port = config.port;


const requestListener = (req, res) => {
  const pathname = new uri.URIPath(req.url).pathname;

  switch (req.method) {
    case "GET":
      // Request for client interface.
      if (pathname === "/") {
        if (account.sessionIsValid(req, res)) {
          static.serveFile(req, res, "/interface.html");
        }

      // Front-end requests files
      } else if (req.url.startsWith("/resources/") || req.url.startsWith("/common/")) {
        static.serveFile(req, res);

      // An origin is trying to send a beacon
      } else if (pathname === "/collect") {
        res.setHeader("Access-Control-Allow-Origin", "*");
        static.serveFile(req, res, "/beaconSender.js");

     // Request for data
      } else if (req.url.startsWith("/api/")) {
        if (account.sessionIsValid(req, res)) {
          api.processRequest(req, res);
        }

      } else {
        static.serveError(res);
      }

      break;

    case "POST":
      // An origin is presumably sending a beacon.
      if (req.url === "/") {
        beaconReceiver.receive(req, res);

      // Login attempt
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

server.listen(port, hostname, () => {
  console.log(`Server is running on http://${hostname}:${port}`);
});
