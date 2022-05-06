/*
 * Custom date object.
 * mode		Indicates the "precision" (year, month, week, day) of the date.
 * year		Integer year of the date.
 * month	Integer month (1-12) of the year, if applicable.
 * week		Integer week (1-53) of the year, if applicable.
 * day		Integer day (1-31) of the month, if applicable.
 */
class JDDate {
	constructor(arg1, arg2, arg3) {

		// Internal constructor can also be used to change the value after declaration.
		this.set = function(arg1, arg2, arg3) {

			// Build object from short form representation.
			if (typeof arg1 === "string") {
				let matches = arg1.match(/^(\d{4})(?:(?:-(\d{2}))?(?:-(\d{2}))?|(?:-W(\d{2})))$/);

				if (!matches || matches.length < 2) {
					throw "malformedDate";
				}

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
				this.year = arg1;
				this.mode = "year";

				if (typeof arg2 === "number") {
					this.month = arg2;
					this.mode = "month";

					if (typeof arg3 === "number") {
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
				throw "malformedDate";
			}
			if (this.day < 1 || this.day > nbOfDaysInMonth(this.year, this.month)) {
				throw "malformedDate";
			}
			if (this.week < 1 || this.week > nbOfWeeksInYear(this.year)) {
				throw "malformedDate";
			}
		};

		this.set(arg1, arg2, arg3);
	}


	// Returns whether the two operands are the equal.
	equals(b) {
		return this.shortForm === b.shortForm
	}

	// Returns whether this date is strictly before the passed date.
	earlierThan(b) {
		const a = this.firstDay;
		b = b.lastDay;

		if (a.year === b.year) {
			if (a.month === b.month) {
				return a.day < b.day;
			}
			return a.month < b.month;
		}
		return a.year < b.year;
	}

	// Returns whether this date is strictly after the passed date.
	laterThan(b) {
		const a = this.lastDay;
		b = b.firstDay;

		if (a.year === b.year) {
			if (a.month === b.month) {
				return a.day > b.day;
			}
			return a.month > b.month;
		}
		return a.year > b.year;
	}

	// Returns a new JDDate with n mode-units added to the date.
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
								newDay = 1;

							} else {
								newMonth++;
								newDay = 1;
							}

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
								newDay = nbOfDaysInMonth(newYear, newMonth);
							}

						} else {
							newDay--;
						}
					}
				}

				return new JDDate(newYear, newMonth, newDay);
		}

	}

	// Returns a new JDDate with n mode-units subtracted from the date.
	minus(n) {
		return this.plus(-1 * n);
	}

	// Adds n mode-units to this date.
	next(n = 1) {
		this.set(this.plus(n).shortForm);
	}

	// Subtracts n mode-units from this date.
	previous(n = 1) {
		this.set(this.minus(n).shortForm);
	}


	// Returns a new JDDate of the canonical first day of the date.
	get firstDay() {
		switch (this.mode) {
			case "year":
				return new JDDate(this.year, 1, 1);
				break;
			case "month":
				const lastDayOfMonth = nbOfDaysInMonth(this.year, this.month);
				return new JDDate(this.year, this.month, 1);
				break;
			case "week":
				let nbOfDays = this.week * 7;
				nbOfDays -= new Date(Date.UTC(this.year, 0, 4)).getUTCDay();
				nbOfDays -= 3;
				return (new JDDate(this.year, 1, 1)).plus(nbOfDays);
				break;
			case "day":
				return new JDDate(this.shortForm);
				break;
		}
	}

	// Returns a new JDDate of the canonical last day of the date.
	get lastDay() {
		switch (this.mode) {
			case "year":
				return new JDDate(this.year, 12, 31);
				break;
			case "month":
				const lastDayOfMonth = nbOfDaysInMonth(this.year, this.month);
				return new JDDate(this.year, this.month, lastDayOfMonth);
				break;
			case "week":
				let nbOfDays = this.week * 7 + 6;
				nbOfDays -= new Date(Date.UTC(this.year, 0, 4)).getUTCDay();
				nbOfDays -= 3;
				return (new JDDate(this.year, 1, 1)).plus(nbOfDays);
				break;
			case "day":
				return new JDDate(this.shortForm);
				break;
		}
	}

	// Returns the first epoch millisecond of the date.
	get firstMillisecond() {
		return (new Date(this.firstDay.shortForm)).getTime();
	}

	// Returns the last epoch millisecond of the date.
	get lastMillisecond() {
		return (new Date(this.lastDay.shortForm)).getTime() + 1000*60*60*24;
	}


	/*
	 * Returns the unique text representation of the date.
	 * Possible formats are:
	 * year		2022
	 * month	2022-04
	 * week		2022-W01
	 * day		2022-04-20
	 */
	get shortForm() {
		let shortForm = this.year;

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

	// Returns a nice human readable string of the date.
	get niceForm() {
		let niceForm;

		switch (this.mode) {
			case "day":
				if (this.equals(JDDate.today())) {
					niceForm = "Aujourd’hui";
					break;
				}
				niceForm = this.day + (daysSuffixDict[this.day - 1] ?? "");
				niceForm += " " + monthsDict[this.month - 1].toLowerCase();
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


	// See JDDateRange for details.
	monthRange() {
		return (new JDDateRange(this)).monthRange();
	}


	// Returns the current day object.
	static today() {
		const now = new Date();
		return new JDDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
	}

	// Returns the current week object.
	static thisWeek() {
		const now = new Date();
		const fourthOfYear = new Date(now.getFullYear(), 0, 4);
		const week = Math.ceil((now.getTime() - fourthOfYear.getTime()) / 1000 / 60 / 60 / 24 / 7);
		return new JDDate(now.getFullYear(), "W" + String(week).padStart(2, "0"));
	}

	// Returns the current month object.
	static thisMonth() {
		const now = new Date();
		return new JDDate(now.getFullYear(), now.getMonth() + 1);
	}

	// Returns the current year object.
	static thisYear() {
		const now = new Date();
		return new JDDate(now.getFullYear());
	}
}


/*
 * Custom date range object using JDDate bounds.
 * mode		Indicates the "precision" (year(s), month(s), week(s), day(s)) of the date.
 * from		JDDate start date of the range.
 * to		JDDate end date of the range.
 * → See JDDate for documentation on bridged methods.
 */
class JDDateRange {
	constructor(arg1 = JDDate.thisMonth(), arg2) {

		// Internal constructor can also be used to change the value after declaration.
		this.set = function(arg1, arg2) {

			// Build object from short form representation.
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
				this.from = arg1;
				this.to = arg1;

				if (arg2 instanceof JDDate) {
					this.to = arg2;
				}
			}
		};

		this.set(arg1, arg2);
	}


	get mode() {
		return this.from.mode + (this.plural ? "s" : "");
	}

	// Returns whether this range corresponds to a single JDDate value.
	get plural() {
		return !this.to.equals(this.from);
	}

	get year() {
		if (!this.plural) {
			return this.from.year;
		}
		return undefined;
	}

	get month() {
		if (!this.plural) {
			return this.from.month;
		}
		return undefined;
	}

	get week() {
		if (!this.plural) {
			return this.from.week;
		}
		return undefined;
	}

	get day() {
		if (!this.plural) {
			return this.from.day;
		}
		return undefined;
	}


	get firstDay() {
		return this.from.firstDay;
	}

	get lastDay() {
		return this.to.lastDay;
	}

	get firstMillisecond() {
		return this.from.firstMillisecond;
	}

	get lastMillisecond() {
		return this.to.lastMillisecond;
	}


	get shortForm() {
		if (this.plural) {
			return this.from.shortForm + ":" + this.to.shortForm;
		} else {
			return this.from.shortForm;
		}
	}

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
					niceForm += " à " + this.to.niceForm.toLowerCase();
					break;

				case "weeks":
					niceForm = this.from.niceForm;
					niceForm += " à ";
					if (this.from.year !== this.to.year) {
						niceForm += this.to.year + " ";
					}
					niceForm += "W" + this.to.week;
					break;

				case "days":
					niceForm = this.from.day + (daysSuffixDict[this.from.day - 1] ?? "");
					if (this.from.month !== this.to.month || this.from.year !== this.to.year) {
						niceForm += " " + monthsDict[this.from.month - 1].toLowerCase();
					}
					if (this.from.year !== this.to.year) {
						niceForm += " " + this.from.year;
					}
					niceForm += " au " + this.to.niceForm;
					break;
			}

		} else {
			niceForm = this.from.niceForm;
		}

		return niceForm;
	}


	equals(b) {
		fromEquals = this.from.shortForm === b.from.shortForm;
		toEquals = this.plural ? this.to.shortForm === b.to.shortform : true;
		return fromEquals && toEquals;
	}

	earlierThan(b) {
		if (this.plural || b.plural) {
			return undefined;
		}
		return this.from.earlierThan(b.from ?? b);
	}

	laterThan(b) {
		if (this.plural || b.plural) {
			return undefined;
		}
		return this.from.laterThan(b.from ?? b);
	}

	plus(n) {
		if (this.plural) {
			return undefined;
		}
		return new JDDateRange(this.from.plus(n));
	}

	minus(n) {
		if (this.plural) {
			return undefined;
		}
		return new JDDateRange(this.from.minus(n));
	}

	next(n = 1) {
		if (this.plural) {
			return undefined;
		}
		this.set(this.from.next(n));
	}

	previous(n = 1) {
		if (this.plural) {
			return undefined;
		}
		this.set(this.from.previous(n));
	}


	// Returns the array of months that include this date range.
	monthRange() {
		const range = [];

		const from = this.firstDay;
		const to = this.lastDay;

		for (let year = from.year; year <= to.year; year++) {
			for (let month = 1; month <= 12; month++) {

				if (year === from.year && month < from.month) {
					continue;

				} else if (year === to.year && month > to.month) {
					break;
				}

				range.push(year + "-" + String(month).padStart(2, "0"));
			}
		}
		return range;
	}
}


// Returns whether the given integer is a leap year.
function isLeapYear(year) {
	if (year % 400 === 0) {
		return true;
	} else if (year % 4 === 0 && year % 100 !== 0) {
		return true;
	}
	return false;
}

// Returns the number of days in the given month of the given year.
function nbOfDaysInMonth(year, month) {
	switch (month) {
		case 4:
		case 6:
		case 9:
		case 11:
			return 30;
			break;
		case 2:
			return isLeapYear(year) ? 29 : 28;
			break;
		default:
			return 31;
	}
}

// Returns whether the given integer is a long year (53-week year).
function isLongYear(year) {
	const firstDay = new Date(Date.UTC(year, 0, 1)).getUTCDay();
	const lastDay = new Date(Date.UTC(year, 11, 31)).getUTCDay();

	if (firstDay === 4 || lastDay === 4) {
		return true;
	}

	return false;
}

// Returns the number of ISO weeks in the given year.
function nbOfWeeksInYear(year) {
	return isLongYear(year) ? 53 : 52;
}


const monthsDict = [
	"Janvier", "Février", "Mars", "Avril",
	"Mai", "Juin", "Juillet", "Août",
	"Septembre", "Octobre", "Novembre", "Décembre"
];
const daysSuffixDict = [ "<sup>er</sup>" ];


try {
	global.JDDate = JDDate;
	global.JDDateRange = JDDateRange;
} catch (e) {}
