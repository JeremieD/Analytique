const acquisitionChannelsDict = {
	"direct": "Direct",
	"organic": "Organique",
	"social": "Social",
	"other": "Autre référence"
};

const bilingualismClassesDict = {
	"en": "Anglais, pas de français",
	"en+": "Bilingue, anglais d’abord",
	"fr": "Français, pas d’anglais",
	"fr+": "Bilingue, français d’abord",
	"al": "Autres langues seulement"
};

const countriesDict = {
	"CA": "Canada",
	"US": "États-Unis",
	"CN": "Chine",
	"RU": "Russie",
	"FR": "France",
	"ES": "Espagne",
	"TJ": "Tadjikistan",
	"DE": "Allemagne",
	"": "Indéterminé"
};

const screenBreakpointsDict = {
	"desktop": "Grand <small>(>1080px)</small>",
	"tablet": "Moyen <small>(≤1080px)</small>",
	"mobile": "Petit <small>(≤800px)</small>",
	"xsmall": "Mini <small>(≤360px)</small>"
};


/**
 * Replaces "" with "Indéterminé", otherwise returns the input.
 */
function _identity(input) {
	if (input === "") {
		return "Indéterminé";
	}
	return input;
}


/**
 * Converts the acquisition channel code to its French string.
 */
function niceAcquisitionChannelName(input) {
	if (acquisitionChannelsDict[input] !== "") {
		return acquisitionChannelsDict[input];
	}
}


/**
 * Converts the bilingualism class code to a short explanation string.
 */
function niceBilingualismClassName(input) {
	if (bilingualismClassesDict[input]) {
		return bilingualismClassesDict[input];
	}
}


/**
 * Converts an ISO 3166 2-letter country codes to its French short-form.
 */
function niceCountryName(input) {
	if (countriesDict[input]) {
		return countriesDict[input];
	} else {
		console.error("Unknown country code: " + input);
	}
}


/**
 * Converts the breakpoint name to a French string.
 */
function niceScreenBreakpointsName(input) {
	if (screenBreakpointsDict[input] !== "") {
		return screenBreakpointsDict[input];
	}
}
