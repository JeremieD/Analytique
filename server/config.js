const fs = require("fs");

const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));

module.exports = config;
