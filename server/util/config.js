const fs = require("fs");

const configRoot = "./config";
const config = {};

loadAllConfig();

function loadAllConfig() {
  config.server = JSON.parse(fs.readFileSync(`${configRoot}/server.json`));
  config.accounts = JSON.parse(fs.readFileSync(`${configRoot}/accounts.json`));

  config.analytique = {};
  config.analytique.global = JSON.parse(fs.readFileSync(`${configRoot}/analytique/global.json`));

  config.analytique.origins = {};
  for (originFile of fs.readdirSync(`${configRoot}/analytique/origins/`)) {
    if (originFile.startsWith(".")) continue;
    const originID = originFile.slice(0, -5);
    config.analytique.origins[originID] = JSON.parse(fs.readFileSync(`${configRoot}/analytique/origins/${originFile}`));
  }

  config.users = {};
  for (userFile of fs.readdirSync(`${configRoot}/users/`)) {
    if (userFile.startsWith(".")) continue;
    const userID = userFile.slice(0, -5);
    config.users[userID] = JSON.parse(fs.readFileSync(`${configRoot}/users/${userFile}`));
  }
}

module.exports = config;
