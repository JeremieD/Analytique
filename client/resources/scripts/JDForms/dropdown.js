/**
 * Custom dropdown element.
 * @property {string} value - Currently selected value.
 * @property {string[]} options - List of possible values.
 */
class JDDropdown extends HTMLElement {

  #value;

  #label = document.createElement("label");
  #menu = document.createElement("ol");
  #optionElements = {};

  #mouseDownTime;
  #abort;
  #backdropClickTimeout;

  constructor() {
    super();

    this.options = [];
    this.labels = [];

    this.addEventListener("mousedown", this.handleMouseDown);
    this.addEventListener("mouseup", this.handleMouseUp);
    this.addEventListener("keydown", this.handleKeyboardEvent);
  }

  get value() {
    return this.#value;
  }

  set value(value) {
    if (this.#optionElements.hasOwnProperty(value)) {
      this.#value = value;
      this.#label.innerText = value;
    }
  }

  connectedCallback() {
    this.tabIndex = 0;

    const icon = new JDIcon("chevron-down");
    this.append(this.#label, icon);
  }

  /**
   * Adds the given value to the list of options.
   */
  addOption(value, label = undefined) {
    const newElement = document.createElement("option");
    newElement.tabIndex = -1;
    newElement.value = value;

    if (label === undefined) {
      label = value;
    }
    newElement.innerText = label;

    this.options.push(value);
    this.labels.push(label);
    this.#optionElements[value] = newElement;

    this.#menu.append(newElement);

    if (this.#value === undefined) {
      this.#value = value;
      this.#label.innerText = value;
    }
  }

  handleMouseDown(e) {
    if (this.classList.contains("open")) return;
    this.#mouseDownTime = Date.now();
    this.open();
  }

  handleMouseUp(e) {
    if (this.#mouseDownTime === undefined || Date.now() - this.#mouseDownTime > 250) {
      if (e.target !== this.#menu && e.target.value !== this.#value) {
        this.#value = e.target.value;
        this.#label.innerText = e.target.value;
        this.dispatchEvent(new Event("change"));
      }
      this.close();
    }
  }

  handleKeyboardEvent(e) {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();

      if (e.target === this) {
        this.open();
        this.#menu.children[this.options.indexOf(this.#value)].focus();

      } else {
        if (e.target.value !== this.#value) {
          this.#value = e.target.value;
          this.#label.innerText = e.target.value;
          this.dispatchEvent(new Event("change"));
        }
        this.close();
        this.focus();
      }

    } else if (e.code === "ArrowDown") {
      e.preventDefault();

      if (e.target === this) {
        if (this.classList.contains("open")) {
          this.#menu.children[0].focus();
          return;
        }
        const nextIndex = this.options.indexOf(this.#value) + 1;
        if (nextIndex < this.options.length) {
          this.#value = this.options[nextIndex];
          this.#label.innerText = this.options[nextIndex];
          this.dispatchEvent(new Event("change"));
        }
        return;
      }

      let nextIndex = this.options.indexOf(e.target.value) + 1;
      if (nextIndex >= this.options.length) {
        nextIndex = 0;
      }

      this.#menu.children[nextIndex].focus();

    } else if (e.code === "ArrowUp") {
      e.preventDefault();

      if (e.target === this) {
        if (this.classList.contains("open")) {
          this.#menu.children[this.options.length - 1].focus();
          return;
        }
        const previousIndex = this.options.indexOf(this.#value) - 1;
        if (previousIndex >= 0) {
          this.#value = this.options[previousIndex];
          this.#label.innerText = this.options[previousIndex];
          this.dispatchEvent(new Event("change"));
        }
        return;
      }

      let previousIndex = this.options.indexOf(e.target.value) - 1;
      if (previousIndex < 0) {
        previousIndex = this.options.length - 1;
      }

      this.#menu.children[previousIndex].focus();

    } else if (e.code === "Tab") {
      this.close();

    } else if (e.code === "Escape") {
      this.close();
      e.preventDefault();

    } else {
      this.close();
    }
  }

  /**
   * Reveals the dropdown.
   */
  open() {
    this.classList.add("open");
    this.#menu.classList.remove("fade-out");

    this.#abort = new AbortController();

    this.append(this.#menu);

    const yOffset = -8 - this.#optionElements[this.#value].offsetTop;
    this.#menu.style.transform = `translateY(${yOffset}px)`;

    this.#backdropClickTimeout = setTimeout(() => {
      document.addEventListener("click", () => {
        this.close();
      }, { once: true, passive: true, signal: this.#abort.signal });
    }, 125);
  }

  /**
   * Hides the dropdown.
   */
  close() {
    clearTimeout(this.#backdropClickTimeout);
    this.#abort?.abort();
    this.#mouseDownTime = undefined;

    this.#menu.addEventListener("animationend", () => {
      this.#menu.remove();
    }, { once: true, passive: true });

    this.classList.remove("open");
    this.#menu.classList.add("fade-out");
  }
}

customElements.define("jd-dropdown", JDDropdown);
