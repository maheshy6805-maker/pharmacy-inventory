// utils/csvHandler.js
const Papa = require("papaparse");
const { createProduct } = require("../services/productService");
const { createPurchaseBill } = require("../services/purchaseBillService");

const MONTH_NAMES = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const toNumber = (val, fallback = 0) => {
  if (val === null || val === undefined) return fallback;
  const num = Number(String(val).replace(/[, ]+/g, ""));
  return isNaN(num) ? fallback : num;
};

/**
 * Parse a messy expiry value into a Date object representing the LAST DAY
 * of the expiry month. Returns null when parsing fails or empty.
 *
 * Supported inputs (examples):
 * - "09/26", "09-26"        => Sep 2026
 * - "09/2026", "09-2026"    => Sep 2026
 * - "26/09/2001", "26-09-2001" => parses as dd/mm/yyyy (Sep 2001) -> last day Sep 2001
 * - "09/26/01"              => handles two-digit years (2001 or 2026 based on pos)
 * - "09/26" where first > 12 (e.g. "26/09") => treated as day/month or swapped to month/year heuristics:
 *      - "26/09" -> month=09 year=2026 (if we detect two-part and first>12 we assume format day/yy or dd/mm => heuristics)
 * - "Sep-26", "Sep 2026", "september 2026"
 */
function parseExpiryToDate(raw) {
  if (!raw && raw !== 0) return null;
  let s = String(raw).trim();

  // drop surrounding quotes, weird characters
  s = s
    .replace(/^"+|"+$/g, "")
    .replace(/[^0-9A-Za-z\/\-\.\s]/g, "")
    .trim();
  if (!s) return null;

  // try month name formats first: "Sep-26", "September 2026", "sep 26"
  const monthNameMatch = s.match(/^([A-Za-z]{3,})[ \-\/\.]*([0-9]{2,4})$/i);
  if (monthNameMatch) {
    const mname = monthNameMatch[1].toLowerCase();
    const mm = MONTH_NAMES[mname.slice(0, 3)];
    let yy = monthNameMatch[2];
    if (!mm) return null;
    let year = Number(yy);
    if (yy.length === 2) year = 2000 + year;
    return lastDayOfMonth(year, mm);
  }

  // normalize separators to '/'
  s = s.replace(/[\.\-]/g, "/").replace(/\s+/g, ""); // remove spaces inside
  const parts = s.split("/").filter(Boolean);

  // helper to produce Date for last day of month
  function ld(year, month) {
    return lastDayOfMonth(year, month);
  }

  // 1) three-part patterns: d/m/yyyy or m/d/yyyy
  if (parts.length === 3) {
    let [p1, p2, p3] = parts.map((p) => p.trim());
    if (!p1 || !p2 || !p3) return null;

    // ensure numeric (strip non-digits)
    p1 = p1.replace(/\D/g, "");
    p2 = p2.replace(/\D/g, "");
    p3 = p3.replace(/\D/g, "");

    if (!p1 || !p2 || !p3) return null;

    let day = parseInt(p1, 10);
    let month = parseInt(p2, 10);
    let year = parseInt(p3, 10);
    if (p3.length === 2) year = 2000 + year;

    // Heuristics:
    // If first > 12 => DD/MM/YYYY
    // Else if second > 12 => MM/DD/YYYY (US)
    // Else default to DD/MM/YYYY (Indian style)
    if (day > 12) {
      // dd/mm/yyyy
      return ld(year, month);
    } else if (month > 12) {
      // mm/dd/yyyy (second field is day)
      month = parseInt(p1, 10);
      // day = parseInt(p2, 10);
      return ld(year, month);
    } else {
      // both <= 12 -> assume dd/mm/yyyy (Indian default)
      return ld(year, month);
    }
  }

  // 2) two-part patterns: a/b
  if (parts.length === 2) {
    let [aRaw, bRaw] = parts;
    aRaw = aRaw.replace(/\D/g, "");
    bRaw = bRaw.replace(/\D/g, "");
    if (!aRaw || !bRaw) return null;

    // if second is 4-digit -> a/b where b is year (likely mm/yyyy or dd/yyyy)
    if (bRaw.length === 4) {
      const a = parseInt(aRaw, 10);
      const year = parseInt(bRaw, 10);
      if (a >= 1 && a <= 12) {
        return ld(year, a); // mm/yyyy
      } else {
        // ambiguous but if a>12 treat as dd/yyyy => can't extract month, so fallback: month = 1
        return ld(year, 1);
      }
    }

    // both parts length 2 (common): could be MM/YY or DD/MM or YY/MM
    const a = parseInt(aRaw, 10);
    const b = parseInt(bRaw, 10);

    // Heuristics:
    // - If a <= 12 and b <= 99 -> assume a is month, b is year (MM/YY)
    // - If a > 12 and b <= 12 -> probable DD/MM or YY/MM; interpret as year=2000+a, month=b (this handles "26/09" -> month 9 year 2026)
    // - If both <= 12 -> treat as MM/YY by default (US-ish), but if this causes odd results you can adjust
    if (a <= 12 && b <= 99) {
      const year = 2000 + b;
      return ld(year, a);
    } else if (a > 12 && b <= 12) {
      // handle "26/09" -> month=09, year=2000+26 => Sep 2026
      const year = 2000 + a;
      const month = b;
      return ld(year, month);
    } else if (a <= 12 && b > 12) {
      // case like 09/2026 (b > 12 but not 4-digit) — fallback: treat b as year
      const year = 2000 + b;
      return ld(year, a);
    } else {
      // fallback safe
      return null;
    }
  }

  // 3) single numeric: maybe "2026" or "0926"
  if (parts.length === 1) {
    const cleaned = parts[0].replace(/\D/g, "");
    if (!cleaned) return null;
    if (cleaned.length === 4) {
      // year only -> use Jan of that year -> last day of Jan (or we could set Dec)
      const year = parseInt(cleaned, 10);
      return ld(year, 1);
    }
    if (cleaned.length === 3 || cleaned.length === 2) {
      // e.g. "0926" or "926" or "26" ambiguous; try to treat last two digits as year and preceding as month
      if (cleaned.length === 4) {
        const mm = parseInt(cleaned.slice(0, 2), 10);
        const yy = parseInt(cleaned.slice(2), 10);
        return ld(2000 + yy, mm);
      }
      if (cleaned.length === 2) {
        // treat as MM/YY -> month=first, year=2000+second (but we only have 2 digits)
        const mm = parseInt(cleaned.slice(0, 2), 10);
        // ambiguous; cannot determine year. skip
        return null;
      }
    }
  }

  // if nothing matched, return null
  return null;
}

// helper: last day of month for given year and 1-based month (1..12)
function lastDayOfMonth(year, month1Based) {
  if (!year || !month1Based) return null;
  const m = parseInt(month1Based, 10);
  if (m < 1 || m > 12) return null;
  // JS Date: new Date(year, monthIndex, 0) -> last day of "monthIndex" (1-based)
  // so if month1Based = 9 (Sept), call new Date(year, 9, 0)
  return new Date(year, m, 0);
}

async function processCsvAndInsert(csvText, enterpriseId) {
  // Parse CSV
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data;

  let productsAdded = 0;
  let purchaseBillsAdded = 0;
  const failed = [];

  for (const rawRow of rows) {
    const row = {};
    for (let k in rawRow) {
      const cleanKey = k.toLowerCase().replace(/\s+/g, ""); // normalize keys
      row[cleanKey] = rawRow[k]?.toString().trim() || "";
    }

    console.log("🔍 Processing item:", row.itemname || row.name || "(no name)");

    try {
      // parse expiry robustly
      const expiryDate = row.expiry ? parseExpiryToDate(row.expiry) : null;

      // 1. Create Product (inventory)
      const productPayload = {
        name: row.itemname || row.name,
        hsnCode: row.hsncode || row.hsn,
        manufacturer: row.manufacturername || row.company,
        batchNumber: row.batchno || row.batch,
        expiryDate: expiryDate,
        costPrice: toNumber(row.ftrate) || toNumber(row.rate),
        price: toNumber(row.srate) || toNumber(row.retailprice),
        discountPercentage: toNumber(row.dis),
        gstPercentage: toNumber(row.cgst) + toNumber(row.sgst),
        cgstPercent: toNumber(row.cgst),
        sgstPercent: toNumber(row.sgst),
        scheme: row.scheme,
        stock: toNumber(row.qty),
        pack: row.pack,
        category: row.category || "Medicine",
        subcategory: row.subcategory || "Allopathic",
        enterprise: enterpriseId,
      };

      const product = await createProduct(productPayload, enterpriseId);

      // 2. Map to PurchaseBill schema item (map all relevant fields)
      const item = {
        name: row.itemname || row.name,
        hsnCode: row.hsncode || row.hsn,
        manufacturerName: row.manufacturername || row.company,
        batchNo: row.batchno || row.batch,
        expiryDate: expiryDate,
        rate: toNumber(row.ftrate) || toNumber(row.rate),
        retailPrice: toNumber(row.srate) || toNumber(row.retailprice),
        discountPercent: toNumber(row.dis),
        scheme: row.scheme,
        cgstPercent: toNumber(row.cgst),
        sgstPercent: toNumber(row.sgst),
        qnty: toNumber(row.qty),
        pack: row.pack,
        amount: toNumber(row.qty) * toNumber(row.ftrate),
        product: product._id,
      };

      const purchaseBillPayload = {
        supplierName: row.supplier || "Unknown",
        invoiceNumber: row.invoiceno || `INV-${Date.now()}`,
        purchasedDate: row.purchaseddate
          ? new Date(row.purchaseddate)
          : new Date(),
        paymentStatus: row.paymentstatus || "PENDING",
        items: [item],
      };

      await createPurchaseBill(purchaseBillPayload, enterpriseId);

      productsAdded++;
      purchaseBillsAdded++;
    } catch (err) {
      console.error("CSV row failed:", err.message);
      failed.push({ row: rawRow, error: err.message });
    }
  }

  return {
    message: "CSV processed",
    productsAdded,
    purchaseBillsAdded,
    failedCount: failed.length,
    failed,
  };
}

module.exports = { processCsvAndInsert };
