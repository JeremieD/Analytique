/**
 * Custom date object.
 * @property {string} mode - Indicates the "precision" (year, month, week, day) of the date.
 * @property {number} year - Integer year of the date.
 * @property {number} month - Integer month (1-12) of the year, if applicable.
 * @property {number} week - Integer week (1-53) of the year, if applicable.
 * @property {number} day - Integer day (1-31) of the month, if applicable.
 */
class JDDate {
  /**
   * @param {string|number|Date} arg1 - If a string, parses the string according to short-form format. If a Date, converts it a JDDate.
   * @param {number} [arg2] - If all parameters are present and numbers, treats them as the year, month and day, respectively.
   * @param {number} [arg3]
   */
  constructor(arg1, arg2, arg3) {

    /** Changes the date after declaration. See constructor for details. */
    this.set = function(arg1, arg2, arg3) {
      this.year = undefined;
      this.month = undefined;
      this.week = undefined;
      this.day = undefined;

      // Build object from short-form representation.
      if (typeof arg1 === "string") {
        let matches = arg1.match(/^(\d{4})(?:(?:-(\d{2}))?(?:-(\d{2}))?|(?:-W(\d{2})))$/);

        if (!matches || matches.length < 2) throw "malformedDate";

        if (matches[1] !== undefined) {
          this.year = parseInt(matches[1]);
          this.mode = "year";
        }

        if (matches[2] !== undefined) {
          this.month = parseInt(matches[2]);
          this.mode = "month";

          if (matches[3] !== undefined) {
            this.day = parseInt(matches[3]);
            this.mode = "day";
          }
        }

        if (matches[4] !== undefined) {
          this.week = parseInt(matches[4]);
          this.mode = "week";
        }

      // Build object from components.
      } else if (typeof arg1 === "number") {
        if (isNaN(arg1)) throw "malformedDate";
        this.year = arg1;
        this.mode = "year";

        if (typeof arg2 === "number" && !isNaN(arg2)) {
          this.month = arg2;
          this.mode = "month";

          if (typeof arg3 === "number" && !isNaN(arg3)) {
            this.day = arg3;
            this.mode = "day";
          }

        } else if (typeof arg2 === "string" && arg2.startsWith("W")) {
          this.week = parseInt(arg2.substr(1));
          this.mode = "week";
        }

        // Build object from Date object.
      } else if (arg1 instanceof Date) {
        this.mode = "day";
        this.year = arg1.getFullYear();
        this.month = arg1.getMonth() + 1;
        this.day = arg1.getDate();
      }

      // Check bounds.
      if (this.month < 1 || this.month > 12) {
        throw "monthOutOfBounds";
      }
      if (this.day < 1 || this.day > nbOfDaysInMonth(this.year, this.month)) {
        throw "dayOutOfBounds";
      }
      if (this.week < 1 || this.week > nbOfWeeksInYear(this.year)) {
        throw "weekOutOfBounds";
      }

      return this;
    };

    this.set(arg1, arg2, arg3);
  }


  /**
   * Calculates the day of the week.
   * @returns {number} The day of the week from 0 to 6, where 0 is Monday.
   * @throws "wrongMode" if date is not in "day" mode.
   */
  get dayOfWeek() {
    if (this.mode !== "day") throw "wrongMode";
    return ((new Date(this.year, this.month - 1, this.day)).getDay() + 6) % 7;
  }

  /**
   * Calculates the day of the year.
   * @returns {number} The day of the year from 1 to 366.
   * @throws "wrongMode" if date is not in "day" mode.
   */
  get ordinalDate() {
    if (this.mode !== "day") throw "wrongMode";

    const offsetPerMonth = [
        0,  31,  59,  90,
      120, 151, 181, 212,
      243, 273, 304, 334
    ];
    const leapYearOffset = isLeapYear(this.year) && this.month > 2 ? 1 : 0;
    return offsetPerMonth[this.month - 1] + leapYearOffset + this.day;
  }

  /**
   * Converts the date to the given mode.
   *
   * If range is "current" (this year, month, week or day), tries to keep it that way.
   * From specific to generic, simply trims the most significant units.
   * From generic to specific, prefers either the start or end of the range.
   * Can be unpredictable when dealing with week numbers.
   *
   * @param {string} targetMode - The mode to convert this date to.
   * @param {boolean} [preferEnd=false] - If set to true, will prefer converting to the end of a range when going from generic to specific.
   * @returns this
   */
  convertTo(targetMode, preferEnd = false) {
    if (this.mode === targetMode) return this;

    const preferredMonth = preferEnd ? 12 : 1;
    const preferredWeek = preferEnd ? nbOfWeeksInYear(this.year) : 1;
    const preferredDay = preferEnd ? nbOfDaysInMonth(this.year, this.month) : 1;

    switch (targetMode) {
      case "year":
        // Current range.
        if (this.isCurrent) return this.set(JDDate.thisYear().shortForm);

        // Week → Year
        if (this.mode === "week") {
          const fourthOfTheWeek = (new JDDate(this.shortForm)).convertTo("day").plus(3);
          return this.set(fourthOfTheWeek.convertTo("year").shortForm);
        }

        // Day/Month → Year
        return this.set(this.year);

      case "month":
        // Current range.
        if (this.isCurrent) return this.set(JDDate.thisMonth().shortForm);

        // Week → Month
        if (this.mode === "week") {
          const fourthOfTheWeek = (new JDDate(this.shortForm)).convertTo("day").plus(3);
          return this.set(fourthOfTheWeek.convertTo("month").shortForm);
        }

        // Day/Year → Month
        const month = this.month ?? preferredMonth;
        return this.set(this.year, month);

      case "week":
        // Current range.
        if (this.mode !== "day" && this.isCurrent) {
          return this.set(JDDate.thisWeek().shortForm);
        }

        // Month → Week
        if (this.mode === "month") {
          return this.set((new JDDate(this.year, this.month, 4)).convertTo("week").shortForm);
        }

        // Day → Week
        if (this.mode === "day") {
          const nearestThu = this.plus(3 - this.dayOfWeek);
          const nearestThuOrdinal = nearestThu.ordinalDate;

          const isoYear = nearestThu.year;

          const firstOfYear = new JDDate(isoYear, 1, 4);
          const nearestThuToFirstOfYear = firstOfYear.plus(3 - firstOfYear.dayOfWeek);
          const nearestThuToFirstOfYearOrdinal = nearestThuToFirstOfYear.ordinalDate;

          const weekOfYear = Math.floor((nearestThuOrdinal - nearestThuToFirstOfYearOrdinal) / 7) + 1;

          return this.set(isoYear + "-W" + String(weekOfYear).padStart(2, "0"));
        }

        // Year → Week
        return this.set(this.year + "-W" + String(preferredWeek).padStart(2, "0"));

      case "day":
        // Current range.
        if (this.isCurrent) return this.set(JDDate.today().shortForm);

        // Week → Day
        if (this.mode === "week") {
          const firstOfYear = new JDDate(this.year, 1, 4);
          const nearestThuToFirstOfYear = firstOfYear.plus(3 - firstOfYear.dayOfWeek);
          const firstMondayOfYear = nearestThuToFirstOfYear.minus(nearestThuToFirstOfYear.dayOfWeek);
          return this.set(firstMondayOfYear.plus(7 * (this.week - 1)).shortForm);
        }

        // Month/Year → Day
        return this.set(this.year, this.month ?? preferredMonth, preferredDay);
    }
  }


  /**
   * Checks if operand is the same date.
   * @param {JDDate|JDDateRange} b - Another date to compare.
   * @returns {boolean} Whether the two operands are equal.
   */
  equals(b) {
    return this.shortForm === b.shortForm;
  }

  /**
   * Checks if this date is strictly before the given date.
   * @param {JDDate|JDDateRange} b - Another date to compare.
   * @returns {boolean} Whether this date is strictly before the passed date.
   */
  earlierThan(b) {
    const a = this.firstDay;
    b = b.firstDay;

    if (a.year === b.year) {
      if (a.month === b.month) {
        return a.day < b.day;
      }
      return a.month < b.month;
    }
    return a.year < b.year;
  }

  /**
   * Checks if this date is strictly after the given date.
   * @param {JDDate|JDDateRange} b - Another date to compare.
   * @returns {boolean} Whether this date is strictly after the passed date
   */
  laterThan(b) {
    const a = this.lastDay;
    b = b.lastDay;

    if (a.year === b.year) {
      if (a.month === b.month) {
        return a.day > b.day;
      }
      return a.month > b.month;
    }
    return a.year > b.year;
  }

  /**
   * Checks if the given date is contained in this range.
   * @param {JDDate} b - Date that must be contained.
   * @returns {boolean} Whether the passed JDDate is contained in this range.
   */
  contains(b) {
    return !b.earlierThan(this.firstDay) && !b.laterThan(this.lastDay);
  }

  /**
   * Adds n "mode-units" to the date.
   * The mode-unit is the unit associated with the current mode. So if this date
   * is in "week" mode, this function will add n number of *weeks*.
   * @param {number} n - Number to add.
   * @returns {JDDate} A new JDDate with n mode-units added to the date.
   */
  plus(n) {
    const sign = Math.sign(n);

    let newYear = this.year;
    let newMonth = this.month;
    let newWeek = this.week;
    let newDay = this.day;

    switch (this.mode) {
      case "year":
        return new JDDate(this.year + n);

      case "month":
        if (sign === 1) {
          for (let i = 0; i < n; i++) {
            if (newMonth === 12) {
              newYear++;
              newMonth = 1;

            } else {
              newMonth++;
            }
          }

        } else {
          for (let i = 0; i < Math.abs(n); i++) {
            if (newMonth === 1) {
              newYear--;
              newMonth = 12;

            } else {
              newMonth--;
            }
          }
        }

        return new JDDate(newYear, newMonth);

      case "week":
        if (sign === 1) {
          for (let i = 0; i < n; i++) {
            if (newWeek === nbOfWeeksInYear(newYear)) {
              newYear++;
              newWeek = 1;

            } else {
              newWeek++;
            }

          }

        } else {
          for (let i = 0; i < Math.abs(n); i++) {
            if (newWeek === 1) {
              newYear--;
              newWeek = nbOfWeeksInYear(newYear);

            } else {
              newWeek--;
            }
          }
        }

        return new JDDate(newYear, "W" + String(newWeek).padStart(2, "0"));

      case "day":
        if (sign === 1) {
          for (let i = 0; i < n; i++) {
            if (newDay === nbOfDaysInMonth(newYear, newMonth)) {
              if (newMonth === 12) {
                newYear++;
                newMonth = 1;

              } else {
                newMonth++;
              }

              newDay = 1;

            } else {
              newDay++;
            }
          }
        } else {
          for (let i = 0; i < Math.abs(n); i++) {
            if (newDay === 1) {
              if (newMonth === 1) {
                newYear--;
                newMonth = 12;

              } else {
                newMonth--;
              }

              newDay = nbOfDaysInMonth(newYear, newMonth);

            } else {
              newDay--;
            }
          }
        }

        return new JDDate(newYear, newMonth, newDay);
    }
  }

  /**
   * Subtracts n "mode-units" from the date.
   * The mode-unit is the unit associated with the current mode. So if this date
   * is in "week" mode, this function will subtract n number of *weeks*.
   * @param {number} n - Number to subtract.
   * @returns {JDDate} A new JDDate with n mode-units subtracted to the date.
   */
  minus(n) {
    return this.plus(-1 * n);
  }

  /**
   * Adds n "mode-units" to this date.
   * @see JDDate.plus()
   * @param {number} [n=1] - Number to add.
   * @returns this
   */
  next(n = 1) {
    return this.set(this.plus(n).shortForm);
  }

  /**
   * Subtracts n "mode-units" from this date.
   * @see JDDate.minus()
   * @param {number} [n=1] - Number to subtract.
   * @returns this
   */
  previous(n = 1) {
    return this.set(this.minus(n).shortForm);
  }


  /**
   * @returns {JDDate} A new JDDate of the canonical first day of the date.
   */
  get firstDay() {
    switch (this.mode) {
      case "year":
        return new JDDate(this.year, 1, 1);

      case "month":
        const lastDayOfMonth = nbOfDaysInMonth(this.year, this.month);
        return new JDDate(this.year, this.month, 1);

      case "week":
        let nbOfDays = this.week * 7;
        nbOfDays -= new Date(Date.UTC(this.year, 0, 4)).getUTCDay();
        nbOfDays -= 3;
        return (new JDDate(this.year, 1, 1)).plus(nbOfDays);

      case "day":
        return new JDDate(this.shortForm);
    }
  }

  /**
   * @returns {JDDate} A new JDDate of the canonical last day of the date.
   */
  get lastDay() {
    switch (this.mode) {
      case "year":
        return new JDDate(this.year, 12, 31);

      case "month":
        const lastDayOfMonth = nbOfDaysInMonth(this.year, this.month);
        return new JDDate(this.year, this.month, lastDayOfMonth);

      case "week":
        let nbOfDays = this.week * 7 + 6;
        nbOfDays -= new Date(Date.UTC(this.year, 0, 4)).getUTCDay();
        nbOfDays -= 3;
        return (new JDDate(this.year, 1, 1)).plus(nbOfDays);

      case "day":
        return new JDDate(this.shortForm);
    }
  }

  /**
   * @returns {number} The first epoch millisecond of the date.
   */
  get firstMillisecond() {
    return (new Date(this.firstDay.shortForm)).getTime();
  }

  /**
   * @returns {number} The last epoch millisecond of the date.
   */
  get lastMillisecond() {
    return (new Date(this.lastDay.shortForm)).getTime() + 1000*60*60*24;
  }

  /**
   * @returns {number} The length of the date in days.
   */
  get length() {
    switch (this.mode) {
      case "year":
        return isLeapYear(this.year) ? 366 : 365;
      case "month":
        return nbOfDaysInMonth(this.year, this.month);
      case "week":
        return 7;
      case "day":
        return 1;
    }
  }

  /**
   * @see JDDateRange#monthRange
   * @returns {string[]}
   */
  monthRange() {
    return (new JDDateRange(this)).monthRange();
  }

  /**
   * @returns {boolean} Whether this date is "current" according to mode.
   */
  get isCurrent() {
    switch (this.mode) {
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


  /**
   * Formats the date using short-form notation.
   * Possible formats are:
   *  - year   2022
   *  - month  2022-04
   *  - week   2022-W01
   *  - day    2022-04-20
   * @returns {string} The canonical text representation of the date.
   */
  get shortForm() {
    let shortForm = String(this.year);

    if (this.month) {
      shortForm += "-" + String(this.month).padStart(2, "0");
      if (this.day) {
        shortForm += "-" + String(this.day).padStart(2, "0");
      }
    } else if (this.week) {
      shortForm += "-W" + String(this.week).padStart(2, "0");
    }

    return shortForm;
  }

  /**
   * Formats the date using a nice human-readable (French) notation.
   * @returns {string} A nice human-readable string of the date.
   */
  get niceForm() {
    let niceForm;

    switch (this.mode) {
      case "day":
        if (this.equals(JDDate.today())) {
          niceForm = "Aujourd’hui";
          break;
        }
        niceForm = this.day + (daysSuffixDict[this.day - 1] ?? "");
        niceForm += " " + monthsDict[this.month - 1].toLowerCase();
        niceForm += " " + this.year;
        break;

      case "month":
        if (this.equals(JDDate.thisMonth())) {
          niceForm = "Ce mois-ci";
          break;
        }
        niceForm = monthsDict[this.month - 1];
        niceForm += " " + this.year;
        break;

      case "week":
        if (this.equals(JDDate.thisWeek())) {
          niceForm = "Cette semaine";
          break;
        }
        niceForm = this.year;
        niceForm += " W" + String(this.week).padStart(2, "0");
        break;

      case "year":
        if (this.equals(JDDate.thisYear())) {
          niceForm = "Cette année";
          break;
        }
        niceForm = this.year;
        break;
    }

    return niceForm;
  }


  /**
   * @static
   * @returns {JDDate} A new JDDate set to today.
   */
  static today() {
    const now = new Date();
    return new JDDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  /**
   * @static
   * @returns {JDDate} A new JDDate set to this week.
   */
  static thisWeek() {
    return JDDate.today().convertTo("week");
  }

  /**
   * @static
   * @returns {JDDate} A new JDDate set to this month.
   */
  static thisMonth() {
    const now = new Date();
    return new JDDate(now.getFullYear(), now.getMonth() + 1);
  }

  /**
   * @static
   * @returns {JDDate} A new JDDate set to this year.
   */
  static thisYear() {
    const now = new Date();
    return new JDDate(now.getFullYear());
  }
}


/**
 * Custom date range object using JDDate bounds.
 * @property {string} mode - Indicates the “precision” (year(s), month(s), week(s), day(s)) of the date.
 * @property {JDDate} from - JDDate start date of the range.
 * @property {JDDate} to - JDDate end date of the range.
 * @see JDDate
 */
class JDDateRange {

  /**
   * Creates a new JDDateRange. Defaults to this month if no arguments are specified.
   * @param {JDDate|string} [arg1=JDDate.thisMonth()] - If a string, the string will be parsed for 2 short-form dates separated by ":".
   * @param {JDDate} [arg2] - If both arguments are present and JDDates, will use them as the beginning and end of the range.
   */
  constructor(arg1 = JDDate.thisMonth(), arg2) {

    /** Changes the date after declaration. See constructor for details. */
    this.set = function(arg1, arg2) {

      // Build object from short-form representation.
      if (typeof arg1 === "string") {
        const dates = arg1.split(":");
        this.from = new JDDate(dates[0]);

        switch (dates.length) {
          case 1:
            this.to = this.from;
            break;

          case 2:
            this.to = new JDDate(dates[1]);
            if (this.to.mode !== this.from.mode) {
              throw "malformedRange";
            }
            break;

          default:
            throw "malformedRange";
        }

        // Build object from JDDate objects.
      } else if (arg1 instanceof JDDate) {
        this.from = new JDDate(arg1.shortForm);
        this.to = new JDDate(arg1.shortForm);

        if (arg2 instanceof JDDate) {
          this.to = new JDDate(arg2.shortForm);
        }
      }

      return this;
    };

    this.set(arg1, arg2);
  }


  /**
   * @see JDDate.year
   * @returns {number}
   */
  get year() {
    if (!this.plural) {
      return this.from.year;
    }
    return undefined;
  }

  /**
   * @see JDDate.month
   * @returns {number}
   */
  get month() {
    if (!this.plural) {
      return this.from.month;
    }
    return undefined;
  }

  /**
   * @see JDDate.week
   * @returns {number}
   */
  get week() {
    if (!this.plural) {
      return this.from.week;
    }
    return undefined;
  }

  /**
   * @see JDDate.day
   * @returns {number}
   */
  get day() {
    if (!this.plural) {
      return this.from.day;
    }
    return undefined;
  }


  /**
   * Same as JDDate modes but has an “s” at the end when “plural”.
   * @see JDDate.mode
   * @returns {string}
   */
  get mode() {
    return this.from.mode + (this.plural ? "s" : "");
  }

  /**
   * Checks if this range actually corresponds to a single JDDate value.
   * @returns {boolean} Whether this range corresponds to a single JDDate value.
   */
  get plural() {
    return !this.to.equals(this.from);
  }

  /**
   * Converts Date to a different mode.
   * Note: Converting plural modes is currently unimplemented.
   * @see JDDate.convertTo()
   * @returns this
   */
  convertTo(mode, preferEnd = false) {
    const bound = preferEnd ? "to" : "from";
    return this.set(this[bound].convertTo(mode, preferEnd));
  }


  /**
   * @see JDDate.equals()
   * @returns {boolean}
   */
  equals(b) {
    const fromEquals = this.from.shortForm === (b.from?.shortForm ?? b.shortForm);
    const toEquals = this.to?.shortForm === b.to?.shortform;
    return fromEquals && toEquals;
  }

  /**
   * @see JDDate.earlierThan()
   * @param {JDDateRange} b
   * @returns {boolean} Undefined if any operand is plural.
   */
  earlierThan(b) {
    if (this.plural || b.plural) return undefined;
    return this.from.earlierThan(b.from ?? b);
  }

  /**
   * @see JDDate.laterthan()
   * @param {JDDateRange} b
   * @returns {boolean} Undefined if any operand is plural.
   */
  laterThan(b) {
    if (this.plural || b.plural) return undefined;
    return this.from.laterThan(b.from ?? b);
  }

  /**
   * @see JDDate#contains
   * @param {JDDate|JDDateRange} b
   * @returns {boolean}
   */
  contains(b) {
    return !b.earlierThan(this.from) && !b.laterThan(this.to);
  }

  /**
   * @see JDDate.plus()
   * @param {number} n
   * @returns {JDDateRange} A new JDDateRange object. Undefined if range is plural.
   */
  plus(n) {
    if (this.plural) return undefined;
    return new JDDateRange(this.from.plus(n));
  }

  /**
   * @see JDDate.minus()
   * @param {number} n
   * @returns {JDDateRange} A new JDDateRange object. Undefined if range is plural.
   */
  minus(n) {
    if (this.plural) return undefined;
    return new JDDateRange(this.from.minus(n));
  }

  /**
   * @see JDDate.next()
   * @param {number} [n=1]
   * @returns this - Undefined if range is plural.
   */
  next(n = 1) {
    if (this.plural) return undefined;
    return this.set(this.from.next(n));
  }

  /**
   * @see JDDate.previous()
   * @param {number} [n=1]
   * @returns this - Undefined if range is plural.
   */
  previous(n = 1) {
    if (this.plural) return undefined;
    return this.set(this.from.previous(n));
  }


  /**
   * @see JDDate.firstDay
   * @returns {JDDate}
   */
  get firstDay() {
    return this.from.firstDay;
  }

  /**
   * @see JDDate.lastDay
   * @returns {JDDate}
   */
  get lastDay() {
    return this.to.lastDay;
  }

  /**
   * @see JDDate.lastMillisecond
   * @returns {number}
   */
  get firstMillisecond() {
    return this.from.firstMillisecond;
  }

  /**
   * @see JDDate.lastMillisecond
   * @returns {number}
   */
  get lastMillisecond() {
    return this.to.lastMillisecond;
  }

  /**
   * @see JDDate.length
   * @returns {number}
   */
  get length() {
    if (this.plural) {
      let length = 0;
      const pointer = new JDDate(this.from.shortForm);
      while (!pointer.laterThan(this.to)) {
        length += pointer.length;
        pointer.next();
      }
      return length;
    }
    return this.from.length;
  }

  /**
   * Lists the months that include this range.
   * @returns {string[]} An array of short-form months that include this range.
   */
  monthRange() {
    const range = [];

    const from = this.firstDay;
    const to = this.lastDay;

    for (let year = from.year; year <= to.year; year++) {
      for (let month = 1; month <= 12; month++) {
        if (year === from.year && month < from.month) continue;
        if (year === to.year && month > to.month) break;

        range.push(year + "-" + String(month).padStart(2, "0"));
      }
    }
    return range;
  }

  /**
   * @see JDDate.isCurrent
   * @returns {boolean}
   */
  get isCurrent() {
    if (this.plural) return false;
    return this.from.isCurrent;
  }


  /**
   * @see JDDate.shortForm
   * @returns {string}
   */
  get shortForm() {
    if (this.plural) {
      return this.from.shortForm + ":" + this.to.shortForm;
    }
    return this.from.shortForm;
  }

  /**
   * @see JDDate.niceForm
   * @returns {string}
   */
  get niceForm() {
    let niceForm;

    if (this.plural) {
      switch (this.mode) {
        case "years":
          niceForm = this.from.year + " à " + this.to.year;
          break;

        case "months":
          niceForm = monthsDict[this.from.month - 1];
          if (this.from.year !== this.to.year) {
            niceForm += " " + this.from.year;
          }
          niceForm += " à " + monthsDict[this.to.month - 1].toLowerCase();
          niceForm += " " + this.to.year;
          break;

        case "weeks":
          niceForm = "";
          if (this.from.year !== this.to.year) {
            niceForm += this.from.year + " ";
          }
          niceForm += "W" + this.from.week;
          niceForm += " à ";
          niceForm += this.to.year + " ";
          niceForm += "W" + this.to.week;
          break;

        case "days":
          niceForm = this.from.day + (daysSuffixDict[this.from.day - 1] ?? "");
          if (this.from.month !== this.to.month || this.from.year !== this.to.year) {
            niceForm += " " + monthsDict[this.from.month - 1].toLowerCase();
          }
          if (this.from.year !== this.to.year) {
            niceForm += " " + this.from.year;
          }
          niceForm += " au ";
          niceForm += this.to.day + (daysSuffixDict[this.to.day - 1] ?? "");
          niceForm += " " + monthsDict[this.to.month - 1].toLowerCase();
          niceForm += " " + this.to.year;
          break;
      }

    } else {
      niceForm = this.from.niceForm;
    }

    return niceForm;
  }
}


/**
 * Calculates if a given year is a leap year.
 * @param {number} year - description
 * @returns {boolean} Whether the given integer is a leap year.
 */
function isLeapYear(year) {
  if (year % 400 === 0) {
    return true;
  }
  if (year % 4 === 0 && year % 100 !== 0) {
    return true;
  }
  return false;
}

/**
 * Calculates the number of days in the given month of the given year.
 * @param {number} year - Integer year.
 * @param {number} month - Integer month from 1 to 12.
 * @returns {number} The number of days in the given month of the given year.
 */
function nbOfDaysInMonth(year, month) {
  switch (month) {
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 31;
  }
}

/**
 * Calculates whether the given year is a long (53 weeks) or short (52 weeks) year.
 * @param {number} year - Integer year.
 * @returns {boolean} Whether the given integer is a long year.
 */
function isLongYear(year) {
  const firstDay = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const lastDay = new Date(Date.UTC(year, 11, 31)).getUTCDay();

  return firstDay === 4 || lastDay === 4;
}

/**
 * Calculates the number of weeks in the given year.
 * @param {number} year - Integer year.
 * @returns {number} The number of ISO weeks in the given year.
 */
function nbOfWeeksInYear(year) {
  return isLongYear(year) ? 53 : 52;
}


const monthsDict = [
  "Janvier",    "Février",  "Mars",     "Avril",
  "Mai",        "Juin",     "Juillet",  "Août",
  "Septembre",  "Octobre",  "Novembre", "Décembre"
];
const daysSuffixDict = [ "<sup>er</sup>" ];


try {
  global.JDDate = JDDate;
  global.JDDateRange = JDDateRange;
} catch (e) {}
