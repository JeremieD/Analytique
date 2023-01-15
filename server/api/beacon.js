class Beacon {
  #definition;

  constructor(raw) {
    this._raw = raw;

    this._values = raw.split("\t");

    this.version = this._values[0];

    if (!Beacon.definitions.hasOwnProperty(this.version)) throw new Error("unknownBeaconVersion");
    this.#definition = Beacon.definitions[this.version];

    if (this._values.length !== this.#definition.length) throw new Error("invalidBeaconLength")
  }

  get time() { return parseInt(this._values[this.#definition.indexOf("time")]); }
  get timezoneOffset() { return parseInt(this._values[this.#definition.indexOf("timezoneOffset")]); }

  get pageTitle() { return decodeURI(this._values[this.#definition.indexOf("pageTitle")]); }
  get pageURL() { return decodeURI(this._values[this.#definition.indexOf("pageURL")]); }
  get pageReferrer() { return decodeURI(this._values[this.#definition.indexOf("pageReferrer")]); }

  get language() { return this._values[this.#definition.indexOf("language")]; }
  get languages() { return this._values[this.#definition.indexOf("languages")].split(","); }

  get innerWindowSize() {
    const values = this._values[this.#definition.indexOf("innerWindowSize")].split("x").map(n => parseInt(n));
    if (values.length !== 2) return undefined;
    if (!Number.isInteger(values[0]) || !Number.isInteger(values[1])) return undefined;
    return { width: values[0], height: values[1] };
  }
  get outerWindowSize() {
    const values = this._values[this.#definition.indexOf("outerWindowSize")].split("x").map(n => parseInt(n));
    if (values.length !== 2) return undefined;
    if (!Number.isInteger(values[0]) || !Number.isInteger(values[1])) return undefined;
    return { width: values[0], height: values[1] };
  }

  get prefersDarkTheme() {
    return !!+this._values[this.#definition.indexOf("prefersDarkTheme")];
  }
  get prefersReducedMotion() {
    return !!+this._values[this.#definition.indexOf("prefersReducedMotion")];
  }
  get prefersMoreContrast() {
    return !!+this._values[this.#definition.indexOf("prefersMoreContrast")];
  }

  get userAgent() { return decodeURI(this._values[this.#definition.indexOf("userAgent")]); }
  get ipAddress() { return this._values[this.#definition.indexOf("ipAddress")]; }

  static definitions = {
    "a": [ // Alpha version beacon (v0.1–v0.6)
      "version",
      "time",
      "timezoneOffset",
      "pageTitle",
      "pageURL",
      "pageReferrer",
      "language",
      "languages",
      "innerWindowSize",
      "outerWindowSize",
      "userAgent",
      "ipAddress"
    ],
    "b": [ // Beta version beacon (v0.7–v0.9)
      "version",
      "time",
      "timezoneOffset",
      "pageTitle",
      "pageURL",
      "pageReferrer",
      "language",
      "languages",
      "innerWindowSize",
      "outerWindowSize",
      "prefersDarkTheme",
      "prefersReducedMotion",
      "prefersMoreContrast",
      "userAgent",
      "ipAddress"
    ]
  }
}

try {
  global.Beacon = Beacon;
} catch (e) {}
