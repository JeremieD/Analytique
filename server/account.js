const fs = require("fs").promises;
const static = require("./static.js");
const cookies = require("./utilities/cookies.js");

const users = require("./config.js").users;

// Holds the active sessions IDs and their expiration time
// in milliseconds since 1 January 1970 UTC.
const activeSessions = {};


/*
 * Returns true if the request has a valid session ID.
 * If the session is refused, the login page is served.
 */
function sessionIsValid(req, res) {
	const id = cookies.parse(req)?.session;

	if (activeSessions[id] && activeSessions[id] > Date.now()) {
		return true;

	} else {
		if (activeSessions[id]) {
			delete activeSessions[id];
		}
		static.serveFile(req, res, "/login.html");
	}
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
			// Return a new session ID and add it to the active sessions list.
			const newSession = "_" + Math.random().toString(36).substr(2, 9);
			activeSessions[newSession] = Date.now() + 3600000*24*30;
			res.end(newSession);

		} else {
			// Otherwise, return "refused".
			res.end("refused");
		}
	});
}


module.exports = { sessionIsValid, login };
