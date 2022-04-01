const fs = require("fs").promises;
const crypto = require("crypto").webcrypto;
const staticFile = require("./staticFile.js");
const cookies = require("./utilities/cookies.js");

const activeSessions = {};

function sessionIsValid(req, res) {
	const sessionID = cookies.parse(req)?.session;

	if (activeSessions[sessionID]
		&& activeSessions[sessionID] > Date.now()) {
		return true;

	} else {
		if (activeSessions[sessionID]) {
			delete activeSessions[sessionID];
		}
		staticFile.serveStaticFile(req, res, "/login.html");
	}
}

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
		res.writeHead(200);

		const login = JSON.parse(rawData);

		fs.readFile("./data/users.json").then(rawUsers => {
			const users = JSON.parse(rawUsers);

			hash(login.p).then(hash => {
				// console.log(hash);
				if (users[login.u] === hash) {
					const newSession = "_" + Math.random().toString(36).substr(2, 9);
					activeSessions[newSession] = Date.now() + 3600000*24*30;
					res.end(newSession);
				}
			});
		});

	});
}

async function hash(message) {
	const encoder = new TextEncoder();
	const data = encoder.encode(message);
	return crypto.subtle.digest("SHA-512", data).then(value => {
		const hashArray = Array.from(new Uint8Array(value));
		return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
	});
}

module.exports = { sessionIsValid, login };
