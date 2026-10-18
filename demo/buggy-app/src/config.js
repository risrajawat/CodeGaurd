// Security issues for the demo: hardcoded secret + eval
const API_KEY = "sk-live-1234567890abcdef";

function runUserFormula(formula) {
  return eval(formula);
}

module.exports = { API_KEY, runUserFormula };
