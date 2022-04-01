// Holds the stats data from the server.
var model = {};

// Holds references to the DOM objects that display the data.
const view = {};


/*
 * Updates the model object with data downloaded from the server.
 */
function updateModel(successCallback) {
	return new Promise(function(resolve, reject) {
		const httpRequest = new XMLHttpRequest();

		httpRequest.onreadystatechange = () => {
			if (httpRequest.readyState === XMLHttpRequest.DONE) {

				if (httpRequest.status === 200) {
					try {
						model = JSON.parse(httpRequest.responseText);
						resolve();

					} catch (e) {
						console.error(e);
						reject(e);
					}

				} else {
					reject(httpRequest.status);
				}
			}
		};

		httpRequest.open("GET", "/api/stats?range=2022-02:2022-03");
		httpRequest.send();
	});
}


/*
 * Updates the view with data from the model object.
 */
function updateView() {
	view.sessionTotal.innerText = model.stats.sessionTotal;
	// view.sessionTotalGraph.value = "";

	view.avgSessionLength.innerHTML = model.stats.avgSessionLength.round(2)
											+ "<small> vues</small>";
	// view.avgSessionLengthGraph.value = "";

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
		"sessionTotal",
		"sessionTotal",
		"sessionTotal",
		"sessionTotal",
		"sessionTotal",
		"sessionTotal",
		"sessionTotal",
		"sessionTotal",
		"sessionTotal",
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

	// Sets all view objects to their loaded state.
	for (let viewComponent of Object.keys(view)) {
		view[viewComponent].classList.remove("loading");
	}
}


whenDOMReady(() => {

	// Build the view object.
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

	// Sets all view objects to their loading state. (with a delay)
	const loadingAnimationDelay = setTimeout(() => {
		for (let viewComponent of Object.keys(view)) {
			view[viewComponent].classList.add("loading");
		}
	}, 250);

	// Download the model then update the view.
	updateModel().then(() => {
		updateView();
		clearTimeout(loadingAnimationDelay);
	});
});
