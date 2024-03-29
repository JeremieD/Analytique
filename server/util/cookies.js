/**
 * Parses the cookie header and turns it into an object.
 * @param req - The request object from the HTTP server.
 * @returns {object} An object containing the individual cookies.
 */
function parse(req) {
  const cookies = {};
  const rawHeader = req.headers?.cookie;

  if (!rawHeader) return cookies;

  for (const cookie of rawHeader.split(";")) {
    let [name, ...rest] = cookie.split("=");

    name = name?.trim();
    if (!name) continue;

    const value = rest.join("=").trim();
    if (!value) continue;

    cookies[name] = decodeURI(value);
  }

  return cookies;
}

module.exports = { parse };
