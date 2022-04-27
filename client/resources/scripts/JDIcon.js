/*
 *
 */
class JDIcon extends HTMLElement {

	constructor() {
		super();

		const iconName = encodeURI(this.getAttribute("icon"));

		httpGet("/resources/graphics/icons/" + iconName + ".svg").then(svg => {
			this.innerHTML = svg;
		});
	}
}

customElements.define("jd-icon", JDIcon);
