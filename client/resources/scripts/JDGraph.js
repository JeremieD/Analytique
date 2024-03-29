/**
 * Custom element that displays an interactive graph.
 */
class JDGraph extends HTMLElement {

  constructor() {
    super();
  }

  /**
   * Updates the graph according to the given data.
   * @param {object} data - Data used to draw the graph. It looks like this:
   *  - xAxisLabel     Label displayed at the bottom of the graph.
   *  - maxPointCount  Maximum number of points. Used for the scale of the X axis.
   *  - floatingDigits Integer number of decimal places to round values to.
   *  - yAxisMultiple  The scale of the Y axis will be a multiple of this integer. Preferably also a multiple of 3.
   *  - points[]       Array of objects describing the points of the graph.
   *     - x           X coordinate.
   *     - y           Y coordinate.
   *     - label       Label to display for that point.
   *     - onClick     Function to call when point is clicked.
   *     - style       Class to add to the *line* preceding this point.
   */
  draw(data) {
    // Clear the graph.
    this.innerHTML = "";

    // Auto-size X axis if maxPointCount is left undefined.
    if (data.maxPointCount === undefined) {
      data.maxPointCount = data.points.length;
    }

    // Find maximum Y coordinate.
    let maxYValue = 0;
    for (const point of data.points) {
      if (point.y > maxYValue) {
        maxYValue = point.y;
      }
    }
    if (data.yAxisMultiple !== undefined) {
      maxYValue = data.yAxisMultiple * Math.ceil(maxYValue / data.yAxisMultiple);
    }

    // Draw the X axis
    const xAxis = document.createElement("axis");
    xAxis.setAttribute("name", "x");

    const xAxisLabel = document.createElement("label");
    xAxisLabel.innerText = data.xAxisLabel;

    xAxis.append(xAxisLabel);

    // Draw the Y axis
    const yAxis = document.createElement("axis");
    yAxis.setAttribute("name", "y");

    const yAxisLabel1 = document.createElement("label");
    yAxisLabel1.innerText = (maxYValue).round(data.floatingDigits);
    const yAxisLabel2 = document.createElement("label");
    yAxisLabel2.innerText = (maxYValue / 3 * 2).round(data.floatingDigits);
    const yAxisLabel3 = document.createElement("label");
    yAxisLabel3.innerText = (maxYValue / 3).round(data.floatingDigits);

    yAxis.append(yAxisLabel1, yAxisLabel2, yAxisLabel3);

    // Draw the graph body.
    const graph = document.createElement("graph");

    const cursor = document.createElement("cursor");
    cursor.style.left = "100%";

    const line = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    line.setAttribute("viewBox", `0 0 ${data.maxPointCount - 1} ${maxYValue}`);
    line.setAttribute("preserveAspectRatio", "none");
    line.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const points = [];

    let polyline, style, linePoint;

    for (let i = 0; i < data.points.length; i++) {
      const dataPoint = data.points[i];

      // Ignore points with no Y value.
      if (dataPoint.y === undefined) continue;

      const xOffset = i + data.maxPointCount - data.points.length;

      if (style !== dataPoint.style) {
        style = dataPoint.style;
        polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("points", linePoint ?? "");
        if (dataPoint.style !== "") {
          polyline.classList.add(dataPoint.style);
        }
        line.append(polyline);
      }

      linePoint = `${xOffset},${maxYValue - dataPoint.y}`;
      polyline.setAttribute("points", polyline.getAttribute("points") + " " + linePoint);

      const point = document.createElement("point");
      point.style.bottom = dataPoint.y / (maxYValue !== 0 ? maxYValue : 1) * 100 + "%";
      point.style.left = `calc(100%/${data.maxPointCount - 1}*${xOffset})`;
      if (xOffset === data.maxPointCount - 1) {
        point.classList.add("selected");
      }
      if (dataPoint.onClick !== undefined) {
        point.addEventListener("click", dataPoint.onClick);
      }

      const label = document.createElement("label");
      if (xOffset === data.maxPointCount - 1) {
        label.innerHTML = dataPoint.y.round(data.floatingDigits);
      } else {
        label.innerHTML = dataPoint.label + ": <em>" + dataPoint.y.round(data.floatingDigits) + "</em>";
      }
      point.append(label);

      // Add annotation
      if (dataPoint.annotation !== undefined) {
          const annotation = new JDIcon("lightning");
          annotation.classList.add("annotation");
          point.append(annotation);
      }

      points.push(point);
    }

    graph.append(cursor, line, ...points);

    this.append(xAxis, yAxis, graph);
  }
}

customElements.define("jd-graph", JDGraph);
