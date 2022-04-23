const fs = require("fs").promises;
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

		const login = JSON.parse(rawData);

		// If a matching user/password pair is found...
		if (users[login.u] === login.p) {
			// Get a new session ID and add it to the active sessions list.
			const newID = "_" + Math.random().toString(36).substr(2, 9);

			const newSession = {
				username: login.u,
				expiration: Date.now() + 3600000*24*30
			};

			activeSessions[newID] = newSession;

			res.end(newID);

		} else {
			// Otherwise, return "refused".
			res.end("refused");
		}
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


module.exports = { sessionIsValid, login, getUser };
