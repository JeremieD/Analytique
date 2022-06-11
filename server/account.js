const fs = require("fs").promises;
const subtle = require('crypto').webcrypto.subtle;
const static = require("./static.js");
const cookies = require("./utilities/cookies.js");

const users = require("./config.js").users;

// Holds the active sessions IDs and their expiration time
// in milliseconds since 1 January 1970 UTC.
const activeSessions = {};


/*
 * Returns whether the request has a valid session ID.
 * If the session is refused, the login page is served.
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


/*
 * Answers a POST request for login.
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

    let login;
    if (req.headers["content-type"] === "application/json") {
      login = JSON.parse(rawData);

    } else {
      res.end("unsupportedContentType");
      return;
    }

    // If a matching user/password pair is found...
    hash(login.p).then(hashedP => {
      if (users[login.u] === hashedP) {
        // Get a new session ID and add it to the active sessions list.
        const newID = "_" + Math.random().toString(36).substr(2, 9);

        const newSession = {
          username: login.u,
          expiration: Date.now() + 3600000*24*30
        };

        activeSessions[newID] = newSession;

        res.end(newID);

      } else {
        // Otherwise, return "authenticationFailed".
        res.end("authenticationFailed");
      }
    });
  });
}


/*
 * Returns the session ID of the current request.
 */
function getSessionID(req) {
  return cookies.parse(req)?.session;
}


/*
 * Returns the user of the current request.
 */
function getUser(req) {
  return activeSessions[getSessionID(req)]?.username;
}


/*
 * Hashes a message using SHA-512. Encodes as a string of hex digits.
 */
async function hash(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  return subtle.digest("SHA-512", data).then(value => {
    const hashArray = Array.from(new Uint8Array(value));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  });
}


module.exports = { sessionIsValid, login, getUser };
