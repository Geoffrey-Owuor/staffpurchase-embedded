// Excel side of Staff Offers: the upload template, reading an uploaded
// sheet, and a promo's export. The export uses the template's first two
// columns, so an exported file can be edited and uploaded again.
// DB checks on the parsed rows live in lib/adminStaffOffers.js
// (analyzeOfferUpload).
import ExcelJS from "exceljs";
import { RouteError } from "@/lib/adminForm";
import { readOfferPrice, readProductCode } from "@/lib/adminStaffOffers";
import {
  OFFER_UPLOAD_CODE_HEADER as CODE_HEADER,
  OFFER_UPLOAD_MAX_BYTES,
  OFFER_UPLOAD_MAX_ROWS,
  OFFER_UPLOAD_PRICE_HEADER as PRICE_HEADER,
  OFFER_UPLOAD_RULES,
} from "@/utils/Admin/adminConstants";

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Header text -> column role. Lenient on case/spacing/punctuation so a
// retyped header still works.
const normalize = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const isCodeHeader = (h) => ["productcode", "code", "itemcode"].includes(h);
const isPriceHeader = (h) => h === "price" || h.startsWith("offerprice");

const HEADER_STYLE = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } },
};

function addOfferSheet(workbook, name) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    // Text format keeps codes like 00123 from losing their leading zeros
    { header: CODE_HEADER, key: "productCode", width: 24, style: { numFmt: "@" } },
    { header: PRICE_HEADER, key: "offerPrice", width: 20, style: { numFmt: "#,##0.00" } },
  ];
  sheet.getRow(1).eachCell((cell) => Object.assign(cell, HEADER_STYLE));
  return sheet;
}

export async function buildTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = addOfferSheet(workbook, "Offers");
  sheet.addRow({ productCode: "EXAMPLE-CODE-1", offerPrice: 45999 });
  sheet.addRow({ productCode: "EXAMPLE-CODE-2", offerPrice: 12500.5 });

  const help = workbook.addWorksheet("Instructions");
  help.getColumn(1).width = 110;
  help.addRow(["How to fill in the Offers sheet"]).font = { bold: true };
  for (const rule of OFFER_UPLOAD_RULES) help.addRow([`• ${rule}`]);
  help.addRow([]);
  help.addRow(["Delete the two example rows before uploading."]);
  return workbook.xlsx.writeBuffer();
}

export async function buildPromoExport(promo, offers) {
  const workbook = new ExcelJS.Workbook();
  const sheet = addOfferSheet(workbook, "Offers");
  // Status etc. sit after the template columns, so the file re-uploads
  // as-is (extra columns are ignored)
  for (const [key, header, width] of [
    ["status", "Status", 12],
    ["usageCount", "Used by (purchase lines)", 24],
    ["createdAt", "Added", 20],
  ]) {
    const column = sheet.getColumn(sheet.columnCount + 1);
    column.key = key;
    column.width = width;
    const cell = sheet.getRow(1).getCell(column.number);
    cell.value = header;
    Object.assign(cell, HEADER_STYLE);
  }
  sheet.getColumn("createdAt").numFmt = "yyyy-mm-dd hh:mm";
  for (const offer of offers) {
    sheet.addRow({
      productCode: offer.productCode,
      offerPrice: offer.offerPrice,
      status: offer.isActive ? "Active" : "Inactive",
      usageCount: offer.usageCount,
      createdAt: new Date(offer.createdAt),
    });
  }

  const about = workbook.addWorksheet("Promo");
  about.getColumn(1).width = 16;
  about.getColumn(2).width = 60;
  for (const [label, value] of [
    ["Promo", promo.name],
    ["Status", promo.status],
    ["Starts", promo.startsAt.replace("T", " ")],
    ["Ends", promo.endsAt.replace("T", " ")],
    ["Products", `${promo.activeProductCount} active of ${promo.productCount}`],
    ["Exported", new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC"],
  ]) {
    about.addRow([label, value]).getCell(1).font = { bold: true };
  }
  about.addRow([]);
  about.addRow([
    "",
    "Inactive products are included - remove them before re-uploading this file into another promo.",
  ]);
  return workbook.xlsx.writeBuffer();
}

export function xlsxResponse(buffer, filename) {
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": XLSX_TYPE,
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.\- ]/g, "_")}"`,
    },
  });
}

// A cell's underlying value: formula results, rich text and hyperlinks
// unwrapped; null for empty.
function cellValue(cell) {
  let value = cell.value;
  if (value && typeof value === "object") {
    if ("result" in value) value = value.result;
    else if (Array.isArray(value.richText)) {
      value = value.richText.map((part) => part.text).join("");
    } else if ("text" in value) value = value.text;
    else if (value instanceof Date) value = null;
  }
  if (value === undefined || value === "") return null;
  return value;
}

// Excel stores prices as floats: accept ones that are whole cents
function priceFromCell(value) {
  if (typeof value === "number") {
    const cents = Math.round(value * 100);
    if (Math.abs(value * 100 - cents) > 1e-6) {
      throw new RouteError(400, "Offer price must have at most 2 decimals");
    }
    return readOfferPrice((cents / 100).toFixed(2));
  }
  return readOfferPrice(value);
}

// Reads an uploaded File (from request.formData()) into
// [{ row, productCode, offerPrice, errors: [] }]. Structural problems
// (not an .xlsx, missing headers, too many rows) throw a 400.
export async function readOfferUpload(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new RouteError(400, "Choose an Excel file to upload");
  }
  if (!/\.xlsx$/i.test(file.name ?? "")) {
    throw new RouteError(400, "Upload an .xlsx file - download the template to start");
  }
  if (file.size > OFFER_UPLOAD_MAX_BYTES) {
    throw new RouteError(
      400,
      `The file is too large (max ${Math.round(OFFER_UPLOAD_MAX_BYTES / 1024 / 1024)} MB)`,
    );
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new RouteError(400, "That file couldn't be read as an Excel workbook");
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new RouteError(400, "The workbook has no sheets");

  let codeCol = null;
  let priceCol = null;
  sheet.getRow(1).eachCell((cell, col) => {
    const header = normalize(cellValue(cell));
    if (codeCol === null && isCodeHeader(header)) codeCol = col;
    else if (priceCol === null && isPriceHeader(header)) priceCol = col;
  });
  if (!codeCol || !priceCol) {
    throw new RouteError(
      400,
      `Row 1 of the first sheet needs "${CODE_HEADER}" and "${PRICE_HEADER}" headers - use the template`,
    );
  }

  const rows = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const rawCode = cellValue(row.getCell(codeCol));
    const rawPrice = cellValue(row.getCell(priceCol));
    if (rawCode === null && rawPrice === null) continue;

    if (rows.length >= OFFER_UPLOAD_MAX_ROWS) {
      throw new RouteError(
        400,
        `The file has more than ${OFFER_UPLOAD_MAX_ROWS.toLocaleString("en-KE")} products - split it into smaller files`,
      );
    }

    const entry = {
      row: r,
      productCode: rawCode === null ? "" : String(rawCode).trim(),
      offerPrice: null,
      errors: [],
      warnings: [],
    };
    try {
      entry.productCode = readProductCode(entry.productCode);
    } catch (error) {
      entry.errors.push(error.message);
    }
    try {
      entry.offerPrice = priceFromCell(rawPrice);
    } catch (error) {
      entry.errors.push(
        rawPrice === null ? "Offer price is missing" : error.message,
      );
    }
    rows.push(entry);
  }

  if (rows.length === 0) {
    throw new RouteError(400, "The file has no products below the headers");
  }
  return rows;
}
