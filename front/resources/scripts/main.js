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


// Query the earliest available month with data.
const earliestRange = new Promise((resolve, reject) => {
	const httpRequest = new XMLHttpRequest();

	httpRequest.onreadystatechange = () => {
		if (httpRequest.readyState === XMLHttpRequest.DONE) {

			if (httpRequest.status === 200) {
				resolve(new DateRange(httpRequest.responseText));

			} else {
				console.error(httpRequest.status);
				reject();
			}
		}
	};

	httpRequest.open("GET", "/api/earliest");
	httpRequest.send();
});


whenDOMReady(() => {
	// Build the view object.
	view.rangeDisplay = document.getElementById("range-display");
	view.sessionTotal = document.getElementById("session-total");
	view.sessionTotalGraph = document.getElementById("session-total-graph");
	view.avgSessionLength = document.getElementById("avg-session-length");
	view.avgSessionLengthGraph = document.getElementById("avg-session-length-graph");
	view.pageViews = document.getElementById("page-views");
	view.acquisitionChannels = document.getElementById("acquisition-channels");
	view.referrerOrigins = document.getElementById("referrer-origins");
	view.landingPages = document.getElementById("landing-pages");
	view.bilingualismClasses = document.getElementById("bilingualism-classes");
	view.countries = document.getElementById("countries");
	view.oses = document.getElementById("oses");
	view.browsers = document.getElementById("browsers");
	view.screenBreakpoints = document.getElementById("screen-breakpoints");
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


	refresh();
});


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
	}, 250);


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

		// If cache is fresh, serve from cache, otherwise, fetch from server.
		if (Date.now() - modelCacheModTime[shortRange] < cacheTTL) {
			model = modelCache[shortRange];
			resolve();

		} else {
			fetchStats(shortRange).then(data => {
				model = data;
				modelCache[shortRange] = data;
				modelCacheModTime[shortRange] = Date.now();
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

					// If cache is fresh, serve from cache, otherwise, fetch from server.
					if (Date.now() - modelCacheModTime[range] < cacheTTL) {
						secondaryModel[range] = modelCache[range];
						resolve();

					} else {
						fetchStats(range).then(data => {
							secondaryModel[range] = data;
							modelCache[range] = data;
							modelCacheModTime[range] = Date.now();
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
	return new Promise(function(resolve, reject) {
		const httpRequest = new XMLHttpRequest();

		httpRequest.onreadystatechange = () => {
			if (httpRequest.readyState === XMLHttpRequest.DONE) {

				if (httpRequest.status === 200) {
					try {
						resolve(JSON.parse(httpRequest.responseText));

					} catch (e) {
						console.error(e);
						reject(e);
					}

				} else {
					reject(httpRequest.status);
				}
			}
		};

		httpRequest.open("GET", "/api/stats?range=" + range);
		httpRequest.send();
	});
}


/*
 * Updates the view with data from the main model object.
 */
function updateMainView() {

	view.rangeDisplay.innerText = range.longForm;

	view.sessionTotal.innerText = model.stats.sessionTotal;

	const avgSessionLengthFormatted = model.stats.avgSessionLength.round(2);
	view.avgSessionLength.innerHTML = avgSessionLengthFormatted
		+ "<small> vue" + (avgSessionLengthFormatted === 1 ? "" : "s") + "</small>";

	// Build the "list views".
	const listViews = [
		view.pageViews,
		view.acquisitionChannels,
		view.referrerOrigins,
		view.landingPages,
		view.bilingualismClasses,
		view.countries,
		view.oses,
		view.browsers,
		view.screenBreakpoints,
		view.excludedTraffic
	];
	const listViewsModels = [
		"pageViews",
		"acquisitionChannels",
		"referrerOrigins",
		"landingPages",
		"bilingualismClasses",
		"countries",
		"oses",
		"browsers",
		"screenBreakpoints",
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
		niceScreenBreakpointsName,
		niceExcludedTrafficName
	];
	const listViewsOneHundredPercents = [
		"sessionTotal", "sessionTotal", "sessionTotal",
		"sessionTotal", "sessionTotal", "sessionTotal",
		"sessionTotal", "sessionTotal", "sessionTotal",
		"viewTotal"
	];

	for (let i = 0; i < listViews.length; i++) {
		listViews[i].innerHTML = "";
		for (let dataPoint of model.stats[listViewsModels[i]]) {
			if (listViews[i].children.length > 5) {
				break;
			}

			// Formats the key according to a function.
			const transformedKey = listViewsTransforms[i](dataPoint.key);

			const newElement = document.createElement("li");
			if (dataPoint.key === ""
				|| transformedKey.includes("Autre")) {
				newElement.classList.add("last");
			}

			const dataPoint1 = document.createElement("data");
			dataPoint1.innerHTML = transformedKey;

			const dataPoint2 = document.createElement("data");
			dataPoint2.classList.add("numerical", "secondary");
			dataPoint2.innerHTML = dataPoint.value;

			const dataPoint3 = document.createElement("data");
			dataPoint3.classList.add("numerical");
			const oneHundredPercent = model.stats[listViewsOneHundredPercents[i]];
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
		points: []
	};
	for (let previousMonth of previousMonths) {
		let previousRange = new DateRange(previousMonth);
		sessionTotalData.points.push({
			label: monthsDict[previousRange.month],
			y: secondaryModel[previousMonth].stats.sessionTotal
		});
	}
	sessionTotalData.points.push({
		label: monthsDict[range.month],
		y: model.stats.sessionTotal
	});

	// Draw session total graph
	view.sessionTotalGraph.draw(sessionTotalData);


	// Assemble data for session length graph
	const sessionLengthData = {
		points: []
	};
	for (let previousMonth of previousMonths) {
		let previousRange = new DateRange(previousMonth);
		sessionLengthData.points.push({
			label: monthsDict[previousRange.month],
			y: secondaryModel[previousMonth].stats.avgSessionLength
		});
	}
	sessionLengthData.points.push({
		label: monthsDict[range.month],
		y: model.stats.avgSessionLength
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
