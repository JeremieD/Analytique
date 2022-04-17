function whenDOMReady(callback, options = { once: true, passive: true }) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", callback, options);

	} else {
		callback();
	}
}


/*
 * Async wrapper for XMLHttpRequest.
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


/*
 * Simple rounding function with arbitrary number decimal places.
 */
Number.prototype.round = function(decimalPlaces = 0) {
	return Math.round(this * 10 ** decimalPlaces) / 10 ** decimalPlaces;
}
