/**
 * Utility class that allows easy access to parts of a URI.
 * @property {string} pathname - Path without the query.
 * @property {string} filename - Filename, including the extension.
 * @property {string} extension - Letters after the final dot.
 * @property {string} query - Complete query, starting with "?".
 * @property {object} parameters - Query parameters as an object.
 * @property {string} fragment - Hash, anchor or fragment, starting with "#";
 */
class URIPath {
  /**
   * @param {string} uri - The URI to decompose.
   */
  constructor(uri) {
    const matches = uri.match(/^(\/(?:\w*\/?)*?([\w-]+(?:\.(\w+))?)?)(\?.*)?(#.*)?$/) ?? "";

    this.pathname = matches[1];
    this.filename = matches[2];
    this.extension = matches[3];
    this.query = matches[4];
    this.parameters = {};
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
