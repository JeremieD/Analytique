const state = {
	availableOrigins: httpGet("/api/origins").then(JSON.parse),
	origin: "",
	availableRange: {
		earliest: undefined,
		latest: undefined
	},
	range: new JDDateRange(),
	filter: {
		key: "",
		value: ""
	},
};
let previousState = {
	origin: "",
	range: new JDDateRange(),
	filter: {}
};

// Promises to model data.
const model = {
	main: {},
	complementary: {}
};
const modelCache = {}; // Cached model data. [origin][range][filter][data, modTime]
const modelCacheTTL = 300000; // 5min to live.

// Reference to view elements.
const view = {};


whenDOMReady(() => {
	// Populate the view object.
	view.hud = {
		origin: document.getElementById("origin-selector"),
		range: document.getElementById("range-display"),
		rangeMode: document.getElementById("range-mode"),
		previousRange: document.getElementById("range-previous"),
		nextRange: document.getElementById("range-next"),
		filterReset: document.getElementById("filter-reset"),
		errorCollapse: document.getElementById("error-collapse"),
		errorDisplay: document.getElementById("error-display")
	};
	view.main = {
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
	];
	view.complementary = {
		sessionTotal: {
			el: document.getElementById("session-total-graph"),
			model: "sessionTotal"
		},
		avgSessionLength: {
			el: document.getElementById("avg-session-length-graph"),
			model: "avgSessionLength"
		}
	};

	// Wait for list of available origins.
	state.availableOrigins.then(origins => {
		// Initial view update.
		switchToOrigin(origins[0]);
		view.hud.origin.value = state.origin;
		update();

		// Load available origins in origin selector.
		for (const origin of origins) {
			view.hud.origin.addOption(origin);
		}
	});

	// Handlers for HUD elements.
	view.hud.origin.addEventListener("change", () => {
		switchToOrigin(view.hud.origin.value);
		update();
	});
	view.hud.rangeMode.addEventListener("change", () => {
		switchRangeMode(view.hud.rangeMode.value);
		update();
	});
	view.hud.previousRange.addEventListener("click", () => {
		previousRange();
		update();
	});
	view.hud.nextRange.addEventListener("click", () => {
		nextRange();
		update();
	});
	view.hud.filterReset.addEventListener("click", () => {
		clearFilter();
		update();
	});

	// Handler for app-wide keyboard shortcuts
	window.addEventListener("keydown", e => {
		if (e.key === "ArrowLeft" && !view.hud.previousRange.disabled) {
			previousRange();
			update();

		} else if (e.key === "ArrowRight" && !view.hud.nextRange.disabled) {
			nextRange();
			update();
		}
	});
});


// Change state to specified origin.
function switchToOrigin(origin) {
	if (state.origin === origin) return;

	state.origin = origin;

	// Reset filter.
	clearFilter();

	// Fetch earliest available range.
	state.availableRange.earliest = httpGet(`/api/earliest?origin=${origin}`)
	.then(bound => {
		bound = JSON.parse(bound);
		if (bound.error !== undefined) return bound;

		bound = new JDDate(bound);

		// Check range bounds and move range accordingly.
		if (state.range.earlierThan(bound)) {
			state.range = bound;
		}

		return bound;
	});

	// Fetch latest available range.
	state.availableRange.latest = httpGet(`/api/latest?origin=${origin}`)
	.then(bound => {
		bound = JSON.parse(bound);
		if (bound.error !== undefined) return bound;

		bound = new JDDate(bound);

		// Check range bounds and move range accordingly.
		// if (state.range.laterThan(bound)) {
		// 	state.range = bound;
		// }

		return bound;
	});
}

// Change state to specified range mode.
function switchRangeMode(mode) {
	if (state.range.mode === mode) return;

	switch (mode) {
		case "year":
			state.range = new JDDateRange(JDDate.thisYear());
		break;
		case "month":
			state.range = new JDDateRange(JDDate.thisMonth());
			break;
		case "week":
			state.range = new JDDateRange(JDDate.thisWeek());
			break;
	}
}

// Advances range in state.
function nextRange() {
	state.range.next();
}

// Rewinds range in state.
function previousRange() {
	state.range.previous();
}

// Set filter state.
function setFilter(filter) {
	state.filter = filter;
}

// Clear filter state.
function clearFilter() {
	state.filter = {
		key: "",
		value: ""
	};
}


/*
 * Updates model and view according to current state.
 */
function update() {
	const originChanged = state.origin !== previousState.origin;
	const rangeChanged = !state.range.equals(previousState.range);
	const filterKeyChanged = previousState.filter.key !== "" && state.filter.key !== previousState.filter.key;
	const filterValueChanged = state.filter.value !== previousState.filter.value;

	const stateChanged = originChanged || rangeChanged ||
						 filterKeyChanged || filterValueChanged;

	// If state has not changed, skip update.
	if (!stateChanged) return;

	// Write previousState before update.
	previousState = {
		origin: state.origin,
		range: new JDDateRange(state.range.shortForm),
		filter: {
			key: state.filter.key,
			value: state.filter.value
		}
	};

	// Update HUD
	view.hud.range.innerHTML = state.range.niceForm;

	state.availableRange.earliest.then(earliest => {
		let isFirstRange = true;
		if (earliest.error === undefined) {
			isFirstRange = state.range.earlierThan(earliest.plus(1));
		}
		if (isFirstRange) view.hud.previousRange.blur();
		view.hud.previousRange.disabled = isFirstRange;
	});

	state.availableRange.latest.then(latest => {
		let isLastRange = true;
		if (latest.error === undefined) {
			isLastRange = state.range.laterThan(latest.minus(1));
		}
		if (isLastRange) view.hud.nextRange.blur();
		view.hud.nextRange.disabled = isLastRange;
	});

	const filterEnabled = state.filter.key !== "";
	view.hud.filterReset.disabled = !filterEnabled;
	if (!filterEnabled) {
		view.hud.filterReset.blur();
		document.querySelector(".card>ol>li.selected")?.classList.remove("selected");
	}

	// Set loading state.
	setAllLoading();

	// Update models, then views.
	refreshMainModel().then(drawMainView);
	refreshComplementaryModel().then(drawComplementaryView);
}


/*
 * Updates the main model according to current state.
 */
function refreshMainModel() {
	model.main = getModel(state.origin, state.range.shortForm, serializeFilter(state.filter));
	return model.main;
}

/*
 * Updates the complementary model according to current state.
 */
function refreshComplementaryModel() {
	// Determine required model ranges.
	const ranges = [];
	switch (state.range.mode) {
		case "year":
			// Load 10 previous years (?!) in year mode.
			for (let i = 0; i < 10; i++) {
				ranges.push(state.range.minus(i).shortForm);
			}
			break;
		case "month":
			// Load 12 previous months in month mode.
			for (let i = 0; i < 12; i++) {
				ranges.push(state.range.minus(i).shortForm);
			}
			break;
		case "week":
			// Load 12 previous weeks in week mode.
			for (let i = 0; i < 12; i++) {
				ranges.push(state.range.minus(i).shortForm);
			}
			break;
		default:
			// If range is 16 days or less, display each day.
			if (state.range.length <= 16) {
				// TODO

			// If range is 112 days (4 months) or less, display each week.
			} else if (state.range.length <= 112) {
				// TODO

			// Otherwise, display each month.
			} else {
				// TODO
			}
	}

	// Get model for each complementary range.
	model.complementary = {};
	for (const range of ranges) {
		model.complementary[range] = getModel(state.origin, range, serializeFilter(state.filter));
	}

	// Return the promise of all models including main.
	return Promise.all(Object.values(model.complementary));
}

/*
 * Updates the view with data from the main model.
 */
function drawMainView() {
	// Wait for model to be loaded.
	model.main.then(data => {

		// Check for and draw errors.
		if (data.error !== undefined) {
			view.hud.errorCollapse.classList.add("shown");
			view.hud.errorDisplay.innerText = niceErrorName(data.error);
			return;

		} else {
			view.hud.errorCollapse.classList.remove("shown");
			view.hud.errorDisplay.innerText = "";
		}

		// Session total.
		view.main.sessionTotal.el.innerText = data.sessionTotal;
		view.main.sessionTotal.el.classList.remove("loading");

		// Engagement.
		const avgSessionLengthFormatted = data.avgSessionLength.round(2);
		view.main.avgSessionLength.el.innerHTML = avgSessionLengthFormatted +
			"<small> vue" + (avgSessionLengthFormatted === 1 ? "" : "s") + "</small>";
		view.main.avgSessionLength.el.classList.remove("loading");

		// Draw list views.
		for (const listView of view.listViews) {

			listView.el.classList.remove("loading");

			// Whether this list view is selected for filtering.
			const isFilterKey = listView.model === state.filter.key;

			// If range and filter key have not changed, keep selected list view intact.
			if (isFilterKey) {
				for (const listItem of listView.el.children) {
					const isSelected = listItem.dataset.filterValue === state.filter.value;
					if (isSelected) {
						listItem.classList.add("selected");
						listItem.classList.remove("subdued");
					} else {
						listItem.classList.add("subdued");
						listItem.classList.remove("selected");
					}
					// Update just the numbers. Keys that don’t apply are set to 0.
					let value = 0;
					const oneHundredPercent = data[listView.oneHundredPercent] || 100;
					for (const point of data[listView.model]) {
						if (point.key === listItem.dataset.filterValue) {
							value = point.value;
							break;
						}
					}
					listItem.children[1].innerHTML = value;
					listItem.children[2].innerHTML = (value / oneHundredPercent * 100).round() + "%";
				}
				continue;
			}

			// Draw other (not selected) list views.
			listView.el.innerHTML = "";

			// For each data point in the corresponding model.
			for (const dataPoint of data[listView.model]) {

				// Allow no more than 6 data points.
				if (listView.el.children.length > 5) break;

				// Create new list item.
				const newListItem = document.createElement("li");
				newListItem.dataset.filterKey = listView.model;
				newListItem.dataset.filterValue = dataPoint.key;

				// Format the key according to a function.
				const transformedKey = listView.transform(dataPoint.key);

				// Style empty and “Autre” data points differently.
				if (dataPoint.key === "" || transformedKey.includes("Autre")) {
					newListItem.classList.add("last");
				}

				// Create data elements and append to the list element.
				const dataPoint1 = document.createElement("data");
				dataPoint1.innerHTML = transformedKey;

				const dataPoint2 = document.createElement("data");
				dataPoint2.classList.add("numerical", "secondary");
				dataPoint2.innerHTML = dataPoint.value;

				const dataPoint3 = document.createElement("data");
				dataPoint3.classList.add("numerical");
				const oneHundredPercent = data[listView.oneHundredPercent];
				dataPoint3.innerHTML = (dataPoint.value / oneHundredPercent * 100).round() + "%";

				newListItem.append(dataPoint1, dataPoint2, dataPoint3);

				// Handle click on list item by filtering,
				// except those that are not counted in sessions.
				if (listView.oneHundredPercent === "sessionTotal") {
					newListItem.addEventListener("click", () => {
						if (state.filter.key !== listView.model ||
							state.filter.value !== dataPoint.key) {
							setFilter({
								key: listView.model,
								value: dataPoint.key
							});
						} else {
							clearFilter();
						}

						update();
					});
				}

				listView.el.append(newListItem);
			}
		}

	});
}

/*
 * Updates the view with data from the complementary model.
 */
function drawComplementaryView() {
	const complementaryRanges = []; // Keys (short form ranges)
	const complementaryModels = []; // Values (promises)

	for (const range of Object.keys(model.complementary).sort()) {
		complementaryRanges.push(range);
		complementaryModels.push(model.complementary[range]);
	}

	let xAxisLabel;
	switch (state.range.mode) {
		case "year":
			xAxisLabel = "10 dernières années";
			break;
		case "month":
			xAxisLabel = "12 derniers mois";
			break;
		case "week":
			xAxisLabel = "12 dernières semaines";
			break;
	}

	// Wait for models to be loaded.
	Promise.all(complementaryModels).then(data => {
		// Data for graphs
		const sessionTotalData = {
			points: [],
			xAxisLabel: xAxisLabel,
			floatingDigits: 0,
			yAxisMultiple: 30
		};
		const sessionLengthData = {
			points: [],
			xAxisLabel: xAxisLabel,
			floatingDigits: 2,
			yAxisMultiple: 3
		};

		// Count number of ranges that have errors.
		let errorCount = 0;

		// Assemble data from previous ranges.
		for (let i = 0; i < data.length; i++) {
			if (data[i].error !== undefined) {
				errorCount++;
			}

			const rangeObject = new JDDateRange(complementaryRanges[i]);

			let label = "";
			switch (rangeObject.mode) {
				case "year":
					label = String(rangeObject.year);
					break;
				case "month":
					label = monthsDict[rangeObject.month - 1];
					break;
				case "week":
					label = "W" + String(rangeObject.week).padStart(2, "0");
					break;
			}

			sessionTotalData.points.push({
				label: label,
				y: data[i].sessionTotal
			});

			sessionLengthData.points.push({
				label: label,
				y: data[i].avgSessionLength
			});
		}

		if (errorCount === data.length) {
			return;
		}

		// Draw graphs
		view.complementary.sessionTotal.el.draw(sessionTotalData);
		view.complementary.sessionTotal.el.classList.remove("loading");
		view.complementary.avgSessionLength.el.draw(sessionLengthData);
		view.complementary.avgSessionLength.el.classList.remove("loading");
	});
}


/*
 * Sets all element to display a placeholder animation.
 */
function setAllLoading() {
	for (const key of Object.keys(view.main)) {
		view.main[key].el.classList.add("loading");
	}
	for (const key of Object.keys(view.complementary)) {
		view.complementary[key].el.classList.add("loading");
	}
}

/*
 * Returns promised stats data from the server.
 */
function fetchStats(origin, range, serializedFilter) {
	let url = "/api/stats?origin=" + origin + "&range=" + range;

	if (serializedFilter !== "") {
		url += "&filter=" + serializedFilter;
	}

	return httpGet(url).then(JSON.parse);
}

/*
 * Returns promised model data either from cache or server.
 */
function getModel(origin, range, serializedFilter) {
	// Ensure safe access to model cache.
	if (!modelCache.hasOwnProperty(origin)) {
		modelCache[origin] = {};
	}
	if (!modelCache[origin].hasOwnProperty(range)) {
		modelCache[origin][range] = {};
	}

	// If cache is empty or stale, fetch from server.
	if (modelCache[origin][range][serializedFilter] === undefined ||
		Date.now() - modelCache[origin][range][serializedFilter].modTime > modelCacheTTL) {

		modelCache[origin][range][serializedFilter] = fetchStats(origin, range, serializedFilter);

		// Set modTime only when data is fully loaded.
		modelCache[origin][range][serializedFilter].then(() => {
			modelCache[origin][range][serializedFilter].modTime = Date.now();
		});
	}

	return modelCache[origin][range][serializedFilter];
}

/*
 * Takes a filter object and stringifies it for use in a request.
 */
function serializeFilter(filter) {
	const key = encodeURIComponent(filter.key);
	const value = encodeURIComponent(filter.value);

	if (key === "" && value === "") return "";

	return `${key}:${value}`;
}
