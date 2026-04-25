import ExcelJS from "exceljs";

import {
  CHECK_IN_FIELD_ORDER,
  CHECK_IN_SHEET_NAME,
  FIELD_LABELS,
  MASTER_EXPORT_ROUTE,
} from "@/lib/check-ins/constants";
import { normalizeQuantityInput } from "@/lib/check-ins/schema";
import {
  computeDurationMinutes,
  durationMinutesToExcelFraction,
  formatDateTimeForDisplay,
  formatTimeForDisplay,
  timeInputToExcelFraction,
  toExcelDallasDateTime,
  toExcelDateValue,
} from "@/lib/date-time";
import type {
  CheckInFieldKey,
  CheckInFields,
  MasterExportRow,
  SingleCheckInWorkbookInput,
} from "@/lib/check-ins/types";
import { safeSlug, sanitizeFileName } from "@/lib/utils";

const BORDER_COLOR = "FFD3DCE6";
const OUTLINE_COLOR = "FF94A0AE";
const HEADER_BORDER_COLOR = "FF6A7582";
const TITLE_TEXT_COLOR = "FF1D2A36";
const SUBTLE_TEXT_COLOR = "FF6E7781";
const SECTION_FILL = "FF2D3E50";
const LABEL_FILL = "FFF3F5F7";
const SUCCESS_FILL = "FFDFF5E6";
const WARNING_FILL = "FFFFF4CE";
const DANGER_FILL = "FFFDE2E1";
const DELAY_TEXT_COLOR = "FF8F1D1D";
const FORM_FIELD_LABELS: Record<CheckInFieldKey, string> = {
  ticketNumber: "Ticket Number",
  date: "Date",
  vendor: "Vendor",
  harscoEmployee: "Employee",
  material: "Material",
  quantity: "Load Weight",
  truckNumber: "Truck Number",
  vehicleNumber: "Vehicle Number",
  radTicket: "RAD Ticket",
  arrivalTime: "Arrival Time",
  departureTime: "Departure Time",
  comments: "Comments",
};

const MASTER_EXPORT_COLUMNS = [
  ...CHECK_IN_FIELD_ORDER,
  "timeOnSite",
  "submissionStatus",
  "exportStatus",
  "emailStatus",
  "submittedAt",
] as const;

type MasterExportColumnKey = (typeof MASTER_EXPORT_COLUMNS)[number];

const MASTER_EXPORT_HEADERS: Record<MasterExportColumnKey, string> = {
  date: FIELD_LABELS.date,
  ticketNumber: FIELD_LABELS.ticketNumber,
  vendor: FIELD_LABELS.vendor,
  material: FIELD_LABELS.material,
  quantity: FIELD_LABELS.quantity,
  truckNumber: FIELD_LABELS.truckNumber,
  arrivalTime: FIELD_LABELS.arrivalTime,
  departureTime: FIELD_LABELS.departureTime,
  comments: FIELD_LABELS.comments,
  vehicleNumber: FIELD_LABELS.vehicleNumber,
  radTicket: FIELD_LABELS.radTicket,
  harscoEmployee: FIELD_LABELS.harscoEmployee,
  timeOnSite: "Time On Site",
  submissionStatus: "Submission Status",
  exportStatus: "Export Status",
  emailStatus: "Email Status",
  submittedAt: "Submitted At",
};

function applyThinBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: BORDER_COLOR } },
    left: { style: "thin", color: { argb: BORDER_COLOR } },
    bottom: { style: "thin", color: { argb: BORDER_COLOR } },
    right: { style: "thin", color: { argb: BORDER_COLOR } },
  };
}

function applyHeaderBottomBorder(cell: ExcelJS.Cell) {
  cell.border = {
    bottom: { style: "medium", color: { argb: HEADER_BORDER_COLOR } },
  };
}

function applySectionOutline(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
) {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    for (const columnLetter of ["A", "B"] as const) {
      const cell = worksheet.getCell(`${columnLetter}${rowNumber}`);
      const currentBorder = cell.border ?? {};
      cell.border = {
        top:
          rowNumber === startRow
            ? { style: "medium", color: { argb: OUTLINE_COLOR } }
            : currentBorder.top ?? { style: "thin", color: { argb: BORDER_COLOR } },
        bottom:
          rowNumber === endRow
            ? { style: "medium", color: { argb: OUTLINE_COLOR } }
            : currentBorder.bottom ?? { style: "thin", color: { argb: BORDER_COLOR } },
        left: {
          style: columnLetter === "A" ? "medium" : "thin",
          color: { argb: columnLetter === "A" ? OUTLINE_COLOR : BORDER_COLOR },
        },
        right: {
          style: columnLetter === "B" ? "medium" : "thin",
          color: { argb: columnLetter === "B" ? OUTLINE_COLOR : BORDER_COLOR },
        },
      };
    }
  }
}

function formatQuantityDisplay(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const normalized = normalizeQuantityInput(trimmed);
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return trimmed;
  }

  const numericValue = Number(normalized);
  const hasDecimal = normalized.includes(".");
  const formattedValue = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: hasDecimal ? 2 : 0,
  }).format(numericValue);

  return `${formattedValue} LB`;
}

function computeTimeOnSiteFraction(fields: CheckInFields) {
  return durationMinutesToExcelFraction(
    computeDurationMinutes(fields.arrivalTime, fields.departureTime),
  );
}

function styleFormCellPair(worksheet: ExcelJS.Worksheet, rowNumber: number, label: string) {
  const labelCell = worksheet.getCell(`A${rowNumber}`);
  const valueCell = worksheet.getCell(`B${rowNumber}`);
  labelCell.value = label;
  labelCell.font = { bold: true, size: 11, color: { argb: TITLE_TEXT_COLOR } };
  labelCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: LABEL_FILL },
  };
  labelCell.alignment = { vertical: "middle", horizontal: "left" };
  valueCell.font = { size: 13, color: { argb: TITLE_TEXT_COLOR } };
  valueCell.alignment = { vertical: "middle", horizontal: "left" };
  applyThinBorder(labelCell);
  applyThinBorder(valueCell);
  worksheet.getRow(rowNumber).height = 24;
}

function addSectionHeader(worksheet: ExcelJS.Worksheet, rowNumber: number, title: string) {
  worksheet.mergeCells(`A${rowNumber}:B${rowNumber}`);
  const cell = worksheet.getCell(`A${rowNumber}`);
  cell.value = title;
  cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: SECTION_FILL },
  };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  applyThinBorder(cell);
  applyThinBorder(worksheet.getCell(`B${rowNumber}`));
  worksheet.getRow(rowNumber).height = 24;
}

function addSpacerRow(worksheet: ExcelJS.Worksheet, rowNumber: number) {
  worksheet.getRow(rowNumber).height = 10;
  applyThinBorder(worksheet.getCell(`A${rowNumber}`));
  applyThinBorder(worksheet.getCell(`B${rowNumber}`));
}

function configureSingleTruckWorksheet(worksheet: ExcelJS.Worksheet) {
  worksheet.columns = [
    { key: "label", width: 28 },
    { key: "value", width: 42 },
  ];
  worksheet.views = [{ state: "frozen", ySplit: 2, topLeftCell: "A3" }];
  worksheet.mergeCells("A1:B1");
  worksheet.mergeCells("A2:B2");

  const titleCell = worksheet.getCell("A1");
  titleCell.value = "HOT LOAD CHECK-IN";
  titleCell.font = { bold: true, size: 20, color: { argb: TITLE_TEXT_COLOR } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  const subtitleCell = worksheet.getCell("A2");
  subtitleCell.value = "Gerdau – Manager";
  subtitleCell.font = { italic: true, size: 11, color: { argb: SUBTLE_TEXT_COLOR } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.getRow(1).height = 30;
  worksheet.getRow(2).height = 20;

  applyHeaderBottomBorder(titleCell);
  applyHeaderBottomBorder(worksheet.getCell("B1"));
  applyHeaderBottomBorder(subtitleCell);
  applyHeaderBottomBorder(worksheet.getCell("B2"));
}

function configureMasterWorksheet(worksheet: ExcelJS.Worksheet) {
  worksheet.columns = MASTER_EXPORT_COLUMNS.map((columnKey) => ({
    key: columnKey,
    width:
      columnKey === "comments"
        ? 28
        : columnKey === "submittedAt"
          ? 22
          : columnKey === "timeOnSite"
            ? 14
            : Math.max(MASTER_EXPORT_HEADERS[columnKey].length + 4, 14),
  }));

  if (worksheet.rowCount === 0) {
    worksheet.addRow(MASTER_EXPORT_COLUMNS.map((columnKey) => MASTER_EXPORT_HEADERS[columnKey]));
  }

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFF7F7F7" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: SECTION_FILL },
  };

  headerRow.eachCell((cell) => {
    applyThinBorder(cell);
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: "A1",
    to: `${worksheet.getRow(1).getCell(MASTER_EXPORT_COLUMNS.length).address}`,
  };
}

function populateSingleTruckWorksheet(
  worksheet: ExcelJS.Worksheet,
  input: SingleCheckInWorkbookInput,
) {
  configureSingleTruckWorksheet(worksheet);

  const submittedAtValue = toExcelDallasDateTime(input.submittedAt);
  const exportGeneratedAtValue = toExcelDallasDateTime(input.exportGeneratedAt);
  const loadWeightDisplay = formatQuantityDisplay(input.fields.quantity);
  const timeOnSiteValue = computeTimeOnSiteFraction(input.fields);
  const delayFlagValue =
    timeOnSiteValue === null ? "" : timeOnSiteValue > 2 / 24 ? "Yes" : "No";
  const manualEditsValue =
    input.manuallyEditedFields.length > 0
      ? `Edited: ${input.manuallyEditedFields
          .map((fieldKey) => FORM_FIELD_LABELS[fieldKey])
          .join(", ")}`
      : "No manual edits";

  addSectionHeader(worksheet, 3, "LOAD DETAILS");
  styleFormCellPair(worksheet, 4, FORM_FIELD_LABELS.ticketNumber);
  styleFormCellPair(worksheet, 5, FORM_FIELD_LABELS.date);
  styleFormCellPair(worksheet, 6, FORM_FIELD_LABELS.vendor);
  styleFormCellPair(worksheet, 7, FORM_FIELD_LABELS.harscoEmployee);
  styleFormCellPair(worksheet, 8, FORM_FIELD_LABELS.material);
  styleFormCellPair(worksheet, 9, FORM_FIELD_LABELS.quantity);
  addSpacerRow(worksheet, 10);

  addSectionHeader(worksheet, 11, "VEHICLE DETAILS");
  styleFormCellPair(worksheet, 12, FORM_FIELD_LABELS.truckNumber);
  styleFormCellPair(worksheet, 13, FORM_FIELD_LABELS.vehicleNumber);
  styleFormCellPair(worksheet, 14, FORM_FIELD_LABELS.radTicket);
  addSpacerRow(worksheet, 15);

  addSectionHeader(worksheet, 16, "TIMING");
  styleFormCellPair(worksheet, 17, FORM_FIELD_LABELS.arrivalTime);
  styleFormCellPair(worksheet, 18, FORM_FIELD_LABELS.departureTime);
  styleFormCellPair(worksheet, 19, "Time On Site");
  styleFormCellPair(worksheet, 20, "Delay Flag");
  addSpacerRow(worksheet, 21);

  addSectionHeader(worksheet, 22, "NOTES");
  styleFormCellPair(worksheet, 23, FORM_FIELD_LABELS.comments);
  addSpacerRow(worksheet, 24);

  addSectionHeader(worksheet, 25, "SYSTEM INFO");
  styleFormCellPair(worksheet, 26, "Submitted At");
  styleFormCellPair(worksheet, 27, "Review Status");
  styleFormCellPair(worksheet, 28, "Manual Edits");
  addSpacerRow(worksheet, 29);

  worksheet.mergeCells("A30:B30");
  worksheet.mergeCells("A31:B31");
  const footerNoteCell = worksheet.getCell("A30");
  footerNoteCell.value = "Generated by Hot Load Check-In";
  footerNoteCell.font = { size: 10, color: { argb: SUBTLE_TEXT_COLOR }, italic: true };
  footerNoteCell.alignment = { horizontal: "center", vertical: "middle" };
  applyThinBorder(footerNoteCell);
  applyThinBorder(worksheet.getCell("B30"));

  const footerTimestampCell = worksheet.getCell("A31");
  footerTimestampCell.value =
    exportGeneratedAtValue instanceof Date
      ? exportGeneratedAtValue
      : `Export Generated: ${formatDateTimeForDisplay(input.exportGeneratedAt)}`;
  footerTimestampCell.font = { size: 10, color: { argb: SUBTLE_TEXT_COLOR } };
  footerTimestampCell.alignment = { horizontal: "center", vertical: "middle" };
  if (exportGeneratedAtValue instanceof Date) {
    footerTimestampCell.numFmt = '"Export Generated: "m/d/yyyy h:mm AM/PM';
  }
  applyThinBorder(footerTimestampCell);
  applyThinBorder(worksheet.getCell("B31"));

  worksheet.getCell("B4").value = input.fields.ticketNumber || "";
  worksheet.getCell("B5").value = toExcelDateValue(input.fields.date);
  worksheet.getCell("B6").value = input.fields.vendor || "";
  worksheet.getCell("B7").value = input.fields.harscoEmployee || "";
  worksheet.getCell("B8").value = input.fields.material || "";
  worksheet.getCell("B9").value = loadWeightDisplay;
  worksheet.getCell("B12").value = input.fields.truckNumber || "";
  worksheet.getCell("B13").value = input.fields.vehicleNumber || "";
  worksheet.getCell("B14").value = input.fields.radTicket || "";
  worksheet.getCell("B17").value = timeInputToExcelFraction(input.fields.arrivalTime);
  worksheet.getCell("B18").value = timeInputToExcelFraction(input.fields.departureTime);
  worksheet.getCell("B19").value = timeOnSiteValue;
  worksheet.getCell("B20").value = delayFlagValue;
  worksheet.getCell("B23").value = input.fields.comments || "";
  worksheet.getCell("B26").value = submittedAtValue;
  worksheet.getCell("B27").value = input.reviewStatus;
  worksheet.getCell("B28").value = manualEditsValue;

  worksheet.getCell("B5").numFmt = "m/d/yyyy";
  worksheet.getCell("B17").numFmt = "h:mm AM/PM";
  worksheet.getCell("B18").numFmt = "h:mm AM/PM";
  worksheet.getCell("B19").numFmt = "[h]:mm";
  worksheet.getCell("B19").font = { bold: true, size: 13, color: { argb: TITLE_TEXT_COLOR } };
  worksheet.getCell("B20").font = { bold: true, size: 13, color: { argb: TITLE_TEXT_COLOR } };
  worksheet.getCell("B26").numFmt = "m/d/yyyy h:mm AM/PM";
  worksheet.getCell("B23").alignment = {
    vertical: "top",
    horizontal: "left",
    wrapText: true,
  };
  worksheet.getCell("B28").alignment = {
    vertical: "top",
    horizontal: "left",
    wrapText: true,
  };

  worksheet.getRow(23).height = 78;
  worksheet.getRow(26).height = 24;
  worksheet.getRow(27).height = 24;
  worksheet.getRow(28).height = 34;
  worksheet.getRow(30).height = 18;
  worksheet.getRow(31).height = 18;

  worksheet.addConditionalFormatting({
    ref: "B19",
    rules: [
      {
        type: "cellIs",
        priority: 1,
        operator: "lessThan",
        formulae: ["1/24"],
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: SUCCESS_FILL },
            fgColor: { argb: SUCCESS_FILL },
          },
        },
      },
      {
        type: "cellIs",
        priority: 2,
        operator: "between",
        formulae: ["1/24", "2/24"],
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: WARNING_FILL },
            fgColor: { argb: WARNING_FILL },
          },
        },
      },
      {
        type: "cellIs",
        priority: 3,
        operator: "greaterThan",
        formulae: ["2/24"],
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: DANGER_FILL },
            fgColor: { argb: DANGER_FILL },
          },
        },
      },
    ],
  });

  worksheet.addConditionalFormatting({
    ref: "B20",
    rules: [
      {
        type: "expression",
        priority: 4,
        formulae: ['$B$20="Yes"'],
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: { argb: DANGER_FILL },
            fgColor: { argb: DANGER_FILL },
          },
          font: {
            bold: true,
            color: { argb: DELAY_TEXT_COLOR },
          },
        },
      },
    ],
  });

  applySectionOutline(worksheet, 3, 9);
  applySectionOutline(worksheet, 11, 14);
  applySectionOutline(worksheet, 16, 20);
  applySectionOutline(worksheet, 22, 23);
  applySectionOutline(worksheet, 25, 28);
}

function addMasterExportRow(worksheet: ExcelJS.Worksheet, rowData: MasterExportRow) {
  const row = worksheet.addRow([
    ...CHECK_IN_FIELD_ORDER.map((fieldKey) =>
      fieldKey === "arrivalTime" || fieldKey === "departureTime"
        ? formatTimeForDisplay(rowData.fields[fieldKey])
        : rowData.fields[fieldKey],
    ),
    computeTimeOnSiteFraction(rowData.fields),
    rowData.submissionStatus,
    rowData.exportStatus,
    rowData.emailStatus,
    toExcelDallasDateTime(rowData.submittedAt),
  ]);

  row.eachCell((cell) => {
    applyThinBorder(cell);
    cell.alignment = { vertical: "top", wrapText: true };
  });

  row.getCell(MASTER_EXPORT_COLUMNS.indexOf("timeOnSite") + 1).numFmt = "[h]:mm";
  row.getCell(MASTER_EXPORT_COLUMNS.indexOf("submittedAt") + 1).numFmt =
    "m/d/yyyy h:mm AM/PM";
  row.height = 22;
}

export async function buildSingleCheckInWorkbook(input: SingleCheckInWorkbookInput) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(CHECK_IN_SHEET_NAME);

  populateSingleTruckWorksheet(worksheet, input);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildMasterWorkbook(rows: MasterExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(CHECK_IN_SHEET_NAME);

  configureMasterWorksheet(worksheet);
  rows.forEach((row) => addMasterExportRow(worksheet, row));

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function buildTruckWorkbookPath(checkInId: string, fields: CheckInFields) {
  const ticket = safeSlug(fields.ticketNumber || checkInId);
  const vendor = safeSlug(fields.vendor || "vendor");
  return `exports/check-ins/${checkInId}/${ticket}-${vendor}.xlsx`;
}

export function buildTruckWorkbookDownloadFileName(fields: CheckInFields, checkInId: string) {
  const ticket = sanitizeFileName(fields.ticketNumber || checkInId).replace(/\.xlsx$/i, "");
  return `hot-load-check-in-ticket-${ticket || "check-in"}.xlsx`;
}

export function buildMasterExportFileName() {
  return `${safeSlug("hot-load-check-in-master")}.xlsx`;
}

export function getMasterExportPath() {
  return MASTER_EXPORT_ROUTE;
}
