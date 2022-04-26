class DateRange {

	constructor(arg1 = ShortDate.currentMonth(), arg2) {
		this.set = function(arg1, arg2) {

			if (typeof arg1 === "string") {
				let bounds = arg1.split(":");
				this.from = new ShortDate(bounds[0]);

				switch (bounds.length) {
					case 1:
						this.to = this.from;
						break;

					case 2:
						this.to = new ShortDate(bounds[1]);
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


	equals(op) {
		fromEquals = this.from.shortForm === op.from.shortForm;
		toEquals = this.plural ? this.to.shortForm === op.to.shortform : true;
		return fromEquals && toEquals;
	}


	// If the operands are singular, bridge functions from ShortDate.
	earlierThan(op) {
		if (this.plural || op.plural) {
			return undefined;
		}
		return this.from.earlierThan(op.from);
	}

	laterThan(op) {
		if (this.plural || op.plural) {
			return undefined;
		}
		return this.from.laterThan(op.from);
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

	get day() {
		if (!this.plural) {
			return this.from.day;
		}
		return undefined;
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

		const from = this.from;
		const to = this.to;

		for (let year = from.year; year <= to.year; year++) {
			for (let month = 1; month <= 12; month++) {

				if (year === from.year && month < from.month) {
					continue;
				} else if (year === to.year && month > to.month) {
					break;
				}

				range.push(year + "-" + month.toString().padStart(2, "0"));
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
				let matches = arg1.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);

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
				}

				if (matches[3] !== undefined) {
					this.day = parseInt(matches[3]);
					this.mode = "day";
				}

			// Build object from three numbers.
			} else if (typeof arg1 === "number") {
				this.year = arg1;
				this.mode = "year";

				if (typeof arg2 === "number") {
					this.month = arg2;
					this.mode = "month";
				}

				if (typeof arg3 === "number") {
					this.day = arg3;
					this.mode = "day";
				}
			}

			// Check bounds.
			if (this.month < 1 || this.month > 12) {
				throw "malformedDate";
			}
			if (this.day < 1 || this.day > nbOfDaysInMonth(this.year, this.month)) {
				throw "malformedDate";
			}
		};

		this.set(arg1, arg2, arg3);
	}


	equals(op) {
		return this.shortForm === op.shortForm
	}


	// Returns whether this date is before the other date.
	earlierThan(op) {
		if (this.year === op.year) {
			if (this.month === op.month) {
				return this.day < op.day;
			}
			return this.month < op.month;
		}
		return this.year < op.year;
	}


	// Returns whether this date is after the other date.
	laterThan(op) {
		if (this.year === op.year) {
			if (this.month === op.month) {
				return this.day > op.day;
			}
			return this.month > op.month;
		}
		return this.year > op.year;
	}


	plus(n) {
		const sign = Math.sign(n);

		let newYear = this.year;
		let newMonth = this.month;
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
		let temp = this.plus(n);
		this.set(temp.year, temp.month, temp.day);
	}


	previous(n = 1) {
		let temp = this.minus(n);
		this.set(temp.year, temp.month, temp.day);
	}


	get shortForm() {
		let shortForm = this.year;
		if (this.month) {
			shortForm += "-" + String(this.month).padStart(2, "0");
		}
		if (this.day) {
			shortForm += "-" + String(this.day).padStart(2, "0");
		}

		return shortForm;
	}


	get niceForm() {
		let niceForm;

		if (this.equals(ShortDate.currentMonth())) {
			niceForm = "Ce mois-ci";

		} else {
			switch (this.mode) {
				case "day":
					niceForm = this.day + (daysSuffixDict[this.day - 1] ?? "");
					niceForm += " " + monthsDict[this.month - 1].toLowerCase();
					niceForm += " " + this.year;
					break;
				case "month":
					niceForm = monthsDict[this.month - 1];
					niceForm += " " + this.year;
					break;
				case "year":
					niceForm = this.year;
					break;
			}
		}

		return niceForm;
	}


	// Returns the current month.
	static currentMonth() {
		const now = new Date();
		return new ShortDate(now.getFullYear(), now.getMonth() + 1);
	}
}


// Returns whether the given integer is a leap year according to the Gregorian Calendar.
function isLeapYear(year) {
	if (year % 400 === 0) {
		return true;
	} else if (year % 4 === 0 && year % 100 !== 0) {
		return true;
	}
	return false;
}


// Returns the number of days in the given month in the given year of the Gregorian Calendar.
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


const monthsDict = [
	"Janvier", "Février", "Mars", "Avril",
	"Mai", "Juin", "Juillet", "Août",
	"Septembre", "Octobre", "Novembre", "Décembre"
];
const daysSuffixDict = [ "<sup>er</sup>" ];


try {
	global.DateRange = DateRange;
} catch (e) {}
