/**
 * Calls a function once the DOM has loaded.
 * Also calls the function if the DOM has *already* loaded.
 * @param {Function} callback - A function to execute when the DOM has loaded.
 * @param {object} [options={once: true, passive: true}] - Options to pass to addEventListener.
 */
function whenDOMReady(callback, options = { once: true, passive: true }) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, options);
  } else {
    callback();
  }
}


/**
 * Async wrapper for XMLHttpRequest.
 * @param {string} url - The requested URL.
 * @returns {Promise<string>} The promised response body.
 */
async function httpGet(url) {
  return new Promise(function(resolve, reject) {
    const httpRequest = new XMLHttpRequest();

    httpRequest.onreadystatechange = () => {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {

        if (httpRequest.status === 200) {
          try {
            resolve(httpRequest.responseText);
          } catch (e) {
            console.error(e);
            reject(e);
          }

        } else {
          reject(httpRequest.status);
        }
      }
    };

    httpRequest.open("GET", url);
    httpRequest.send();
  });
}


/**
 * Rounds with an arbitrary number of decimal places.
 * If decimalPlaces is not specified, rounds to the closest integer.
 * @param {number} [decimalPlaces=0] - Number of decimal places to round to.
 * @returns {number} The rounded number.
 */
Number.prototype.round = function(decimalPlaces = 0) {
  return Math.round(this * 10 ** decimalPlaces) / 10 ** decimalPlaces;
}
