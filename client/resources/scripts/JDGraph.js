/*
 * Custom element that displays an interactive graph.
 */
class JDGraph extends HTMLElement {

	constructor() {
		super();
	}

	/*
	 * The data object passed to draw the graph looks like this:
	 * floatingDigits	Integer number of decimal places to round values to.
	 * yAxisMultiple	The scale of the Y axis will be a multiple of this integer. Preferably also a multiple of 3.
	 * points			Array of objects describing the points of the graph.
	 *   x				X coordinate.
	 *   y				Y coordinate.
	 *   label			Label to display for that point.
	 */
	draw(data) {
		// Clear the graph.
		this.innerHTML = "";


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


		// X axis
		const xAxis = document.createElement("axis");
		xAxis.setAttribute("name", "x");

		const xAxisLabel = document.createElement("label");
		xAxisLabel.innerText = "Dernière année";

		xAxis.append(xAxisLabel);


		// Y axis
		const yAxis = document.createElement("axis");
		yAxis.setAttribute("name", "y");

		const yAxisLabel1 = document.createElement("label");
		yAxisLabel1.innerText = (maxYValue).round(data.floatingDigits);
		const yAxisLabel2 = document.createElement("label");
		yAxisLabel2.innerText = (maxYValue / 3 * 2).round(data.floatingDigits);
		const yAxisLabel3 = document.createElement("label");
		yAxisLabel3.innerText = (maxYValue / 3).round(data.floatingDigits);

		yAxis.append(yAxisLabel1, yAxisLabel2, yAxisLabel3);


		// Graph
		const graph = document.createElement("graph");

		const cursor = document.createElement("cursor");
		cursor.style.left = "100%";

		const line = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		line.setAttribute("viewBox", "0 0 11 " + maxYValue);
		line.setAttribute("preserveAspectRatio", "none");
		line.setAttribute("xmlns", "http://www.w3.org/2000/svg");

		const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
		let polylinePoints = "";

		const points = [];

		for (let i = 0; i < data.points.length; i++) {
			const dataPoint = data.points[i];

			const xOffset = i + 12 - data.points.length;

			polylinePoints += xOffset + "," + (maxYValue - dataPoint.y) + " ";

			const point = document.createElement("point");
			point.style.bottom = dataPoint.y / (maxYValue !== 0 ? maxYValue : 1) * 100 + "%";
			point.style.left = "calc(100%/11*" + xOffset + ")";
			if (xOffset === 11) {
				point.classList.add("selected");
			}

			const label = document.createElement("label");
			if (xOffset === 11) {
				if (dataPoint.y !== 0) {
					label.innerHTML = dataPoint.y.round(data.floatingDigits);
				}
			} else {
				label.innerHTML = dataPoint.label + ": <em>" + dataPoint.y.round(data.floatingDigits) + "</em>";
			}
			point.append(label);

			points.push(point);
		}

		polyline.setAttribute("points", polylinePoints);
		line.append(polyline);

		graph.append(cursor, line, ...points);


		this.append(xAxis, yAxis, graph);
	}
}

customElements.define("jd-graph", JDGraph);
