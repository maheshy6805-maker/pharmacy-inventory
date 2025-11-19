// utils/stockFormatter.js

/**
 * Converts unit-level stock into human-readable text.
 *
 * @param {number} stockUnits - total number of units in stock
 * @param {number} subUnits - number of units per pack (e.g., 10 tablets per strip)
 * @param {string} packLabel - display name for pack (e.g., "strip", "bottle")
 * @param {string} unitLabel - display name for single unit (e.g., "tablet", "ml")
 * @returns {string} - readable string like "9 strips + 5 tablets"
 */
function formatStockDisplay(
  stockUnits,
  subUnits,
  packLabel = "pack",
  unitLabel = "unit"
) {
  if (!stockUnits || stockUnits <= 0) return `Out of stock`;
  if (!subUnits || subUnits <= 0)
    return `${stockUnits} ${unitLabel}${stockUnits > 1 ? "s" : ""}`;

  const packs = Math.floor(stockUnits / subUnits);
  const remainingUnits = stockUnits % subUnits;

  const parts = [];
  if (packs > 0) parts.push(`${packs} ${packLabel}${packs > 1 ? "s" : ""}`);
  if (remainingUnits > 0)
    parts.push(
      `${remainingUnits} ${unitLabel}${remainingUnits > 1 ? "s" : ""}`
    );

  return parts.join(" + ");
}

module.exports = { formatStockDisplay };
