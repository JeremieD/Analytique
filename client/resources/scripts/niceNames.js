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
	"AR": "Argentine",
	"AU": "Australie",
	"BE": "Belgique",
	"BG": "Bulgarie",
	"BR": "Brésil",
	"BY": "Bélarus",
	"CA": "Canada",
	"CL": "Chili",
	"CN": "Chine",
	"CO": "Colombie",
	"DE": "Allemagne",
	"EC": "Équateur",
	"ES": "Espagne",
	"FR": "France",
	"GB": "Royaume-Uni",
	"IL": "Israël",
	"IT": "Italie",
	"KG": "Kirghizistan",
	"KZ": "Kazakhstan",
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
const errorsDict = {
	"noData": "Aucune donnée disponible.",
	"noMatchingSessions": "Aucune session ne correspond à la requête.",
	"noOrigins": "Aucune origine disponible.",
	"ipGeoUnavailable": "Le serveur n’arrive pas à se connecter à ipinfo.io."
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
	return acquisitionChannelsDict[input];
}


/**
 * Simplifies the URL.
 */
function niceOriginName(input) {
	// Don’t touch variants of the current origin.
	if (input.includes(origin)) {
		return input;
	}

	return input.replace("https://", "")
				.replace("www.", "");
}


/**
 * Converts the bilingualism class code to a short explanation string.
 */
function niceBilingualismClassName(input) {
	return bilingualismClassesDict[input];
}


/**
 * Converts an ISO 3166 2-letter country code to its French short-form.
 */
function niceCountryName(input) {
	if (countriesDict[input]) {
		return countriesDict[input];
	}
	return input;
}


/**
 * Converts the breakpoint name to a French string.
 */
function niceScreenBreakpointsName(input) {
	return screenBreakpointsDict[input];
}


/**
 * Converts the breakpoint name to a French string.
 */
function niceExcludedTrafficName(input) {
	return excludedTrafficDict[input];
}


/**
 * Converts an error code to a French explanation.
 */
function niceErrorName(input) {
	if (errorsDict[input]) {
		return errorsDict[input];
	}
	return input;
}
