// Nachbar Hilfe — Jahresabrechnung Service
// Extrahierte Business-Logik aus /api/hilfe/yearly-report/route.ts
import { ServiceError } from "@/lib/services/service-error";
import { canAccessBilling } from "@/modules/hilfe/services/feature-gate";
import { getStateRules } from "@/modules/hilfe/services/federal-states";
import { generateYearlyHelperReport } from "@/modules/hilfe/services/pdf-yearly-helper";
import type {
  YearlyHelperClient,
  YearlyHelperSession,
} from "@/modules/hilfe/services/pdf-yearly-helper";
import { generateYearlyResidentReport } from "@/modules/hilfe/services/pdf-yearly-resident";
import type {
  YearlyResidentHelper,
  YearlyResidentSession,
} from "@/modules/hilfe/services/pdf-yearly-resident";
import {
  generateHelperCsv,
  generateResidentCsv,
} from "@/modules/hilfe/services/csv-yearly";
import type {
  HelperCsvRow,
  ResidentCsvRow,
} from "@/modules/hilfe/services/csv-yearly";
import type { SupabaseClient } from "@supabase/supabase-js";

// --- Ergebnis-Typen ---

export interface YearlyReportResult {
  data: Uint8Array | string;
  contentType: string;
  filename: string;
}

// --- Hilfsfunktionen ---

function formatCentsToEur(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** DSGVO-konformer Anzeigename: "Maria S." */
function toDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// --- Parameter-Validierung ---

export interface YearlyReportParams {
  year: number;
  type: "helper" | "resident";
  format: "pdf" | "csv";
}

export function parseYearlyReportParams(
  searchParams: URLSearchParams,
): YearlyReportParams {
  const yearParam = searchParams.get("year");
  const type = searchParams.get("type");
  const format = searchParams.get("format") || "pdf";

  if (!yearParam || !/^\d{4}$/.test(yearParam)) {
    throw new ServiceError("year muss eine 4-stellige Zahl sein", 400);
  }
  if (!type || !["helper", "resident"].includes(type)) {
    throw new ServiceError('type muss "helper" oder "resident" sein', 400);
  }
  if (!["pdf", "csv"].includes(format)) {
    throw new ServiceError('format muss "pdf" oder "csv" sein', 400);
  }

  return {
    year: parseInt(yearParam, 10),
    type: type as "helper" | "resident",
    format: format as "pdf" | "csv",
  };
}

// --- Helfer-Jahresabrechnung ---

async function generateHelperReport(
  supabase: SupabaseClient,
  userId: string,
  year: number,
  format: "pdf" | "csv",
): Promise<YearlyReportResult> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Helfer-Profil laden
  const { data: helper } = await supabase
    .from("neighborhood_helpers")
    .select(
      "id, user_id, subscription_status, trial_receipt_used, federal_state, date_of_birth, hourly_rate_cents",
    )
    .eq("user_id", userId)
    .single();

  if (!helper) throw new ServiceError("Kein Helfer-Profil", 404);

  // Feature-Gate prüfen
  if (
    !canAccessBilling(helper.subscription_status, helper.trial_receipt_used)
  ) {
    throw new ServiceError("Abrechnungs-Modul erforderlich", 403);
  }

  // Sessions des Jahres laden
  const { data: sessions } = await supabase
    .from("help_sessions")
    .select(
      "*, help_matches!inner(helper_id, request_id, help_requests!inner(user_id))",
    )
    .eq("help_matches.helper_id", helper.id)
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .in("status", ["signed", "receipt_created"]);

  if (!sessions || sessions.length === 0) {
    throw new ServiceError("Keine Einsätze in diesem Jahr", 404);
  }

  // Sessions nach Bewohner gruppieren
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const residentMap = new Map<string, any[]>();
  for (const s of sessions) {
    const residentId = s.help_matches.help_requests.user_id;
    if (!residentMap.has(residentId)) residentMap.set(residentId, []);
    residentMap.get(residentId)!.push(s);
  }

  // Bewohner-Namen laden + Clients aufbauen
  const clients: YearlyHelperClient[] = [];
  const csvRows: HelperCsvRow[] = [];

  for (const [residentId, residentSessions] of residentMap) {
    const {
      data: { user: residentUser },
    } = await supabase.auth.admin.getUserById(residentId);
    const fullName = residentUser?.user_metadata?.full_name || "Bewohner";
    const displayName = toDisplayName(fullName);

    const sessionData: YearlyHelperSession[] = residentSessions.map((s) => ({
      date: s.session_date,
      startTime: s.start_time,
      endTime: s.end_time,
      durationMinutes: s.duration_minutes,
      category: s.activity_category,
      amountCents: s.total_amount_cents,
    }));

    const subtotalCents = residentSessions.reduce(
      (sum: number, s: { total_amount_cents: number }) =>
        sum + s.total_amount_cents,
      0,
    );
    clients.push({ displayName, sessions: sessionData, subtotalCents });

    // CSV-Zeilen sammeln
    for (const s of residentSessions) {
      csvRows.push({
        date: s.session_date,
        clientName: displayName,
        category: s.activity_category,
        durationMinutes: s.duration_minutes,
        hourlyRateEur: formatCentsToEur(helper.hourly_rate_cents),
        amountEur: formatCentsToEur(s.total_amount_cents),
      });
    }
  }

  const totalAmountCents = sessions.reduce(
    (sum, s) => sum + s.total_amount_cents,
    0,
  );
  const totalSessions = sessions.length;
  const totalClients = residentMap.size;
  const totalDurationMinutes = sessions.reduce(
    (sum, s) => sum + s.duration_minutes,
    0,
  );
  const averageHourlyRateCents =
    totalDurationMinutes > 0
      ? Math.round((totalAmountCents / totalDurationMinutes) * 60)
      : helper.hourly_rate_cents;
  const exceedsFreibetrag = totalAmountCents > 300000; // 3.000 EUR

  // Steuer-Hinweis laden
  const stateRules = getStateRules(helper.federal_state);
  const taxNote =
    stateRules?.tax_note ||
    "Bitte informieren Sie sich bei Ihrem Finanzamt über die steuerliche Behandlung.";

  // Helfer-Daten laden
  const {
    data: { user: helperUser },
  } = await supabase.auth.admin.getUserById(userId);

  if (format === "csv") {
    const csv = generateHelperCsv(csvRows);
    return {
      data: csv,
      contentType: "text/csv; charset=utf-8",
      filename: `Jahresabrechnung_Einnahmen_${year}.csv`,
    };
  }

  // PDF generieren
  const pdf = generateYearlyHelperReport({
    year,
    helper: {
      name: helperUser?.user_metadata?.full_name || "Helfer",
      address: helperUser?.user_metadata?.address || "",
      dateOfBirth: helper.date_of_birth || "",
      federalState: helper.federal_state || "",
    },
    clients,
    totalAmountCents,
    totalSessions,
    totalClients,
    averageHourlyRateCents,
    taxNote,
    exceedsFreibetrag,
  });

  return {
    data: Buffer.from(pdf),
    contentType: "application/pdf",
    filename: `Jahresabrechnung_Einnahmen_${year}.pdf`,
  };
}

// --- Bewohner-Jahresabrechnung ---

async function generateResidentReport(
  supabase: SupabaseClient,
  userId: string,
  year: number,
  format: "pdf" | "csv",
): Promise<YearlyReportResult> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Pflege-Profil laden
  const { data: careProfile } = await supabase
    .from("care_profiles_hilfe")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!careProfile) throw new ServiceError("Kein Pflege-Profil", 404);

  // Sessions des Jahres laden (Bewohner = Auftraggeber der help_requests)
  const { data: sessions } = await supabase
    .from("help_sessions")
    .select(
      "*, help_matches!inner(helper_id, request_id, help_requests!inner(user_id))",
    )
    .eq("help_matches.help_requests.user_id", userId)
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .in("status", ["signed", "receipt_created"]);

  if (!sessions || sessions.length === 0) {
    throw new ServiceError("Keine Einsätze in diesem Jahr", 404);
  }

  // Sessions nach Helfer gruppieren
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const helperMap = new Map<string, any[]>();
  for (const s of sessions) {
    const helperId = s.help_matches.helper_id;
    if (!helperMap.has(helperId)) helperMap.set(helperId, []);
    helperMap.get(helperId)!.push(s);
  }

  // Helfer-IDs → user_ids auflösen (helper_id ist neighborhood_helpers.id, nicht user_id)
  const helperIds = Array.from(helperMap.keys());
  const { data: helperProfiles } = await supabase
    .from("neighborhood_helpers")
    .select("id, user_id, hourly_rate_cents")
    .in("id", helperIds);

  const helpers: YearlyResidentHelper[] = [];
  const csvRows: ResidentCsvRow[] = [];

  for (const [helperId, helperSessions] of helperMap) {
    const helperProfile = helperProfiles?.find((h) => h.id === helperId);
    const helperUserId = helperProfile?.user_id;
    let helperName = "Helfer";
    let helperAddress = "";

    if (helperUserId) {
      const {
        data: { user: helperUser },
      } = await supabase.auth.admin.getUserById(helperUserId);
      helperName = helperUser?.user_metadata?.full_name || "Helfer";
      helperAddress = helperUser?.user_metadata?.address || "";
    }

    const sessionData: YearlyResidentSession[] = helperSessions.map((s) => ({
      date: s.session_date,
      startTime: s.start_time,
      endTime: s.end_time,
      durationMinutes: s.duration_minutes,
      category: s.activity_category,
      hourlyRateCents: helperProfile?.hourly_rate_cents || 0,
      amountCents: s.total_amount_cents,
    }));

    const subtotalCents = helperSessions.reduce(
      (sum: number, s: { total_amount_cents: number }) =>
        sum + s.total_amount_cents,
      0,
    );
    helpers.push({
      name: helperName,
      address: helperAddress,
      sessions: sessionData,
      subtotalCents,
    });

    // CSV-Zeilen sammeln
    for (const s of helperSessions) {
      csvRows.push({
        date: s.session_date,
        helperName,
        helperAddress,
        category: s.activity_category,
        durationMinutes: s.duration_minutes,
        hourlyRateEur: formatCentsToEur(helperProfile?.hourly_rate_cents || 0),
        amountEur: formatCentsToEur(s.total_amount_cents),
      });
    }
  }

  const totalAmountCents = sessions.reduce(
    (sum, s) => sum + s.total_amount_cents,
    0,
  );
  const totalSessions = sessions.length;
  // 20% absetzbar nach § 35a EStG
  const deductibleCents = Math.round(totalAmountCents * 0.2);
  const deductibleAmount = formatCentsToEur(deductibleCents);

  // Versichertennummer maskieren: nur letzte 4 Zeichen
  const rawInsuranceNumber = careProfile.insurance_number_encrypted || "";
  const insuranceNumberMasked =
    rawInsuranceNumber.length > 4
      ? "****" + rawInsuranceNumber.slice(-4)
      : rawInsuranceNumber;

  // Bewohner-Daten laden
  const {
    data: { user: residentUser },
  } = await supabase.auth.admin.getUserById(userId);

  if (format === "csv") {
    const csv = generateResidentCsv(csvRows);
    return {
      data: csv,
      contentType: "text/csv; charset=utf-8",
      filename: `Jahresabrechnung_Ausgaben_${year}.csv`,
    };
  }

  // PDF generieren
  const pdf = generateYearlyResidentReport({
    year,
    resident: {
      name: residentUser?.user_metadata?.full_name || "Bewohner",
      address: residentUser?.user_metadata?.address || "",
      insuranceName: careProfile.insurance_name || "",
      insuranceNumberMasked,
      careLevel: careProfile.care_level || 1,
    },
    helpers,
    totalAmountCents,
    totalSessions,
    deductibleAmount,
  });

  return {
    data: Buffer.from(pdf),
    contentType: "application/pdf",
    filename: `Jahresabrechnung_Ausgaben_${year}.pdf`,
  };
}

// --- Haupt-Funktion ---

export async function getYearlyReport(
  supabase: SupabaseClient,
  userId: string,
  params: YearlyReportParams,
): Promise<YearlyReportResult> {
  if (params.type === "helper") {
    return generateHelperReport(supabase, userId, params.year, params.format);
  }
  return generateResidentReport(supabase, userId, params.year, params.format);
}
