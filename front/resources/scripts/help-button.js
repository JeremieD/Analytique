const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
	<rect width="16" height="16" stroke="transparent"/>
	<g>
		<circle cx="8" cy="8" r="8" stroke="none"/>
		<circle cx="8" cy="8" r="7.25" fill="none"/>
	</g>
	<path d="M0-4V1" transform="translate(8 11)" />
	<path d="M0-3v1.5" transform="translate(8 7)"/>
</svg>`;

class HelpButton extends HTMLElement {

	constructor() {
		super();

		this.tooltipElement = document.createElement("help-text");
		this.tooltipElement.innerHTML = this.innerHTML;
		this.innerHTML = icon;

		if (!this.hasAttribute("tabindex")) {
			this.tabIndex = 0;
		}

		this.animationController;


		this.addEventListener("mouseenter", this.open, { passive: true });
		this.addEventListener("mouseleave", this.close, { passive: true });
	}

	open() {
		if (this.tooltipElement.classList.contains("out")) {
			this.tooltipElement.classList.remove("out");
			this.animationController.abort();
		} else {
			this.tooltipElement.classList.add("in");
			this.appendChild(this.tooltipElement);
		}
	}

	close() {
		this.tooltipElement.classList.remove("in");
		this.animationController = new AbortController(); // Reset AbortController
		this.tooltipElement.addEventListener("animationend", () => {
			this.tooltipElement.remove();
			this.tooltipElement.classList.remove("out");

		}, { passive: true, once: true, signal: this.animationController.signal });

		this.tooltipElement.classList.add("out");
	}
}

customElements.define("help-button", HelpButton);
