// Query the available origins.
const availableOrigins = httpGet("/api/origins").then(JSON.parse);

// Holds the current origin.
let origin;

// Query the earliest available month with data.
let earliestRange;

// Holds stats data for current and anterior ranges.
let model = {};
let secondaryModel = {};

// Current filter value and selected data point.
let filter = "";
let selectedListElement;

// Holds cached stats data.
let modelCache = {};
let modelCacheModTime = {};
const cacheTTL = 300000; // 5min to live.

// Holds references to the DOM objects that display the data.
const view = {};

// Holds the view-model’s current range.
let range = new DateRange();

// Reference to the queued loading animation.
let loadingAnimation;


whenDOMReady(() => {
	// Build the view object.
	view.originSelector = document.getElementById("origin-selector");
	view.rangeDisplay = document.getElementById("range-display");
	view.sessionTotal = document.getElementById("session-total");
	view.sessionTotalGraph = document.getElementById("session-total-graph");
	view.avgSessionLength = document.getElementById("avg-session-length");
	view.avgSessionLengthGraph = document.getElementById("avg-session-length-graph");
	view.pageViews = document.getElementById("page-views");
	view.acquisitionChannels = document.getElementById("acquisition-channels");
	view.referrerOrigins = document.getElementById("referrer-origins");
	view.landings = document.getElementById("landings");
	view.bilingualismClasses = document.getElementById("bilingualism-classes");
	view.countries = document.getElementById("countries");
	view.cities = document.getElementById("cities");
	view.oses = document.getElementById("oses");
	view.browsers = document.getElementById("browsers");
	view.screenBreakpoints = document.getElementById("screen-breakpoints");
	view.errorPages = document.getElementById("error-pages");
	view.excludedTraffic = document.getElementById("excluded-traffic");
	view.previousRangeButton = document.getElementById("previous-range")
	view.nextRangeButton = document.getElementById("next-range")

	// Triggers for range buttons.
	view.previousRangeButton.addEventListener("click", previousRange);
	view.nextRangeButton.addEventListener("click", nextRange);
	window.addEventListener("keydown", e => {
		if (e.key === "ArrowLeft" && !view.previousRangeButton.disabled) {
			previousRange();

		} else if (e.key === "ArrowRight" && !view.nextRangeButton.disabled) {
			nextRange();
		}
	});

	// Trigger for origin switcher.
	view.originSelector.addEventListener("change", () => {
		switchToOrigin(view.originSelector.value);
	});

	// Load the first available origin whenever possible.
	availableOrigins.then(origins => {
		for (let origin of origins) {
			const option = document.createElement("option");
			option.value = origin;
			option.innerText = origin;
			view.originSelector.append(option);
		}
		switchToOrigin(origins[0]);
	});
});


/*
 * Switch view-model to the given origin.
 */
function switchToOrigin(newOrigin) {
	origin = newOrigin;
	filter = "";

	// Sets the origin switcher display value.
	view.originSelector.value = origin;

	// Wait for earliestRange before updating the view.
	earliestRange = httpGet("/api/earliest?origin=" + origin).then(value => {
		// If range is unavailable in the new origin, select the earliest range.
		const newEarliestRange = new DateRange(value);
		if (newEarliestRange.laterThan(range)) {
			range = newEarliestRange;
		}

		update();
		return newEarliestRange;
	});
}


/*
 * Selects the previous range and refresh.
 */
function previousRange() {
	range.previous();
	update();
}


/*
 * Selects the next range and refresh.
 */
function nextRange() {
	range.next();
	update();
}


/*
 * Checks data availability, then updates the view.
 */
function update() {
	// Check that range is in bound.
	const isLastRange = range.laterThan((new DateRange()).minus(1));
	view.nextRangeButton.disabled = isLastRange;
	if (view.nextRangeButton.disabled) {
		view.nextRangeButton.blur();
	}
	earliestRange.then(value => {
		const isFirstRange = range.earlierThan(value.plus(1));
		view.previousRangeButton.disabled = isFirstRange;
		if (view.previousRangeButton.disabled) {
			view.previousRangeButton.blur();
		}
	});

	// Update models then update the views.
	const main = refreshMainModel().then(() => {
		// As soon as the main model is ready, draw the main view.
		drawMainView();
	});

	const secondary = refreshSecondaryModel();

	// Wait for both the main and secondary models before drawing secondary view.
	Promise.all([main, secondary]).then(() => {
		drawSecondaryView();
	})
	.catch(e => console.error)
	.finally(() => {
		// De-queues the loading animation.
		clearTimeout(loadingAnimation);

		// Sets all view objects to their loaded state.
		for (let viewComponent of Object.keys(view)) {
			view[viewComponent].classList.remove("loading");
		}
	});

	// Sets all view objects to their loading state. (with a delay)
	// Doing this after requesting view-model updates avoids race conditions
	// that can lead to an infinite loading animation.
	loadingAnimation = setTimeout(() => {
		for (let viewComponent of Object.keys(view)) {
			view[viewComponent].classList.add("loading");
		}
	}, 100);
}


/*
 * Load the model from cache or fetch from server.
 */
function refreshMainModel() {
	return new Promise(function(resolve, reject) {
		const shortRange = range.shortForm;

		// Ensure safe access to cache fields.
		if (!modelCache.hasOwnProperty(origin)) {
			modelCache[origin] = {};
			modelCacheModTime[origin] = {};
		}
		if (!modelCache[origin].hasOwnProperty(shortRange)) {
			modelCache[origin][shortRange] = {};
			modelCacheModTime[origin][shortRange] = {};
		}

		// If cache is fresh, serve from cache, otherwise, fetch from server.
		if (Date.now() - modelCacheModTime[origin][shortRange][filter] < cacheTTL) {
			model = modelCache[origin][shortRange][filter];
			resolve();

		} else {
			fetchStats(shortRange, filter).then(data => {
				model = data;
				modelCache[origin][shortRange][filter] = data;
				modelCacheModTime[origin][shortRange][filter] = Date.now();
				resolve();
			});
		}
	});
}

/*
 * Load the secondary models from cache or fetch from server.
 */
function refreshSecondaryModel() {
	return new Promise(function(resolve, reject) {
		// Wait for earliestRange.
		earliestRange.then(value => {

			// Clear model.
			secondaryModel = {};

			let anteriorData = [];

			// Construct list of past ranges.
			let anteriorRanges = [];
			const lowerBound = value.minus(1);
			let anteriorRange = range.minus(1);
			while (anteriorRange.laterThan(lowerBound) && anteriorRanges.length < 11) {
				anteriorRanges.push(anteriorRange.shortForm)
				anteriorRange = anteriorRange.minus(1);
			}

			// For each anterior range...
			for (const range of anteriorRanges) {
				anteriorData.push(new Promise(function(resolve, reject) {

					// Ensure safe access to cache fields.
					if (!modelCache.hasOwnProperty(origin)) {
						modelCache[origin] = {};
						modelCacheModTime[origin] = {};
					}
					if (!modelCache[origin].hasOwnProperty(range)) {
						modelCache[origin][range] = {};
						modelCacheModTime[origin][range] = {};
					}

					// If cache is fresh, serve from cache, otherwise, fetch from server.
					if (Date.now() - modelCacheModTime[origin][range][filter] < cacheTTL) {
						secondaryModel[range] = modelCache[origin][range][filter];
						resolve();

					} else {
						fetchStats(range, filter).then(data => {
							secondaryModel[range] = data;
							modelCache[origin][range][filter] = data;
							modelCacheModTime[origin][range][filter] = Date.now();
							resolve();
						});
					}
				}));
			}

			// When all anterior models are loaded, resolve.
			Promise.all(anteriorData).then(() => {
				resolve();
			});
		});
	});
}


/*
 * Downloads stats data from the server.
 */
function fetchStats(range, filter) {
	let url = "/api/stats?origin=" + origin + "&range=" + range;

	if (filter !== "") {
		url += "&filter=" + filter;
	}

	return httpGet(url).then(JSON.parse);
}


/*
 * Updates the view with data from the main model object.
 */
function drawMainView() {
	// Sets the title.
	view.rangeDisplay.innerText = range.longForm;

	// Big session total.
	view.sessionTotal.innerText = model.sessionTotal;

	// Big engagement value.
	const avgSessionLengthFormatted = model.avgSessionLength.round(2);
	view.avgSessionLength.innerHTML = avgSessionLengthFormatted
		+ "<small> vue" + (avgSessionLengthFormatted === 1 ? "" : "s") + "</small>";

	// Build the list views.
	const listViews = [
		view.pageViews,
		view.acquisitionChannels,
		view.referrerOrigins,
		view.landings,
		view.bilingualismClasses,
		view.countries,
		view.cities,
		view.oses,
		view.browsers,
		view.screenBreakpoints,
		view.errorPages,
		view.excludedTraffic
	];
	const listViewsModels = [
		"pageViews",
		"acquisitionChannels",
		"referrerOrigins",
		"landings",
		"bilingualismClasses",
		"countries",
		"cities",
		"oses",
		"browsers",
		"screenBreakpoints",
		"errorViews",
		"excludedTraffic"
	];
	const listViewsTransforms = [
		_identity,
		niceAcquisitionChannelName,
		niceOriginName,
		_identity,
		niceBilingualismClassName,
		niceCountryName,
		_identity,
		_identity,
		_identity,
		niceScreenBreakpointsName,
		_identity,
		niceExcludedTrafficName
	];
	const listViewsOneHundredPercents = [ "sessionTotal",
		"sessionTotal", "sessionTotal", "sessionTotal",
		"sessionTotal", "sessionTotal", "sessionTotal",
		"sessionTotal", "sessionTotal", "sessionTotal",
		"sessionTotal", "viewTotal"
	];

	// For each list view or “card”...
	for (let i = 0; i < listViews.length; i++) {

		// Clear all lists except for the selected item.
		for (const item of listViews[i].querySelectorAll("li:not(.selected)")) {
			item.remove();
		}

		// For each data point for that...
		for (let dataPoint of model[listViewsModels[i]]) {
			// Allow no more than 6 data points.
			if (listViews[i].children.length > 5) {
				break;
			}

			// Determine the filter key.
			const filterValue = encodeURIComponent(listViewsModels[i])
						+ ":" + encodeURIComponent(dataPoint.key);

			let newElement;
			// If data point is selected for filtering, don’t create new element.
			if (filter === filterValue) {
				newElement = selectedListElement;
				newElement.innerHTML = "";
			} else {
				newElement = document.createElement("li");
			}

			// Format the key according to a function.
			const transformedKey = listViewsTransforms[i](dataPoint.key);

			// Style empty and “Autre” data points differently.
			if (dataPoint.key === "" || transformedKey.includes("Autre")) {
				newElement.classList.add("last");
			}

			// Create data elements and append to the list element.
			const dataPoint1 = document.createElement("data");
			dataPoint1.innerHTML = transformedKey;

			const dataPoint2 = document.createElement("data");
			dataPoint2.classList.add("numerical", "secondary");
			dataPoint2.innerHTML = dataPoint.value;

			const dataPoint3 = document.createElement("data");
			dataPoint3.classList.add("numerical");
			const oneHundredPercent = model[listViewsOneHundredPercents[i]];
			dataPoint3.innerHTML = (dataPoint.value / oneHundredPercent * 100).round() + "%";

			newElement.append(dataPoint1, dataPoint2, dataPoint3);

			// If this data point was selected for filtering, skip the last part.
			if (filter === filterValue) {
				continue;
			}

			// Handle click on list item by filtering,
			// except those that are not valued in sessions.
			if (listViewsOneHundredPercents[i] === "sessionTotal") {
				newElement.addEventListener("click", () => {
					// If the clicked list item is not currently selected...
					if (filter !== filterValue) {
						filter = filterValue;
						selectedListElement?.classList.remove("selected");
						newElement.classList.add("selected");
						selectedListElement = newElement;
						view.rangeDisplay.classList.add("filtered");

					} else { // ...othersise...
						filter = "";
						newElement.classList.remove("selected");
						view.rangeDisplay.classList.remove("filtered");
					}

					update();
				});
			}

			listViews[i].append(newElement);
		}
	}
}


/*
 * Updates the view with data from the secondary model object.
 */
function drawSecondaryView() {
	const previousMonths = Object.keys(secondaryModel);

	// Assemble data for session total graph
	const sessionTotalData = {
		points: [],
		floatingDigits: 0
	};

	// Add data from previous months.
	for (let previousMonth of previousMonths) {
		let previousRange = new DateRange(previousMonth);
		sessionTotalData.points.push({
			label: monthsDict[previousRange.month],
			y: secondaryModel[previousMonth].sessionTotal
		});
	}

	// Add data from currently selected month.
	sessionTotalData.points.push({
		label: monthsDict[range.month],
		y: model.sessionTotal
	});

	// Draw session total graph
	view.sessionTotalGraph.draw(sessionTotalData);


	// Assemble data for session length graph
	const sessionLengthData = {
		points: [],
		floatingDigits: 2
	};

	// Add data from previous months.
	for (let previousMonth of previousMonths) {
		let previousRange = new DateRange(previousMonth);
		sessionLengthData.points.push({
			label: monthsDict[previousRange.month],
			y: secondaryModel[previousMonth].avgSessionLength
		});
	}

	// Add data from currently selected month.
	sessionLengthData.points.push({
		label: monthsDict[range.month],
		y: model.avgSessionLength
	});

	// Draw session length graph
	view.avgSessionLengthGraph.draw(sessionLengthData);
}
