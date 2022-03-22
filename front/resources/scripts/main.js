var model = {};

const view = {};
view.engagement = {};
view.acquisition = {};
view.profiling = {};


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
					console.error(e);
					reject(e);
				}
			}
		};

		httpRequest.open("GET", "/api/stats");
		httpRequest.send();
	});
}


function updateView() {
	view.engagement.sessionsTotal.innerText = model.data.sessionsTotal;
	// view.engagement.sessionsTotalGraph.value = "";

	view.engagement.averageLength.innerHTML = model.data.averageSessionLength.round(2)
											+ "<small> vues</small>";
	// view.engagement.averageLengthGraph.value = "";

	const listViews = [
		view.engagement.topPages,
		view.acquisition.channels,
		view.acquisition.origins,
		view.acquisition.landings,
		view.profiling.bilingualism,
		view.profiling.countries,
		view.profiling.oses,
		view.profiling.browsers,
		view.profiling.formFactors
	];
	const listViewsModels = [
		"viewsPerPage",
		"sessionsPerAcquisitionChannel",
		"sessionsPerReferrerOrigin",
		"landingsPerPage",
		"bilingualism",
		"sessionsPerCountry",
		"sessionsPerOS",
		"sessionsPerBrowser",
		"sessionsPerFormFactor"
	];
	const listViewsTransforms = [
		_identity,
		niceChannelName,
		_identity,
		_identity,
		niceBilingualismClassName,
		niceCountryName,
		_identity,
		_identity,
		niceFormFactorName
	];

	for (let i = 0; i < listViews.length; i++) {
		listViews[i].innerHTML = "";
		for (let dataPoint of model.data[listViewsModels[i]]) {
			if (listViews[i].children.length > 5) {
				break;
			}

			const newElement = document.createElement("li");
			if (dataPoint.key === "") {
				newElement.classList.add("last");
			}

			const dataPoint1 = document.createElement("data");
			dataPoint1.innerText = listViewsTransforms[i](dataPoint.key);

			const dataPoint2 = document.createElement("data");
			dataPoint2.classList.add("numerical", "secondary");
			dataPoint2.innerText = dataPoint.value;

			const dataPoint3 = document.createElement("data");
			dataPoint3.classList.add("numerical");
			dataPoint3.innerText = Math.round(dataPoint.value / model.data.sessionsTotal * 100) + "%";

			newElement.append(dataPoint1, dataPoint2, dataPoint3);

			listViews[i].append(newElement);
		}
	}

	view.engagement.sessionsTotal.classList.remove("loading");
	view.engagement.sessionsTotalGraph.classList.remove("loading");
	view.engagement.averageLength.classList.remove("loading");
	view.engagement.averageLengthGraph.classList.remove("loading");
	view.engagement.topPages.classList.remove("loading");

	view.acquisition.channels.classList.remove("loading");
	view.acquisition.origins.classList.remove("loading");
	view.acquisition.landings.classList.remove("loading");

	view.profiling.bilingualism.classList.remove("loading");
	view.profiling.countries.classList.remove("loading");
	view.profiling.oses.classList.remove("loading");
	view.profiling.browsers.classList.remove("loading");
	view.profiling.formFactors.classList.remove("loading");
}


whenDOMReady(() => {
	view.engagement.sessionsTotal = document.getElementById("engagement-sessions-total");
	view.engagement.sessionsTotalGraph = document.getElementById("engagement-sessions-total-graph");
	view.engagement.averageLength = document.getElementById("engagement-avg-length");
	view.engagement.averageLengthGraph = document.getElementById("engagement-avg-length-graph");
	view.engagement.topPages = document.getElementById("engagement-top-pages");

	view.acquisition.channels = document.getElementById("acquisition-channels");
	view.acquisition.origins = document.getElementById("acquisition-origins");
	view.acquisition.landings = document.getElementById("acquisition-landings");

	view.profiling.bilingualism = document.getElementById("profiling-bilingualism");
	view.profiling.countries = document.getElementById("profiling-countries");
	view.profiling.oses = document.getElementById("profiling-oses");
	view.profiling.browsers = document.getElementById("profiling-browsers");
	view.profiling.formFactors = document.getElementById("profiling-form-factors");


	view.engagement.sessionsTotal.classList.add("loading");
	view.engagement.sessionsTotalGraph.classList.add("loading");
	view.engagement.averageLength.classList.add("loading");
	view.engagement.averageLengthGraph.classList.add("loading");
	view.engagement.topPages.classList.add("loading");

	view.acquisition.channels.classList.add("loading");
	view.acquisition.origins.classList.add("loading");
	view.acquisition.landings.classList.add("loading");

	view.profiling.bilingualism.classList.add("loading");
	view.profiling.countries.classList.add("loading");
	view.profiling.oses.classList.add("loading");
	view.profiling.browsers.classList.add("loading");
	view.profiling.formFactors.classList.add("loading");

	updateModel().then(updateView);
});


function _identity(input) {
	if (input === "") {
		return "Indéterminé";
	}
	return input;
}

function niceChannelName(input) {
	const dict = {
		"direct": "Direct",
		"organic": "Organique",
		"social": "Social",
		"other": "Autre canal"
	};

	if (dict[input] !== "") {
		return dict[input];
	}
};

function niceBilingualismClassName(input) {
	const dict = {
		"en": "Anglais, pas de français",
		"en+": "Bilingue, anglais en premier",
		"fr": "Français, pas d’anglais",
		"fr+": "Bilingue, français en premier",
		"al": "Autres langues seulement"
	};

	if (dict[input]) {
		return dict[input];
	}
}

function niceCountryName(input) {
	const dict = {
		"CA": "Canada",
		"US": "États-Unis",
		"CN": "Chine",
		"RU": "Russie",
		"FR": "France",
		"ES": "Espagne",
		"": "Indéterminé"
	};

	if (dict[input]) {
		return dict[input];
	} else {
		console.log(input);
	}
}

function niceFormFactorName(input) {
	const dict = {
		"desktop": "Grand écran",
		"tablet": "Petit écran",
		"mobile": "Écran portable"
	};

	if (dict[input] !== "") {
		return dict[input];
	}
}
