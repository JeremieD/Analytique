/**
 * Custom element that allows selecting a JDDateRange using a calendar.
 * This object requires JDDate.js.
 * @property
 * @property
 * @property
 */
class JDCalendar extends HTMLElement {
  constructor() {
    super();

    this.range = new JDDateRange(JDDate.thisYear());
    this.value = new JDDateRange(JDDate.today());
    this.highlighted = new JDDateRange(JDDate.today());
    this.monthInView = JDDate.thisMonth();
    this.scrollLock = false;

    this.view = {};
    this.days = {};
  }

  connectedCallback() {
    const gridContainer = document.createElement("div");
    gridContainer.classList.add("grid-container");

    const header = document.createElement("hgroup");
    this.view.label = document.createElement("label");
    header.append(this.view.label);

    // Days grid
    this.view.grid = document.createElement("div");
    this.view.grid.classList.add("days-grid");

    gridContainer.append(header, this.view.grid);
    this.append(gridContainer);

    // Initial draw
    this.drawDaysGrid();
    this.drawHighlight();
    this.drawMonthInView();

    let locked = false;
    let start, end;

    // Lock on mousedown
    this.view.grid.addEventListener("mousedown", e => {
      if (e.target.dataset.value) {
        locked = true;
        start = new JDDate(e.target.dataset.value);
        this.setHighlighted(new JDDateRange(start));
      }
    }, { passive: true });

    // Unlock on mouseup
    document.addEventListener("mouseup", e => {
      if (locked && start) {
        if (e.target.dataset.value && !e.target.disabled) {
          end = new JDDate(e.target.dataset.value);
        }

        if (end === undefined) {
          end = new JDDate(start.shortForm);
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
      if (locked && e.target.dataset.value && !e.target.disabled) {
        end = new JDDate(e.target.dataset.value);

        if (end.earlierThan(start)) {
          this.setHighlighted(new JDDateRange(end, start));
        } else {
          this.setHighlighted(new JDDateRange(start, end));
        }
      }
    }, { passive: true });

    // Update on scroll.
    this.view.grid.addEventListener("scroll", () => {
      if (!this.scrollLock) {
        const tileSize = parseInt(getComputedStyle(this).getPropertyValue('--day-size'));
        const tileGap = parseInt(getComputedStyle(this).getPropertyValue('--day-gap'));
        const row = Math.ceil(this.view.grid.scrollTop / (tileSize + tileGap));
        const topDayIndex = (row + 1) * 7 + 7;
        const topDay = this.view.grid.children[topDayIndex];
        const monthInView = (new JDDate(topDay.dataset.value)).convertTo("month");
        if (!monthInView.equals(this.monthInView)) {
          this.setMonthInView(monthInView);
        }
      }
    });
  }

  /**
   *
   * @param {JDDateRange} value
   */
  setRange(value) {
    this.range = new JDDateRange(value.shortForm);
    this.drawDaysGrid();
  }

  /**
   *
   * @param {JDDateRange} value
   */
  setValue(value) {
    this.value.set(value.shortForm);
    this.setHighlighted(value);

    value.convertTo("month");
    if (!value.equals(this.monthInView)) {
      this.setMonthInView(value);
    }
  }

  /**
   *
   * @param {JDDateRange} value
   */
  setHighlighted(value) {
    this.highlighted.set(value.shortForm);
    this.drawHighlight();
  }

  /**
   *
   * @param {JDDate} value
   */
  setMonthInView(value) {
    this.monthInView.set(value.shortForm);
    this.drawMonthInView();
  }

  drawDaysGrid() {
    this.view.grid.innerHTML = "";

    // Draw main range
    for (let month of this.range.monthRange()) {
      month = new JDDate(month);

      for (let i = 1; i <= nbOfDaysInMonth(month.year, month.month); i++) {
        const date = new JDDate(month.year, month.month, i);

        const day = document.createElement("button");
        day.innerText = i;
        day.tabIndex = -1;
        day.dataset.value = date.shortForm;

        if (!this.range.contains(date)) {
          day.disabled = true;
        }

        if (i === 1) {
          day.classList.add("firstOfMonth");
          day.style.gridColumnStart = date.dayOfWeek + 1;
        }

        this.view.grid.append(day);

        this.days[date.shortForm] = day;
      }
    }

    // Overdraw 2 weeks before range.
    let pointer = new JDDate(this.view.grid.children[0].dataset.value);
    let dayOfWeek = pointer.dayOfWeek;
    let overdrawCount = 14 + dayOfWeek;
    for (let i = 0; i < overdrawCount; i++) {
      pointer.previous();
      const day = document.createElement("button");
      day.innerText = pointer.day;
      day.tabIndex = -1;
      day.dataset.value = pointer.shortForm;
      day.disabled = true;
      this.view.grid.prepend(day);
      this.days[pointer.shortForm] = day;
    }

    // Overdraw 2 weeks after range.
    pointer = new JDDate(this.view.grid.children[this.view.grid.children.length - 1].dataset.value);
    dayOfWeek = pointer.dayOfWeek;
    overdrawCount = 20 - dayOfWeek;
    for (let i = 0; i < overdrawCount; i++) {
      pointer.next();
      const day = document.createElement("button");
      day.innerText = pointer.day;
      day.tabIndex = -1;
      day.dataset.value = pointer.shortForm;
      day.disabled = true;
      this.view.grid.append(day);
      this.days[pointer.shortForm] = day;
    }
  }

  drawHighlight() {
    for (const day of this.view.grid.children) {
      const date = new JDDate(day.dataset.value);

      day.classList.remove("highlighted");
      if (this.highlighted.contains(date)) {
        day.classList.add("highlighted");
      }

      day.classList.remove("start");
      if (date.equals(this.highlighted.firstDay)) {
        day.classList.add("start");
      }

      day.classList.remove("end");
      if (date.equals(this.highlighted.lastDay)) {
        day.classList.add("end");
      }
    }
  }

  drawMonthInView() {
    // Draw title
    this.view.label.innerHTML = monthsDict[this.monthInView.month - 1] +
      " <small>" + this.monthInView.year + "</small>";

    // Fade other days.
    for (const day of this.view.grid.children) {
      const date = new JDDate(day.dataset.value);
      day.classList.remove("subdued");
      if (!this.monthInView.contains(date)) {
        day.classList.add("subdued");
      }
    }

    // Scroll to month
    const tileSize = parseInt(getComputedStyle(this).getPropertyValue('--day-size'));
    const tileGap = parseInt(getComputedStyle(this).getPropertyValue('--day-gap'));
    const firstOfMonth = new JDDate(this.monthInView.shortForm + "-01");
    const yOffset = this.days[firstOfMonth.shortForm].offsetTop;
    const scrollTop = yOffset - tileSize - tileGap;
    if (scrollTop !== this.view.grid.scrollTop) {
      this.scrollLock = true;
      setTimeout(() => {
        this.scrollLock = false;
      }, 500);

      this.view.grid.scrollTo({
        top: scrollTop,
        behavior: "smooth"
      });
    }
  }
}

customElements.define("jd-calendar", JDCalendar);
