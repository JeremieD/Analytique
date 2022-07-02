/**
 * Custom element that allows selecting a JDDateRange using a calendar.
 */
class JDCalendar extends HTMLElement {
  constructor() {
    super();

    this.state = {
      range: new JDDateRange(JDDate.thisYear()),
      value: new JDDateRange(JDDate.today()),
      highlighted: new JDDateRange(JDDate.today()),
      active: 0,
      monthInView: JDDate.thisMonth(),
      scrollLock: true
    };

    this.previousState = {
      value: undefined,
    };

    this.view = {
      fields: [],
      days: {}
    };
  }

  connectedCallback() {
    const fieldsContainer = document.createElement("div");
    fieldsContainer.classList.add("fields-container");

    this.view.fields[0] = new JDDayField();
    this.view.fields[0].disableValidation = true;
    this.view.fields[0].classList.add("small");
    const rangeSeparator = document.createElement("span");
    rangeSeparator.innerText = "→";
    this.view.fields[1] = new JDDayField();
    this.view.fields[1].disableValidation = true;
    this.view.fields[1].classList.add("small");
    fieldsContainer.append(this.view.fields[0], rangeSeparator, this.view.fields[1]);

    const gridContainer = document.createElement("div");
    gridContainer.classList.add("grid-container");

    const header = document.createElement("hgroup");
    this.view.label = document.createElement("label");
    header.append(this.view.label);

    // Days grid
    this.view.grid = document.createElement("div");
    this.view.grid.classList.add("days-grid");
    this.view.grid.tabIndex = -1;

    gridContainer.append(header, this.view.grid);
    this.append(fieldsContainer, gridContainer);

    // Initial draw
    this.drawDaysGrid();
    this.drawHighlight();
    this.drawMonthInView();

    let locked = false;
    let start, end;

    // Lock on mousedown
    this.view.grid.addEventListener("mousedown", e => {
      if (e.target.value) {
        locked = true;
        start = new JDDate(e.target.value);
        this.state.active = 0;
        this.setHighlighted(new JDDateRange(start));
      }
    }, { passive: true });

    // Unlock on mouseup
    document.addEventListener("mouseup", e => {
      if (locked && start) {
        if (e.target.value && !e.target.disabled) {
          end = new JDDate(e.target.value);
        }

        if (end === undefined) {
          end = new JDDate(start);
        }

        if (end.earlierThan(start)) {
          this.setValue(new JDDateRange(end, start));
        } else {
          this.setValue(new JDDateRange(start, end));
        }
        locked = false;

        start = undefined;
        end = undefined;

        this.dispatchEvent(new Event("change"));
      }
    }, { passive: true });

    // Update on mousemove
    this.view.grid.addEventListener("mousemove", e => {
      if (locked && e.target.value && !e.target.disabled) {
        end = new JDDate(e.target.value);
        this.state.active = 1;

        if (end.earlierThan(start)) {
          this.state.active = 0;
          this.setHighlighted(new JDDateRange(end, start));
        } else {
          this.setHighlighted(new JDDateRange(start, end));
        }
      }
    }, { passive: true });

    // Update on scroll.
    this.view.grid.addEventListener("scroll", () => {
      if (!this.state.scrollLock) {
        const tileSize = parseInt(getComputedStyle(this).getPropertyValue('--day-size'));
        const tileGap = parseInt(getComputedStyle(this).getPropertyValue('--day-gap'));
        const row = Math.ceil(this.view.grid.scrollTop / (tileSize + tileGap));
        const topDayIndex = (row + 1) * 7 + 7;
        const topDay = this.view.grid.children[topDayIndex];
        const monthInView = (new JDDate(topDay.value)).convertTo("month");
        if (!monthInView.equals(this.state.monthInView)) {
          this.setMonthInView(monthInView);
        }
      }
    }, { passive: true });

    // Update on field change
    this.view.fields[0].addEventListener("change", () => {
      this.setValue(new JDDateRange(this.view.fields[0].value, this.view.fields[1].value));
      this.view.fields[0].classList.remove("invalid");
      if (!this.state.range.contains(this.view.fields[0].value)) {
        this.view.fields[0].classList.add("invalid");
      }
      this.dispatchEvent(new Event("change"));
    });
    this.view.fields[1].addEventListener("change", () => {
      this.setValue(new JDDateRange(this.view.fields[0].value, this.view.fields[1].value));
      this.view.fields[1].classList.remove("invalid");
      if (!this.state.range.contains(this.view.fields[1].value)) {
        this.view.fields[1].classList.add("invalid");
      }
      this.dispatchEvent(new Event("change"));
    });

    this.view.fields[0].addEventListener("focus", () => {
      this.state.active = 0;
      this.drawHighlight();
    });
    this.view.fields[1].addEventListener("focus", () => {
      this.state.active = 1;
      this.drawHighlight();
    });
  }

  /**
   *
   * @param {JDDateRange} value
   */
  setRange(value) {
    this.state.range = new JDDateRange(value);
    this.drawDaysGrid();
    this.drawMonthInView();
  }

  /**
   * @param {JDDateRange} value
   */
  setValue(value) {
    if (this.previousState.value === undefined ||
        !value.equals(this.previousState.value)) {
      this.state.value.set(value);
      this.setHighlighted(value);

      this.view.fields[0].setValue(new JDDate(value.from), false);
      this.view.fields[1].setValue(new JDDate(value.to), false);

      value.convertTo("month");
      if (!value.equals(this.state.monthInView)) {
        this.setMonthInView(value.from);
      }

      this.previousState.value = new JDDateRange(value);
    }
  }

  /**
   * @param {JDDateRange} value
   */
  setHighlighted(value) {
    this.state.highlighted.set(value);
    this.drawHighlight();
  }

  /**
   * @param {JDDate} value
   */
  setMonthInView(value) {
    this.state.monthInView.set(value);
    this.drawMonthInView();
  }

  drawDaysGrid() {
    this.view.grid.innerHTML = "";
    this.view.days = [];

    // Draw main range
    for (let month of this.state.range.monthRange()) {
      month = new JDDate(month);

      for (let i = 1; i <= nbOfDaysInMonth(month.year, month.month); i++) {
        const date = new JDDate(month.year, month.month, i);

        const day = document.createElement("button");
        day.innerText = i;
        day.tabIndex = -1;
        day.value = date.shortForm;

        if (!this.state.range.contains(date)) {
          day.disabled = true;
        }

        if (i === 1) {
          day.classList.add("firstOfMonth");
          day.style.gridColumnStart = date.dayOfWeek + 1;
        }

        this.view.grid.append(day);

        this.view.days[date.shortForm] = day;
      }
    }

    // Overdraw 2 weeks before range.
    let pointer = new JDDate(this.view.grid.children[0].value);
    let dayOfWeek = pointer.dayOfWeek;
    let overdrawCount = 14 + dayOfWeek;
    for (let i = 0; i < overdrawCount; i++) {
      pointer.previous();
      const day = document.createElement("button");
      day.innerText = pointer.day;
      day.tabIndex = -1;
      day.value = pointer.shortForm;
      day.disabled = true;
      this.view.grid.prepend(day);
      this.view.days[pointer.shortForm] = day;
    }

    // Overdraw 2 weeks after range.
    pointer.set(this.view.grid.children[this.view.grid.children.length - 1].value);
    dayOfWeek = pointer.dayOfWeek;
    overdrawCount = 20 - dayOfWeek;
    for (let i = 0; i < overdrawCount; i++) {
      pointer.next();
      const day = document.createElement("button");
      day.innerText = pointer.day;
      day.tabIndex = -1;
      day.value = pointer.shortForm;
      day.disabled = true;
      this.view.grid.append(day);
      this.view.days[pointer.shortForm] = day;
    }

    this.view.grid.scrollTop = this.view.days[this.state.value.from.shortForm].offsetTop;
  }

  drawHighlight() {
    for (const day of this.view.grid.children) {
      const date = new JDDate(day.value);

      day.classList.remove("highlighted");
      if (this.state.highlighted.contains(date)) {
        day.classList.add("highlighted");
      }

      day.classList.remove("active");

      day.classList.remove("start");
      if (date.equals(this.state.highlighted.firstDay)) {
        day.classList.add("start");
        if (this.state.active === 0) {
          day.classList.add("active");
        }
      }

      day.classList.remove("end");
      if (date.equals(this.state.highlighted.lastDay)) {
        day.classList.add("end");
        if (this.state.active === 1) {
          day.classList.add("active");
        }
      }
    }
  }

  drawMonthInView() {
    // Draw title
    this.view.label.innerHTML = monthsDict[this.state.monthInView.month - 1] +
      " <small>" + this.state.monthInView.year + "</small>";

    // Fade other days.
    for (const day of this.view.grid.children) {
      const date = new JDDate(day.value);
      day.classList.remove("subdued");
      if (!this.state.monthInView.contains(date)) {
        day.classList.add("subdued");
      }
    }

    // Scroll to month
    if (this.state.range.contains(this.state.monthInView)) {
      this.state.scrollLock = true;
      setTimeout(() => {
        this.state.scrollLock = false;
      }, 500);
      const tileSize = parseInt(getComputedStyle(this).getPropertyValue('--day-size'));
      const tileGap = parseInt(getComputedStyle(this).getPropertyValue('--day-gap'));
      const firstOfMonth = new JDDate(this.state.monthInView.shortForm + "-01");
      const yOffset = this.view.days[firstOfMonth.shortForm].offsetTop;
      this.view.grid.scrollTo({
        top: yOffset - tileSize - tileGap,
        behavior: "smooth"
      });
    }
  }
}

customElements.define("jd-calendar", JDCalendar);
