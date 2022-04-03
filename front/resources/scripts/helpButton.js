/*
 * A custom element that displays a help tooltip when hovered.
 */
class HelpButton extends HTMLElement {

	constructor() {
		super();

		this.tooltipElement = document.createElement("help-text");
		this.tooltipElement.innerHTML = this.innerHTML;

		this.innerHTML = HelpButton.icon;
		
		this.abortController;

		if (!this.hasAttribute("tabindex")) {
			this.tabIndex = 0;
		}


		this.addEventListener("mouseenter", this.open, { passive: true });
		this.addEventListener("mouseleave", this.close, { passive: true });
	}


	open() {
		if (this.tooltipElement.classList.contains("out")) {
			this.tooltipElement.classList.remove("out");
			this.abortController.abort();

		} else {
			this.tooltipElement.classList.add("in");
			this.appendChild(this.tooltipElement);
		}
	}


	close() {
		this.tooltipElement.classList.remove("in");
		this.abortController = new AbortController(); // Reset AbortController

		this.tooltipElement.addEventListener("animationend", () => {
			this.tooltipElement.remove();
			this.tooltipElement.classList.remove("out");

		}, { passive: true, once: true, signal: this.abortController.signal });

		this.tooltipElement.classList.add("out");
	}


	// The help icon that is used as a button.
	static icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
		<rect width="16" height="16" stroke="transparent"/>
		<g>
			<circle cx="8" cy="8" r="8" stroke="none"/>
			<circle cx="8" cy="8" r="7.25" fill="none"/>
		</g>
		<path d="M0-4V1" transform="translate(8 11)" />
		<path d="M0-3v1.5" transform="translate(8 7)"/>
	</svg>`;
}

customElements.define("help-button", HelpButton);
