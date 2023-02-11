const fs = require("fs").promises;
const static = require("../web/static.js");
const account = require("../web/account.js");
const uri = require("../util/uri.js");
const config = require("../util/config.js");
require("../util/misc.js");

function processGetRequest(req, res) {
  const path = new uri.URIPath(req.url);
  const user = account.getUser(req);

  if (path.filename === "user") {
    static.serve(req, res, config.users[user], "application/json", "auto",
                 "private", hash(JSON.stringify(config.users[user]) + user));
  }

  if (path.filename === "analytique") {}

  if (path.filename === "accounts") {}

  if (path.filename == "origin") {
    // Check origin existence and permissions.
    const origin = path.parameters?.origin;
    if (origin === undefined || !config.analytique.origins.hasOwnProperty(origin) ||
        !config[origin].allowedUsers.includes(user)) {
      static.serve(req, res, { error: "unknownOrigin" }, "application/json", "auto");
      return;
    }
  }
}

function processPostRequest(req, res) {
  let rawData = "";

  // When receiving data...
  req.on("data", data => {
    rawData += data;

    // Too much POST data
    if (rawData.length > 1e4) {
      console.error("Connection closed. Received too much data.");
      req.connection.destroy();
    }
  });

  req.on("end", () => {
    const newConfig = JSON.parse(rawData);

    const path = new uri.URIPath(req.url);
    const user = account.getUser(req);

    if (user === undefined) return static.serveError(res, "User disconnected. Ignoring config request.", 400);

    if (path.filename === "user") {
      if (validate(newConfig, templates.user)) {
        fs.writeFile(`./config/users/${user}.json`, JSON.stringify(newConfig)).then(() => {
          config.loadConfig(`users/${user}`);
        }).catch(console.error);
        res.writeHead(200);
        res.end();
      } else {
        console.log(newConfig);
        static.serveError(res, "Error with supplied config data.", 400);
      }
    } else {
      static.serveError(res);
    }
  });
}

const templates = {
  user: {
    name: "string",
    defaultView: {
      origin: "string",
      rangeMode: "string"
    },
    _lastView: {
      origin: "string",
      rangeMode: "string"
    }
  }
};

function validate(config, template) {
  for (const key of Object.keys(template)) {
    if (!config.hasOwnProperty(key)) return false;
    switch (typeof template[key]) {
      case "string":
        if (typeof config[key] !== template[key]) return false;
        break;
      case "object":
        if (template[key] instanceof Array) {
          for (let i = 0; i < config[key].length; i++) {
            if (!validate(config[key][i], template[key][0])) return false;
          }
        } else {
          if (!validate(config[key], template[key])) return false;
        }
        break;
      default:
        throw new Error("Malformed config template: " + JSON.stringify(template));
    }
  }
  return true;
}

module.exports = { processGetRequest, processPostRequest };
