const zlib = require("zlib");

const compressionEnabled = require("../util/config.js").server.compressionEnabled;


/**
 * Compresses the passed data according to the given algorithm.
 * @param {string} data - The data to compress.
 * @param {string} [encoding="identity"] - The compression algorithm to use. Supported values are "gzip", "deflate", and "br".
 * @returns {string} The compressed data. If the encoding parameter is omitted, the data is returned untouched.
 */
function encode(data, encoding = "identity") {
  if (!compressionEnabled) return data;

  switch (encoding) {
    case "gzip":
      return zlib.gzipSync(data);
    case "deflate":
      return zlib.deflateSync(data);
    case "br":
      return zlib.brotliCompressSync(data);
    case "identity":
      return data;
  }
}


/**
 * Determines the best compression method.
 * @param {string[]} acceptedEncodings - List of encodings to choose from.
 * @param {number} contentLength - The length of the content that would be compressed.
 * @returns {string} Supported values are "gzip", "deflate", and "br".
 */
function getBestEncoding(acceptedEncodings, contentLength) {
  let encoding = "identity";

  if (compressionEnabled && contentLength > 512) {
    if (acceptedEncodings.includes("br")) {
      encoding = "br";
    } else if (acceptedEncodings.includes("deflate")) {
      encoding = "deflate";
    } else if (acceptedEncodings.includes("gzip")) {
      encoding = "gzip";
    }
  }

  return encoding;
}


module.exports = { encode, getBestEncoding };
