/*
 * Custom element that allows selecting a JDDateRange using a calendar.
 * This object depends on JDDate.js.
 */
class JDCalendar extends HTMLElement {

  constructor(value) {
    super();
    this.value = value ?? new JDDateRange(JDDate.today());
    this.month = new JDDate(this.value.to.year, this.value.to.month);
  }

  connectedCallback() {
    const header = document.createElement("div");

    this.previousMonthButton = document.createElement("button");
    this.previousMonthButton.tabIndex = -1;
    this.previousMonthButton.addEventListener("click", () => {
      this.month.previous();
      this.draw();
    });
    const iconNext = document.createElement("jd-icon");
    iconNext.setAttribute("icon", "chevron-left");
    this.previousMonthButton.append(iconNext);

    this.nextMonthButton = document.createElement("button");
    this.nextMonthButton.tabIndex = -1;
    this.nextMonthButton.addEventListener("click", () => {
      this.month.next();
      this.draw();
    });
    const iconPrevious = document.createElement("jd-icon");
    iconPrevious.setAttribute("icon", "chevron-right");
    this.nextMonthButton.append(iconPrevious);

    this.label = document.createElement("label");

    header.append(this.previousMonthButton, this.label, this.nextMonthButton);

    // Days grid
    this.grid = document.createElement("div");

    this.append(header, this.grid);

    this.draw();
  }

  draw() {
    // Draw month title.
    this.label.innerHTML = monthsDict[this.month.month - 1] +
      " <small>" + this.month.year + "</small>";

    // Clear grid.
    this.grid.innerHTML = "";

    // Inline function to spawn a new day button.
    const newDayButton = (date, enabled = true,
                          selected = false, secondary = false) => {
      const dayButton = document.createElement("button");

      if (selected) dayButton.classList.add("selected");
      if (secondary) dayButton.classList.add("secondary");
      dayButton.disabled = !enabled;

      dayButton.tabIndex = -1;
      dayButton.innerText = date.day;
      dayButton.dataset.targetValue = date.shortForm;

      dayButton.addEventListener("click", () => {
        this.value = new JDDateRange(dayButton.dataset.targetValue);
        this.month = new JDDate(this.value.to.year, this.value.to.month);
        this.dispatchEvent(new Event("change"));
        this.draw();
      });

      return dayButton;
    };

    // Draw days for previous month.
    const previousMonth = (new JDDate(this.month.year, this.month.month)).previous();
    const firstOffset = (new JDDate(this.month.year, this.month.month, 1)).dayOfWeek;
    let date;
    if (firstOffset !== 0) {
      date = new JDDate(previousMonth.year, previousMonth.month,
        nbOfDaysInMonth(previousMonth.year, previousMonth.month) - firstOffset + 1);
    }
    for (let i = 0; i < firstOffset; i++) {
      const enabled = this.availableRange?.contains(date) ?? true;
      const selected = this.value.contains(date);
      this.grid.append(newDayButton(date, enabled, selected, true));
      date.next();
    }

    // Draw days for current month.
    date = new JDDate(this.month.year, this.month.month, 1);
    for (let i = 0; i < nbOfDaysInMonth(this.month.year, this.month.month); i++) {
      const enabled = this.availableRange?.contains(date) ?? true;
      const selected = this.value.contains(date);
      this.grid.append(newDayButton(date, enabled, selected, false));
      date.next();
    }

    // Draw days for next month.
    const nextMonth = (new JDDate(this.month.year, this.month.month)).next();
    date = new JDDate(nextMonth.year, nextMonth.month, 1);
    const lastOffset = (new JDDate(this.month.year, this.month.month, nbOfDaysInMonth(this.month.year, this.month.month))).dayOfWeek;
    for (let i = 1; i < 7 - lastOffset; i++) {
      const enabled = this.availableRange?.contains(date) ?? true;
      const selected = this.value.contains(date);
      this.grid.append(newDayButton(date, enabled, selected, true));
      date.next();
    }
  }
}

customElements.define("jd-calendar", JDCalendar);
