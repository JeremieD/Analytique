/**
 * Returns if *any* of the passed needles is included in a string.
 */
String.prototype.includesAny = function(needles = [""]) {
	for (let needle of needles) {
		if (this.indexOf(needle) !== -1) {
			return true;
		}
	}

	return false;
}


/**
 * Condenses an array so that each element is unique.
 */
Array.prototype.unique = function() {
	return this.filter((element, index) => {
		return this.indexOf(element) === index;
	});
};
