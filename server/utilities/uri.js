class URIPath {
	constructor(raw) {
		const matches = raw.match(/^(\/(?:\w*\/?)*?([\w-]+(?:\.(\w+))?)?)(\?.*)?(#.*)?$/) ?? "";

		this.pathname = matches[1]; // Path without the query.
		this.filename = matches[2]; // Filename, including the extension.
		this.extension = matches[3]; // Letters after the final dot.
		this.query = matches[4]; // Complete query, starting with "?".
		this.parameters = {}; // Query parameters as an associative array.
		this.fragment = matches[5];

		if (this.query !== undefined) {
			const rawQuery = this.query.substring(1);
			const rawParams = rawQuery.split("&");

			for (const rawParam of rawParams) {
				const param = rawParam.split("=");
				this.parameters[param[0]] = param[1];
			}
		}
	}
}

module.exports = { URIPath };
