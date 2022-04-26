// Holds references to the DOM objects that display the data.
let view = {};

// Holds promises to draw views, so that there is only ever one requested view.
let mainViewDrawn, secondaryViewDrawn;

// Holds stats data for current and anterior ranges.
let model = {};
let secondaryModel = {};

let error;

// Holds cached stats data.
let modelCache = {};
let modelCacheModTime = {};
const cacheTTL = 300000; // 5min to live.

// Query the available origins.
const availableOrigins = httpGet("/api/origins").then(JSON.parse);

// Holds the current origin.
let origin;

// Query the earliest available month with data.
let earliestRange;

// Holds the view-model’s current range.
let range = new DateRange();

// Current filter value and selected data point.
let filter = "";
let selectedListElement;

// Reference to the queued loading animation.
let loadingAnimation;


whenDOMReady(() => {
	// Build the view object.
	view = {
		controls: {
			origin: document.getElementById("origin-selector"),
			filterReset: document.getElementById("filter-reset"),
			previousRange: document.getElementById("range-previous"),
			nextRange: document.getElementById("range-next"),
			errorSection: document.getElementById("error-section"),
			error: document.getElementById("error-display")
		},
		main: {
			range: {
				el: document.getElementById("range-display")
			},
			sessionTotal: {
				el: document.getElementById("session-total")
			},
			avgSessionLength: {
				el: document.getElementById("avg-session-length")
			},
			pageViews: {
				el: document.getElementById("page-views"),
				model: "pageViews",
				transform: _identity,
				oneHundredPercent: "sessionTotal"
			},
			acquisitionChannels: {
				el: document.getElementById("acquisition-channels"),
				model: "acquisitionChannels",
				transform: niceAcquisitionChannelName,
				oneHundredPercent: "sessionTotal"
			},
			referrerOrigins: {
				el: document.getElementById("referrer-origins"),
				model: "referrerOrigins",
				transform: niceOriginName,
				oneHundredPercent: "sessionTotal"
			},
			landings: {
				el: document.getElementById("landings"),
				model: "landings",
				transform: _identity,
				oneHundredPercent: "sessionTotal"
			},
			bilingualismClasses: {
				el: document.getElementById("bilingualism-classes"),
				model: "bilingualismClasses",
				transform: niceBilingualismClassName,
				oneHundredPercent: "sessionTotal"
			},
			countries: {
				el: document.getElementById("countries"),
				model: "countries",
				transform: niceCountryName,
				oneHundredPercent: "sessionTotal"
			},
			cities: {
				el: document.getElementById("cities"),
				model: "cities",
				transform: _identity,
				oneHundredPercent: "sessionTotal"
			},
			oses: {
				el: document.getElementById("oses"),
				model: "oses",
				transform: _identity,
				oneHundredPercent: "sessionTotal"
			},
			renderingEngines: {
				el: document.getElementById("renderingEngines"),
				model: "renderingEngines",
				transform: _identity,
				oneHundredPercent: "sessionTotal"
			},
			screenBreakpoints: {
				el: document.getElementById("screen-breakpoints"),
				model: "screenBreakpoints",
				transform: niceScreenBreakpointsName,
				oneHundredPercent: "sessionTotal"
			},
			errorPages: {
				el: document.getElementById("error-pages"),
				model: "errorViews",
				transform: _identity,
				oneHundredPercent: "sessionTotal"
			},
			excludedTraffic: {
				el: document.getElementById("excluded-traffic"),
				model: "excludedTraffic",
				transform: niceExcludedTrafficName,
				oneHundredPercent: "viewTotal"
			}
		},
		secondary: {
			sessionTotal: {
				el: document.getElementById("session-total-graph"),
				model: "sessionTotal"
			},
			avgSessionLength: {
				el: document.getElementById("avg-session-length-graph"),
				model: "avgSessionLength"
			}
		},
	};
	view.listViews = [
		view.main.pageViews,
		view.main.acquisitionChannels,
		view.main.referrerOrigins,
		view.main.landings,
		view.main.bilingualismClasses,
		view.main.countries,
		view.main.cities,
		view.main.oses,
		view.main.renderingEngines,
		view.main.screenBreakpoints,
		view.main.errorPages,
		view.main.excludedTraffic
	],

	// Trigger for filter reset.
	view.controls.filterReset.addEventListener("click", () => {
		filter = "";
		update();
	});

	// Triggers for range buttons.
	view.controls.previousRange.addEventListener("click", previousRange);
	view.controls.nextRange.addEventListener("click", nextRange);
	window.addEventListener("keydown", e => {
		if (e.key === "ArrowLeft" && !view.controls.previousRange.disabled) {
			previousRange();

		} else if (e.key === "ArrowRight" && !view.controls.nextRange.disabled) {
			nextRange();
		}
	});

	// Trigger for origin switcher.
	view.controls.origin.addEventListener("change", () => {
		switchToOrigin(view.controls.origin.value);
	});

	// Load the first available origin whenever possible.
	availableOrigins.then(origins => {
		if (origins.error !== undefined) {
			error = origins.error;
			drawError();
			return;
		}

		for (let origin of origins) {
			view.controls.origin.addOption(origin);
		}

		switchToOrigin(origins[0]);
	});
});


/*
 * Switches to the given origin.
 */
function switchToOrigin(newOrigin) {
	origin = newOrigin;
	filter = "";

	// Set the origin switcher display value.
	view.controls.origin.value = origin;

	// Wait for earliestRange before updating the view.
	earliestRange = httpGet("/api/earliest?origin=" + origin).then(value => {
		value = JSON.parse(value);

		let newEarliestRange;

		// If range is unavailable in the new origin, select the earliest range.
		if (value.error === undefined) {
			newEarliestRange = new DateRange(value);
			if (newEarliestRange.laterThan(range)) {
				range = newEarliestRange;
			}
		} else {
			newEarliestRange = value;
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
 * Update models, then view.
 */
function update() {
	error = undefined;

	// Check that range is in bound.
	const isLastRange = range.laterThan((new DateRange()).minus(1));
	view.controls.nextRange.disabled = isLastRange;
	view.controls.previousRange.disabled = true;
	earliestRange?.then(value => {
		if (value.error !== undefined) {
			if (error === undefined) {
				error = value.error;
			}
			drawError();
			return;
		}
		let isFirstRange;
		isFirstRange = range.earlierThan(value.plus(1));
		view.controls.previousRange.disabled = isFirstRange ?? true;

	});
	// Blur on disable.
	if (view.controls.nextRange.disabled) {
		view.controls.nextRange.blur();
	}
	if (view.controls.previousRange.disabled) {
		view.controls.previousRange.blur();
	}

	// Update models then update the views.
	const mainViewDrawn = refreshMainModel().then(drawMainView);

	const secondaryViewDrawn = refreshSecondaryModel();

	// Wait for both the main and secondary models before drawing secondary view.
	Promise.all([mainViewDrawn, secondaryViewDrawn]).then(drawSecondaryView)
		.catch(e => console.error(e))
		.finally(() => {
			// De-queues the loading animation.
			clearTimeout(loadingAnimation);
		});

	setLoading();
}


/*
 * Loads the model from cache or fetch from server.
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
 * Loads the secondary models from cache or fetch from server.
 */
function refreshSecondaryModel() {
	return new Promise(function(resolve, reject) {
		// Wait for earliestRange.
		earliestRange?.then(value => {

			// Clear model.
			secondaryModel = {};

			if (value.error !== undefined || value === undefined) {
				return;
			}

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

			// Resolve when all anterior models are loaded.
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

	return httpGet(url).then(value => {
		value = JSON.parse(value);
		return value;
	});
}


/*
 * Updates the view with data from the main model object.
 */
function drawMainView() {
	// Update filter display.
	const filterEnabled = filter !== "";
	view.controls.filterReset.disabled = !filterEnabled;
	if (!filterEnabled) {
		view.controls.filterReset.blur();
		selectedListElement?.classList.remove("selected");
		selectedListElement = undefined;
	}

	// Check for errors in model and update display.
	if (model.error !== undefined && error === undefined) {
		error = model.error;
	}
	drawError();
	if (error !== undefined) {
		return;
	}

	// Sets the title.
	view.main.range.el.innerText = range.niceForm;

	// Big session total.
	view.main.sessionTotal.el.innerText = model.sessionTotal;

	// Big engagement value.
	const avgSessionLengthFormatted = model.avgSessionLength.round(2);
	view.main.avgSessionLength.el.innerHTML = avgSessionLengthFormatted
		+ "<small> vue" + (avgSessionLengthFormatted === 1 ? "" : "s") + "</small>";

	// For each list view or “card”...
	for (var listView of view.listViews) {

		// Clear all lists except for the selected item.
		for (const item of listView.el.querySelectorAll("li:not(.selected)")) {
			item.remove();
		}

		// For each data point for that...
		for (let dataPoint of model[listView.model]) {
			// Allow no more than 6 data points.
			if (listView.el.children.length > 5) {
				break;
			}

			// Determine the filter key.
			const filterValue = encodeURIComponent(listView.model)
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
			const transformedKey = listView.transform(dataPoint.key);

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
			const oneHundredPercent = model[listView.oneHundredPercent];
			dataPoint3.innerHTML = (dataPoint.value / oneHundredPercent * 100).round() + "%";

			newElement.append(dataPoint1, dataPoint2, dataPoint3);

			// If this data point was selected for filtering, skip the last part.
			if (filter === filterValue) {
				continue;
			}

			// Handle click on list item by filtering,
			// except those that are not counted in sessions.
			if (listView.oneHundredPercent === "sessionTotal") {
				newElement.addEventListener("click", () => {
					// If the clicked list item is not currently selected...
					if (filter !== filterValue) {
						filter = filterValue;
						selectedListElement?.classList.remove("selected");
						newElement.classList.add("selected");
						selectedListElement = newElement;

					} else { // ...otherwise...
						filter = "";
					}

					update();
				});
			}

			listView.el.append(newElement);
		}
	}
}


/*
 * Updates the view with data from the secondary model object.
 */
function drawSecondaryView() {
	const previousMonths = Object.keys(secondaryModel);

	// Data for graphs
	const sessionTotalData = {
		points: [],
		floatingDigits: 0
	};
	const sessionLengthData = {
		points: [],
		floatingDigits: 2
	};

	// Assemble data from previous months.
	for (let previousMonth of previousMonths) {
		const previousRange = new DateRange(previousMonth);
		const label = monthsDict[previousRange.month - 1];

		sessionTotalData.points.push({
			label: label,
			y: secondaryModel[previousMonth].sessionTotal ?? 0
		});

		sessionLengthData.points.push({
			label: label,
			y: secondaryModel[previousMonth].avgSessionLength ?? 0
		});
	}

	// Add data from currently selected month.
	const label = monthsDict[range.month - 1];
	sessionTotalData.points.push({
		label: label,
		y: model.sessionTotal ?? 0
	});
	sessionLengthData.points.push({
		label:label,
		y: model.avgSessionLength ?? 0
	});

	// Draw graphs
	view.secondary.sessionTotal.el.draw(sessionTotalData);
	view.secondary.avgSessionLength.el.draw(sessionLengthData);
}


function drawError() {
	if (error !== undefined) {
		view.controls.errorSection.classList.add("shown");
		view.controls.error.innerText = niceErrorName(error);
		setLoading(view.main);
		if (error !== "noMatchingSessions") {
			setLoading(view.secondary);
		}
		return;
	}

	if (view.controls.error.innerText !== "") {
		view.controls.errorSection.classList.remove("shown");
	}
	unsetLoading(view.main, view.secondary);
}


/*
 * Start loading animation for all view objects after a delay.
 */
function setLoading(...subviews) {
	if (subviews.length > 0) {
		for (const subview of subviews) {
			for (const component of Object.keys(subview)) {
				subview[component].el.classList.add("loading");
			}
		}
	} else {
		loadingAnimation = setTimeout(() => {
			for (const component of Object.keys(view.main)) {
				view.main[component].el.classList.add("loading");
			}
			for (const component of Object.keys(view.secondary)) {
				view.secondary[component].el.classList.add("loading");
			}
		}, 100);
	}
}


/*
 * Stop loading animation for passed view object after a delay.
 */
function unsetLoading(...subviews) {
	for (const subview of subviews) {
		for (const component of Object.keys(subview)) {
			subview[component].el.classList.remove("loading");
		}
	}
}
