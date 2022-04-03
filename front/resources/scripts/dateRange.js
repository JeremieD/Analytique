class DateRange {
	constructor(value = undefined) {
		this.shortForm = value ?? DateRange.currentMonth();
	}

	get month() {
		return parseInt(this.shortForm.substr(5, 2)) - 1;
	}

	get year() {
		return parseInt(this.shortForm.substr(0, 4));
	}

	plus(n) {
		const sign = Math.sign(n);
		let newYear = this.year;
		let newMonth = this.month;

		if (sign === 1) {
			for (let i = 0; i < n; i++) {
				if (newMonth === 11) {
					newYear++;
					newMonth = 0;
				} else {
					newMonth++;
				}
			}

		} else {
			for (let i = 0; i < Math.abs(n); i++) {
				if (newMonth === 0) {
					newYear--;
					newMonth = 11;
				} else {
					newMonth--;
				}
			}
		}

		return new DateRange(newYear + "-" + String(newMonth + 1).padStart(2, "0"));
	}

	minus(n) {
		return this.plus(-1 * n);
	}

	next() {
		this.shortForm = this.plus(1).shortForm;
	}

	previous() {
		this.shortForm = this.minus(1).shortForm;
	}


	lessThan(otherDateRange) {
		if (this.year === otherDateRange.year) {
			return this.month < otherDateRange.month;
		}
		return this.year < otherDateRange.year;
	}

	moreThan(otherDateRange) {
		if (this.year === otherDateRange.year) {
			return this.month > otherDateRange.month;
		}
		return this.year > otherDateRange.year;
	}

	get longForm() {
		let longForm = "Ce mois-ci";
		if (this.shortForm !== DateRange.currentMonth()) {
			longForm = monthsDict[this.month] + " " + this.year;
		}
		return longForm;
	}

	static currentMonth() {
		const currentDate = new Date();
		return currentDate.getFullYear() + "-" +
			   String(currentDate.getMonth() + 1).padStart(2, "0");
	}
}

const monthsDict = [
	"Janvier", "Février", "Mars",
	"Avril", "Mai", "Juin",
	"Juillet", "Août", "Septembre",
	"Octobre", "Novembre", "Décembre",
]
