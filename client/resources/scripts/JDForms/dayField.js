/**
 *
 * @property {}  -
 */
class JDDayField extends HTMLElement {

  constructor() {
    super();

    this.value = JDDate.today();
    this.disableValidation = false;
    this.view = {};
  }

  connectedCallback() {
    this.classList.add("field");

    this.view.yearField = document.createElement("input");
    this.view.yearField.classList.add("no-focus");

    this.view.monthField = document.createElement("input");
    this.view.monthField.classList.add("no-focus");

    this.view.dayField = document.createElement("input");
    this.view.dayField.classList.add("no-focus");

    const separator1 = document.createElement("span");
    separator1.innerText = "-";
    const separator2 = document.createElement("span");
    separator2.innerText = "-";

    this.append(this.view.yearField,
                separator1, this.view.monthField,
                separator2, this.view.dayField);

    this.draw();

    this.addEventListener("click", e => {
      if (e.target === this.view.yearField) {
        this.view.yearField.focus();
        this.view.yearField.select();

      } else if (e.target === this.view.monthField) {
        this.view.monthField.focus();
        this.view.monthField.select();

      } else {
        this.view.dayField.focus();
        this.view.dayField.select();
      }
    });

    this.view.yearField.addEventListener("change", this.updateFromFields);
    this.view.monthField.addEventListener("change", this.updateFromFields);
    this.view.dayField.addEventListener("change", this.updateFromFields);

    this.view.yearField.addEventListener("focus", () => this.dispatchEvent(new Event("focus")));
    this.view.monthField.addEventListener("focus", () => this.dispatchEvent(new Event("focus")));
    this.view.dayField.addEventListener("focus", () => this.dispatchEvent(new Event("focus")));
    this.view.yearField.addEventListener("blur", () => this.dispatchEvent(new Event("blur")));
    this.view.monthField.addEventListener("blur", () => this.dispatchEvent(new Event("blur")));
    this.view.dayField.addEventListener("blur", () => this.dispatchEvent(new Event("blur")));

    this.view.yearField.addEventListener("keydown", e => {
      if (e.key === "ArrowUp") {
        this.setValue(new JDDate(this.value.year + 1, this.value.month, this.value.day));
        this.view.yearField.select();

      } else if (e.key === "ArrowDown") {
        this.setValue(new JDDate(this.value.year - 1, this.value.month, this.value.day));
        this.view.yearField.select();

      } else if (e.key === "ArrowRight") {
        this.view.monthField.focus();
        this.view.monthField.select();
      }
    });
    this.view.monthField.addEventListener("keydown", e => {
      if (e.key === "ArrowUp") {
        const newDate = this.value.convertedTo("month");
        newDate.next();
        this.setValue(new JDDate(newDate.year, newDate.month, this.value.day));
        this.view.monthField.select();

      } else if (e.key === "ArrowDown") {
        const newDate = this.value.convertedTo("month");
        newDate.previous();
        this.setValue(new JDDate(newDate.year, newDate.month, this.value.day));
        this.view.monthField.select();

      } else if (e.key === "ArrowLeft") {
        this.view.yearField.focus();
        this.view.yearField.select();

      } else if (e.key === "ArrowRight") {
        this.view.dayField.focus();
        this.view.dayField.select();
      }
    });
    this.view.dayField.addEventListener("keydown", e => {
      if (e.key === "ArrowUp") {
        const newDate = new JDDate(this.value);
        newDate.next();
        this.setValue(newDate);
        this.view.dayField.select();

      } else if (e.key === "ArrowDown") {
        const newDate = new JDDate(this.value);
        newDate.previous();
        this.setValue(newDate);
        this.view.dayField.select();

      } else if (e.key === "ArrowLeft") {
        this.view.monthField.focus();
        this.view.monthField.select();
      }
    });
  }

  setValue(date, dispatchEvent = true) {
    this.value.set(date);
    if (!this.disableValidation) {
      this.classList.remove("invalid");
    }
    this.draw();
    if (dispatchEvent) {
      this.dispatchEvent(new Event("change"));
    }
  }

  updateFromFields = () => {
    try {
      this.setValue(new JDDate(parseInt(this.view.yearField.value),
                               parseInt(this.view.monthField.value),
                               parseInt(this.view.dayField.value)));
    } catch (e) {
      if (!this.disableValidation) {
        this.classList.add("invalid");
      }
    }
  }

  draw = () => {
    let year = "AAAA";
    let month = "MM";
    let day = "JJ";

    if (this.value !== undefined) {
      year = String(this.value.year);
      month = String(this.value.month).padStart(2, "0");
      day = String(this.value.day).padStart(2, "0");
    }

    this.view.yearField.value = year;
    this.view.monthField.value = month;
    this.view.dayField.value = day;
  }
}

customElements.define("jd-day-field", JDDayField);
