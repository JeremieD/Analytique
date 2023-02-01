const fs = require("fs");

const configRoot = "./config";
const config = {};

loadAllConfig();

function loadAllConfig() {
  config.server = JSON.parse(fs.readFileSync(`${configRoot}/server.json`, "utf8"));
  config.accounts = JSON.parse(fs.readFileSync(`${configRoot}/accounts.json`, "utf8"));

  config.analytique = {};
  config.analytique.global = JSON.parse(fs.readFileSync(`${configRoot}/analytique/global.json`, "utf8"));

  config.analytique.origins = {};
  for (originFile of fs.readdirSync(`${configRoot}/analytique/origins/`)) {
    if (originFile.startsWith(".")) continue;
    const originID = originFile.slice(0, -5);
    config.analytique.origins[originID] = JSON.parse(fs.readFileSync(`${configRoot}/analytique/origins/${originFile}`, "utf8"));
  }

  config.users = {};
  for (userFile of fs.readdirSync(`${configRoot}/users/`)) {
    if (userFile.startsWith(".")) continue;
    const userID = userFile.slice(0, -5);
    config.users[userID] = JSON.parse(fs.readFileSync(`${configRoot}/users/${userFile}`, "utf8"));
  }
}

module.exports = config;
