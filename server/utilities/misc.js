/**
 * Checks if any of the needles are in this string.
 * @param {string[]} needles - Array of strings to look for.
 * @returns {boolean} Whether *any* of the needles is included in this string.
 */
String.prototype.includesAny = function(needles = [""]) {
  for (const needle of needles) {
    if (this.indexOf(needle) !== -1) {
      return true;
    }
  }
  return false;
}


/**
 * Removes duplicate elements from an array.
 * @returns {array} A new array with duplicate elements removed.
 */
Array.prototype.unique = function() {
  return this.filter((element, index) => {
    return this.indexOf(element) === index;
  });
};


/**
 * Flattens an "associative array" (object) into an array of objects,
 * each containing a key and value pair, with the goal of having
 * an object with fixed-order elements.
 * This is sort of like Map, but allows a more natural access syntax.
 * @param {string} [keyLabel="key"] - Label to use for keys.
 * @param {string} [valueLabel="value"] - Label to use for values.
 * @returns {object[]} An array of length-2 objects, sorted by value.
 */
Object.prototype.sortedAssociativeArray = function(keyLabel = "key", valueLabel = "value") {
  let array = [];

  const keys = Object.keys(this);
  const values = Object.values(this);

  for (let i = 0; i < keys.length; i++) {
    const newElement = {};
    newElement[keyLabel] = keys[i];
    newElement[valueLabel] = values[i];
    array.push(newElement);
  }

  const sortedArray = array.sort((a, b) => {
    return b[valueLabel] - a[valueLabel];
  });

  return sortedArray;
};
