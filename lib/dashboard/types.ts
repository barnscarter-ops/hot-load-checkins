import type { ReviewStatus, WorkflowStepStatus } from "@/lib/check-ins/types";

export type DashboardDatePreset = "today" | "last7" | "last30" | "custom";

export interface DashboardFilters {
  preset: DashboardDatePreset;
  startDate: string;
  endDate: string;
  vendor: string;
  material: string;
  employee: string;
  isSingleDay: boolean;
  rangeLabel: string;
}

export interface DashboardQueryRow {
  id: string;
  date: string;
  ticketNumber: string;
  vendor: string;
  material: string;
  arrivalTime: string;
  departureTime: string;
  submittedAt: string | null;
  submissionStatus: WorkflowStepStatus;
  exportStatus: WorkflowStepStatus;
  emailStatus: WorkflowStepStatus;
  reviewStatus: ReviewStatus;
  employee: string;
}

export interface DashboardFilterOptions {
  vendors: string[];
  materials: string[];
  employees: string[];
}

export interface DashboardLoadRecord extends DashboardQueryRow {
  vendorDisplay: string;
  materialDisplay: string;
  employeeDisplay: string;
  durationMinutes: number | null;
  hasValidDuration: boolean;
  isDelayed: boolean;
  hasFailedDownstreamAction: boolean;
  delayFlag: "Yes" | "No" | "Unknown";
}

export interface DashboardKpiMetrics {
  totalLoads: number;
  averageTimeOnSiteMinutes: number | null;
  longestLoadTimeMinutes: number | null;
  percentLoadsOverTwoHours: number | null;
  totalDelayedLoads: number;
  validDurationCount: number;
}

export interface DashboardTrendPoint {
  label: string;
  averageMinutes: number | null;
  totalLoads: number;
}

export interface DashboardDistributionBucket {
  label: string;
  count: number;
}

export interface DashboardAverageGroup {
  label: string;
  averageMinutes: number;
  count: number;
}

export interface DashboardViewModel {
  filters: DashboardFilters;
  options: DashboardFilterOptions;
  records: DashboardLoadRecord[];
  kpis: DashboardKpiMetrics;
  trend: DashboardTrendPoint[];
  distribution: DashboardDistributionBucket[];
  avgByVendor: DashboardAverageGroup[];
  avgByMaterial: DashboardAverageGroup[];
  topSlowLoads: DashboardLoadRecord[];
  problemLoads: DashboardLoadRecord[];
  hasData: boolean;
  hasValidDurations: boolean;
}
