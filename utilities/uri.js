class URIPath {
	constructor(raw) {
		const matches = raw.match(/^(\/(?:\w*\/?)*?([\w-]+(?:\.(\w+))?)?)(\?.*)?$/) ?? "";
		this.pathname = matches[1];
		this.filename = matches[2];
		this.extension = matches[3];
		this.query = matches[4];
		this.parameters = {};

		if (this.query != undefined) {
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
