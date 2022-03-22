function whenDOMReady(callback, options = { once: true, passive: true }) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", callback, options);

	} else {
		callback();
	}
}

Number.prototype.round = function(decimalPlace) {
	return Math.round(this * 10 ** decimalPlace) / 10 ** decimalPlace;
}
