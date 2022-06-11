/*
 * Returns whether *any* of the passed needles is included in a string.
 */
String.prototype.includesAny = function(needles = [""]) {
  for (let needle of needles) {
    if (this.indexOf(needle) !== -1) {
      return true;
    }
  }
  return false;
}


/*
 * Condenses an array so that each element is unique.
 */
Array.prototype.unique = function() {
  return this.filter((element, index) => {
    return this.indexOf(element) === index;
  });
};


/*
 * Transforms an "associative array" into an array of length-2 arrays,
 * each containing a key and value pair.
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
