function sendTelemetry(...events) {
  const beacon = {
    o: "§{originID}",
    e: events
  };
  navigator.sendBeacon("https://§{homebase}", JSON.stringify(beacon));
}

const pageView = {
  e: "pageView",
  t: Date.now(),
  tz: (new Date()).getTimezoneOffset(),
  pt: document.title,
  pu: location.href,
  pr: document.referrer,
  l: [navigator.language, ...navigator.languages],
  inS: innerWidth + "x" + innerHeight,
  outS: outerWidth + "x" + outerHeight,
  theme: +!!matchMedia("(prefers-color-scheme: dark)").matches,
  contrast: +!!matchMedia("(prefers-contrast: more)").matches,
  motion: +!!matchMedia("(prefers-reduced-motion)").matches,
  ptrHovr: +!!matchMedia("(hover: hover)").matches,
  ptrPrec: 0
};
if (matchMedia("(pointer: fine)").matches) {
  pageView.ptrPrec = 2;
} else if (matchMedia("(pointer: coarse)").matches) {
  pageView.ptrPrec = 1;
}

sendTelemetry(pageView);
