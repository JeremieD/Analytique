/*
 *
 */
class JDSelect extends HTMLElement {

	constructor() {
		super();
		this.value;
		this.options = [];
		this.label = document.createElement("label");

		this.tabIndex = 0;

		const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		icon.setAttribute("viewBox", "0 0 8 4");
		icon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
		const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
		const polylinePoints = "0,0 4,4 8,0";
		polyline.setAttribute("points", polylinePoints);
		icon.append(polyline);

		this.append(this.label, icon);

		this._mouseDownTime;
		this._abortController;

		this.menu = document.createElement("ol");
		this.menu.classList.add("jd-select-menu");

		this.addEventListener("mousedown", this.handleMouseEvent);
		this.addEventListener("mouseup", this.handleMouseEvent);
		this.addEventListener("keydown", this.handleKeyboardEvent);
	}

	addOption(value) {
		if (this.options.length === 0) {
			this.label.innerText = value;
		}
		this.options.push(value);

		const newElement = document.createElement("li");
		newElement.tabIndex = -1;
		newElement.dataset.value = value;

		newElement.innerText = value;
		this.menu.append(newElement);
	}

	handleMouseEvent(e) {
		if (e.type === "mousedown") {
			if (this._mouseDownTime === undefined) {
				this._mouseDownTime = Date.now();
				this.open();
			}

		} else if (e.type === "mouseup") {
			if (Date.now() - this._mouseDownTime > 125) {
				if (e.target !== this.menu && e.target.dataset.value !== this.value) {
					this.value = e.target.dataset.value;
					this.label.innerText = e.target.dataset.value;
					this.dispatchEvent(new Event("change"));
				}
				this.close();
			}
		}
	}

	handleKeyboardEvent(e) {
		if (e.code === "Space" || e.code === "Enter") {
			if (e.target === this) {
				this.open();
				this.menu.children[this.options.indexOf(this.value)].focus();

			} else {
				if (e.target.dataset.value !== this.value) {
					this.value = e.target.dataset.value;
					this.label.innerText = e.target.dataset.value;
					this.dispatchEvent(new Event("change"));
				}
				this.close();
				this.focus();
			}
			e.preventDefault();

		} else if (e.code === "ArrowDown") {
			e.preventDefault();
			if (e.target === this) {
				if (this.classList.contains("open")) {
					this.menu.children[0].focus();
					return;
				}
				const nextIndex = this.options.indexOf(this.value) + 1;
				if (nextIndex < this.options.length) {
					this.value = this.options[nextIndex];
					this.label.innerText = this.options[nextIndex];
					this.dispatchEvent(new Event("change"));
				}
				return;
			}
			let nextIndex = this.options.indexOf(e.target.dataset.value) + 1;
			if (nextIndex >= this.options.length) {
				nextIndex = 0;
			}
			this.menu.children[nextIndex].focus();

		} else if (e.code === "ArrowUp") {
			e.preventDefault();
			if (e.target === this) {
				if (this.classList.contains("open")) {
					this.menu.children[this.options.length - 1].focus();
					return;
				}
				const previousIndex = this.options.indexOf(this.value) - 1;
				if (previousIndex >= 0) {
					this.value = this.options[previousIndex];
					this.label.innerText = this.options[previousIndex];
					this.dispatchEvent(new Event("change"));
				}
				return;
			}
			let previousIndex = this.options.indexOf(e.target.dataset.value) - 1;
			if (previousIndex < 0) {
				previousIndex = this.options.length - 1;
			}
			this.menu.children[previousIndex].focus();

		} else if (e.code === "Tab") {
			this.close();

		} else if (e.code === "Escape") {
			this.close();
			e.preventDefault();

		} else {
			this.close();
		}
	}

	open() {
		this.classList.add("open");

		this._abortController = new AbortController()

		this.menu.style.transform = "translateY(" + (-12 - this.options.indexOf(this.value) * 32) + "px)";
		this.append(this.menu);

		this.backdropClickTimeout = setTimeout(() => {
			document.addEventListener("click", () => {
				this.close();
			}, { once: true, signal: this._abortController.signal });
		}, 125);
	}

	close() {
		clearTimeout(this.backdropClickTimeout);
		this._abortController.abort();
		this._mouseDownTime = undefined;

		this.menu.remove();
		this.classList.remove("open");
	}

}

customElements.define("jd-select", JDSelect);
