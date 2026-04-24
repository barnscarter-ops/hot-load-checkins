export const DALLAS_TIME_ZONE = "America/Chicago";

interface ParsedDateInput {
  year: number;
  month: number;
  day: number;
}

interface ParsedTimeInput {
  hours24: number;
  minutes: number;
  totalMinutes: number;
  normalized12: string;
  normalized24: string;
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function isValidDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseDateInput(value: string): ParsedDateInput | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return isValidDateParts(year, month, day) ? { year, month, day } : null;
  }

  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!usMatch) {
    return null;
  }

  const month = Number(usMatch[1]);
  const day = Number(usMatch[2]);
  const year = Number(usMatch[3]);
  return isValidDateParts(year, month, day) ? { year, month, day } : null;
}

export function normalizeDateInput(value: string) {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return value.trim();
  }

  return `${parsed.year}-${pad(parsed.month)}-${pad(parsed.day)}`;
}

function formatDateParts(month: number, day: number, year: number) {
  return `${month}/${day}/${year}`;
}

function getZonedDateParts(date: Date, timeZone = DALLAS_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? "0"),
    second: Number(parts.find((part) => part.type === "second")?.value ?? "0"),
  };
}

function parseDateTimeValue(value: string | Date | null) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateForDisplay(value: string | Date | null) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const parsedDate = parseDateInput(value);
    if (parsedDate) {
      return formatDateParts(parsedDate.month, parsedDate.day, parsedDate.year);
    }
  }

  const parsedDateTime = parseDateTimeValue(value);
  if (!parsedDateTime) {
    return typeof value === "string" ? value : "";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: DALLAS_TIME_ZONE,
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(parsedDateTime);
}

export function formatDateTimeForDisplay(value: string | Date | null) {
  if (!value) {
    return "";
  }

  const parsed = parseDateTimeValue(value);
  if (!parsed) {
    return typeof value === "string" ? value : "";
  }

  const parts = getZonedDateParts(parsed);
  return `${formatDateParts(parts.month, parts.day, parts.year)} ${formatTimeParts(parts.hour, parts.minute)}`;
}

function formatTimeParts(hours24: number, minutes: number) {
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const displayHour = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${displayHour}:${pad(minutes)} ${suffix}`;
}

export function parseTimeInput(value: string): ParsedTimeInput | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (amPmMatch) {
    const hours = Number(amPmMatch[1]);
    const minutes = Number(amPmMatch[2]);
    if (hours < 1 || hours > 12 || minutes > 59) {
      return null;
    }

    const meridiem = amPmMatch[3].toUpperCase();
    const hours24 =
      meridiem === "AM" ? (hours === 12 ? 0 : hours) : hours === 12 ? 12 : hours + 12;
    return {
      hours24,
      minutes,
      totalMinutes: hours24 * 60 + minutes,
      normalized12: formatTimeParts(hours24, minutes),
      normalized24: `${pad(hours24)}:${pad(minutes)}`,
    };
  }

  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFourHourMatch) {
    return null;
  }

  const hours24 = Number(twentyFourHourMatch[1]);
  const minutes = Number(twentyFourHourMatch[2]);
  if (hours24 > 23 || minutes > 59) {
    return null;
  }

  return {
    hours24,
    minutes,
    totalMinutes: hours24 * 60 + minutes,
    normalized12: formatTimeParts(hours24, minutes),
    normalized24: `${pad(hours24)}:${pad(minutes)}`,
  };
}

export function normalizeTimeInput(value: string) {
  const parsed = parseTimeInput(value);
  if (!parsed) {
    return value.trim();
  }

  return parsed.normalized12;
}

export function formatTimeForDisplay(value: string) {
  return normalizeTimeInput(value);
}

export function timeInputToExcelFraction(value: string) {
  const parsed = parseTimeInput(value);
  if (!parsed) {
    return value.trim() ? value.trim() : null;
  }

  return parsed.totalMinutes / (24 * 60);
}

export function computeDurationMinutes(arrivalTime: string, departureTime: string) {
  const arrival = parseTimeInput(arrivalTime);
  const departure = parseTimeInput(departureTime);

  if (!arrival || !departure) {
    return null;
  }

  const minutesInDay = 24 * 60;
  return ((departure.totalMinutes - arrival.totalMinutes) % minutesInDay + minutesInDay) % minutesInDay;
}

export function formatDurationMinutes(minutes: number | null) {
  if (minutes === null) {
    return "\u2014";
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}:${pad(remainder)}`;
}

export function durationMinutesToExcelFraction(minutes: number | null) {
  return minutes === null ? null : minutes / (24 * 60);
}

export function toExcelDateValue(value: string) {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return value.trim() ? value.trim() : null;
  }

  return new Date(parsed.year, parsed.month - 1, parsed.day);
}

export function toExcelDallasDateTime(value: string | Date | null) {
  const parsed = parseDateTimeValue(value);
  if (!parsed) {
    return typeof value === "string" ? value : null;
  }

  const parts = getZonedDateParts(parsed);
  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
}

export function formatDateRangeForDisplay(startDate: string, endDate: string) {
  const formattedStart = formatDateForDisplay(startDate);
  const formattedEnd = formatDateForDisplay(endDate);
  return startDate === endDate ? formattedStart : `${formattedStart} to ${formattedEnd}`;
}
