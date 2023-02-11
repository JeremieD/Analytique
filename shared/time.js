const units = [
  { symbol: "s", factor: 1000 },
  { symbol: "m", factor: 60 },
  { symbol: "h", factor: 60 },
  { symbol: "d", factor: 24 }
];

// Converts common time metrics into milliseconds.
// 3s = 3 seconds =          3*1000 =        3000 ms
// 3m = 3 minutes =       3*60*1000 =     180 000 ms
// 3h = 3 hours   =    3*60*60*1000 =  10 800 000 ms
// 3d = 3 days    = 3*24*60*60*1000 = 259 200 000 ms
function time(input) {
  if (typeof input !== "string") throw new TypeError("Single argument should be a string.");

  let [, value, symbol] = input.match(/^(\d+(?:\.\d+)?)([a-z])$/);
  value = parseFloat(value);

  let symbolMatchesKnownUnit = false;
  for (const unit of units) {
    value *= unit.factor;
    if (unit.symbol === symbol) {
      symbolMatchesKnownUnit = true;
      break;
    }
  }
  if (!symbolMatchesKnownUnit) throw new Error(`Unknown unit: “${symbol}”`);

  return value;
}

try {
  global.time = time;
} catch (e) {}
