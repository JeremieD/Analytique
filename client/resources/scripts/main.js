// Query the available origins.
const availableOrigins = httpGet("/api/origins").then(JSON.parse);

// Holds the current origin.
var origin;

// Query the earliest available month with data.
var earliestRange;

// Holds stats data.
var model = {}; // Data for the current range.
var secondaryModel = {}; // Anterior data.

// Holds cached stats data.
var modelCache = {};
var modelCacheModTime = {};
const cacheTTL = 30000; // 30s to live.

// Holds references to the DOM objects that display the data.
const view = {};

// Holds the view-model’s current range.
let range = new DateRange();


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
	view.previousRangeButton.addEventListener("click", e => previousRange(e));
	view.nextRangeButton.addEventListener("click", e => nextRange(e));

	document.addEventListener("keydown", e => {
		if (e.key === "ArrowLeft" && !view.previousRangeButton.disabled) {
			previousRange(e);

		} else if (e.key === "ArrowRight" && !view.nextRangeButton.disabled) {
			nextRange(e);
		}
	});

	view.originSelector.addEventListener("change", () => {
		switchToOrigin(view.originSelector.value);
	});

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


function switchToOrigin(newOrigin) {
	origin = newOrigin;
	view.originSelector.value = origin;
	earliestRange = httpGet("/api/earliest?origin=" + origin).then(value => {
		const newEarliestRange = new DateRange(value);
		if (newEarliestRange.laterThan(range)) {
			range = newEarliestRange;
		}
		refresh();
		return newEarliestRange;
	});
}


/*
 * Checks data availability, then updates the view.
 */
function refresh() {
	// Checks that range is in bound.
	const isLastRange = range.laterThan((new DateRange()).minus(1));
	view.nextRangeButton.disabled = isLastRange;
	earliestRange.then(value => {
		const isFirstRange = range.earlierThan(value.plus(1));
		view.previousRangeButton.disabled = isFirstRange;
	});


	// Sets all view objects to their loading state. (with a delay)
	const loadingAnimationDelay = setTimeout(() => {
		for (let viewComponent of Object.keys(view)) {
			view[viewComponent].classList.add("loading");
		}
	}, 50);


	// Update models then update the views.
	const main = updateMainModel().then(() => {
		updateMainView();
	});
	const secondary = updateSecondaryModel();

	Promise.all([main, secondary]).then(() => {
		updateSecondaryView();

		// Sets all view objects to their loaded state.
		for (let viewComponent of Object.keys(view)) {
			view[viewComponent].classList.remove("loading");
		}
	})
	.catch(e => console.error)
	.finally(() => {
		// De-queues the loading animation.
		clearTimeout(loadingAnimationDelay);
	});
}


/*
 * Updates the model from cache or fetch new data.
 */
function updateMainModel() {
	return new Promise(function(resolve, reject) {
		const shortRange = range.shortForm;

		if (!modelCache.hasOwnProperty(origin)) {
			modelCache[origin] = {};
			modelCacheModTime[origin] = {};
		}

		// If cache is fresh, serve from cache, otherwise, fetch from server.
		if (Date.now() - modelCacheModTime[origin][shortRange] < cacheTTL) {
			model = modelCache[origin][shortRange];
			resolve();

		} else {
			fetchStats(shortRange).then(data => {
				model = data;
				modelCache[origin][shortRange] = data;
				modelCacheModTime[origin][shortRange] = Date.now();
				resolve();
			});
		}
	});
}

/*
 * Updates the secondary model from cache or fetch new data.
 */
function updateSecondaryModel() {
	return new Promise(function(resolve, reject) {
		earliestRange.then(value => {

			// Clear model.
			secondaryModel = {};

			let anteriorData = [];

			// Construct a list of past ranges.
			let anteriorRanges = [];
			const lowerBound = value.minus(1);
			let anteriorRange = range.minus(1);
			while (anteriorRange.laterThan(lowerBound) && anteriorRanges.length < 11) {
				anteriorRanges.push(anteriorRange.shortForm)
				anteriorRange = anteriorRange.minus(1);
			}

			for (const range of anteriorRanges) {
				anteriorData.push(new Promise(function(resolve, reject) {

					if (!modelCache.hasOwnProperty(origin)) {
						modelCache[origin] = {};
						modelCacheModTime[origin] = {};
					}

					// If cache is fresh, serve from cache, otherwise, fetch from server.
					if (Date.now() - modelCacheModTime[origin][range] < cacheTTL) {
						secondaryModel[range] = modelCache[origin][range];
						resolve();

					} else {
						fetchStats(range).then(data => {
							secondaryModel[range] = data;
							modelCache[origin][range] = data;
							modelCacheModTime[origin][range] = Date.now();
							resolve();
						});
					}
				}));
			}

			Promise.all(anteriorData).then(() => {
				resolve();
			});
		});
	});
}


/*
 * Downdloads stats data from the server.
 */
function fetchStats(range) {
	return httpGet("/api/stats?origin=" + origin + "&range=" + range).then(JSON.parse);
}


/*
 * Updates the view with data from the main model object.
 */
function updateMainView() {

	view.rangeDisplay.innerText = range.longForm;

	view.sessionTotal.innerText = model.sessionTotal;

	const avgSessionLengthFormatted = model.avgSessionLength.round(2);
	view.avgSessionLength.innerHTML = avgSessionLengthFormatted
		+ "<small> vue" + (avgSessionLengthFormatted === 1 ? "" : "s") + "</small>";

	// Build the "list views".
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

	for (let i = 0; i < listViews.length; i++) {
		listViews[i].innerHTML = "";
		for (let dataPoint of model[listViewsModels[i]]) {
			if (listViews[i].children.length > 5) {
				break;
			}

			// Formats the key according to a function.
			const transformedKey = listViewsTransforms[i](dataPoint.key);

			const newElement = document.createElement("li");
			if (dataPoint.key === "" || transformedKey.includes("Autre")) {
				newElement.classList.add("last");
			}

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

			listViews[i].append(newElement);
		}
	}
}


/*
 * Updates the view with data from the secondary model object.
 */
function updateSecondaryView() {
	const previousMonths = Object.keys(secondaryModel);

	// Assemble data for session total graph
	const sessionTotalData = {
		points: [],
		floatingDigits: 0
	};
	for (let previousMonth of previousMonths) {
		let previousRange = new DateRange(previousMonth);
		sessionTotalData.points.push({
			label: monthsDict[previousRange.month],
			y: secondaryModel[previousMonth].sessionTotal
		});
	}
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
	for (let previousMonth of previousMonths) {
		let previousRange = new DateRange(previousMonth);
		sessionLengthData.points.push({
			label: monthsDict[previousRange.month],
			y: secondaryModel[previousMonth].avgSessionLength
		});
	}
	sessionLengthData.points.push({
		label: monthsDict[range.month],
		y: model.avgSessionLength
	});

	// Draw session length graph
	view.avgSessionLengthGraph.draw(sessionLengthData);
}


/*
 * Selects the previous range and refresh.
 */
function previousRange(e) {
	e?.preventDefault();
	range.previous();
	refresh();
}


/*
 * Selects the next range and refresh.
 */
function nextRange(e) {
	e?.preventDefault();
	range.next();
	refresh();
}
