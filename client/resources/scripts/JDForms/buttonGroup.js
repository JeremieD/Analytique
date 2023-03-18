/**
 * Radio-like button group element.
 * @property {string} value - Currently selected value.
 * @property {string[]} options - List of possible values, each one corresponding to a button.
 */
class JDButtonGroup extends HTMLElement {

  constructor() {
    super();

    this.value = this.querySelector(".selected")?.value;
    this.options = [];

    for (const button of this.children) {
      this.options.push(button.value);

      button.classList.add("button");

      // Select on click.
      const self = this;
      button.addEventListener("click", function() {
        self.select(this.value);
      });

      this.select(this.value);

      // Handle keyboard events
      this.addEventListener("keydown", e => {
        // Selects next value.
        if (e.code === "ArrowRight") {
          let nextIndex = this.options.indexOf(e.target.value) + 1;
          if (nextIndex >= this.options.length) {
            nextIndex = 0;
          }
          this.select(this.options[nextIndex], true);

        // Selects previous value.
        } else if (e.code === "ArrowLeft") {
          let previousIndex = this.options.indexOf(e.target.value) - 1;
          if (previousIndex < 0) {
            previousIndex = this.options.length - 1;
          }
          this.select(this.options[previousIndex], true);
        }

        e.stopPropagation();
      });

    }
  }

  /**
   * Selects the given value.
   * @param {string} value - The value to select.
   * @param {boolean} [focus=false] - If set to true, moves focus to selected button.
   */
  select(value, focus = false) {
    for (const button of this.children) {
      const selected = button.value === value;
      button.tabIndex = selected ? 0 : -1;

      if (selected) {
        button.classList.add("selected");
        if (focus) {
          button.focus();
        }
        this.value = value;
        this.dispatchEvent(new Event("change"));

      } else {
        button.classList.remove("selected");
      }
    }
  }
}

customElements.define("jd-button-group", JDButtonGroup);
