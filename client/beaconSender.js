let collectedData = [];

collectedData[0] = "b";

collectedData[1] = Date.now();
collectedData[2] = (new Date()).getTimezoneOffset();

collectedData[3] = document.title;
collectedData[4] = location.href;
collectedData[5] = document.referrer;

collectedData[6] = navigator.language;
collectedData[7] = navigator.languages.join(",");

collectedData[8] = innerWidth + "x" + innerHeight;
collectedData[9] = outerWidth + "x" + outerHeight;

collectedData[10] = +!!matchMedia("(prefers-color-scheme: dark)").matches;
collectedData[11] = +!!matchMedia("(prefers-contrast: more)").matches;
collectedData[12] = +!!matchMedia("(prefers-reduced-motion)").matches;

collectedData = collectedData.map(encodeURI);

const analyticsHomebase = "https://analytique.jeremiedupuis.com";
navigator.sendBeacon(analyticsHomebase, collectedData.join("\t"));
