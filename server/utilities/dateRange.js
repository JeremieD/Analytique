class DateRange {
	constructor(input) {
		this.value = input;

		switch (this.value.length) {
			case 3: // All available: "ALL"
				this.type = "all";
				break;

			case 4: // "2022"
				this.type = "year";
				break;

			case 9: // "2021:2022"
				this.type = "years";
				if (this.value.substr(0, 4) == this.value.substr(5, 4)) {
					this.value = this.value.substr(0, 4);
					this.type = "year";
				}
				break;

			case 7: // "2022-03"
				this.type = "month";
				break;

			case 15: // "2022-03:2022-02"
				this.type = "months";
				if (this.value.substr(0, 7) == this.value.substr(8, 7)) {
					this.value = this.value.substr(0, 7);
					this.type = "month";
				}
				break;

			case 10: // 2022-03-01"
				this.type = "day";
				break;

			case 21: // "2022-03-01:2022-03-07"
				this.type = "days";
				if (this.value.substr(0, 11) == this.value.substr(12, 11)) {
					this.value = this.value.substr(0, 11);
					this.type = "day";
				}
				break;

			default:
				return undefined;
		}
	}

	from() {
		let from = {};

		from.year = parseInt(this.value.substr(0, 4));

		if (this.type.startsWith("month") || this.type.startsWith("day")) {
			from.month = parseInt(this.value.substr(5, 2));
		} else {
			from.month = 1;
		}

		if (this.type.startsWith("day")) {
			from.day = parseInt(this.value.substr(8, 2));
		} else {
			from.day = 1;
		}

		return from;
	};

	to() {
		let value = this.value;
		if (this.type.endsWith("s")) {
			value = this.value.split(":")[1];
		}

		let to = {};

		to.year = parseInt(value.substr(0, 4));

		if (this.type.startsWith("month") || this.type.startsWith("day")) {
			to.month = parseInt(value.substr(5, 2));
		} else {
			to.month = 12;
		}

		if (this.type.startsWith("day")) {
			to.day = parseInt(value.substr(8, 2));
		} else {
			to.day = nbOfDaysInMonth(to.month, to.year);
		}

		const lastDate = to.year + "-" + to.month + "-" + to.day;
		to.millisecond = (new Date(lastDate + " 23:59:59.999")).getTime();

		return to;
	};

	monthRange() {
		let range = [];
		let from = this.from();
		let to = this.to();

		for (let year = from.year; year <= to.year; year++) {
			for (let month = 1; month <= 12; month++) {
				if (year == from.year && month < from.month) {
					continue;
				} else if (year == to.year && month > to.month) {
					break;
				}
				range.push(year + "-" + month.toString().padStart(2, "0"));
			}
		}

		return range;
	};
}

// Returns whether the given integer is a leap year according to the Gregorian Calendar.
function isLeapYear(year) {
	if (year % 400 == 0) {
		return true;
	} else if (year % 4 == 0 && year % 100 != 0) {
		return true;
	}
	return false;
}

// Returns the number of days in the given month in the given year of the Gregorian Calendar.
function nbOfDaysInMonth(month, year) {
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

module.exports = { DateRange };
