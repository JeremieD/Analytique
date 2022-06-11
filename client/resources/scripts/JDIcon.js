/**
 * Icon element that consists of inlined SVG.
 * The HTML attribute "icon" should contain the name of the SVG file.
 */
class JDIcon extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    if (!this.hasAttribute("icon")) return;

    const iconName = encodeURI(this.getAttribute("icon"));

    if (JDIcon.cache[iconName] !== undefined) {
      JDIcon.cache[iconName].then(svg => {
        this.innerHTML = svg;
      });
      return;
    }

    this.classList.add("placeholder");

    const iconPath = `/resources/graphics/icons/${iconName}.svg`;
    JDIcon.cache[iconName] = httpGet(iconPath).then(svg => {
      this.innerHTML = svg;
      this.classList.remove("placeholder");
      return svg;
    });
  }

  // Holds SVG icons. Access with [iconName].
  static cache = {};
}

customElements.define("jd-icon", JDIcon);
