const referralChannelsDict = {
  "direct": "Direct/inconnu",
  "internal": "Interne",
  "organic": "Organique",
  "social": "Social",
  "other": "Autre référence"
};
const bilingualismClassesDict = {
  "en":  "Anglais, pas de français",
  "en+": "Bilingue, anglais d’abord",
  "fr":  "Français, pas d’anglais",
  "fr+": "Bilingue, français d’abord",
  "al":  "Autres langues seulement"
};
const countryName = new Intl.DisplayNames([ "fr-CA" ], { type: "region" });
const languageName = new Intl.DisplayNames([ "fr-CA" ], { type: "language" });
const screenBreakpointsDict = {
  "desktop": "Grand <small>(>1080px)</small>",
  "tablet":  "Moyen <small>(≤1080px)</small>",
  "mobile":  "Petit <small>(≤800px)</small>",
  "xsmall":  "Mini <small>(≤360px)</small>"
};
const excludedTrafficDict = {
  "dev": "Développeurs",
  "bots": "Robots",
  "spam": "Spam",
  "filtered": "Filtré"
};
const preferencesDict = {
  "darkMode": "Thème sombre",
  "moreContrast": "Plus de contraste",
  "lessMotion": "Moins de mouvement"
};
const errorsDict = {
  "noData": "Aucune donnée disponible.",
  "noMatchingSessions": "Aucune session ne correspond à la requête.",
  "noOrigins": "Aucune origine disponible.",
  "ipGeoUnavailable": "Le serveur n’arrive pas à se connecter à ipinfo.io.",
};


/**
 * Replaces "" with "Indéterminé", otherwise returns the input.
 * @param {string} input
 * @returns {string}
 */
function _identity(input) {
  if (input === "") return "Indéterminé";
  return input;
}


/**
 * Converts the referral channel code to a French string.
 * @param {string} input
 * @returns {string}
 */
function niceReferralChannelName(input) {
  return referralChannelsDict[input];
}


/**
 * Simplifies the URL.
 * @param {string} input
 * @returns {string}
 */
function niceOriginName(input) {
  // Don’t touch variants of the current origin.
  if (input.includes(origin)) return input;
  return input.replace("https://", "").replace("www.", "");
}


/**
 * Converts the bilingualism class code to a short explanation string.
 * @param {string} input
 * @returns {string}
 */
function niceBilingualismName(input) {
  return bilingualismClassesDict[input];
}


/**
 * Converts a 2-letter region code to its local short-form.
 * @param {string} input
 * @returns {string}
 */
function niceCountryName(input) {
  const name = countryName.of(input);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Converts a 2-letter language code to its local form.
 * @param {string} input
 * @returns {string}
 */
function niceLanguageName(input) {
  const name = languageName.of(input);
  return name.charAt(0).toUpperCase() + name.slice(1);
}


/**
 * Converts the breakpoint name to a French string.
 * @param {string} input
 * @returns {string}
 */
function niceScreenBreakpointName(input) {
  return screenBreakpointsDict[input];
}


/**
 * Converts the breakpoint name to a French string.
 * @param {string} input
 * @returns {string}
 */
function niceExcludedTrafficName(input) {
  return excludedTrafficDict[input];
}


function nicePreferenceName(input) {
  return preferencesDict[input];
}


/**
 * Converts an error code to a French explanation.
 * @param {string} input
 * @returns {string}
 */
function niceErrorName(input) {
  return errorsDict[input] ?? input;
}
