import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUtcRangeForLocalDates } from "@/lib/dashboard/metrics";
import type { DashboardFilterOptions, DashboardFilters, DashboardQueryRow } from "@/lib/dashboard/types";

interface StoredDashboardRow {
  id: string;
  ticket_number: string | null;
  vendor: string | null;
  material: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  submitted_at: string | null;
  submission_status: "idle" | "processing" | "succeeded" | "failed" | null;
  export_status: "idle" | "processing" | "succeeded" | "failed" | null;
  email_status: "idle" | "processing" | "succeeded" | "failed" | null;
  review_status: "idle" | "ready" | "reviewed" | null;
  harsco_employee: string | null;
}

function mapDashboardRow(row: StoredDashboardRow): DashboardQueryRow {
  return {
    id: row.id,
    ticketNumber: row.ticket_number ?? "",
    vendor: row.vendor ?? "",
    material: row.material ?? "",
    arrivalTime: row.arrival_time ?? "",
    departureTime: row.departure_time ?? "",
    submittedAt: row.submitted_at,
    submissionStatus: row.submission_status ?? "idle",
    exportStatus: row.export_status ?? "idle",
    emailStatus: row.email_status ?? "idle",
    reviewStatus: row.review_status ?? "idle",
    employee: row.harsco_employee ?? "",
  };
}

export async function getDashboardFilterOptions(filters: DashboardFilters): Promise<DashboardFilterOptions> {
  const supabase = createSupabaseAdminClient();
  const { startUtcIso, endUtcIso } = getUtcRangeForLocalDates(filters.startDate, filters.endDate);
  const { data, error } = await supabase
    .from("check_ins")
    .select("vendor,material,harsco_employee")
    .eq("status", "submitted")
    .gte("submitted_at", startUtcIso)
    .lt("submitted_at", endUtcIso);

  if (error) {
    throw new Error(`Could not load dashboard filter options: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as Array<{
    vendor: string | null;
    material: string | null;
    harsco_employee: string | null;
  }>;

  const dedupe = (values: Array<string | null | undefined>) =>
    Array.from(
      new Set(
        values
          .map((value) => value?.trim() ?? "")
          .filter((value) => value.length > 0),
      ),
    ).sort((left, right) => left.localeCompare(right));

  return {
    vendors: dedupe(rows.map((row) => row.vendor)),
    materials: dedupe(rows.map((row) => row.material)),
    employees: dedupe(rows.map((row) => row.harsco_employee)),
  };
}

export async function getDashboardRows(filters: DashboardFilters): Promise<DashboardQueryRow[]> {
  const supabase = createSupabaseAdminClient();
  const { startUtcIso, endUtcIso } = getUtcRangeForLocalDates(filters.startDate, filters.endDate);

  let query = supabase
    .from("check_ins")
    .select(
      [
        "id",
        "ticket_number",
        "vendor",
        "material",
        "arrival_time",
        "departure_time",
        "submitted_at",
        "submission_status",
        "export_status",
        "email_status",
        "review_status",
        "harsco_employee",
      ].join(","),
    )
    .eq("status", "submitted")
    .gte("submitted_at", startUtcIso)
    .lt("submitted_at", endUtcIso)
    .order("submitted_at", { ascending: false, nullsFirst: false });

  if (filters.vendor) {
    query = query.eq("vendor", filters.vendor);
  }

  if (filters.material) {
    query = query.eq("material", filters.material);
  }

  if (filters.employee) {
    query = query.eq("harsco_employee", filters.employee);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Could not load dashboard rows: ${error.message}`);
  }

  return ((data ?? []) as unknown as StoredDashboardRow[]).map(mapDashboardRow);
}
