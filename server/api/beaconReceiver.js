const fs = require("fs").promises;

const origins = Object.keys(require("../config.js").origins);

/**
 * A user-agent is sending a view beacon.
 * The server calls this function with the *req*uest and *res*ponse context.
 */
function receiveBeacon(req, res) {
	let body = "";

	req.on("data", function(data) {
		body += data;

		// Too much POST data
		if (body.length > 1e5) {
			req.connection.destroy();
		}
	});

	req.on("end", function() {
		const beacon = body.split("\t");

		const origin = new URL(beacon[4]).hostname;

		if (!origins.includes(origin)) {
			// Received beacon is for an unregistered origin.
			return;
		}

		if (beacon[0] !== "1" || beacon.length !== 10) {
			// Received beacon is invalid.
			return;
		}

		// Complete the beacon data.
		beacon[10] = encodeURI(Date.now());
		beacon[11] = encodeURI(req.headers["user-agent"]);
		beacon[12] = encodeURI(req.headers["x-forwarded-for"] ?? req.connection.remoteAddress);


		// Write the beacon data to file.
		const date = new Date;
		const currentYear = date.getFullYear();
		const currentMonth = (date.getMonth() + 1).toString().padStart(2, "0");
		const viewsFile = currentYear + "-" + currentMonth + ".tsv";

		fs.mkdir("./data/views", { recursive: true }).then(() => {
			fs.appendFile("./data/views/" + viewsFile, beacon.join("\t") + "\n")
				.then(() => {
					res.writeHead(200);
					res.end();
				})
				.catch(e => { console.error(e); });
		})
		.catch(e => { console.error(e); });

	});
}

module.exports = { receiveBeacon };
