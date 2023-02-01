const http = require("http");
const fs = require("fs").promises;
fs.readFileSync = require("fs").readFileSync;
const uri = require("./server/util/uri.js");
const static = require("./server/web/static.js");
const DJS = require("./server/web/dynamic.js");
const account = require("./server/web/account.js");

const beaconReceiver = require("./server/analytique/beaconReceiver.js");
const api = require("./server/analytique/api.js");
const config = require("./server/util/config.js");

const requestListener = (req, res) => {
  const path = new uri.URIPath(req.url);
  const pathname = path.pathname;
  const parameters = path.parameters;

  switch (req.method) {
    case "GET":
      // Request for client interface.
      if (pathname === "/") {
        if (account.sessionIsValid(req, res)) {
          static.serveFile(req, res, "/interface.html");
        }

      // Front-end requests files
      } else if (req.url.startsWith("/resources/") || req.url.startsWith("/shared/")) {
        static.serveFile(req, res);

      // An origin is trying to send a beacon
      } else if (pathname === "/collect") {
        const originID = path.parameters?.o
        if (config.analytique.origins.hasOwnProperty(originID)) {
          const params = { homebase: config.server.publicHostname, originID: originID };
          const rawDJS = fs.readFileSync("./server/analytique/beaconSender.djs", "utf8");
          const beaconSender = DJS.compile(rawDJS, params);
          res.setHeader("Access-Control-Allow-Origin", originID);
          static.serve(req, res, beaconSender, config.server.mimeTypes["js"],
                       "auto", "no-cache, private");
        } else {
          static.serveError(res, "", 400);
        }

      // Request for data
      } else if (req.url.startsWith("/api/")) {
        if (account.sessionIsValid(req, res)) {
          api.processRequest(req, res);
        }

      // Serve 404 error
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

      // Serve 404 error
      } else {
        static.serveError(res);
      }

      break;

    // Protocol is unsupported
    default:
      static.serveError(res, "", 405);
  }
};

const server = http.createServer(requestListener);

server.listen(config.server.localPort, config.server.localHostname, () => {
  console.log(`Server is running on http://${config.server.localHostname}:${config.server.localPort}`);
});
