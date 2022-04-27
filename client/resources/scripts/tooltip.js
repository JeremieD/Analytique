/*
 * Display a tooltip when hovering an element with the “tooltip” attribute.
 */
whenDOMReady(() => {
	let elementsWithTooltips = document.querySelectorAll("[tooltip]");

	for (const el of elementsWithTooltips) {
		if (!el.hasAttribute("tabindex")) {
			el.tabIndex = 0;
		}

		el.abortController;
		el.tooltipElement = document.createElement("jd-tooltip");
		el.tooltipElement.innerHTML = el.getAttribute("tooltip");

		el.addEventListener("mouseenter", () => {
			if (el.tooltipElement.classList.contains("out")) {
				el.tooltipElement.classList.remove("out");
				el.abortController.abort();

			} else {
				el.tooltipElement.classList.add("in");
				el.appendChild(el.tooltipElement);
			}
		}, { passive: true });

		el.addEventListener("mouseleave", () => {
			el.tooltipElement.classList.remove("in");
			el.abortController = new AbortController(); // Reset AbortController

			el.tooltipElement.addEventListener("animationend", () => {
				el.tooltipElement.remove();
				el.tooltipElement.classList.remove("out");

			}, { passive: true, once: true, signal: el.abortController.signal });

			el.tooltipElement.classList.add("out");

		}, { passive: true });
	}
});
