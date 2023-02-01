const symbols = {
  string: "§",
  func: "ƒ",
  open: "{",
  close: "}"
}

function compile(dJS, tokens = {}) {
  let compiledJS = "";

  // Strings
  const rawPattern = `(?<!\\\\)${symbols.string}${symbols.open}([A-z0-9_-]*)${symbols.close}`;
  const pattern = new RegExp(rawPattern, "g");
  compiledJS = dJS.replaceAll(pattern, (match, name) => tokens[name] ?? match)
                  .replaceAll(`\\${symbols.string}`, symbols.string);

  return compiledJS;
}

module.exports = { compile };
