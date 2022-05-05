class DateRange {
	constructor(arg1 = ShortDate.thisMonth(), arg2) {
		this.set = function(arg1, arg2) {

			if (typeof arg1 === "string") {
				const dates = arg1.split(":");
				this.from = new ShortDate(dates[0]);

				switch (dates.length) {
					case 1:
						this.to = this.from;
						break;

					case 2:
						this.to = new ShortDate(dates[1]);
						if (this.to.mode !== this.from.mode) {
							throw "malformedRange";
						}
						break;

					default:
						throw "malformedRange";
				}

			} else if (arg1 instanceof ShortDate) {
				this.from = arg1;
				this.to = arg1;

				if (arg2 instanceof ShortDate) {
					this.to = arg2;
				}
			}
		};

		this.set(arg1, arg2);
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
		return this.from.earlierThan(b.from);
	}

	laterThan(b) {
		if (this.plural || b.plural) {
			return undefined;
		}
		return this.from.laterThan(b.from);
	}

	plus(n) {
		if (this.plural) {
			return undefined;
		}
		return new DateRange(this.from.plus(n));
	}

	minus(n) {
		if (this.plural) {
			return undefined;
		}
		return new DateRange(this.from.minus(n));
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


	get mode() {
		return this.from.mode + (this.plural ? "s" : "");
	}

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
					niceForm = "W" + String(this.from.week).padStart(2, "0");
					if (this.from.year !== this.to.year) {
						niceForm += " " + this.from.year;
					}
					niceForm += " à " + this.to.niceForm;
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


class ShortDate {
	constructor(arg1, arg2, arg3) {
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


	equals(b) {
		return this.shortForm === b.shortForm
	}

	earlierThan(b) {
		if (this.year === b.year) {
			if (this.mode === "week") {
				return this.week < b.week;

			} else if (this.month === b.month) {
				return this.day < b.day;
			}
			return this.month < b.month;
		}
		return this.year < b.year;
	}

	laterThan(b) {
		if (this.year === b.year) {
			if (this.mode === "week") {
				return this.week > b.week;

			} else if (this.month === b.month) {
				return this.day > b.day;
			}
			return this.month > b.month;
		}
		return this.year > b.year;
	}

	plus(n) {
		const sign = Math.sign(n);

		let newYear = this.year;
		let newMonth = this.month;
		let newWeek = this.week;
		let newDay = this.day;

		switch (this.mode) {
			case "year":
				return new ShortDate(this.year + n);

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

				return new ShortDate(newYear, newMonth);

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

				return new ShortDate(newYear, "W" + String(newWeek).padStart(2, "0"));

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

				return new ShortDate(newYear, newMonth, newDay);
		}

	}

	minus(n) {
		return this.plus(-1 * n);
	}

	next(n = 1) {
		this.set(this.plus(n).shortForm);
	}

	previous(n = 1) {
		this.set(this.minus(n).shortForm);
	}


	get firstDay() {
		switch (this.mode) {
			case "year":
				return new ShortDate(this.year, 1, 1);
				break;
			case "month":
				const lastDayOfMonth = nbOfDaysInMonth(this.year, this.month);
				return new ShortDate(this.year, this.month, 1);
				break;
			case "week":
				let nbOfDays = this.week * 7;
				nbOfDays -= new Date(Date.UTC(this.year, 0, 4)).getUTCDay();
				nbOfDays -= 3;
				return (new ShortDate(this.year, 1, 1)).plus(nbOfDays);
				break;
			case "day":
				return new ShortDate(this.shortForm);
				break;
		}
	}

	get lastDay() {
		switch (this.mode) {
			case "year":
				return new ShortDate(this.year, 12, 31);
				break;
			case "month":
				const lastDayOfMonth = nbOfDaysInMonth(this.year, this.month);
				return new ShortDate(this.year, this.month, lastDayOfMonth);
				break;
			case "week":
				let nbOfDays = this.week * 7 + 6;
				nbOfDays -= new Date(Date.UTC(this.year, 0, 4)).getUTCDay();
				nbOfDays -= 3;
				return (new ShortDate(this.year, 1, 1)).plus(nbOfDays);
				break;
			case "day":
				return new ShortDate(this.shortForm);
				break;
		}
	}

	get firstMillisecond() {
		return (new Date(this.firstDay.shortForm)).getTime();
	}

	get lastMillisecond() {
		return (new Date(this.lastDay.shortForm)).getTime() + 1000*60*60*24;
	}


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

	get niceForm() {
		let niceForm;

		switch (this.mode) {
			case "day":
				if (this.equals(ShortDate.today())) {
					niceForm = "Aujourd’hui";
					break;
				}
				niceForm = this.day + (daysSuffixDict[this.day - 1] ?? "");
				niceForm += " " + monthsDict[this.month - 1].toLowerCase();
				niceForm += " " + this.year;
				break;

			case "month":
				if (this.equals(ShortDate.thisMonth())) {
					niceForm = "Ce mois-ci";
					break;
				}
				niceForm = monthsDict[this.month - 1];
				niceForm += " " + this.year;
				break;

			case "week":
				if (this.equals(ShortDate.thisWeek())) {
					niceForm = "Cette semaine";
					break;
				}
				niceForm = "W" + String(this.week).padStart(2, "0");
				niceForm += " " + this.year;
				break;

			case "year":
				if (this.equals(ShortDate.thisYear())) {
					niceForm = "Cette année";
					break;
				}
				niceForm = this.year;
				break;
		}

		return niceForm;
	}


	// Returns the current month.
	static today() {
		const now = new Date();
		return new ShortDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
	}

	// Returns the current month.
	static thisWeek() {
		const now = new Date();
		const fourthOfYear = new Date(now.getFullYear(), 0, 4);
		const week = Math.ceil((now.getTime() - fourthOfYear.getTime()) / 1000 / 60 / 60 / 24 / 7);
		return new ShortDate(now.getFullYear(), "W" + String(week).padStart(2, "0"));
	}

	// Returns the current month.
	static thisMonth() {
		const now = new Date();
		return new ShortDate(now.getFullYear(), now.getMonth() + 1);
	}

	// Returns the current month.
	static thisYear() {
		const now = new Date();
		return new ShortDate(now.getFullYear());
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
	global.DateRange = DateRange;
} catch (e) {}
