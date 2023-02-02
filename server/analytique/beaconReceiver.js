const fs = require("fs").promises;
fs.existsSync = require("fs").existsSync;
fs.readFileSync = require("fs").readFileSync;
fs.mkdirSync = require("fs").mkdirSync;
const static = require("../web/static.js");
const config = require("../util/config.js").analytique;
require("../util/misc.js");
require("../../shared/time.js");

// Stores [dir], [path] and latest [t]ime) to open sessions per origin.
// Access using openSessions[originID][userHash].
const openSessions = {};
const lastCleanup = {};

function receive(req, res) {
  let rawBeacon = "";

  // When receiving data...
  req.on("data", data => {
    rawBeacon += data;

    // Too much POST data
    if (rawBeacon.length > 1e4) {
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

    // Beacon seems OK. Close connection.
    res.writeHead(200);
    res.end();

    const originConfig = config.origins[originID];
    const sessionsRoot = `./data/${originID}/sessions/`;

    const ipAddress = req.headers["x-forwarded-for"] ?? req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const userHash = hash(ipAddress + userAgent);

    let sessionObj = {
      ip: ipAddress,
      ua: userAgent,
      e: []
    };

    let sessionDir, sessionFile;

    // Check open session index for file path.
    openSessions[originID] ??= {};
    if (openSessions[originID].hasOwnProperty(userHash)) {
      const session = openSessions[originID][userHash];
      if (session.t + time(originConfig.sessionMaxAge) > Date.now()) {
        // Found open session
        sessionDir = session.dir;
        sessionFile = session.file;
        sessionObj = JSON.parse(fs.readFileSync(sessionDir + sessionFile, "utf8"));
      } else {
        delete openSessions[originID][userHash];
      }
    }

    if (sessionFile === undefined) {
      // No open session: determine the file path.
      const now = new Date(beacon.e[0].t);
      const year = now.getUTCFullYear();
      const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
      const date = now.getUTCDate().toString().padStart(2, "0");

      sessionDir = `${sessionsRoot}${year}/${month}/${date}/`;
      sessionFile = `${userHash}.json`;
      let i = 0;
      while (fs.existsSync(sessionDir + sessionFile)) {
        sessionFile = `${userHash}-${i++}.json`;
      }
    }

    // Process beacon into session object.
    const sessionFields = [ "tz", "l", "inS", "outS", "theme", "contrast", "motion", "ptrHovr", "ptrPrec" ];
    for (const event of beacon.e) {
      const sessionPopulated = sessionObj.hasOwnProperty("startT");
      if (event.e === "pageView") {
        for (field of sessionFields) {
          if (!sessionPopulated) sessionObj[field] = event[field];
          delete event[field];
        }
      }
      sessionObj.e.push(event);
      if (!sessionPopulated) sessionObj.startT = event.t;
      sessionObj.endT = event.t;
    }
    sessionObj.l = sessionObj.l.unique();

    // Write to file.
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFile(sessionDir + sessionFile, JSON.stringify(sessionObj)).then(() => {
      // Store pointer to file.
      openSessions[originID][userHash] = {
        dir: sessionDir,
        file: sessionFile,
        t: Date.now()
      };
    }).catch(console.error);

    // Clean up open sessions if not done recently.
    if ((lastCleanup[originID] ?? 0) + time(originConfig.sessionMaxAge) < Date.now()) {
      for (hash of Object.keys(openSessions[originID])) {
        const session = openSessions[originID][hash];
        if (session.t + time(originConfig.sessionMaxAge) < Date.now()) {
          delete openSessions[originID][hash];
        }
      }
      lastCleanup[originID] = Date.now();
    }

    return;
  });
}

module.exports = { receive };
