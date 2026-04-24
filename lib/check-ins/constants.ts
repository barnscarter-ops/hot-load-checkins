import type {
  CheckInFieldSection,
  CheckInFieldKey,
  CheckInFields,
  ConfidenceMap,
  ConfidenceReasonMap,
} from "@/lib/check-ins/types";

export const APP_NAME = "Hot Load Check-In";
export const LOW_CONFIDENCE_THRESHOLD = 0.8;
export const MAX_IMAGE_COUNT = 10;
export const CHECK_IN_SHEET_NAME = "Check-In";
export const MASTER_EXPORT_ROUTE = "/api/check-ins/master-export";
export const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const CHECK_IN_FIELD_ORDER: CheckInFieldKey[] = [
  "date",
  "ticketNumber",
  "vendor",
  "material",
  "quantity",
  "truckNumber",
  "arrivalTime",
  "departureTime",
  "comments",
  "vehicleNumber",
  "radTicket",
  "harscoEmployee",
];

export const REQUIRED_FIELDS = [...CHECK_IN_FIELD_ORDER];

export const FIELD_LABELS: Record<CheckInFieldKey, string> = {
  date: "Date",
  ticketNumber: "Ticket Number",
  vendor: "Vendor",
  material: "Material",
  quantity: "Quantity",
  truckNumber: "Truck Number",
  arrivalTime: "Arrival Time",
  departureTime: "Departure Time",
  comments: "Comments",
  vehicleNumber: "Vehicle Number",
  radTicket: "RAD Ticket",
  harscoEmployee: "HARSCO Employee",
};

export const FIELD_HELP_TEXT: Record<CheckInFieldKey, string> = {
  date: "Use the load date shown on the paperwork.",
  ticketNumber: "Primary ticket or scale ticket number.",
  vendor: "Company or supplier listed on the load.",
  material: "Material description from the paperwork.",
  quantity: "Exact quantity value as shown.",
  truckNumber: "Truck identifier or fleet number.",
  arrivalTime: "Arrival time like 1:56 PM or 13:56.",
  departureTime: "Departure time like 3:27 PM or 15:27.",
  comments: "Add any important notes from the paperwork or yard.",
  vehicleNumber: "Vehicle number if listed separately from truck number.",
  radTicket: "RAD ticket reference from the paperwork.",
  harscoEmployee: "Employee responsible for the check-in.",
};

export const FIELD_INPUT_TYPES: Record<
  CheckInFieldKey,
  "text" | "date" | "textarea"
> = {
  date: "date",
  ticketNumber: "text",
  vendor: "text",
  material: "text",
  quantity: "text",
  truckNumber: "text",
  arrivalTime: "text",
  departureTime: "text",
  comments: "textarea",
  vehicleNumber: "text",
  radTicket: "text",
  harscoEmployee: "text",
};

export const FIELD_SECTIONS: CheckInFieldSection[] = [
  {
    id: "ticket-info",
    title: "Ticket Info",
    description: "Date and ticket references from the paperwork.",
    fieldKeys: ["date", "ticketNumber", "radTicket"],
  },
  {
    id: "vendor-material-load",
    title: "Vendor / Material / Load",
    description: "Supplier, material, and quantity details for the load.",
    fieldKeys: ["vendor", "material", "quantity"],
  },
  {
    id: "truck-vehicle",
    title: "Truck / Vehicle",
    description: "Truck and vehicle identifiers used in the yard.",
    fieldKeys: ["truckNumber", "vehicleNumber"],
  },
  {
    id: "times",
    title: "Times",
    description: "Arrival and departure times in Dallas local time with AM/PM display.",
    fieldKeys: ["arrivalTime", "departureTime"],
  },
  {
    id: "comments-employee",
    title: "Comments / Employee",
    description: "Operational notes and the HARSCO employee responsible for the check-in.",
    fieldKeys: ["comments", "harscoEmployee"],
  },
];

export const BLANK_CHECK_IN_FIELDS: CheckInFields = {
  date: "",
  ticketNumber: "",
  vendor: "",
  material: "",
  quantity: "",
  truckNumber: "",
  arrivalTime: "",
  departureTime: "",
  comments: "",
  vehicleNumber: "",
  radTicket: "",
  harscoEmployee: "",
};

export const EMPTY_CONFIDENCE_MAP: ConfidenceMap = {
  date: 0,
  ticketNumber: 0,
  vendor: 0,
  material: 0,
  quantity: 0,
  truckNumber: 0,
  arrivalTime: 0,
  departureTime: 0,
  comments: 0,
  vehicleNumber: 0,
  radTicket: 0,
  harscoEmployee: 0,
};

export const EMPTY_CONFIDENCE_REASON_MAP: ConfidenceReasonMap = {
  date: "",
  ticketNumber: "",
  vendor: "",
  material: "",
  quantity: "",
  truckNumber: "",
  arrivalTime: "",
  departureTime: "",
  comments: "",
  vehicleNumber: "",
  radTicket: "",
  harscoEmployee: "",
};
