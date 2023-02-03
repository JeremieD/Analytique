const fs = require("fs").promises;

const logsRoot = "./logs/";
fs.mkdir(logsRoot, { recursive: true });

function log(domain, msg) {
  msg = (new Date).toLocaleString("en-CA") + "\t" + msg + "\n";
  fs.appendFile(`${logsRoot}${domain}.log`, msg).catch(console.error);
}

module.exports = { log };
