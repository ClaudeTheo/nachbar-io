import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkCronHealth } from "@/lib/care/cron-heartbeat";

/**
 * GET /api/admin/health
 *
 * System-Health-Checks fuer das Admin-Dashboard.
 * Prueft DB-Verbindung, Push-Konfiguration, KI-API und Tabellen-Zustand.
 * Nur fuer Admins zugaenglich.
 */
export async function GET() {
  const supabase = await createClient();

  // Admin-Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
  }

  const checks: {
    name: string;
    status: "ok" | "warn" | "error";
    detail: string;
    responseMs?: number;
  }[] = [];

  // 1. Datenbank-Verbindung pruefen
  const dbStart = Date.now();
  try {
    const { count, error } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true });
    const dbMs = Date.now() - dbStart;

    if (error) {
      checks.push({ name: "Datenbank", status: "error", detail: error.message, responseMs: dbMs });
    } else {
      checks.push({
        name: "Datenbank",
        status: dbMs > 2000 ? "warn" : "ok",
        detail: `${count} Nutzer, ${dbMs}ms`,
        responseMs: dbMs,
      });
    }
  } catch {
    checks.push({ name: "Datenbank", status: "error", detail: "Verbindung fehlgeschlagen", responseMs: Date.now() - dbStart });
  }

  // 2. Push-Konfiguration pruefen
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (vapidKey && vapidPrivate) {
    // Abonnements zaehlen
    const { count: subCount } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true });
    checks.push({ name: "Push-Dienst", status: "ok", detail: `${subCount ?? 0} Abonnements` });
  } else if (vapidKey) {
    checks.push({ name: "Push-Dienst", status: "warn", detail: "Private Key fehlt" });
  } else {
    checks.push({ name: "Push-Dienst", status: "warn", detail: "VAPID Keys nicht konfiguriert" });
  }

  // 3. KI-News (Anthropic API Key)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey !== "placeholder-api-key") {
    // Letzten News-Scrape pruefen
    const { data: lastNews } = await supabase
      .from("news_items")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastNews) {
      const hoursAgo = Math.round((Date.now() - new Date(lastNews.created_at).getTime()) / 3600000);
      checks.push({
        name: "KI-News",
        status: hoursAgo > 168 ? "warn" : "ok", // Warnung wenn >7 Tage
        detail: hoursAgo < 24 ? `Letzter Import: vor ${hoursAgo}h` : `Letzter Import: vor ${Math.round(hoursAgo / 24)} Tagen`,
      });
    } else {
      checks.push({ name: "KI-News", status: "warn", detail: "Noch keine Nachrichten" });
    }
  } else {
    checks.push({ name: "KI-News", status: "warn", detail: "API Key nicht konfiguriert" });
  }

  // 4. Tabellen-Zustaende pruefen
  const tableChecks = await Promise.all([
    supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("help_requests").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
  ]);

  const openAlerts = tableChecks[0].count ?? 0;
  const activeHelp = tableChecks[1].count ?? 0;
  const unreadNotifications = tableChecks[2].count ?? 0;

  checks.push({
    name: "Offene Meldungen",
    status: openAlerts > 5 ? "warn" : "ok",
    detail: `${openAlerts} offen, ${activeHelp} Hilfegesuche`,
  });

  checks.push({
    name: "Benachrichtigungen",
    status: "ok",
    detail: `${unreadNotifications} ungelesen`,
  });

  // 5. Cron-Jobs: Secret pruefen + Heartbeat-Status (FMEA Massnahme)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    checks.push({ name: "Cron-Jobs", status: "warn", detail: "CRON_SECRET fehlt" });
  } else {
    try {
      const cronHealth = await checkCronHealth(supabase);
      for (const cron of cronHealth) {
        checks.push({
          name: `Cron: ${cron.name}`,
          status: cron.status,
          detail: cron.detail,
        });
      }
    } catch {
      checks.push({ name: "Cron-Jobs", status: "warn", detail: "Heartbeat-Tabelle nicht verfuegbar" });
    }
  }

  // Gesamt-Status
  const hasError = checks.some((c) => c.status === "error");
  const hasWarn = checks.some((c) => c.status === "warn");

  return NextResponse.json({
    overall: hasError ? "error" : hasWarn ? "warn" : "ok",
    checks,
    timestamp: new Date().toISOString(),
  });
}
