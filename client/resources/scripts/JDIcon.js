/*
 *
 */
class JDIcon extends HTMLElement {

	constructor() {
		super();
	}

	connectedCallback() {
		if (!this.hasAttribute("icon")) {
			return;
		}

		const iconName = encodeURI(this.getAttribute("icon"));

		if (JDIcon.cache[iconName] !== undefined) {
			JDIcon.cache[iconName].then(svg => {
				this.innerHTML = svg;
			});
			return;
		}

		this.classList.add("placeholder");

		const iconPath = "/resources/graphics/icons/" + iconName + ".svg";
		JDIcon.cache[iconName] = httpGet(iconPath).then(svg => {
			this.innerHTML = svg;
			this.classList.remove("placeholder");
			return svg;
		});
	}

	static cache = {};
}

customElements.define("jd-icon", JDIcon);
