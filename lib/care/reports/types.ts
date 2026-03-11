// lib/care/reports/types.ts
// Nachbar.io — Typen fuer Pflege-Berichte

import type { CareDocumentType } from '../types';

export interface ReportSeniorInfo {
  name: string;
  careLevel: string;
  profileCreatedAt: string;
}

export interface ReportCheckinSummary {
  total: number;
  ok: number;
  notWell: number;
  missed: number;
  complianceRate: number; // 0-100
}

export interface ReportMedicationEntry {
  name: string;
  dosage: string | null;
  totalDoses: number;
  taken: number;
  skipped: number;
  missed: number;
  complianceRate: number;
}

export interface ReportMedicationSummary {
  totalMedications: number;
  totalDoses: number;
  taken: number;
  skipped: number;
  missed: number;
  overallComplianceRate: number;
  medications: ReportMedicationEntry[];
}

export interface ReportSosSummary {
  total: number;
  resolved: number;
  cancelled: number;
  avgResponseMinutes: number | null;
  byCategory: Record<string, number>;
}

export interface ReportAppointmentSummary {
  total: number;
  upcoming: number;
  past: number;
}

export interface ReportAuditEntry {
  timestamp: string;
  eventType: string;
  eventLabel: string;
  actorName: string;
}

export interface ReportData {
  type: CareDocumentType;
  senior: ReportSeniorInfo;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  checkins: ReportCheckinSummary;
  medications: ReportMedicationSummary;
  sos: ReportSosSummary;
  appointments: ReportAppointmentSummary;
  recentActivity: ReportAuditEntry[];
}
