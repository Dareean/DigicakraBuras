import ExcelJS from "exceljs";

export const RED   = "FFB91C1C";
export const GREEN = "FF14532D";
export const DARK  = "FF1E293B";
export const GRAY  = "FF64748B";
export const BGLT  = "FFF1F5F9";
export const BGM   = "FFE2E8F0";
export const WHITE = "FFFFFFFF";
export const BGALT = "FFFAFAFA";

const THIN = { style: "thin" as const, color: { argb: "FFE2E8F0" } };

export function border(cell: ExcelJS.Cell) {
  cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
}

export function title(cell: ExcelJS.Cell) {
  cell.font      = { bold: true, size: 14, color: { argb: RED }, name: "Calibri" };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

export function subtitle(cell: ExcelJS.Cell) {
  cell.font      = { italic: true, size: 10, color: { argb: GRAY }, name: "Calibri" };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

export function sectionHeader(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 10, color: { argb: WHITE }, name: "Calibri" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
  cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  border(cell);
}

export function label(cell: ExcelJS.Cell) {
  cell.font      = { size: 9, color: { argb: DARK }, name: "Calibri" };
  cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: BGLT } };
  border(cell);
}

export function value(cell: ExcelJS.Cell, bold = false, color = DARK) {
  cell.font      = { bold, size: 9, color: { argb: color }, name: "Calibri" };
  cell.alignment = { horizontal: "left", vertical: "middle" };
  border(cell);
}

export function currency(cell: ExcelJS.Cell, bold = false, color = DARK) {
  cell.font      = { bold, size: 9, color: { argb: color }, name: "Calibri" };
  cell.numFmt    = '"Rp"#,##0';
  cell.alignment = { horizontal: "right", vertical: "middle" };
  border(cell);
}

export function thCell(cell: ExcelJS.Cell) {
  cell.font      = { bold: true, size: 9, color: { argb: DARK }, name: "Calibri" };
  cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: BGM } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  border(cell);
}

export function tdCell(
  cell: ExcelJS.Cell,
  align: ExcelJS.Alignment["horizontal"] = "left",
  alt = false,
  bold = false,
  color = DARK
) {
  cell.font      = { size: 9, bold, color: { argb: color }, name: "Calibri" };
  cell.alignment = { horizontal: align, vertical: "middle" };
  if (alt) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BGALT } };
  border(cell);
}

export function footerCell(cell: ExcelJS.Cell, isLabel = false) {
  cell.font      = { bold: true, size: 9, color: { argb: WHITE }, name: "Calibri" };
  cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
  cell.alignment = { horizontal: isLabel ? "right" : "right", vertical: "middle" };
  if (!isLabel) cell.numFmt = '"Rp"#,##0';
  border(cell);
}

export function mergeTitle(ws: ExcelJS.Worksheet, rowNum: number, lastCol: string, text: string, height = 26) {
  const r = ws.addRow([text]);
  ws.mergeCells(`A${rowNum}:${lastCol}${rowNum}`);
  title(r.getCell(1));
  r.height = height;
  return r;
}
