module.exports = { receiveBeacon };

const fs = require("fs").promises;

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

		if (post[0] != "1" || post.length != 10) {
			return;
		}

		post[10] = encodeURI(Date.now());
		post[11] = encodeURI(req.headers["user-agent"]);
		post[12] = encodeURI(req.headers["x-forwarded-for"]);

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
				.catch(log => { console.error(log); });
		})
		.catch(e => { console.error(e); });

	});
}
