function hash(value) {
  let hash;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(31, hash) + value.charCodeAt(i) | 0;
  }
  return Math.abs(hash).toString(36);
}
global.hash = hash;

/**
 * Checks if any of the needles are in this string.
 * @param {string[]} needles - Array of strings to look for.
 * @returns {boolean} Whether *any* of the needles is included in this string.
 */
String.prototype.includesAny = function(needles = [""], caseSensitive = false) {
  if (typeof needles === "string") needles = [ needles ];
  const haystack = caseSensitive ? this : this.toLowerCase();
  for (let needle of needles) {
    if (!caseSensitive) needle = needle.toLowerCase();
    if (haystack.indexOf(needle) !== -1) return true;
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
Object.prototype.sortedAssociativeArray = function(keyLabel = "key", valueLabel = "val", subGroupLabel = "sub") {
  let array = [];

  const keys = Object.keys(this);
  const values = Object.values(this);

  for (let i = 0; i < keys.length; i++) {
    const newElement = {};
    newElement[keyLabel] = keys[i];
    if (typeof values[i] === "object" && values[i].hasOwnProperty("val")) {
      newElement[valueLabel] = values[i].val;
      delete values[i].val;
      newElement[subGroupLabel] = values[i].sortedAssociativeArray();
    } else {
      newElement[valueLabel] = values[i];
    }
    array.push(newElement);
  }

  const sortedArray = array.sort((a, b) => {
    return b[valueLabel] - a[valueLabel];
  });

  return sortedArray;
};
