const config = httpGet("/config/user").then(JSON.parse);
/**
 * Current state of the app.
 * @property {Promise<array>} availableOrigins - List of available origins.
 * @property {string} origin - The current origin.
 * @property {Promise<JDDateInterval>} availableRange - The available range of stats data.
 * @property {JDDateInterval} range - The current range.
 * @property {array} annotations - Array of annotations to the analytic data.
 * @property {array} filter - An array of objects containing "key", "val" and "negated" properties.
 */
const state = {
  availableOrigins: httpGet("/api/origins").then(JSON.parse),
  origin: "",
  availableRange: undefined,
  range: new JDDateInterval(JDDate.thisMonth()),
  annotations: [],
  filter: []
};
let previousState = {
  origin: "",
  range: new JDDateInterval(),
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
    sessionCount: {
      el: document.getElementById("session-count")
    },
    avgSessionLength: {
      el: document.getElementById("avg-session-length")
    },
    pageViews: {
      el: document.getElementById("page-views"),
      model: "pageViews",
      transform: _identity,
      basis: "sessionCount"
    },
    referralChannel: {
      el: document.getElementById("referral-channel"),
      model: "referralChannel",
      transform: niceReferralChannelName,
      basis: "sessionCount"
    },
    referralOrigin: {
      el: document.getElementById("referral-origin"),
      model: "referralOrigin",
      transform: niceOriginName,
      basis: "sessionCount"
    },
    entryPage: {
      el: document.getElementById("entry-page"),
      model: "entryPage",
      transform: _identity,
      basis: "sessionCount"
    },
    bilingualism: {
      el: document.getElementById("bilingualism"),
      model: "bilingualism",
      transform: niceBilingualismName,
      basis: "sessionCount"
    },
    country: {
      el: document.getElementById("country"),
      model: "country",
      transform: niceCountryName,
      basis: "sessionCount"
    },
    city: {
      el: document.getElementById("city"),
      model: "city",
      transform: _identity,
      basis: "sessionCount"
    },
    os: {
      el: document.getElementById("os"),
      model: "os",
      transform: _identity,
      basis: "sessionCount"
    },
    renderingEngine: {
      el: document.getElementById("rendering-engine"),
      model: "renderingEngine",
      transform: _identity,
      basis: "sessionCount"
    },
    screenBreakpoint: {
      el: document.getElementById("screen-breakpoint"),
      model: "screenBreakpoint",
      transform: niceScreenBreakpointName,
      basis: "sessionCount"
    },
    preferences: {
      el: document.getElementById("preferences"),
      model: "preferences",
      transform: nicePreferenceName,
      basis: "sessionCount"
    },
    errorViews: {
      el: document.getElementById("error-views"),
      model: "errorViews",
      transform: _identity,
      basis: "sessionCount"
    },
    excludedTraffic: {
      el: document.getElementById("excluded-traffic"),
      model: "excludedTraffic",
      transform: niceExcludedTrafficName,
      basis: "sessionCountBeforeExlusion"
    }
  };
  view.listViews = [
    view.main.pageViews,
    view.main.referralChannel,
    view.main.referralOrigin,
    view.main.entryPage,
    view.main.bilingualism,
    view.main.country,
    view.main.city,
    view.main.os,
    view.main.renderingEngine,
    view.main.screenBreakpoint,
    view.main.preferences,
    view.main.errorViews,
    view.main.excludedTraffic
  ];
  view.complementary = {
    sessionCount: {
      el: document.getElementById("session-count-graph"),
      model: "sessionCount"
    },
    avgSessionLength: {
      el: document.getElementById("avg-session-length-graph"),
      model: "avgSessionLength"
    }
  };

  // Prepare view according to user config.
  config.then(config => {
    let initialOrigin = config.defaultView.origin;
    let initialRangeMode = config.defaultView.rangeMode;

    if (initialOrigin === "lastViewed") {
      initialOrigin = config._lastView.origin;
    }
    if (initialRangeMode === "lastViewed") {
      initialRangeMode = config._lastView.rangeMode;
    }

    switchToOrigin(initialOrigin);
    view.hud.origin.value = state.origin;

    view.hud.rangeMode.select(initialRangeMode);
    switchRangeMode(initialRangeMode);
    update();
  });

  state.availableOrigins.then(origins => {
    if (origins.error === undefined) {
      // Load available origins in origin selector.
      for (const origin of origins) {
        view.hud.origin.addOption(origin);
      }
      if (state.origin === "") switchToOrigin(origins[0]);
      view.hud.origin.value = state.origin;
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

  view.hud.rangeMode.addEventListener("dblclick", e => {
    switch (e.target.value) {
      case "year":
        setRange(JDDate.thisYear());
        clearFilter();
        break;
      case "month":
        setRange(JDDate.thisMonth());
        clearFilter();
        break;
      case "week":
        setRange(JDDate.thisWeek());
        clearFilter();
        break;
      case "custom":
        setRange(JDDate.today());
        clearFilter();
        break;
    }
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
  addEventListener("keydown", e => {
    if (e.key === "ArrowLeft" && !view.hud.previousRange.disabled) {
      previousRange();
      update();
    } else if (e.key === "ArrowRight" && !view.hud.nextRange.disabled) {
      nextRange();
      update();

    } else if (e.key === "y") {
      view.hud.rangeMode.select("year");
      switchRangeMode("year");
      update();
    } else if (e.key === "m") {
      view.hud.rangeMode.select("month");
      switchRangeMode("month");
      update();
    } else if (e.key === "w") {
      view.hud.rangeMode.select("week");
      switchRangeMode("week");
      update();
    } else if (e.key === "d") {
      view.hud.rangeMode.select("custom");
      switchRangeMode("day");
      update();
    } else if (e.key === "t") {
      view.hud.rangeMode.select("custom");
      switchRangeMode("day");
      setRange(JDDate.today());
      clearFilter();
      update();
    }
  });

  // Save view before unload.
  addEventListener("beforeunload", () => {
    config.then(config => {
      config._lastView.origin = state.origin;
      config._lastView.rangeMode = state.range.unit;
      navigator.sendBeacon("/config/user", JSON.stringify(config));
    });
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
    if (bounds.hasOwnProperty("error")) return bounds;

    bounds = new JDDateInterval(bounds);

    view.hud.calendar.setRange(bounds);

    // Check range bounds and move range accordingly.
    if (state.range.isBefore(bounds.start)) {
      view.hud.rangeMode.select("custom");
      state.range.set(bounds.start.convertedTo(state.range.unit));
      view.hud.calendar.setValue(new JDDateInterval(bounds.start));
      update();
    }
    if (state.range.isAfter(bounds.end)) {
      view.hud.rangeMode.select("custom");
      state.range.set(bounds.end.convertedTo(state.range.unit));
      view.hud.calendar.setValue(new JDDateInterval(bounds.end));
      update();
    }

    return bounds;
  });

  state.annotations = httpGet(`/api/annotations?origin=${origin}`).then(JSON.parse);
}


/**
 * Changes state to specified range unit, converting the date as best as it can.
 * @param {string} unit - The mode to switch to.
 */
function switchRangeMode(unit) {
  if (state.range.unit === unit) return;

  switch (unit) {
    case "year":
    case "month":
    case "week":
      state.range.convertTo(unit, { keepNow: true, forceSingular: true });
      break;
    default:
      if (state.range.unit !== "day") {
        state.range.convertTo("day", { keepNow: true });
      } else {
        state.range.set(view.hud.calendar.state.value);
      }
      view.hud.calendar.setValue(new JDDateInterval(state.range));
  }
}


/**
 * Changes state to specified range.
 * @param {JDDateInterval} range - The range to move to.
 */
function setRange(range) {
  state.range.set(range);
  if (state.range.unit === "day") {
    view.hud.calendar.setValue(new JDDateInterval(state.range));
  }
}


/**
 * Advances range in state.
 */
function nextRange() {
  const newRange = state.range.advancedBy(1);
  setRange(newRange);
}


/**
 * Rewinds range in state.
 */
function previousRange() {
  const newRange = state.range.advancedBy(-1);
  setRange(newRange);
}


/**
 * Changes state to specified filter.
 */
function setFilter(filter) {
  clearFilter();
  state.filter.push(filter);
}


/**
 * Clear filter state.
 */
function clearFilter() {
  state.filter = [];
}


/**
 * Updates model and view according to current state.
 */
function update() {
  const originChanged = state.origin !== previousState.origin;
  const rangeChanged = !state.range.equals(previousState.range);
  const filterChanged = JSON.stringify(previousState.filter) !== JSON.stringify(state.filter);

  const stateChanged = originChanged || rangeChanged || filterChanged;

  // If state has not changed, skip update.
  if (!stateChanged) return;

  // Write previousState before update.
  previousState = {
    origin: state.origin,
    range: new JDDateInterval(state.range),
    filter: JSON.parse(JSON.stringify(state.filter))
  };

  // Update HUD
  view.hud.range.innerHTML = state.range.formatted("long", { capitalize: true, outputSUPTag: true, useNowForms: true });

  state.availableRange?.then(bounds => {
    let isFirstRange = true;
    let isLastRange = true;

    if (bounds.error === undefined) {
      isFirstRange = state.range.advancedBy(-1).isBefore(bounds);
      isLastRange = state.range.advancedBy(1).isAfter(bounds);
    }

    if (isFirstRange) view.hud.previousRange.blur();
    view.hud.previousRange.disabled = isFirstRange;

    if (isLastRange) view.hud.nextRange.blur();
    view.hud.nextRange.disabled = isLastRange;
  });

  // Update filter HUD.
  const filterEnabled = state.filter.length > 0;
  view.hud.filterReset.disabled = !filterEnabled;
  if (filterEnabled) {
    view.hud.filterReset.title = `Filtre appliqué: ${state.filter[0].key} = "${state.filter[0].val}". Cliquez pour remettre à zéro.`;
  } else {
    view.hud.filterReset.title = "";
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
  model.main = getModel(state.origin, state.range.canonicalForm, serializeFilter(state.filter));
  return model.main;
}


/**
 * Updates the complementary model according to current state.
 */
function refreshComplementaryModel() {
  // Determine required model ranges.
  const ranges = [];
  const pointer = new JDDateInterval(state.range);
  ranges.push(pointer.canonicalForm);
  switch (state.range.unit) {
    case "year":
      // Load 10 previous years (?!) in year mode.
      for (let i = 0; i < 9; i++) {
        ranges.push(pointer.canonicalForm);
      }
      break;

    case "month":
      // Load 12 previous months in month mode.
      for (let i = 0; i < 11; i++) {
        ranges.push(pointer.previous().canonicalForm);
      }
      break;

    case "week":
      // Load 12 previous weeks in week mode.
      for (let i = 0; i < 11; i++) {
        ranges.push(pointer.previous().canonicalForm);
      }
      break;

    default:
      // If range is 7 days or less, display the 14 previous days.
      if (state.range.duration() <= 7) {
        pointer.convertTo("day", { preferEnd: true });
        for (let i = 0; i < 13; i++) {
          ranges.push(pointer.previous().canonicalForm);
        }
        break;
      }

      // If range is 21 days (3 weeks) or less, display each day.
      if (state.range.duration() <= 21) {
        pointer.convertTo("day");

      // If range is 112 days (4 months) or less, display each week.
      } else if (state.range.duration() <= 112) {
        pointer.convertTo("week");

      // Otherwise, display each month.
      } else {
        pointer.convertTo("month");
      }

      while (pointer.isAfter(state.range.start)) {
        pointer.set(pointer.advancedBy(-1));
        ranges.push(pointer.canonicalForm);
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
      if (errors[0].hasOwnProperty("error")) {
        view.hud.errorCollapse.classList.add("shown");
        view.hud.errorDisplay.innerText = niceErrorName(errors[0].error);
        view.hud.origin.parentElement.classList.add("transparent");
        errorShown = true;

      } else if (data.hasOwnProperty("error")) {
        view.hud.errorCollapse.classList.add("shown");
        view.hud.errorDisplay.innerText = niceErrorName(data.error);
        errorShown = true;

      } else {
        view.hud.errorCollapse.classList.remove("shown");
        view.hud.errorDisplay.innerText = "";
      }
    });

    // Session count.
    view.main.sessionCount.el.innerText = data.sessionCount ?? 0;
    view.main.sessionCount.el.classList.remove("loading");

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
      const isFilterKey = listView.model === state.filter[0]?.key;

      // If range and filter key have not changed, keep selected list view intact.
      if (isFilterKey) {
        for (const listItem of listView.el.children) {
          const isSelected = listItem.dataset.filterValue === state.filter[0]?.val;

          if (isSelected) {
            listItem.classList.add("selected");
            listItem.classList.remove("subdued");
          } else {
            listItem.classList.add("subdued");
            listItem.classList.remove("selected");
          }

          // Update just the numbers. Keys that don’t apply are set to 0.
          let value = 0;
          const basis = data[listView.basis] || 1;
          for (const point of data[listView.model]) {
            if (point.key === listItem.dataset.filterValue) {
              value = point.val;
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
        if (dataPoint.key === "" || dataPoint.key === "false" ||
            transformedKey.includes("Autre")) {
          newListItem.classList.add("last");
        }

        // Create data elements and append to the list element.
        const dataPoint1 = document.createElement("data");
        dataPoint1.innerHTML = transformedKey;
        dataPoint1.title = transformedKey;

        const dataPoint2 = document.createElement("data");
        dataPoint2.classList.add("numerical", "secondary");
        dataPoint2.innerHTML = dataPoint.val;

        const dataPoint3 = document.createElement("data");
        dataPoint3.classList.add("numerical");
        const basis = data[listView.basis] || 1;
        dataPoint3.innerHTML = (dataPoint.val / basis * 100).round() + "%";

        newListItem.append(dataPoint1, dataPoint2, dataPoint3);

        // Handle click on list item that can be filtered.
        if (listView.basis === "sessionCount") {
          newListItem.dataset.filterKey = listView.model;
          newListItem.dataset.filterValue = dataPoint.key;

          newListItem.addEventListener("click", () => {
            if (state.filter[0]?.key !== listView.model ||
                state.filter[0]?.val !== dataPoint.key) {
              setFilter({
                negated: false,
                key: listView.model,
                val: dataPoint.key
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
  const complementaryRanges = []; // Keys (canonical forms)
  const complementaryModels = []; // Values (promises)

  for (const range of Object.keys(model.complementary).sort()) {
    complementaryRanges.push(range);
    complementaryModels.push(model.complementary[range]);
  }

  let xAxisLabel, maxPointCount;
  switch (state.range.unit) {
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
      if (state.range.duration() <= 21) {
        xAxisLabel = "Par jour";
      } else if (state.range.duration() <= 112) {
        xAxisLabel = "Par semaine";
      } else {
        xAxisLabel = "Par mois";
      }
  }

  // Wait for models to be loaded.
  Promise.all([state.annotations, ...complementaryModels]).then(([annotations, ...data]) => {
    // Data for graphs
    const sessionCountData = {
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

      const rangeObject = new JDDateInterval(complementaryRanges[i]);

      let label = rangeObject.formatted();

      // Draw point as 0 if there is no *matching sessions*,
      // but don’t draw point if there is no *data*.
      let sessionCountValue = 0;
      let avgSessionLengthValue = 0;
      if (data[i].error !== "noMatchingSessions") {
        sessionCountValue = data[i].sessionCount;
        avgSessionLengthValue = data[i].avgSessionLength;
      }

      const onClickHandler = () => {
        setRange(rangeObject);
        update();
      };

      // Calculate whether data point is for a "complete" range or not.
      const isEstimate = rangeObject.isAfterOrIntersects(JDDate.today());

      // Draw annotations.
      let annotationTooltip;
      for (const annotation of annotations) {
        if (rangeObject.intersects((new JDDateInterval(annotation.date)))) {
          annotationTooltip = `<h4>${annotation.name}</h4><p>${annotation.desc}</p>`;
        }
      }

      sessionCountData.points.push({
        label: label,
        y: sessionCountValue,
        onClick: onClickHandler,
        style: isEstimate ? "dashed" : "",
        annotation: annotationTooltip
      });

      sessionLengthData.points.push({
        label: label,
        y: avgSessionLengthValue,
        onClick: onClickHandler,
        style: isEstimate ? "dashed" : "",
        annotation: annotationTooltip
      });
    }

    // If no data is available for the whole range, skip drawing.
    if (noDataCount === data.length) return;

    // Draw graphs
    view.complementary.sessionCount.el.draw(sessionCountData);
    view.complementary.sessionCount.el.classList.remove("loading");
    view.complementary.avgSessionLength.el.draw(sessionLengthData);
    view.complementary.avgSessionLength.el.classList.remove("loading");
  });
}


/**
 * Sets all elements to display a placeholder animation.
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
 * @param {object} filter - An array of objects each containing "negated", "key" and "val".
 * @returns {string} The formatted filter. Empty string if filter is disabled.
 */
function serializeFilter(filter) {
  let serializedFilter = "";
  for (const item of filter) {
    serializedFilter += item.negated ? "!" : "";
    serializedFilter += encodeURIComponent(item.key) + ":";
    serializedFilter += encodeURIComponent(item.val) + ";";
  }
  if (serializedFilter.endsWith(";")) serializedFilter = serializedFilter.slice(0, -1);
  return serializedFilter;
}
