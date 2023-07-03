const fs = require("fs").promises;
const subtle = require('crypto').webcrypto.subtle;
const static = require("./static.js");
const cookies = require("../util/cookies.js");
require("../../shared/time.js");
const Logs = require("../util/log.js");

const accounts = require("../util/config.js").accounts;

// Holds the active sessions IDs and their expiration time
// in milliseconds since 1 January 1970 UTC.
const activeSessions = {};


/**
 * Checks whether the request has a valid session ID.
 * If the session is refused, the login page is served.
 * @param req - The request object from the HTTP server.
 * @param res - The response object from the HTTP server.
 * @returns {boolean} Whether the request has a valid session ID.
 */
function sessionIsValid(req, res) {
  const id = getSessionID(req);

  if (activeSessions[id]) {
    if (activeSessions[id].expiration > Date.now()) {
      return true;
    }
    delete activeSessions[id];
  }

  static.serveFile(req, res, "/login.html");
  return false;
}


/**
 * Answers a POST request for login.
 * @param req - The request object from the HTTP server.
 * @param res - The response object from the HTTP server.
 */
function login(req, res) {
  let rawData = "";

  req.on("data", data => {
    rawData += data;
    // Too much POST data
    if (rawData.length > 1e5) {
      req.connection.destroy();
    }
  });

  req.on("end", () => {
    res.setHeader("Content-Type", "text/plain");
    res.writeHead(200);
    const ip = req.headers["x-forwarded-for"] ?? req.connection.remoteAddress;

    let login;
    if (req.headers["content-type"] === "application/json") {
      login = JSON.parse(rawData);

    } else {
      res.end("unsupportedContentType");
      return;
    }

    // If a matching user/password pair is found...
    sha512(login.p).then(hashedP => {
      if (accounts[login.u] === hashedP) {
        // Get a new session ID and add it to the active sessions list.
        const newID = "_" + Math.random().toString(36).substr(2, 9);

        const newSession = {
          username: login.u,
          expiration: Date.now() + time("30d")
        };

        activeSessions[newID] = newSession;

        Logs.log("accounts", `User ${login.u} logged in successfully from ${ip}.`);
        res.end(newID);

      } else {
        // Otherwise, return "authenticationFailed".
        Logs.log("accounts", `User ${login.u} failed to login from ${ip}.`);
        res.end("authenticationFailed");
      }
    });
  });
}


/**
 * Extracts the session ID from the request.
 * @param req - The request object from the HTTP server.
 * @returns {string} The session ID of the current request.
 */
function getSessionID(req) {
  return cookies.parse(req)?.session;
}


/**
 * Looks up the username associated with the current session.
 * @param req - The request object from the HTTP server.
 * @returns {string} The user of the current request.
 */
function getUser(req) {
  return activeSessions[getSessionID(req)]?.username;
}


/**
 * Hashes a message using SHA-512.
 * @param {string} message - The message to hash.
 * @returns {Promise<string>} A promise that represents a string of hex digits.
 */
async function sha512(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  return subtle.digest("SHA-512", data).then(value => {
    const hashArray = Array.from(new Uint8Array(value));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  });
}


module.exports = { sessionIsValid, login, getUser };
