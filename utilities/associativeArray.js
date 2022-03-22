function toSortedAssociativeArray(object, keyLabel = "key", valueLabel = "value") {
	let array = [];

	const keys = Object.keys(object);
	const values = Object.values(object);

	for (let i = 0; i < keys.length; i++) {
		const newElement = {};
		newElement[keyLabel] = keys[i];
		newElement[valueLabel] = values[i];
		array.push(newElement);
	}

	const sortedArray = array.sort((a, b) => {
		a = a[valueLabel];
		b = b[valueLabel];
		return b - a;
	});

	return sortedArray;
}

module.exports = { toSortedAssociativeArray };
