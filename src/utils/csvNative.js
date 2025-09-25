const readline = require("readline");

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((l) => {
    const vals = l.split(",");
    const obj = {};
    headers.forEach((h, i) => (obj[h] = vals[i]?.trim() || ""));
    return obj;
  });
}

module.exports = { parseCSV };
