let collectedData = [];

collectedData[0] = 1;

collectedData[1] = Date.now();
collectedData[2] = (new Date).getTimezoneOffset();

collectedData[3] = document.title;
collectedData[4] = location.href;
collectedData[5] = document.referrer;

collectedData[6] = navigator.language;
collectedData[7] = navigator.languages.join(",");

collectedData[8] = innerWidth + "x" + innerHeight;
collectedData[9] = outerWidth + "x" + outerHeight;

collectedData = collectedData.map(x => encodeURI(x));

const analyticsHomebase = "https://analytics.jeremiedupuis.com";
navigator.sendBeacon(analyticsHomebase, collectedData.join("\t"));
