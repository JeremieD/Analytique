const fs = require("fs").promises;
fs.existsSync = require("fs").existsSync;
fs.readFileSync = require("fs").readFileSync;
fs.mkdirSync = require("fs").mkdirSync;
const static = require("../web/static.js");
const config = require("../util/config.js").analytique;
require("../../shared/time.js");

function receive(req, res) {
  let rawBeacon = "";

  // When receiving data...
  req.on("data", data => {
    rawBeacon += data;

    // Too much POST data
    if (rawBeacon.length > 1e5) {
      console.error("Connection closed. Received too much data.");
      req.connection.destroy();
    }
  });

  // When done receiving data...
  req.on("end", () => {
    let beacon;
    try {
      beacon = JSON.parse(rawBeacon);
    } catch (e) {
      static.serveError(res, `Error “${e.message}” with beacon: “${rawBeacon}”`, 400);
      return;
    }

    const originID = beacon.o;
    if (!config.origins.hasOwnProperty(originID)) {
      static.serveError(res, `A beacon was received from unknown origin “${originID}”`, 400);
      return;
    }
    const originConfig = config.origins[originID];
    const sessionsRoot = `./data/${originID}/sessions`;

    const ipAddress = req.headers["x-forwarded-for"] ?? req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const sessionHash = hash(ipAddress + userAgent);

    let sessionObj = {
      ip: ipAddress,
      ua: userAgent,
      e: []
    };

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
    const date = now.getUTCDate().toString().padStart(2, "0");

    const sessionDir = `${sessionsRoot}/${year}/${month}/${date}`;
    let sessionFile = `${sessionDir}/${sessionHash}.json`;
    let i = 0;
    while (fs.existsSync(sessionFile)) {
      const candidate = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
      if (candidate.endT + time(originConfig.sessionMaxAge) > Date.now()) {
        // Found matching session.
        sessionObj = candidate;
        break;
      }
      sessionFile = `${sessionDir}/${sessionHash}-${i++}.json`;
    }

    // Here, sessionFile should be the target file and sessionObj should either
    // contain the session data or the empty template for a new session.

    const sessionFields = [ "tz", "l", "inS", "outS", "theme", "contrast", "motion", "ptrHovr", "ptrPrec" ];
    for (const event of beacon.e) {
      const sessionPopulated = sessionObj.hasOwnProperty("startT");
      if (event.e === "pageView") {
        for (field of sessionFields) {
          if (!sessionPopulated) sessionObj[field] = event[field];
          delete event[field];
        }
      }
      sessionObj.events.push(event);
      if (!sessionPopulated) sessionObj.startT = event.t;
      sessionObj.endT = event.t;
    }
    sessionObj.l = sessionObj.l.unique();

    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFile(sessionFile, JSON.stringify(sessionObj)).then(() => {
      res.writeHead(200);
      res.end();
    }).catch(console.error);
    return;
  });
}

module.exports = { receive };
