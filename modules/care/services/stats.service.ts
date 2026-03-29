// modules/care/services/stats.service.ts
// Nachbar.io — Pflege-Statistiken (Business Logic)

import { SupabaseClient } from "@supabase/supabase-js";
import {
  requireAdmin,
  requireCareAccess,
  careLog,
} from "@/lib/care/api-helpers";
import { ServiceError } from "@/lib/services/service-error";

// --- Service-Funktionen ---

/**
 * Aggregierte Pflege-Statistiken (GET /api/care/stats)
 * Für einen Senior oder systemweit (Admin).
 */
export async function getCareStats(
  supabase: SupabaseClient,
  userId: string,
  seniorId: string | null,
): Promise<unknown> {
  // Ohne senior_id: Admin-Check
  if (!seniorId) {
    const isAdmin = await requireAdmin(supabase, userId);
    if (!isAdmin)
      throw new ServiceError("Senior-ID erforderlich oder Admin-Rechte", 403);
  } else if (seniorId !== userId) {
    // Mit senior_id: Zugriffsprüfung
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) throw new ServiceError("Kein Zugriff auf diesen Senior", 403);
  }

  careLog("stats", "fetch", {
    seniorId: seniorId ?? "system-wide",
    userId,
  });

  try {
    // Build filter - seniorId scopes queries, null = system-wide
    const filter = seniorId;

    // Zeitstempel für 7-Tage-Abfragen
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const now = new Date().toISOString();

    // Alle Abfragen parallel ausführen für Performance
    const [
      seniorsResult,
      sosResult,
      sosLast7Result,
      checkinsResult,
      checkinsLast7Result,
      medsResult,
      medsLogsResult,
      medsLast7Result,
      appointmentsResult,
      appointmentsUpcomingResult,
      helpersResult,
      helpersVerifiedResult,
      documentsResult,
      subscriptionsResult,
    ] = await Promise.all([
      // Senioren-Profile gesamt
      supabase
        .from("care_profiles")
        .select("id", { count: "exact", head: true }),

      // SOS-Alerts gesamt
      (() => {
        const q = supabase
          .from("care_sos_alerts")
          .select("id, status", { count: "exact", head: true });
        return filter ? q.eq("senior_id", filter) : q;
      })(),

      // SOS-Alerts letzte 7 Tage
      (() => {
        const q = supabase
          .from("care_sos_alerts")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo);
        return filter ? q.eq("senior_id", filter) : q;
      })(),

      // Check-ins gesamt
      (() => {
        const q = supabase
          .from("care_checkins")
          .select("id, status", { count: "exact", head: true });
        return filter ? q.eq("senior_id", filter) : q;
      })(),

      // Check-ins letzte 7 Tage
      (() => {
        const q = supabase
          .from("care_checkins")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo);
        return filter ? q.eq("senior_id", filter) : q;
      })(),

      // Aktive Medikamente
      (() => {
        const q = supabase
          .from("care_medications")
          .select("id", { count: "exact", head: true })
          .eq("active", true);
        return filter ? q.eq("senior_id", filter) : q;
      })(),

      // Medikamenten-Logs gesamt
      (() => {
        const q = supabase
          .from("care_medication_logs")
          .select("id, status", { count: "exact", head: true });
        return filter ? q.eq("senior_id", filter) : q;
      })(),

      // Medikamenten-Logs letzte 7 Tage
      (() => {
        const q = supabase
          .from("care_medication_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo);
        return filter ? q.eq("senior_id", filter) : q;
      })(),

      // Termine gesamt
      (() => {
        const q = supabase
          .from("care_appointments")
          .select("id", { count: "exact", head: true });
        return filter ? q.eq("senior_id", filter) : q;
      })(),

      // Anstehende Termine
      (() => {
        const q = supabase
          .from("care_appointments")
          .select("id", { count: "exact", head: true })
          .gte("scheduled_at", now);
        return filter ? q.eq("senior_id", filter) : q;
      })(),

      // Helfer gesamt
      supabase
        .from("care_helpers")
        .select("id", { count: "exact", head: true }),

      // Verifizierte Helfer
      supabase
        .from("care_helpers")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "verified"),

      // Dokumente
      (() => {
        const q = supabase
          .from("care_documents")
          .select("id", { count: "exact", head: true });
        return filter ? q.eq("senior_id", filter) : q;
      })(),

      // Abonnements (immer systemweit für Verteilung)
      supabase.from("care_subscriptions").select("plan"),
    ]);

    // Gelöste SOS-Rate berechnen
    let sosResolved = 0;
    const sosTotal = sosResult.count ?? 0;
    if (sosTotal > 0) {
      const resolvedQuery = supabase
        .from("care_sos_alerts")
        .select("id", { count: "exact", head: true })
        .eq("status", "resolved");
      const { count: resolvedCount } = filter
        ? await resolvedQuery.eq("senior_id", filter)
        : await resolvedQuery;
      sosResolved = resolvedCount ?? 0;
    }

    // Check-in Compliance berechnen
    let checkinOk = 0;
    const checkinTotal = checkinsResult.count ?? 0;
    if (checkinTotal > 0 && filter) {
      const { count: okCount } = await supabase
        .from("care_checkins")
        .select("id", { count: "exact", head: true })
        .eq("senior_id", filter)
        .eq("status", "ok");
      checkinOk = okCount ?? 0;
    }

    // Medikamenten-Compliance (genommen / gesamt)
    let medsTaken = 0;
    const medsLogTotal = medsLogsResult.count ?? 0;
    if (medsLogTotal > 0 && filter) {
      const { count: takenCount } = await supabase
        .from("care_medication_logs")
        .select("id", { count: "exact", head: true })
        .eq("senior_id", filter)
        .eq("status", "taken");
      medsTaken = takenCount ?? 0;
    }

    // Abo-Verteilung
    const subDistribution: Record<string, number> = {
      free: 0,
      basic: 0,
      family: 0,
      professional: 0,
      premium: 0,
    };
    if (subscriptionsResult.data) {
      for (const sub of subscriptionsResult.data) {
        if (sub.plan in subDistribution) {
          subDistribution[sub.plan]++;
        }
      }
    }

    return {
      seniors: {
        total: seniorsResult.count ?? 0,
        active: seniorsResult.count ?? 0, // Alle Profile gelten vorerst als aktiv
      },
      sos: {
        total: sosTotal,
        resolved: sosResolved,
        avgResponseMinutes: null, // Komplexe Berechnung, später implementieren
        last7Days: sosLast7Result.count ?? 0,
      },
      checkins: {
        total: checkinTotal,
        complianceRate:
          checkinTotal > 0 ? Math.round((checkinOk / checkinTotal) * 100) : 0,
        last7Days: checkinsLast7Result.count ?? 0,
      },
      medications: {
        totalMeds: medsResult.count ?? 0,
        complianceRate:
          medsLogTotal > 0 ? Math.round((medsTaken / medsLogTotal) * 100) : 0,
        last7Days: medsLast7Result.count ?? 0,
      },
      appointments: {
        total: appointmentsResult.count ?? 0,
        upcoming: appointmentsUpcomingResult.count ?? 0,
      },
      helpers: {
        total: helpersResult.count ?? 0,
        verified: helpersVerifiedResult.count ?? 0,
      },
      documents: {
        total: documentsResult.count ?? 0,
      },
      subscriptions: subDistribution,
    };
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    throw new ServiceError(`Statistik-Fehler: ${message}`, 500);
  }
}

/**
 * Plattform-Übersicht Statistiken (GET /api/care/stats/overview)
 * Nur für Admins — für Investoren-Präsentationen und Pilot-Bewertung.
 */
export async function getCareOverview(
  supabase: SupabaseClient,
  userId: string,
): Promise<unknown> {
  const isAdmin = await requireAdmin(supabase, userId);
  if (!isAdmin) throw new ServiceError("Nur für Administratoren", 403);

  careLog("stats", "overview", { adminId: userId });

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [
      totalUsersResult,
      activeSeniorsResult,
      helpersResult,
      verifiedHelpersResult,
      sosAllResult,
      sos30DResult,
      sosResolvedResult,
      checkinsAllResult,
      checkins30DResult,
      checkinOkResult,
      medsActiveResult,
      medLogsResult,
      medsTakenResult,
      appointmentsResult,
      appointmentsUpcomingResult,
      subscriptionsResult,
      documentsResult,
      auditResult,
      lastCronResult,
    ] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase
        .from("care_profiles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("care_helpers")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("care_helpers")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "verified"),
      supabase
        .from("care_sos_alerts")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("care_sos_alerts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo),
      supabase
        .from("care_sos_alerts")
        .select("id", { count: "exact", head: true })
        .eq("status", "resolved"),
      supabase
        .from("care_checkins")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("care_checkins")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo),
      supabase
        .from("care_checkins")
        .select("id", { count: "exact", head: true })
        .eq("status", "ok"),
      supabase
        .from("care_medications")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
      supabase
        .from("care_medication_logs")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("care_medication_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "taken"),
      supabase
        .from("care_appointments")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("care_appointments")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", now.toISOString()),
      supabase.from("care_subscriptions").select("plan, status"),
      supabase
        .from("care_documents")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("care_audit_log")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("care_checkins")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Abo-Verteilung berechnen
    const distribution: Record<string, number> = {
      free: 0,
      basic: 0,
      family: 0,
      professional: 0,
      premium: 0,
    };
    let totalPaid = 0;
    let trialActive = 0;
    if (subscriptionsResult.data) {
      for (const sub of subscriptionsResult.data) {
        if (sub.plan in distribution) distribution[sub.plan]++;
        if (sub.plan !== "free") totalPaid++;
        if (sub.status === "trial") trialActive++;
      }
    }

    const totalSeniors = activeSeniorsResult.count ?? 0;
    const totalVerifiedHelpers = verifiedHelpersResult.count ?? 0;
    const totalCheckins = checkinsAllResult.count ?? 0;
    const okCheckins = checkinOkResult.count ?? 0;
    const totalSos = sosAllResult.count ?? 0;
    const resolvedSos = sosResolvedResult.count ?? 0;
    const totalMedLogs = medLogsResult.count ?? 0;
    const takenMeds = medsTakenResult.count ?? 0;

    return {
      platform: {
        totalUsers: totalUsersResult.count ?? 0,
        activeSeniors: totalSeniors,
        registeredHelpers: helpersResult.count ?? 0,
        verifiedHelpers: totalVerifiedHelpers,
        helperCoverageRatio:
          totalSeniors > 0
            ? Number((totalVerifiedHelpers / totalSeniors).toFixed(2))
            : 0,
      },
      operations: {
        sosAlerts: {
          total: totalSos,
          last30Days: sos30DResult.count ?? 0,
          avgResponseMinutes: null, // Komplexe Berechnung, später
          resolutionRate:
            totalSos > 0 ? Math.round((resolvedSos / totalSos) * 100) : 0,
        },
        checkins: {
          total: totalCheckins,
          last30Days: checkins30DResult.count ?? 0,
          complianceRate:
            totalCheckins > 0
              ? Math.round((okCheckins / totalCheckins) * 100)
              : 0,
        },
        medications: {
          activePrescriptions: medsActiveResult.count ?? 0,
          complianceRate:
            totalMedLogs > 0 ? Math.round((takenMeds / totalMedLogs) * 100) : 0,
        },
        appointments: {
          total: appointmentsResult.count ?? 0,
          upcoming: appointmentsUpcomingResult.count ?? 0,
        },
      },
      subscriptions: {
        distribution,
        totalPaid,
        trialActive,
      },
      system: {
        documentsGenerated: documentsResult.count ?? 0,
        auditEntries: auditResult.count ?? 0,
        lastCronRun: lastCronResult.data?.created_at ?? null,
      },
      generatedAt: now.toISOString(),
    };
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    throw new ServiceError(`Plattform-Statistik-Fehler: ${message}`, 500);
  }
}
