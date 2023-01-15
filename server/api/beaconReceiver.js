const fs = require("fs").promises;
const static = require("../static.js");
require("./beacon.js");

const origins = Object.keys(require("../config.js").origins);

/**
 * A user-agent is sending a view beacon.
 * The server calls this function with the *req*uest and *res*ponse context.
 * @param req - The request object from the HTTP server.
 * @param res - The response object from the HTTP server.
 */
function receive(req, res) {
  let body = "";

  // When receiving data...
  req.on("data", data => {
    body += data;

    // Too much POST data
    if (body.length > 1e5) {
      console.error("Connection closed. Received too much data.");
      req.connection.destroy();
    }
  });

  // When done receiving data...
  req.on("end", () => {
    // Complete the beacon data.
    body += "\t" + encodeURI(req.headers["user-agent"]);
    body += "\t" + encodeURI(req.headers["x-forwarded-for"] ?? req.connection.remoteAddress);

    let beacon;

    try { // Decode the raw beacon.
      beacon = new Beacon(body);
    } catch (e) {
      // Problem while decoding the beacon.
      static.serveError(res, `Error “${e.message}” with beacon: “${body}”`, 400);
      return;
    }

    const origin = new URL(beacon.pageURL).hostname;
    if (!origins.includes(origin)) {
      // Received beacon is for an unregistered origin.
      static.serveError(res, `A beacon was received from unknown origin “${origin}”`, 400);
      return;
    }

    // Write the beacon data to file.
    // NOTE: It's very important for the system time to be set correctly for the
    // beacon to go in the right file. The rest of Analytique expects all views
    // of a given month to be in that month's file, and we can't trust the time
    // from the beacon for ordering and security reasons.
    const date = new Date();
    const currentYear = date.getUTCFullYear();
    const currentMonth = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const viewsFile = currentYear + "-" + currentMonth + ".tsv";

    fs.mkdir("./data/" + origin + "/views", { recursive: true }).then(() => {
      fs.appendFile(`./data/${origin}/views/${viewsFile}`, body + "\n")
      .then(() => {
        res.writeHead(200);
        res.end();
      }).catch(console.error);
    }).catch(console.error);
  });
}

module.exports = { receive };
