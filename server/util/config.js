const fs = require("fs");

const configRoot = "./config";
const config = { loadConfig };

loadAllConfig();

function loadConfig(address) {
  address = address.split("/");

  switch (address[0]) {
    case "server":
      config.server = JSON.parse(fs.readFileSync(`${configRoot}/server.json`, "utf8"));
      break;
    case "accounts":
      config.accounts = JSON.parse(fs.readFileSync(`${configRoot}/accounts.json`, "utf8"));
      break;
    case "analytique":
      if (address.length === 1) {
        config.analytique.global = JSON.parse(fs.readFileSync(`${configRoot}/analytique/global.json`, "utf8"));
      } else if (address[1] === "origins") {
        try {
          config.analytique.origins[address[2]] = JSON.parse(fs.readFileSync(`${configRoot}/analytique/origins/${address[2]}.json`, "utf8"));
        } catch (e) {}
      }
      break;
    case "users":
      try {
        config.users[address[1]] = JSON.parse(fs.readFileSync(`${configRoot}/users/${address[1]}.json`, "utf8"));
      } catch (e) {}
      break;
  }
}

function loadAllConfig() {
  loadConfig("server");
  loadConfig("accounts");

  config.analytique = { global: {}, origins: {} };
  loadConfig("analytique");
  for (const originFile of fs.readdirSync(`${configRoot}/analytique/origins/`)) {
    if (originFile.startsWith(".")) continue;
    const originID = originFile.slice(0, -5);
    loadConfig(`analytique/origins/${originID}`);
  }

  config.users = {};
  for (const userFile of fs.readdirSync(`${configRoot}/users/`)) {
    if (userFile.startsWith(".")) continue;
    const userID = userFile.slice(0, -5);
    loadConfig(`users/${userID}`);
  }
}

module.exports = config;
