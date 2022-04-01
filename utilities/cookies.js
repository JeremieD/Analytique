function parse(req) {
	const cookies = {};
	const rawHeader = req.headers?.cookie;
	if (!rawHeader) return cookies;

	for (const cookie of rawHeader.split(";")) {
		let [name, ...rest] = cookie.split("=");

		name = name?.trim();
		if (!name) { continue; }

		const value = rest.join("=").trim();
		if (!value) { continue; }

		cookies[name] = decodeURI(value);
	}

	return cookies;
}

module.exports = { parse };
