/*
 *
 */
class JDButtonToggleGroup extends HTMLElement {

	constructor() {
		super();
		this.value = this.querySelector("[selected]").value;
		this.values = [];

		for (const button of this.children) {
			this.values.push(button.value);

			const isSelected = button.value === this.value;
			button.tabIndex = isSelected ? 0 : -1;

			const self = this;
			button.addEventListener("click", function(e) {
				self.select(this.value);
			});
		}

		this.addEventListener("keydown", this.handleKeyboardEvent);
	}

	select(value, focus = false) {
		for (const button of this.children) {
			const isSelected = button.value === value;
			button.tabIndex = isSelected ? 0 : -1;
			if (isSelected) {
				button.setAttribute("selected", "");
				if (focus) {
					button.focus();
				}
				this.value = value;
				this.dispatchEvent(new Event("change"));

			} else {
				button.removeAttribute("selected");
			}
		}
	}

	handleKeyboardEvent(e) {
		if (e.code === "ArrowRight") {
			let nextIndex = this.values.indexOf(e.target.value) + 1;
			if (nextIndex >= this.values.length) {
				nextIndex = 0;
			}
			this.select(this.values[nextIndex], true);

		} else if (e.code === "ArrowLeft") {
			let previousIndex = this.values.indexOf(e.target.value) - 1;
			if (previousIndex < 0) {
				previousIndex = this.values.length - 1;
			}
			this.select(this.values[previousIndex], true);
		}

		e.stopPropagation();
	}

}

customElements.define("jd-button-toggle-group", JDButtonToggleGroup);
