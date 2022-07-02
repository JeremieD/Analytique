/**
 *
 */
class JDPasswordField extends HTMLElement {
  #view = {};

  constructor() {
    super();

    this.value = "";
  }

  connectedCallback() {
    // Create input field
    this.#view.input = document.createElement("input");
    this.#view.input.type = "password";
    this.#view.input.classList.add("field");

    // Transfer some attributes to input field
    if (this.hasAttribute("required")) {
      this.#view.input.required = true;
      this.removeAttribute("required");
    }
    if (this.hasAttribute("placeholder")) {
      this.#view.input.placeholder = this.getAttribute("placeholder");
      this.removeAttribute("placeholder");
    }
    if (this.hasAttribute("name")) {
      this.#view.input.name = this.getAttribute("name");
      this.removeAttribute("name");
    }

    // Create toggle button
    this.#view.visibilityToggle = document.createElement("button");
    this.#view.visibilityToggle.type = "button";
    const eyeCon = new JDIcon("eye");
    this.#view.visibilityToggle.append(eyeCon);

    // Toggle password visibility on click.
    this.#view.visibilityToggle.addEventListener("click", this.togglePasswordVisibility);

    // Propagate change event to top level
    this.#view.input.addEventListener("input", e => {
      this.value = this.#view.input.value;
      this.dispatchEvent(new Event("input"));
      e.stopPropagation();
    });
    this.#view.input.addEventListener("change", e => {
      this.dispatchEvent(new Event("change"));
      e.stopPropagation();
    });

    this.append(this.#view.input, this.#view.visibilityToggle);
  }

  togglePasswordVisibility = () => {
    if (this.#view.input.type === "password") {
      this.#view.input.type = "text";
    } else {
      this.#view.input.type = "password";
    }
  }
}

customElements.define("jd-password-field", JDPasswordField);
