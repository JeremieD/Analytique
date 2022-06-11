const acquisitionChannelsDict = {
  "direct": "Direct",
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
const countriesDict = {
  "AD": "Andorre",
  "AE": "Émirats arabes unis",
  "AF": "Afghanistan",
  "AG": "Antigua-et-Barbuda",
  "AI": "Anguilla",
  "AL": "Albanie",
  "AM": "Arménie",
  "AO": "Angola",
  "AQ": "Antarctique",
  "AR": "Argentine",
  "AS": "Samoa américaines",
  "AT": "Autriche",
  "AU": "Australie",
  "AW": "Aruba",
  "AX": "Åland(les Îles)",
  "AZ": "Azerbaïdjan",
  "BA": "Bosnie-Herzégovine",
  "BB": "Barbade",
  "BD": "Bangladesh",
  "BE": "Belgique",
  "BF": "Burkina Faso",
  "BG": "Bulgarie",
  "BH": "Bahreïn",
  "BI": "Burundi",
  "BJ": "Bénin",
  "BL": "Saint-Barthélemy",
  "BM": "Bermudes",
  "BN": "Brunéi",
  "BO": "Bolivie",
  "BQ": "Caraïbes néerlandaises",
  "BR": "Brésil",
  "BS": "Bahamas",
  "BT": "Bhoutan",
  "BV": "Île Bouvet",
  "BW": "Botswana",
  "BY": "Bélarus",
  "BZ": "Belize",
  "CA": "Canada",
  "CC": "Îles Cocos",
  "CD": "République démocratique du Congo",
  "CF": "République centrafricaine",
  "CG": "Congo",
  "CH": "Suisse",
  "CI": "Côte d'Ivoire",
  "CK": "Îles Cook",
  "CL": "Chili",
  "CM": "Cameroun",
  "CN": "Chine",
  "CO": "Colombie",
  "CR": "Costa Rica",
  "CU": "Cuba",
  "CV": "Cabo Verde",
  "CW": "Curaçao",
  "CX": "Île Christmas",
  "CY": "Chypre",
  "CZ": "Tchéquie",
  "DE": "Allemagne",
  "DJ": "Djibouti",
  "DK": "Danemark",
  "DM": "Dominique",
  "DO": "République dominicaine",
  "DZ": "Algérie",
  "EC": "Équateur",
  "EE": "Estonie",
  "EG": "Égypte",
  "EH": "Sahara occidental",
  "ER": "Érythrée",
  "ES": "Espagne",
  "ET": "Éthiopie",
  "FI": "Finlande",
  "FJ": "Fidji",
  "FK": "Îles Malouines",
  "FM": "Micronésie",
  "FO": "Îles Féroé",
  "FR": "France",
  "GA": "Gabon",
  "GB": "Royaume-Uni",
  "GD": "Grenade",
  "GE": "Géorgie",
  "GF": "Guyane française",
  "GG": "Guernesey",
  "GH": "Ghana",
  "GI": "Gibraltar",
  "GL": "Groenland",
  "GM": "Gambie",
  "GN": "Guinée",
  "GP": "Guadeloupe",
  "GQ": "Guinée équatoriale",
  "GR": "Grèce",
  "GS": "Géorgie du Sud-et-les îles Sandwich du Sud",
  "GT": "Guatemala",
  "GU": "Guam",
  "GW": "Guinée-Bissau",
  "GY": "Guyana",
  "HK": "Hong Kong",
  "HM": "Îles Heard-et-MacDonald",
  "HN": "Honduras",
  "HR": "Croatie",
  "HT": "Haïti",
  "HU": "Hongrie",
  "ID": "Indonésie",
  "IE": "Irlande",
  "IL": "Israël",
  "IM": "Île de Man",
  "IN": "Inde",
  "IO": "Territoire britannique de l'océan Indien",
  "IQ": "Iraq",
  "IR": "Iran",
  "IS": "Islande",
  "IT": "Italie",
  "JE": "Jersey",
  "JM": "Jamaïque",
  "JO": "Jordanie",
  "JP": "Japon",
  "KE": "Kenya",
  "KG": "Kirghizistan",
  "KH": "Cambodge",
  "KI": "Kiribati",
  "KM": "Comores",
  "KN": "Saint-Kitts-et-Nevis",
  "KP": "Corée du Nord",
  "KR": "Corée du Sud",
  "KW": "Koweït",
  "KY": "Îles Caïmans",
  "KZ": "Kazakhstan",
  "LA": "Laos",
  "LB": "Liban",
  "LC": "Sainte-Lucie",
  "LI": "Liechtenstein",
  "LK": "Sri Lanka",
  "LR": "Libéria",
  "LS": "Lesotho",
  "LT": "Lituanie",
  "LU": "Luxembourg",
  "LV": "Lettonie",
  "LY": "Libye",
  "MA": "Maroc",
  "MC": "Monaco",
  "MD": "Moldavie",
  "ME": "Monténégro",
  "MF": "Saint-Martin (partie française)",
  "MG": "Madagascar",
  "MH": "Îles Marshall",
  "MK": "Macédoine du Nord",
  "ML": "Mali",
  "MM": "Myanmar",
  "MN": "Mongolie",
  "MO": "Macao",
  "MP": "Îles Mariannes du Nord",
  "MQ": "Martinique",
  "MR": "Mauritanie",
  "MS": "Montserrat",
  "MT": "Malte",
  "MU": "Maurice",
  "MV": "Maldives",
  "MW": "Malawi",
  "MX": "Mexique",
  "MY": "Malaisie",
  "MZ": "Mozambique",
  "NA": "Namibie",
  "NC": "Nouvelle-Calédonie",
  "NE": "Niger",
  "NF": "Île Norfolk",
  "NG": "Nigéria",
  "NI": "Nicaragua",
  "NL": "Pays-Bas",
  "NO": "Norvège",
  "NP": "Népal",
  "NR": "Nauru",
  "NU": "Niue",
  "NZ": "Nouvelle-Zélande",
  "OM": "Oman",
  "PA": "Panama",
  "PE": "Pérou",
  "PF": "Polynésie française",
  "PG": "Papouasie-Nouvelle-Guinée",
  "PH": "Philippines",
  "PK": "Pakistan",
  "PL": "Pologne",
  "PM": "Saint-Pierre-et-Miquelon",
  "PN": "Pitcairn",
  "PR": "Porto Rico",
  "PS": "Palestine, État de",
  "PT": "Portugal",
  "PW": "Palaos",
  "PY": "Paraguay",
  "QA": "Qatar",
  "RE": "La Réunion",
  "RO": "Roumanie",
  "RS": "Serbie",
  "RU": "Russie",
  "RW": "Rwanda",
  "SA": "Arabie saoudite",
  "SB": "Îles Salomon",
  "SC": "Seychelles",
  "SD": "Soudan",
  "SE": "Suède",
  "SG": "Singapour",
  "SH": "Sainte-Hélène, Ascension et Tristan da Cunha",
  "SI": "Slovénie",
  "SJ": "Svalbard et Jan Mayen",
  "SK": "Slovaquie",
  "SL": "Sierra Leone",
  "SM": "Saint-Marin",
  "SN": "Sénégal",
  "SO": "Somalie",
  "SR": "Suriname",
  "SS": "Soudan du Sud",
  "ST": "Sao Tomé-et-Principe",
  "SV": "El Salvador",
  "SX": "Saint-Martin (partie néerlandaise)",
  "SY": "Syrie",
  "SZ": "Eswatini",
  "TC": "Îles Turques et Caïques",
  "TD": "Tchad",
  "TF": "Terres australes françaises",
  "TG": "Togo",
  "TH": "Thaïlande",
  "TJ": "Tadjikistan",
  "TK": "Tokelau",
  "TL": "Timor-Leste",
  "TM": "Turkménistan",
  "TN": "Tunisie",
  "TO": "Tonga",
  "TR": "Turquie",
  "TT": "Trinité-et-Tobago",
  "TV": "Tuvalu",
  "TW": "Taïwan",
  "TZ": "Tanzanie",
  "UA": "Ukraine",
  "UG": "Ouganda",
  "UM": "Îles mineures éloignées des États-Unis",
  "US": "États-Unis",
  "UY": "Uruguay",
  "UZ": "Ouzbékistan",
  "VA": "Vatican",
  "VC": "Saint-Vincent-et-les Grenadines",
  "VE": "Venezuela",
  "VG": "Îles Vierges britanniques",
  "VI": "Îles Vierges des États-Unis",
  "VN": "Viet Nam",
  "VU": "Vanuatu",
  "WF": "Wallis-et-Futuna",
  "WS": "Samoa",
  "YE": "Yémen",
  "YT": "Mayotte",
  "ZA": "Afrique du Sud",
  "ZM": "Zambie",
  "ZW": "Zimbabwe",
  "": "Indéterminé"
};
const screenBreakpointsDict = {
  "desktop": "Grand <small>(>1080px)</small>",
  "tablet":  "Moyen <small>(≤1080px)</small>",
  "mobile":  "Petit <small>(≤800px)</small>",
  "xsmall":  "Mini <small>(≤360px)</small>"
};
const excludedTrafficDict = {
  "tests": "Moi",
  "bots":  "Robots",
  "spam":  "Spam",
};
const errorsDict = {
  "noData": "Aucune donnée disponible.",
  "noMatchingSessions": "Aucune session ne correspond à la requête.",
  "noOrigins": "Aucune origine disponible.",
  "ipGeoUnavailable": "Le serveur n’arrive pas à se connecter à ipinfo.io.",
  "malformedBeacon": "Il y a une erreur dans les données de vues."
};


/**
 * Replaces "" with "Indéterminé", otherwise returns the input.
 * @param {string} input
 * @returns {string}
 */
function _identity(input) {
  if (input === "") {
    return "Indéterminé";
  }
  return input;
}


/**
 * Converts the acquisition channel code to a French string.
 * @param {string} input
 * @returns {string}
 */
function niceAcquisitionChannelName(input) {
  return acquisitionChannelsDict[input];
}


/**
 * Simplifies the URL.
 * @param {string} input
 * @returns {string}
 */
function niceOriginName(input) {
  // Don’t touch variants of the current origin.
  if (input.includes(origin)) return input;

  return input.replace("https://", "")
              .replace("www.", "");
}


/**
 * Converts the bilingualism class code to a short explanation string.
 * @param {string} input
 * @returns {string}
 */
function niceBilingualismClassName(input) {
  return bilingualismClassesDict[input];
}


/**
 * Converts an ISO 3166 2-letter country code to its French short-form.
 * @param {string} input
 * @returns {string}
 */
function niceCountryName(input) {
  if (countriesDict[input]) {
    return countriesDict[input];
  }
  return input;
}


/**
 * Converts the breakpoint name to a French string.
 * @param {string} input
 * @returns {string}
 */
function niceScreenBreakpointsName(input) {
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


/**
 * Converts an error code to a French explanation.
 * @param {string} input
 * @returns {string}
 */
function niceErrorName(input) {
  if (errorsDict[input]) {
    return errorsDict[input];
  }
  return input;
}
