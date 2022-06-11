const fs = require("fs").promises;
const static = require("../static.js");

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
      req.connection.destroy();
    }
  });

  // When done receiving data.
  req.on("end", () => {
    const beacon = body.split("\t");

    // Test for beacon version and length.
    if (beacon[0] !== "1" || beacon.length !== 10) {
      // Received beacon is invalid.
      static.serveError(res, `Received an invalid beacon: “${beacon}”`, 400);
      return;
    }

    const origin = new URL(beacon[4]).hostname;
    if (!origins.includes(origin)) {
      // Received beacon is for an unregistered origin.
      static.serveError(res, `A beacon was received from unknown origin “${origin}”`, 400);
      return;
    }

    // Complete the beacon data.
    beacon[10] = encodeURI(req.headers["user-agent"]);
    beacon[11] = encodeURI(req.headers["x-forwarded-for"] ?? req.connection.remoteAddress);

    // Write the beacon data to file.
    const date = new Date();
    const currentYear = date.getFullYear();
    const currentMonth = (date.getMonth() + 1).toString().padStart(2, "0");
    const viewsFile = currentYear + "-" + currentMonth + ".tsv";

    fs.mkdir("./data/" + origin + "/views", { recursive: true }).then(() => {
      fs.appendFile(`./data/${origin}/views/${viewsFile}`, beacon.join("\t") + "\n")
      .then(() => {
        res.writeHead(200);
        res.end();
      }).catch(console.error);
    }).catch(console.error);
  });
}

module.exports = { receive };
