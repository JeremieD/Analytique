/**
 * Current state of the app.
 * @property {Promise<array>} availableOrigins - List of available origins.
 * @property {string} origin - The current origin.
 * @property {Promise<JDDateRange>} availableRange - The available range of stats data.
 * @property {JDDateRange} range - The current range.
 * @property {object} filter - An object containing a "key" and "value" property for the filter.
 */
const state = {
  availableOrigins: httpGet("/api/origins").then(JSON.parse),
  origin: "",
  availableRange: undefined,
  range: new JDDateRange(),
  filter: {
    key: "",
    value: ""
  },
};
let previousState = {
  origin: "",
  range: new JDDateRange(),
  filter: {}
};

/**
 * Promises to model data.
 * @property main - Contains the view that depends on the model for the current range.
 * @property complementary - Contains the view that depends on models other than the current range.
 */
const model = {
  main: {},
  complementary: {}
};

/** Cached model data. Access with [origin][range][filter][data, modTime]. */
const modelCache = {};
const modelCacheTTL = 300000; // 5min to live.

/** Reference to view elements. */
const view = {};


whenDOMReady(() => {
  // Populate the view object.
  view.hud = {
    origin: document.getElementById("origin-selector"),
    range: document.getElementById("range-display"),
    rangeMode: document.getElementById("range-mode"),
    customRange: document.getElementById("custom-range"),
    calendarContainer: document.getElementById("calendar-container"),
    calendar: document.getElementById("calendar"),
    previousRange: document.getElementById("range-previous"),
    nextRange: document.getElementById("range-next"),
    filterReset: document.getElementById("filter-reset"),
    errorCollapse: document.getElementById("error-collapse"),
    errorDisplay: document.getElementById("error-display")
  };
  view.main = {
    sessionTotal: {
      el: document.getElementById("session-total")
    },
    avgSessionLength: {
      el: document.getElementById("avg-session-length")
    },
    pageViews: {
      el: document.getElementById("page-views"),
      model: "pageViews",
      transform: _identity,
      basis: "sessionTotal"
    },
    acquisitionChannels: {
      el: document.getElementById("acquisition-channels"),
      model: "acquisitionChannels",
      transform: niceAcquisitionChannelName,
      basis: "sessionTotal"
    },
    referrerOrigins: {
      el: document.getElementById("referrer-origins"),
      model: "referrerOrigins",
      transform: niceOriginName,
      basis: "sessionTotal"
    },
    landings: {
      el: document.getElementById("landings"),
      model: "landings",
      transform: _identity,
      basis: "sessionTotal"
    },
    bilingualismClasses: {
      el: document.getElementById("bilingualism-classes"),
      model: "bilingualismClasses",
      transform: niceBilingualismClassName,
      basis: "sessionTotal"
    },
    countries: {
      el: document.getElementById("countries"),
      model: "countries",
      transform: niceCountryName,
      basis: "sessionTotal"
    },
    cities: {
      el: document.getElementById("cities"),
      model: "cities",
      transform: _identity,
      basis: "sessionTotal"
    },
    oses: {
      el: document.getElementById("oses"),
      model: "oses",
      transform: _identity,
      basis: "sessionTotal"
    },
    renderingEngines: {
      el: document.getElementById("renderingEngines"),
      model: "renderingEngines",
      transform: _identity,
      basis: "sessionTotal"
    },
    screenBreakpoints: {
      el: document.getElementById("screen-breakpoints"),
      model: "screenBreakpoints",
      transform: niceScreenBreakpointsName,
      basis: "sessionTotal"
    },
    errorPages: {
      el: document.getElementById("error-pages"),
      model: "errorViews",
      transform: _identity,
      basis: "sessionTotal"
    },
    excludedTraffic: {
      el: document.getElementById("excluded-traffic"),
      model: "excludedTraffic",
      transform: niceExcludedTrafficName,
      basis: "viewTotal"
    }
  };
  view.listViews = [
    view.main.pageViews,
    view.main.acquisitionChannels,
    view.main.referrerOrigins,
    view.main.landings,
    view.main.bilingualismClasses,
    view.main.countries,
    view.main.cities,
    view.main.oses,
    view.main.renderingEngines,
    view.main.screenBreakpoints,
    view.main.errorPages,
    view.main.excludedTraffic
  ];
  view.complementary = {
    sessionTotal: {
      el: document.getElementById("session-total-graph"),
      model: "sessionTotal"
    },
    avgSessionLength: {
      el: document.getElementById("avg-session-length-graph"),
      model: "avgSessionLength"
    }
  };

  // Wait for list of available origins.
  state.availableOrigins.then(origins => {
    if (origins.error === undefined) {
      switchToOrigin(origins[0]);
      view.hud.origin.value = state.origin;

      // Load available origins in origin selector.
      for (const origin of origins) {
        view.hud.origin.addOption(origin);
      }
    }

    // Initial view update.
    update();
  });

  // Handlers for HUD elements.
  view.hud.origin.addEventListener("change", () => {
    switchToOrigin(view.hud.origin.value);
    update();
  });

  view.hud.rangeMode.addEventListener("change", () => {
    switchRangeMode(view.hud.rangeMode.value);
    update();
  });

  view.hud.customRange.addEventListener("click", e => {
    view.hud.calendarContainer.classList.add("open");
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    view.hud.calendarContainer.classList.remove("open");
  });

  view.hud.calendar.addEventListener("change", e => {
    state.range.set(view.hud.calendar.state.value);
    update();
    e.stopPropagation();
  });

  view.hud.previousRange.addEventListener("click", () => {
    previousRange();
    update();
  });

  view.hud.nextRange.addEventListener("click", () => {
    nextRange();
    update();
  });

  view.hud.filterReset.addEventListener("click", () => {
    clearFilter();
    update();
  });

  // Handler for app-wide keyboard shortcuts
  window.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft" && !view.hud.previousRange.disabled) {
      previousRange();
      update();

    } else if (e.key === "ArrowRight" && !view.hud.nextRange.disabled) {
      nextRange();
      update();
    }
  });
});


/**
 * Changes state to specified origin.
 * @param {string} origin - The origin to switch to.
 */
function switchToOrigin(origin) {
  if (state.origin === origin) return;

  state.origin = origin;

  // Reset filter.
  clearFilter();

  // Fetch available data range.
  state.availableRange = httpGet(`/api/available?origin=${origin}`).then(bounds => {
    bounds = JSON.parse(bounds);
    if (bounds.error !== undefined) return bounds;

    bounds = new JDDateRange(bounds);

    view.hud.calendar.setRange(bounds);

    // Check range bounds and move range accordingly.
    if (state.range.earlierThan(bounds.from)) {
      state.range.set(bounds.from.convertedTo(state.range.mode));
      view.hud.calendar.setValue(new JDDateRange(bounds.from));
      update();
    }
    if (state.range.laterThan(bounds.to)) {
      state.range.set(bounds.to.convertedTo(state.range.mode));
      view.hud.calendar.setValue(new JDDateRange(bounds.to));
      update();
    }

    return bounds;
  });
}


/**
 * Changes state to specified range mode, converting the date as best as it can.
 * @param {string} mode - The mode to switch to.
 */
function switchRangeMode(mode) {
  if (state.range.mode === mode) return;

  switch (mode) {
    case "year":
    case "month":
    case "week":
      state.range.convertTo(mode);
      break;
    default:
      if (state.range.mode !== "day" && state.range.mode !== "days") {
        state.range.convertTo("day");
      } else {
        state.range.set(view.hud.calendar.state.value);
      }
      view.hud.calendar.setValue(new JDDateRange(state.range));
  }
}


/**
 * Changes state to specified range.
 * @param {JDDateRange} range - The range to move to.
 */
function setRange(range) {
  state.range.set(range);
  if (state.range.mode === "day" || state.range.mode === "days") {
    view.hud.calendar.setValue(new JDDateRange(state.range));
  }
}


/**
 * Advances range in state.
 */
function nextRange() {
  const newRange = new JDDateRange(state.range);
  setRange(newRange.next());
}


/**
 * Rewinds range in state.
 */
function previousRange() {
  const newRange = new JDDateRange(state.range);
  setRange(newRange.previous());
}


/**
 * Changes state to specified filter.
 * @param {object} filter - The filter to switch to.
 *     This object contains a "key" property, containing the stats field to filter by,
 *     and a "value" property, containing the value to filter.
 */
function setFilter(filter) {
  state.filter = filter;
}


/**
 * Clear filter state.
 */
function clearFilter() {
  state.filter = {
    key: "",
    value: ""
  };
}


/**
 * Updates model and view according to current state.
 */
function update() {
  const originChanged = state.origin !== previousState.origin;
  const rangeChanged = !state.range.equals(previousState.range);
  const filterKeyChanged = previousState.filter.key !== "" && state.filter.key !== previousState.filter.key;
  const filterValueChanged = state.filter.value !== previousState.filter.value;

  const stateChanged = originChanged || rangeChanged ||
                    filterKeyChanged || filterValueChanged;

  // If state has not changed, skip update.
  if (!stateChanged) return;

  // Write previousState before update.
  previousState = {
    origin: state.origin,
    range: new JDDateRange(state.range),
    filter: {
      key: state.filter.key,
      value: state.filter.value
    }
  };

  // Update HUD
  view.hud.range.innerHTML = state.range.niceForm;

  state.availableRange?.then(bounds => {
    let isFirstRange = true;
    let isLastRange = true;

    if (bounds.error === undefined) {
      isFirstRange = state.range.firstDay.minus(1).earlierThan(bounds.from);
      isLastRange = state.range.lastDay.plus(1).laterThan(bounds.to);
    }

    if (isFirstRange) view.hud.previousRange.blur();
    view.hud.previousRange.disabled = isFirstRange;

    if (isLastRange) view.hud.nextRange.blur();
    view.hud.nextRange.disabled = isLastRange;
  });

  const filterEnabled = state.filter.key !== "";
  view.hud.filterReset.disabled = !filterEnabled;
  if (!filterEnabled) {
    view.hud.filterReset.blur();
    document.querySelector(".card>ol>li.selected")?.classList.remove("selected");
  }

  // Set loading state.
  setAllLoading();

  // Update models, then views.
  refreshMainModel().then(drawMainView);
  refreshComplementaryModel().then(drawComplementaryView);
}


/**
 * Updates the main model according to current state.
 */
function refreshMainModel() {
  model.main = getModel(state.origin, state.range.shortForm, serializeFilter(state.filter));
  return model.main;
}


/**
 * Updates the complementary model according to current state.
 */
function refreshComplementaryModel() {
  // Determine required model ranges.
  const ranges = [];
  switch (state.range.mode) {
    case "year":
      // Load 10 previous years (?!) in year mode.
      for (let i = 0; i < 10; i++) {
        ranges.push(state.range.minus(i).shortForm);
      }
      break;

    case "month":
      // Load 12 previous months in month mode.
      for (let i = 0; i < 12; i++) {
        ranges.push(state.range.minus(i).shortForm);
      }
      break;

    case "week":
      // Load 12 previous weeks in week mode.
      for (let i = 0; i < 12; i++) {
        ranges.push(state.range.minus(i).shortForm);
      }
      break;

    default:
      const pointer = new JDDate(state.range.to);

      // If range is 7 days or less, display the 14 previous days.
      if (state.range.length <= 7) {
        pointer.convertTo("day", true);
        for (let i = 0; i < 14; i++) {
          ranges.push(pointer.shortForm);
          pointer.previous();
        }
        break;
      }

      // If range is 21 days (3 weeks) or less, display each day.
      if (state.range.length <= 21) {
        pointer.convertTo("day");

      // If range is 112 days (4 months) or less, display each week.
      } else if (state.range.length <= 112) {
        pointer.convertTo("week");

      // Otherwise, display each month.
      } else {
        pointer.convertTo("month");
      }

      while (!pointer.earlierThan(state.range.from)) {
        ranges.push(pointer.shortForm);
        pointer.previous();
      }
  }

  // Get model for each complementary range.
  model.complementary = {};
  for (const range of ranges) {
    model.complementary[range] = getModel(state.origin, range, serializeFilter(state.filter));
  }

  // Return the promise of all models including main.
  return Promise.all(Object.values(model.complementary));
}


/**
 * Updates the view with data from the main model.
 */
function drawMainView() {
  // Wait for model to be loaded.
  model.main.then(async data => {

    let errorShown = false;

    // Check for and draw errors.
    await Promise.all([state.availableOrigins]).then(errors => {
      if (errors[0].error !== undefined) {
        view.hud.errorCollapse.classList.add("shown");
        view.hud.errorDisplay.innerText = niceErrorName(errors[0].error);
        view.hud.origin.parentElement.classList.add("transparent");
        errorShown = true;

      } else if (data.error !== undefined) {
        view.hud.errorCollapse.classList.add("shown");
        view.hud.errorDisplay.innerText = niceErrorName(data.error);
        errorShown = true;

      } else {
        view.hud.errorCollapse.classList.remove("shown");
        view.hud.errorDisplay.innerText = "";
      }
    });

    // Session total.
    view.main.sessionTotal.el.innerText = data.sessionTotal ?? 0;
    view.main.sessionTotal.el.classList.remove("loading");

    // Stop drawing here if an error was detected.
    if (errorShown) return;

    // Engagement.
    const niceAvgSessionLength = data.avgSessionLength.round(2);
    view.main.avgSessionLength.el.innerHTML = niceAvgSessionLength +
      "<small> vue" + (niceAvgSessionLength === 1 ? "" : "s") + "/session</small>";
    view.main.avgSessionLength.el.classList.remove("loading");

    // Draw list views.
    for (const listView of view.listViews) {

      listView.el.classList.remove("loading");

      // Whether this list view is selected for filtering.
      const isFilterKey = listView.model === state.filter.key;

      // If range and filter key have not changed, keep selected list view intact.
      if (isFilterKey) {
        for (const listItem of listView.el.children) {
          const isSelected = listItem.dataset.filterValue === state.filter.value;

          if (isSelected) {
            listItem.classList.add("selected");
            listItem.classList.remove("subdued");
          } else {
            listItem.classList.add("subdued");
            listItem.classList.remove("selected");
          }

          // Update just the numbers. Keys that don’t apply are set to 0.
          let value = 0;
          const basis = data[listView.basis] || 100;
          for (const point of data[listView.model]) {
            if (point.key === listItem.dataset.filterValue) {
              value = point.value;
              break;
            }
          }
          listItem.children[1].innerHTML = value;
          listItem.children[2].innerHTML = (value / basis * 100).round() + "%";
        }
        continue;
      }

      // Draw other (not selected) list views.
      listView.el.innerHTML = "";

      // For each data point in the corresponding model...
      for (const dataPoint of data[listView.model]) {

        // Allow no more than 6 data points.
        if (listView.el.children.length > 5) break;

        // Create new list item.
        const newListItem = document.createElement("li");

        // Format the key according to a function.
        const transformedKey = listView.transform(dataPoint.key);

        // Style empty and “Autre” data points differently.
        if (dataPoint.key === "" || transformedKey.includes("Autre")) {
          newListItem.classList.add("last");
        }

        // Create data elements and append to the list element.
        const dataPoint1 = document.createElement("data");
        dataPoint1.innerHTML = transformedKey;
        dataPoint1.title = transformedKey;

        const dataPoint2 = document.createElement("data");
        dataPoint2.classList.add("numerical", "secondary");
        dataPoint2.innerHTML = dataPoint.value;

        const dataPoint3 = document.createElement("data");
        dataPoint3.classList.add("numerical");
        const basis = data[listView.basis];
        dataPoint3.innerHTML = (dataPoint.value / basis * 100).round() + "%";

        newListItem.append(dataPoint1, dataPoint2, dataPoint3);

        // Handle click on list item that can be filtered.
        if (listView.basis === "sessionTotal") {
          newListItem.dataset.filterKey = listView.model;
          newListItem.dataset.filterValue = dataPoint.key;

          newListItem.addEventListener("click", () => {
            if (state.filter.key !== listView.model ||
              state.filter.value !== dataPoint.key) {
              setFilter({
                key: listView.model,
                value: dataPoint.key
              });
            } else {
              clearFilter();
            }

            update();
          });
        }

        listView.el.append(newListItem);
      }
    }
  });
}


/**
 * Updates the view with data from the complementary model.
 */
function drawComplementaryView() {
  const complementaryRanges = []; // Keys (short-form ranges)
  const complementaryModels = []; // Values (promises)

  for (const range of Object.keys(model.complementary).sort()) {
    complementaryRanges.push(range);
    complementaryModels.push(model.complementary[range]);
  }

  let xAxisLabel, maxPointCount;
  switch (state.range.mode) {
    case "year":
      xAxisLabel = "Années précédentes";
      maxPointCount = 10;
      break;
    case "month":
      xAxisLabel = "12 mois précédents";
      maxPointCount = 12;
      break;
    case "week":
      xAxisLabel = "12 semaines précédentes";
      maxPointCount = 12;
      break;
    case "day":
      xAxisLabel = "14 jours précédents";
      maxPointCount = 14;
      break;
    default:
      if (state.range.length <= 21) {
        xAxisLabel = "Par jour";
      } else if (state.range.length <= 112) {
        xAxisLabel = "Par semaine";
      } else {
        xAxisLabel = "Par mois";
      }
  }

  // Wait for models to be loaded.
  Promise.all(complementaryModels).then(data => {
    // Data for graphs
    const sessionTotalData = {
      points: [],
      xAxisLabel: xAxisLabel,
      maxPointCount: maxPointCount,
      floatingDigits: 0,
      yAxisMultiple: 15
    };
    const sessionLengthData = {
      points: [],
      xAxisLabel: xAxisLabel,
      maxPointCount: maxPointCount,
      floatingDigits: 2,
      yAxisMultiple: 3
    };

    // Count ranges with no data.
    let noDataCount = 0;

    // Assemble data from previous ranges.
    for (let i = 0; i < data.length; i++) {
      if (data[i].error === "noData") {
        noDataCount++;
      }

      const rangeObject = new JDDateRange(complementaryRanges[i]);

      let label = "";
      switch (rangeObject.mode) {
        case "year":
          label = String(rangeObject.year);
          break;
        case "month":
          label = monthsDict[rangeObject.month - 1];
          break;
        case "week":
          label = "W" + String(rangeObject.week).padStart(2, "0");
          break;
        default:
          label = String(rangeObject.month).padStart(2, "0") +
            "-" + String(rangeObject.day).padStart(2, "0");
      }

      // Draw point as 0 if there is no *matching sessions*,
      // but don’t draw point if there is no *data*.
      let sessionTotalValue = 0;
      let avgSessionLengthValue = 0;
      if (data[i].error !== "noMatchingSessions") {
        sessionTotalValue = data[i].sessionTotal;
        avgSessionLengthValue = data[i].avgSessionLength;
      }

      const onClickHandler = () => {
        setRange(rangeObject);
        update();
      };

      sessionTotalData.points.push({
        label: label,
        y: sessionTotalValue,
        onClick: onClickHandler
      });

      sessionLengthData.points.push({
        label: label,
        y: avgSessionLengthValue,
        onClick: onClickHandler
      });
    }

    // If no data is available for the whole range, skip drawing.
    if (noDataCount === data.length) return;

    // Draw graphs
    view.complementary.sessionTotal.el.draw(sessionTotalData);
    view.complementary.sessionTotal.el.classList.remove("loading");
    view.complementary.avgSessionLength.el.draw(sessionLengthData);
    view.complementary.avgSessionLength.el.classList.remove("loading");
  });
}


/**
 * Sets all element to display a placeholder animation.
 */
function setAllLoading() {
  for (const key of Object.keys(view.main)) {
    view.main[key].el.classList.add("loading");
  }
  for (const key of Object.keys(view.complementary)) {
    view.complementary[key].el.classList.add("loading");
  }
}


/**
 * Returns promised stats data from the server.
 * @param {string} origin - The origin to fetch stats for.
 * @param {string} range - The range to limit stats to.
 * @param {string} [serializedFilter] - If present, data will be filtered. Use {@link serializeFilter()} to format.
 * @returns {Promise<object>} The promised stats object.
 */
function fetchStats(origin, range, serializedFilter) {
  let url = "/api/stats?origin=" + origin + "&range=" + range;

  if (serializedFilter !== "") {
    url += "&filter=" + serializedFilter;
  }

  return httpGet(url).then(JSON.parse);
}


/**
 * Returns promised model data either from cache or server.
 * @param {string} origin - The origin to fetch stats for.
 * @param {string} range - The range to limit stats to.
 * @param {string} [serializedFilter] - If present, data will be filtered.
 *     "Serialized" means both filter fields are URI encoded and joined by ":".
 * @returns {Promise<object>} The promised stats object.
 */
function getModel(origin, range, serializedFilter) {
  // Ensure safe access to model cache.
  if (!modelCache.hasOwnProperty(origin)) {
    modelCache[origin] = {};
  }
  if (!modelCache[origin].hasOwnProperty(range)) {
    modelCache[origin][range] = {};
  }

  // If cache is empty or stale, fetch from server.
  if (modelCache[origin][range][serializedFilter] === undefined ||
    Date.now() - modelCache[origin][range][serializedFilter].modTime > modelCacheTTL) {

    modelCache[origin][range][serializedFilter] = fetchStats(origin, range, serializedFilter);

    // Set modTime only when data is fully loaded.
    modelCache[origin][range][serializedFilter].then(() => {
      modelCache[origin][range][serializedFilter].modTime = Date.now();
    });
  }

  return modelCache[origin][range][serializedFilter];
}


/**
 * Takes a filter object and stringifies it for use in a request.
 * @param {object} filter - A filter object with a "key" and "value" property.
 * @returns {string} The formatted filter. Empty string if filter is disabled.
 */
function serializeFilter(filter) {
  const key = encodeURIComponent(filter.key);
  const value = encodeURIComponent(filter.value);

  if (key === "" && value === "") return "";

  return `${key}:${value}`;
}
