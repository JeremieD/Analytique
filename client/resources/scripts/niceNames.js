const referralChannelsDict = {
  "direct": "Direct/inconnu",
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
  "AX": "Åland",
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
  "CI": "Côte d’Ivoire",
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
  "IO": "Territoire britannique de l’océan Indien",
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
  "PS": "Palestine",
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
const languagesDict = {
  "aa": "Afar",
  "ab": "Abkhaze",
  "ae": "Avestique",
  "af": "Afrikaans",
  "ak": "Akan",
  "am": "Amharique",
  "an": "Aragonais",
  "ar": "Arabe",
  "as": "Assamais",
  "av": "Avar",
  "ay": "Aymara",
  "az": "Azéri",
  "ba": "Bachkir",
  "be": "Biélorusse",
  "bg": "Bulgare",
  "bh": "Langues biharies",
  "bi": "Bichelamar",
  "bm": "Bambara",
  "bn": "Bengali",
  "bo": "Tibétain",
  "br": "Breton",
  "bs": "Bosnien",
  "ca": "Catalan",
  "ce": "Tchétchène",
  "ch": "Chamorro",
  "co": "Corse",
  "cr": "Cri",
  "cs": "Tchèque",
  "cu": "Vieux-slave",
  "cv": "Tchouvache",
  "cy": "Gallois",
  "da": "Danois",
  "de": "Allemand",
  "dv": "Maldivien",
  "dz": "Dzongkha",
  "ee": "Éwé",
  "el": "Grec",
  "en": "Anglais",
  "eo": "Espéranto",
  "es": "Espagnol",
  "et": "Estonien",
  "eu": "Basque",
  "fa": "Persan",
  "ff": "Peul",
  "fi": "Finnois",
  "fj": "Fidjien",
  "fo": "Féroïen",
  "fr": "Français",
  "fy": "Frison occidental",
  "ga": "Irlandais",
  "gd": "Écossais",
  "gl": "Galicien",
  "gn": "Guarani",
  "gu": "Gujarati",
  "gv": "Mannois",
  "ha": "Haoussa",
  "he": "Hébreu",
  "hi": "Hindi",
  "ho": "Hiri motu",
  "hr": "Croate",
  "ht": "Créole haïtien",
  "hu": "Hongrois",
  "hy": "Arménien",
  "hz": "Héréro",
  "ia": "Interlingua",
  "id": "Indonésien",
  "ie": "Interlingue",
  "ig": "Igbo",
  "ii": "Yi",
  "ik": "Inupiaq",
  "io": "Ido",
  "is": "Islandais",
  "it": "Italien",
  "iu": "Inuktitut",
  "ja": "Japonais",
  "jv": "Javanais",
  "ka": "Géorgien",
  "kg": "Kikongo",
  "ki": "Kikuyu",
  "kj": "Kuanyama",
  "kk": "Kazakh",
  "kl": "Groenlandais",
  "km": "Khmer",
  "kn": "Kannada",
  "ko": "Coréen",
  "kr": "Kanouri",
  "ks": "Cachemiri",
  "ku": "Kurde",
  "kv": "Komi",
  "kw": "Cornique",
  "ky": "Kirghiz",
  "la": "Latin",
  "lb": "Luxembourgeois",
  "lg": "Ganda",
  "li": "Limbourgeois",
  "ln": "Lingala",
  "lo": "Lao",
  "lt": "Lituanien",
  "lu": "Luba-kasaï",
  "lv": "Letton",
  "mg": "Malgache",
  "mh": "Marshallais",
  "mi": "Maori",
  "mk": "Macédonien",
  "ml": "Malayalam",
  "mn": "Mongol",
  "mr": "Marathi",
  "ms": "Malais",
  "mt": "Maltais",
  "my": "Birman",
  "na": "Nauruan",
  "nb": "Bokmål (norvégien)",
  "nd": "Ndébélé du Nord",
  "ne": "Népalais",
  "ng": "Ndonga",
  "nl": "Néerlandais",
  "nn": "Nynorsk (norvégien)",
  "no": "Norvégien",
  "nr": "Ndébélé du Sud",
  "nv": "Navajo",
  "ny": "Chewa",
  "oc": "Occitan",
  "oj": "Ojibwé",
  "om": "Oromo",
  "or": "Oriya",
  "os": "Ossète",
  "pa": "Pendjabi",
  "pi": "Pali",
  "pl": "Polonais",
  "ps": "Pachto",
  "pt": "Portugais",
  "qu": "Quechua",
  "rm": "Romanche",
  "rn": "Kirundi",
  "ro": "Roumain",
  "ru": "Russe",
  "rw": "Kinyarwanda",
  "sa": "Sanskrit",
  "sc": "Sarde",
  "sd": "Sindhi",
  "se": "Same du Nord",
  "sg": "Sango",
  "si": "Singhalais",
  "sk": "Slovaque",
  "sl": "Slovène",
  "sm": "Samoan",
  "sn": "Shona",
  "so": "Somali",
  "sq": "Albanais",
  "sr": "Serbe",
  "ss": "Swati",
  "st": "Sotho du Sud",
  "su": "Soundanais",
  "sv": "Suédois",
  "sw": "Swahili",
  "ta": "Tamoul",
  "te": "Télougou",
  "tg": "Tadjik",
  "th": "Thaï",
  "ti": "Tigrigna",
  "tk": "Turkmène",
  "tl": "Tagalog",
  "tn": "Tswana",
  "to": "Tongien",
  "tr": "Turc",
  "ts": "Tsonga",
  "tt": "Tatar",
  "tw": "Twi",
  "ty": "Tahitien",
  "ug": "Ouïgour",
  "uk": "Ukrainien",
  "ur": "Ourdou",
  "uz": "Ouzbek",
  "ve": "Venda",
  "vi": "Vietnamien",
  "vo": "Volapük",
  "wa": "Wallon",
  "wo": "Wolof",
  "xh": "Xhosa",
  "yi": "Yiddish",
  "yo": "Yoruba",
  "za": "Zhuang",
  "zh": "Chinois",
  "zu": "Zoulou",
  "": "Indéterminé"
};
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
 * Converts an ISO 3166 2-letter country code to its French short-form.
 * @param {string} input
 * @returns {string}
 */
function niceCountryName(input) {
  return countriesDict[input] ?? input;
}

/**
 * Converts an ISO 639 2-letter language code to its French form.
 * @param {string} input
 * @returns {string}
 */
function niceLanguageName(input) {
  return languagesDict[input.slice(0, 2)] ?? input;
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
