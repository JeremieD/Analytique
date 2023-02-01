/**
 * Date object based on the proleptic Gregorian calendar, with astronomical year
 * numbering (1 BC = 0, 2 BC = -1), months 1-12, (ISO) weeks 1-53, days 1-31,
 * and days of the week 0-6, where 0 is Monday.
 *
 * Version: 0.9.1
 *
*/
class _JDDate {
  constructor() {
    if (this.constructor == _JDDate) throw new Error();
  }

  get isNow() {
      switch (this.unit) {
        case "year":
          return this.equals(JDDate.thisYear());
        case "month":
          return this.equals(JDDate.thisMonth());
        case "week":
          return this.equals(JDDate.thisWeek());
        case "day":
          return this.equals(JDDate.today());
      }
    }

  // Commutative
  equals(b) { return this.canonicalForm === b.canonicalForm; }

  // Non-commutative
  // *Stricly* before, meaning the entire range is before the entire other range.
  isBefore(b) { return this.last("ms") < b.first("ms"); }

  // Non-commutative
  isBeforeOrIntersects(b) { return !this.isAfter(b); }

  // Non-commutative
  // *Stricly* after, meaning the entire range is after the entire other range.
  isAfter(b) { return this.first("ms") > b.last("ms"); }

  // Non-commutative
  isAfterOrIntersects(b) { return !this.isBefore(b); }

  // Non-commutative
  contains(b) {
    return this.first().isBeforeOrIntersects(b.first())
        && this.last().isAfterOrIntersects(b.last());
  }

  // Commutative
  intersects(b) { return !this.isBefore(b) && !this.isAfter(b); }

  each(unit = this.unit) {
    unit = JDDate._normalizeUnit(unit);
    const array = [];
    const pointer = this.first(unit);
    const end = this.last(unit);

    while (!pointer.isAfter(end)) {
      array.push(new JDDate(pointer));
      pointer.next();
    }
    return array;
  }

  [Symbol.iterator]() {
    const pointer = this.first(this.unit).previous();
    const end = this.last(this.unit);
    return {
      next: () => ({
        value: pointer.next(),
        done: pointer.isAfter(end) })
    };
  }

  // Mutates the object.
  convertTo(unit, options = {}) {
    return this.set(this.convertedTo(unit, options));
  }

  formatted(style = "long", options = {}) {
    const start = this.start ?? this;
    const end = this.end ?? this;
    const isInterval = !start.equals(end);

    let formatted = "";

    switch (style) {
      case "long":
        // Options for long style.
        options.language ??= "fr";
        options.useNowForms ??= false;
        options.capitalize ??= false;
        options.outputNBSPs ??= true;
        options.outputSUPTag ??= false;
        options.omitSameValues ??= true;
        options.monthStyle ??= "full";
        options.outputDayOfWeek ??= false;
        options.dayOfWeekStyle ??= "full";

        const dictionary = {
          fr: {
            month: m => {
              const styles = {
                "full": [ "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre" ],
                "abbr": [ "janv.", "févr.", "mars", "avr.", "mai", "juin", "juill.", "août", "sept.", "oct.", "nov.", "déc." ]
              };
              if (!styles.hasOwnProperty(options.monthStyle)) throw new Error("undefinedMonthStyle");
              return styles[options.monthStyle][m - 1];
            },
            daySuffix: d => d === 1 ? (options.outputSUPTag ? "<sup>er</sup>" : "er") : "",
            dayOfWeek: d => {
              const styles = {
                full: [ "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche" ],
                abbr: [ "lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim." ]
              };
              if (!styles.hasOwnProperty(options.dayOfWeekStyle)) throw new Error("undefinedDayOfWeekStyle");
              return styles[options.dayOfWeekStyle][d];
            },
            now: {
              year: "cette année",
              month: "ce mois-ci",
              week: "cette semaine",
              day: "aujourd’hui"
            },
            intervalInfix: () => end.unit === "day" && !end.isNow ? "au" : "à"
          }
        };
        const dict = dictionary[options.language];

        switch (this.unit) {
          case "year":
            if (options.useNowForms && start.isNow) {
              formatted += dict.now.year;
            } else {
              formatted += start.year;
            }
            if (isInterval) {
              formatted += " " + dict.intervalInfix(end) + " ";
              if (options.useNowForms && end.isNow) {
                formatted += dict.now.year;
              } else {
                formatted += end.year;
              }
            }
            break;
          case "month":
            if (options.useNowForms && start.isNow) {
              formatted += dict.now.month;
            } else {
              formatted += dict.month(start.month);
              if (!options.omitSameValues || end.isNow || !isInterval ||
                  start.year !== end.year) {
                formatted += " " + start.year;
              }
            }
            if (isInterval) {
              formatted += " " + dict.intervalInfix(end) + " ";
              if (options.useNowForms && end.isNow) {
                formatted += dict.now.month;
              } else {
                formatted += dict.month(end.month) + " " + end.year;
              }
            }
            break;
          case "week":
            if (options.useNowForms && start.isNow) {
              formatted += dict.now.week;
            } else {
              formatted += "S" + start.week;
              if (!options.omitSameValues || end.isNow || !isInterval ||
                  start.year !== end.year) {
                formatted += " " + start.year;
              }
            }

            if (isInterval) {
              formatted += " " + dict.intervalInfix(end) + " ";
              if (options.useNowForms && end.isNow) {
                formatted += dict.now.week;
              } else {
                formatted += "S" + end.week + " " + end.year;
              }
            }
            break;
          case "day":
            if (options.useNowForms && start.isNow) {
              formatted += dict.now.day;
            } else {
              if (options.outputDayOfWeek) {
                formatted += dict.dayOfWeek(start.dayOfWeek) + " ";
              }
              formatted += start.day;
              formatted += dict.daySuffix(start.day);
              if (!options.omitSameValues || end.isNow || !isInterval ||
                  start.month !== end.month || start.year !== end.year) {
                formatted += " " + dict.month(start.month);
              }
              if (!options.omitSameValues || end.isNow || !isInterval ||
                  start.year !== end.year) {
                formatted += " " + start.year;
              }
            }
            if (isInterval) {
              formatted += " " + dict.intervalInfix(end) + " ";
              if (options.useNowForms && end.isNow) {
                formatted += dict.now.day;
              } else {
                if (options.outputDayOfWeek) {
                  formatted += dict.dayOfWeek(end.dayOfWeek) + " ";
                }
                formatted += end.day;
                formatted += dict.daySuffix(end.day);
                formatted += " " + dict.month(end.month) + " " + end.year;
              }
            }
            break;
        }

        if (options.capitalize) formatted = formatted[0].toUpperCase() + formatted.substring(1);
        if (!options.outputNBSPs) formatted = formatted.replaceAll(" ", " ");

        return formatted;

      case "short":
        // Options for short style.
        options.unitSeparator ??= "-";
        options.boundSeparator ??= "—";
        options.unitsOrder ??= ">";
        options.fixedLengthValues ??= true;
        options.truncateYear ??= false;

        const year = d => {
          return options.truncateYear ? String(d.year).slice(-2) : d.year;
        };
        const month = d => {
          if (this.unit !== "month" && this.unit !== "day") return undefined;
          return options.fixedLengthValues ? String(d.month).padStart(2, "0") : d.month;
        };
        const week = d => {
          if (this.unit !== "week") return undefined;
          return "W" + (options.fixedLengthValues ? String(d.week).padStart(2, "0") : d.week);
        };
        const day = d => {
          if (this.unit !== "day") return undefined;
          return options.fixedLengthValues ? String(d.day).padStart(2, "0") : d.day;
        };

        const order = {
          ">": [ year, month, week, day ],
          "<": [ day, week, month, year ],
          "american": [ month, day, year, week ],
        };

        const bounds = [ start ];
        if (isInterval) bounds.push(end);

        const tokens = [];

        for (let i = 0; i < bounds.length; i++) {
          for (let value of order[options.unitsOrder]) {
            value = value(bounds[i]);
            if (tokens[i] === undefined) tokens[i] = [];
            if (value) tokens[i].push(value);
          }
        }

        return tokens.map(t => t.join(options.unitSeparator)).join(options.boundSeparator);

      default:
        throw new Error("undefinedFormatStyle");
    }
  }
}


class JDDate extends _JDDate {
  constructor(...args) {
    super();
    if (args.length === 0) {
      args[0] = JDDate.today();
    }
    this.set(...args);
  }

  // Mutates the object.
  set(...args) {
    delete this.year;
    delete this.month;
    delete this.week;
    delete this.day;

    // From canonical form
    if (args.length === 1 && typeof args[0] === "string") {
      let matches = args[0].match(/^(-?\d{4,6})(?:(?:-(\d{2}))?(?:-(\d{2}))?|(?:-W(\d{2})))$/);

      if (!matches || matches.length < 2) throw new Error("malformedDate");

      if (matches[1] !== undefined) {
        this.year = parseInt(matches[1]);
        this.unit = "year";
      }

      if (matches[2] !== undefined) {
        this.month = parseInt(matches[2]);
        this.unit = "month";

        if (matches[3] !== undefined) {
          this.day = parseInt(matches[3]);
          this.unit = "day";
        }
      }

      if (matches[4] !== undefined) {
        this.week = parseInt(matches[4]);
        this.unit = "week";
      }

    // From numbers
    } else if (args.length <= 3 && typeof args[0] === "number") {
      this.year = args[0];
      this.unit = "year";

      if (typeof args[1] === "number") {
        this.month = args[1];
        this.unit = "month";

        if (typeof args[2] === "number") {
          this.day = args[2];
          this.unit = "day";
        } else if (args[2] !== undefined) throw new Error("malformedDate");

      } else if (typeof args[1] === "string" && args[1][0] === "W") {
        this.week = parseInt(args[1].substr(1));
        this.unit = "week";

      } else if (args[1] !== undefined) throw new Error("malformedDate");

    // From vanilla Date
    } else if (args.length === 1 && args[0] instanceof Date) {
      return this.set(args[0].getFullYear(), args[0].getMonth() + 1, args[0].getDate());

    // From other JDDate (make a copy)
    } else if (args.length === 1 && args[0] instanceof JDDate) {
      return this.set(args[0].canonicalForm);

    } else {
      throw new Error("malformedDate");
    }

    // Check bounds
    JDDate._validateYear(this.year);
    JDDate._validateMonth(this.month);
    JDDate._validateWeek(this.year, this.week);
    JDDate._validateDay(this.year, this.month, this.day);

    return this;
  }

  get dayOfWeek() {
    if (this.unit !== "day") throw new Error("undefinedForUnit");
    const date = new Date(this.year, this.month - 1, this.day);
    date.setFullYear(this.year);
    return (date.getDay() + 6) % 7;
  }

  get dayOfYear() {
    if (this.unit !== "day") throw new Error("undefinedForUnit");
    const monthOffset = [
        0,  31,  59,  90, 120, 151,
      181, 212, 243, 273, 304, 334
    ];
    const leapYearOffset = JDDate.isLeapYear(this.year) && this.month > 2 ? 1 : 0;
    return monthOffset[this.month - 1] + leapYearOffset + this.day;
  }

  // Returns a new object.
  advancedBy(n) {
    const sign = Math.sign(n);

    let newYear = this.year;
    let newMonth = this.month;
    let newWeek = this.week;
    let newDay = this.day;

    switch (this.unit) {
      case "year":
        return new JDDate(this.year + n);

      case "month":
        if (sign === 1) {
          for (let i = 0; i < n; i++) {
            if (newMonth === 12) {
              newYear++;
              newMonth = 1;
            } else { newMonth++; }
          }

        } else {
          for (let i = 0; i < Math.abs(n); i++) {
            if (newMonth === 1) {
              newYear--;
              newMonth = 12;
            } else { newMonth--; }
          }
        }

        return new JDDate(newYear, newMonth);

      case "week":
        if (sign === 1) {
          for (let i = 0; i < n; i++) {
            if (newWeek === JDDate.weeksInYear(newYear)) {
              newYear++;
              newWeek = 1;
            } else { newWeek++; }

          }

        } else {
          for (let i = 0; i < Math.abs(n); i++) {
            if (newWeek === 1) {
              newYear--;
              newWeek = JDDate.weeksInYear(newYear);
            } else { newWeek--; }
          }
        }

        return new JDDate(newYear, "W" + String(newWeek).padStart(2, "0"));

      case "day":
        if (sign === 1) {
          for (let i = 0; i < n; i++) {
            if (newDay === JDDate.daysInMonth(newYear, newMonth)) {
              if (newMonth === 12) {
                newYear++;
                newMonth = 1;
              } else { newMonth++; }

              newDay = 1;

            } else { newDay++; }
          }
        } else {
          for (let i = 0; i < Math.abs(n); i++) {
            if (newDay === 1) {
              if (newMonth === 1) {
                newYear--;
                newMonth = 12;
              } else { newMonth--; }

              newDay = JDDate.daysInMonth(newYear, newMonth);

            } else { newDay--; }
          }
        }

        return new JDDate(newYear, newMonth, newDay);
    }
  }

  // Mutates the object.
  plus(n) { return this.set(this.advancedBy(n)); }
  minus(n) { return this.set(this.advancedBy(-n)); }
  next(n = 1) { return this.plus(n); }
  previous(n = 1) { return this.minus(n); }

  duration(unit = "day") {
    unit = JDDate._normalizeUnit(unit);
    if (unit === this.unit) return 1;

    switch (unit) {
      case "day":
        switch (this.unit) {
          case "week": // How many days in that week?
            return 7;
          case "month": // How many days in that month?
            return JDDate.daysInMonth(this.year, this.month);
          case "year": // How many days in that year?
            return JDDate.daysInYear(this.year);
        }
      case "week":
        switch (this.unit) {
          case "day": // How many weeks in that day?
            return 1/7;
          case "month": // How many weeks in that month?
            return JDDate.weeksInMonth(this.year, this.month);
          case "year": // How many weeks in that year?
            return JDDate.weeksInYear(this.year);
        }
      case "month":
        switch (this.unit) {
          case "day": // How many months in that day?
            return 1/30;
          case "week": // How many months in that week?
            return 1/4;
          case "year": // How many months in that year?
            return 12;
        }
      case "year":
        switch (this.unit) {
          case "day": // How many years in that day?
            return 1/365;
          case "week": // How many years in that week?
            return 1/52;
          case "month": // How many years in that month?
            return 1/12;
        }
    }

    // return 1 / this.convertedTo(unit).duration(this.unit);
  }

  first(unit = "day") {
    unit = JDDate._normalizeUnit(unit, { allowMillisecond: true });
    if (unit === "millisecond") {
      const firstJDDay = this.first("d");
      const firstDay = new Date(0, 0, 1);
      firstDay.setFullYear(firstJDDay.year);
      firstDay.setMonth(firstJDDay.month - 1);
      firstDay.setDate(firstJDDay.day);
      return firstDay.getTime();
    }
    return this.convertedTo(unit);
  }

  last(unit = "day") {
    unit = JDDate._normalizeUnit(unit, { allowMillisecond: true });
    if (unit === "millisecond") {
      const lastJDDay = this.last("d");
      const lastDay = new Date(0, 0, 1);
      lastDay.setFullYear(lastJDDay.year);
      lastDay.setMonth(lastJDDay.month - 1);
      lastDay.setDate(lastJDDay.day);
      return lastDay.getTime() + 1000*60*60*24 - 1;
    }
    return this.convertedTo(unit, { preferEnd: true });
  }

  // Mutates the object.
  convertedTo(unit, options = {}) {
    unit = JDDate._normalizeUnit(unit);

    const newDate = new JDDate(this);

    if (unit === this.unit) return newDate;

    // Now → Now
    if (options.keepNow && newDate.isNow) return newDate.set(JDDate.now(unit));

    const defaultMonth = options.preferEnd ? 12 : 1;
    const defaultWeek = options.preferEnd ? JDDate.weeksInYear(newDate.year) : 1;
    const defaultDay = options.preferEnd ? JDDate.daysInMonth(newDate.year, this.month ?? defaultMonth) : 1;

    switch (unit) {
      case "year":
        // Week → Year
        if (this.unit === "week") {
          const fourthOfTheWeek = newDate.convertedTo("d").plus(3);
          return newDate.set(fourthOfTheWeek.convertTo("y"));
        }

        // Day/Month → Year
        return newDate.set(this.year);

      case "month":
        // Week → Month
        if (this.unit === "week") {
          const fourthOfTheWeek = this.convertedTo("d").plus(3);
          return newDate.set(fourthOfTheWeek.convertTo("m"));
        }

        // Day/Year → Month
        return newDate.set(this.year, this.month ?? defaultMonth);

      case "week":
        // Month → Week
        if (this.unit === "month") {
          const defaultDayForWeek = options.preferEnd ? 28 : 4;
          return newDate.set((new JDDate(this.year, this.month, defaultDayForWeek)).convertTo("w"));
        }

        // Day → Week
        if (this.unit === "day") {
          const nearestThu = this.advancedBy(3 - this.dayOfWeek);
          const nearestThuOrdinal = nearestThu.dayOfYear;

          const isoYear = nearestThu.year;

          const fourthOfYear = new JDDate(isoYear, 1, 4);
          const nearestThuToFirstOfYear = fourthOfYear.plus(3 - fourthOfYear.dayOfWeek);
          const nearestThuToFirstOfYearOrdinal = nearestThuToFirstOfYear.dayOfYear;

          const weekOfYear = Math.floor((nearestThuOrdinal - nearestThuToFirstOfYearOrdinal) / 7) + 1;

          return newDate.set(isoYear, "W" + String(weekOfYear).padStart(2, "0"));
        }

        // Year → Week
        return newDate.set(this.year, "W" + String(defaultWeek).padStart(2, "0"));

      case "day":
        // Week → Day
        if (this.unit === "week") {
          const fourthOfYear = new JDDate(this.year, 1, 4);
          const nearestThuToFourthOfYear = fourthOfYear.plus(3 - fourthOfYear.dayOfWeek);
          const firstMondayOfYear = nearestThuToFourthOfYear.minus(3);
          const preferEndOffset = options.preferEnd ? 6 : 0;
          return newDate.set(firstMondayOfYear.plus(7 * (newDate.week - 1) + preferEndOffset));
        }

        // Month/Year → Day
        return newDate.set(this.year, this.month ?? defaultMonth, defaultDay);
    }

    // return newDate;
  }

  get canonicalForm() {
    let canonicalForm = Math.sign(this.year) === -1 ? "-" : "";
    canonicalForm += String(Math.abs(this.year)).padStart(4, "0");

    if (this.month) {
      canonicalForm += "-" + String(this.month).padStart(2, "0");
      if (this.day) {
        canonicalForm += "-" + String(this.day).padStart(2, "0");
      }
    } else if (this.week) {
      canonicalForm += "-W" + String(this.week).padStart(2, "0");
    }

    return canonicalForm;
  }

  static today() {
    const now = new Date();
    return new JDDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  static thisWeek() {
    return JDDate.today().convertTo("week");
  }

  static thisMonth() {
    const now = new Date();
    return new JDDate(now.getFullYear(), now.getMonth() + 1);
  }

  static thisYear() {
    const now = new Date();
    return new JDDate(now.getFullYear());
  }

  static now(unit = "day") {
    unit = JDDate._normalizeUnit(unit);
    switch (unit) {
      case "day":
        return JDDate.today();
      case "week":
        return JDDate.thisWeek();
      case "month":
        return JDDate.thisMonth();
      case "year":
        return JDDate.thisYear();
    }
  }

  static isLongYear = y => {
    JDDate._validateYear(y);
    const firstOfJan = (new Date(Date.UTC(0, 0, 1)));
    firstOfJan.setUTCFullYear(y);
    const lastOfDec = (new Date(Date.UTC(0, 11, 31)));
    lastOfDec.setUTCFullYear(y);
    return firstOfJan.getUTCDay() === 4 || lastOfDec.getUTCDay() === 4;
  };

  static weeksInYear = y => JDDate.isLongYear(y) ? 53 : 52;

  static isLongMonth = (y, m) => {
    const lastDay = (new JDDate(y, m)).last("d");
    return lastDay.dayOfWeek === 3 && lastDay.day !== 28
        || lastDay.dayOfWeek === 4 && lastDay.month !== 2
        || lastDay.dayOfWeek === 5 && lastDay.day === 31;
  }

  static weeksInMonth = (y, m) => JDDate.isLongMonth(y, m) ? 5 : 4;

  static isLeapYear = y => {
    JDDate._validateYear(y);
    return y % 400 === 0 || (y % 4 === 0 && y % 100 !== 0);
  };

  static daysInYear = y => JDDate.isLeapYear(y) ? 366 : 365;

  static daysInMonth = (y, m) => {
      JDDate._validateMonth(m);
      switch (m) {
        case 4:
        case 6:
        case 9:
        case 11:
          return 30;
        case 2:
          return JDDate.isLeapYear(y) ? 29 : 28;
      }
      return 31;
    };

  static _validateYear = y => {
    if (y < -200000 || y > 200000) throw new Error("outOfRangeYear");
    if (y !== undefined && !Number.isInteger(y)) throw new Error("illegalYear");
  };

  static _validateMonth = m => {
    if (m < 1 || m > 12 || (m !== undefined && !Number.isInteger(m))) {
      throw new Error("illegalMonth");
    }
  };

  static _validateWeek = (y, w) => {
    if (w < 1 || w > JDDate.weeksInYear(y)
      || (w !== undefined && !Number.isInteger(w))) {
      throw new Error("illegalWeek");
    }
  };

  static _validateDay = (y, m, d) => {
    if (d < 1 || (m !== undefined && d > JDDate.daysInMonth(y, m))
      || (d !== undefined && !Number.isInteger(d))) {
      throw new Error("illegalDay");
    }
  };

  static _normalizeUnit = (u, options = {}) => {
    if (typeof u !== "string") throw new Error("invalidUnit");
    switch (u) {
      case "year":
      case "y":
        return "year";
      case "month":
      case "m":
        return "month";
      case "week":
      case "w":
        return "week";
      case "day":
      case "d":
        return "day";
      case "millisecond":
      case "ms":
        if (options.allowMillisecond) { return "millisecond"; }
    }
    throw new Error("undefinedUnit");
  };
}


class JDDateInterval extends _JDDate {
  constructor(...args) {
    super();
    this.set(...args);
  }

  set(...args) {
    delete this.start;
    delete this.end;

    if (args.length === 0) {
      args[0] = JDDate.today();
    }

    if (typeof args[0] === "string" && args.length === 1) {
      const bounds = args[0].split(":");
      this.start = new JDDate(bounds[0]);
      this.end = new JDDate(bounds[1] ?? bounds[0]);

    } else if (args[0] instanceof JDDateInterval && args.length === 1) {
      return this.set(args[0].canonicalForm);

    } else if (args.length <= 2) {
      this.start = new JDDate(args[0]);
      this.end = new JDDate(args[1] ?? args[0]);

    } else { throw new Error("malformedDate"); }

    if (this.start.unit !== this.end.unit) throw new Error("asymetricUnits");
    this.unit = this.start.unit;

    if (this.end.isBefore(this.start)) throw new Error("endBoundBeforeStartBound");

    return this;
  }

  get isSingular() { return this.start.equals(this.end); }

  // Returns a new object.
  advancedBy(n) {
    return new JDDateInterval(this.start.advancedBy(n), this.end.advancedBy(n));
  }

  // Mutates the object
  // For intervals, these keep the duration fixed.
  next(n = 1) { return this.set(this.advancedBy(n*(this.duration(this.unit)))); }
  previous(n = 1) { return this.next(-n); }

  duration(unit = "day") {
    unit = JDDate._normalizeUnit(unit);
    const rank = {
      "year": 0,
      "month": 1,
      "week": 2,
      "day": 3
    }
    if (rank[unit] < rank[this.unit]) {
      const unitDuration = {
        "month": {
          "year": 1/12
        },
        "week": {
          "year": 1/52,
          "month": 1/4
        },
        "day": {
          "year": 1/365,
          "month": 1/30,
          "week": 1/7
        },
      }
      return this.duration(this.unit) * unitDuration[this.unit][unit];
    }
    return this.each().reduce((total, el) => total + el.duration(unit), 0);
  }

  first(unit = "day") { return this.start.first(unit); }

  last(unit = "day") { return this.end.last(unit); }

  // Returns a new object.
  // Note: "preferEnd" has no effect here.
  convertedTo(unit, options = {}) {
    unit = JDDate._normalizeUnit(unit);

    const newInterval = new JDDateInterval(this);

    if (unit === this.unit) return newInterval;

    // Now → Now
    if (options.keepNow && this.isNow) return newInterval.set(JDDate.now(unit));

    newInterval.start.convertTo(unit);
    newInterval.end.convertTo(unit, { preferEnd: true });

    if (options.forceSingular) {
      if (options.preferEnd) {
        newInterval.start.set(newInterval.end);
      } else {
        newInterval.end.set(newInterval.start);
      }
    }

    return newInterval;
  }

  get canonicalForm() {
    let canonicalForm = this.start.canonicalForm;
    canonicalForm += this.isSingular ? "" : ":" + this.end.canonicalForm;
    return canonicalForm;
  }

  static today() { return new JDDateInterval(JDDate.today()); }
  static thisWeek() { return new JDDateInterval(JDDate.thisWeek()); }
  static thisMonth() { return new JDDateInterval(JDDate.thisMonth()); }
  static thisYear() { return new JDDateInterval(JDDate.thisYear()); }
  static now(unit = "day") { return new JDDateInterval(JDDate.now(unit)); }
}


try {
  global.JDDate = JDDate;
  global.JDDateInterval = JDDateInterval;
} catch (e) {}
