// GET /api/hilfe/yearly-report?year=2026&type=helper|resident&format=pdf|csv
// Jahresabrechnung als PDF oder CSV herunterladen
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessBilling } from "@/lib/hilfe/feature-gate";
import { getStateRules } from "@/lib/hilfe/federal-states";
import { generateYearlyHelperReport } from "@/lib/hilfe/pdf-yearly-helper";
import type {
  YearlyHelperClient,
  YearlyHelperSession,
} from "@/lib/hilfe/pdf-yearly-helper";
import { generateYearlyResidentReport } from "@/lib/hilfe/pdf-yearly-resident";
import type {
  YearlyResidentHelper,
  YearlyResidentSession,
} from "@/lib/hilfe/pdf-yearly-resident";
import { generateHelperCsv, generateResidentCsv } from "@/lib/hilfe/csv-yearly";
import type { HelperCsvRow, ResidentCsvRow } from "@/lib/hilfe/csv-yearly";

function formatCentsToEur(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** DSGVO-konformer Anzeigename: "Maria S." */
function toDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  // --- Parameter validieren ---
  const yearParam = request.nextUrl.searchParams.get("year");
  const type = request.nextUrl.searchParams.get("type");
  const format = request.nextUrl.searchParams.get("format") || "pdf";

  if (!yearParam || !/^\d{4}$/.test(yearParam)) {
    return NextResponse.json(
      { error: "year muss eine 4-stellige Zahl sein" },
      { status: 400 },
    );
  }
  if (!type || !["helper", "resident"].includes(type)) {
    return NextResponse.json(
      { error: 'type muss "helper" oder "resident" sein' },
      { status: 400 },
    );
  }
  if (!["pdf", "csv"].includes(format)) {
    return NextResponse.json(
      { error: 'format muss "pdf" oder "csv" sein' },
      { status: 400 },
    );
  }

  const year = parseInt(yearParam, 10);
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // ============================================================
  // HELPER PATH
  // ============================================================
  if (type === "helper") {
    // Helfer-Profil laden
    const { data: helper } = await supabase
      .from("neighborhood_helpers")
      .select(
        "id, user_id, subscription_status, trial_receipt_used, federal_state, date_of_birth, hourly_rate_cents",
      )
      .eq("user_id", user.id)
      .single();

    if (!helper)
      return NextResponse.json(
        { error: "Kein Helfer-Profil" },
        { status: 404 },
      );

    // Feature-Gate pruefen
    if (
      !canAccessBilling(helper.subscription_status, helper.trial_receipt_used)
    ) {
      return NextResponse.json(
        { error: "Abrechnungs-Modul erforderlich" },
        { status: 403 },
      );
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
      return NextResponse.json(
        { error: "Keine Einsaetze in diesem Jahr" },
        { status: 404 },
      );
    }

    // Sessions nach Bewohner gruppieren
    const residentMap = new Map<string, typeof sessions>();
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
        (sum, s) => sum + s.total_amount_cents,
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
      "Bitte informieren Sie sich bei Ihrem Finanzamt ueber die steuerliche Behandlung.";

    // Helfer-Daten laden
    const {
      data: { user: helperUser },
    } = await supabase.auth.admin.getUserById(user.id);

    if (format === "csv") {
      const csv = generateHelperCsv(csvRows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Jahresabrechnung_Einnahmen_${year}.csv"`,
        },
      });
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

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Jahresabrechnung_Einnahmen_${year}.pdf"`,
      },
    });
  }

  // ============================================================
  // RESIDENT PATH
  // ============================================================
  // Pflege-Profil laden
  const { data: careProfile } = await supabase
    .from("care_profiles_hilfe")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!careProfile)
    return NextResponse.json({ error: "Kein Pflege-Profil" }, { status: 404 });

  // Sessions des Jahres laden (Bewohner = Auftraggeber der help_requests)
  const { data: sessions } = await supabase
    .from("help_sessions")
    .select(
      "*, help_matches!inner(helper_id, request_id, help_requests!inner(user_id))",
    )
    .eq("help_matches.help_requests.user_id", user.id)
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .in("status", ["signed", "receipt_created"]);

  if (!sessions || sessions.length === 0) {
    return NextResponse.json(
      { error: "Keine Einsaetze in diesem Jahr" },
      { status: 404 },
    );
  }

  // Sessions nach Helfer gruppieren
  const helperMap = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const helperId = s.help_matches.helper_id;
    if (!helperMap.has(helperId)) helperMap.set(helperId, []);
    helperMap.get(helperId)!.push(s);
  }

  // Helfer-IDs → user_ids aufloesen (helper_id ist neighborhood_helpers.id, nicht user_id)
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
      (sum, s) => sum + s.total_amount_cents,
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
  } = await supabase.auth.admin.getUserById(user.id);

  if (format === "csv") {
    const csv = generateResidentCsv(csvRows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Jahresabrechnung_Ausgaben_${year}.csv"`,
      },
    });
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

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Jahresabrechnung_Ausgaben_${year}.pdf"`,
    },
  });
}
