const fs = require("fs").promises;

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

		// Complete the beacon data.
		const post = body.split("\t");

		if (post[0] !== "1" || post.length !== 10) {
			// Received beacon is invalid.
			return;
		}

		post[10] = encodeURI(Date.now());
		post[11] = encodeURI(req.headers["user-agent"]);
		// Since the Node server is behind an Apache proxy, this holds
		// the client’s IP address.
		post[12] = encodeURI(req.headers["x-forwarded-for"]);


		// Write the beacon data to file.
		const date = new Date;
		const currentYear = date.getFullYear();
		const currentMonth = (date.getMonth() + 1).toString().padStart(2, "0");
		const viewsFile = currentYear + "-" + currentMonth + ".tsv";

		fs.mkdir("./data/views", { recursive: true }).then(() => {
			fs.appendFile("./data/views/" + viewsFile, post.join("\t") + "\n")
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
