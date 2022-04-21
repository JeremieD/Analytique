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
	"AU": "Australie",
	"BE": "Belgique",
	"BG": "Bulgarie",
	"BR": "Brésil",
	"BY": "Bélarus",
	"CA": "Canada",
	"CN": "Chine",
	"CO": "Colombie",
	"DE": "Allemagne",
	"EC": "Équateur",
	"ES": "Espagne",
	"FR": "France",
	"GB": "Royaume-Uni",
	"IT": "Italie",
	"MG": "Madagascar",
	"MX": "Mexique",
	"NL": "Pays-Bas",
	"PL": "Pologne",
	"RU": "Russie",
	"TJ": "Tadjikistan",
	"UA": "Ukraine",
	"US": "États-Unis",
	"": "Indéterminé"
};
const screenBreakpointsDict = {
	"desktop": "Grand <small>(>1080px)</small>",
	"tablet": "Moyen <small>(≤1080px)</small>",
	"mobile": "Petit <small>(≤800px)</small>",
	"xsmall": "Mini <small>(≤360px)</small>"
};
const excludedTrafficDict = {
	"tests": "Moi",
	"bots": "Robots",
	"spam": "Spam",
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
 * Converts the acquisition channel code to a French string.
 */
function niceAcquisitionChannelName(input) {
	if (acquisitionChannelsDict[input] !== "") {
		return acquisitionChannelsDict[input];
	}
}


/**
 * Simplifies the URL.
 */
function niceOriginName(input) {
	// Don’t touch variants of the current origin.
	if (input.includes(origin)) {
		return input;
	}

	return input.replace("www.", "")
				.replace("https://", "");
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
		return input;
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


/**
 * Converts the breakpoint name to a French string.
 */
function niceExcludedTrafficName(input) {
	if (excludedTrafficDict[input] !== "") {
		return excludedTrafficDict[input];
	}
}
