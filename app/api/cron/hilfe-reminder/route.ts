// GET /api/cron/hilfe-reminder — Erinnerung am 28. jeden Monats
// Vercel Cron: 0 9 28 * * (28. jeden Monats um 09:00)
import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/care/channels/push";
import { safeInsertNotification } from "@/lib/notifications-server";
import { writeCronHeartbeat } from "@/lib/care/cron-heartbeat";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler" },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;

  // Alle aktiven Helfer mit Verbindungen finden
  const { data: helpers } = await supabase
    .from("neighborhood_helpers")
    .select("id, user_id, subscription_status")
    .in("subscription_status", ["active", "trial"]);

  if (!helpers || helpers.length === 0) {
    return NextResponse.json({ success: true, reminded: 0 });
  }

  let reminded = 0;
  const errors: string[] = [];

  for (const helper of helpers) {
    try {
      // Hat der Helfer Einsätze in diesem Monat?
      const { count } = await supabase
        .from("help_sessions")
        .select("*", { count: "exact", head: true })
        .eq("status", "signed")
        .gte("session_date", `${monthYear}-01`)
        .lte("session_date", `${monthYear}-31`);

      if (!count || count === 0) continue;

      await safeInsertNotification(supabase, {
        user_id: helper.user_id,
        type: "system",
        title: "Sammelabrechnung bereit",
        body: `Sie haben ${count} Einsätze im ${monthYear}. Erstellen Sie jetzt Ihre Sammelabrechnung.`,
      });

      await sendPush(supabase, {
        userId: helper.user_id,
        title: "Sammelabrechnung bereit",
        body: `${count} Einsätze — jetzt Sammelabrechnung erstellen`,
        url: "/hilfe/budget",
      });

      reminded++;
    } catch {
      errors.push(helper.id);
    }
  }

  await writeCronHeartbeat(supabase, "hilfe_reminder" as never, {
    reminded,
    errors: errors.length,
  });

  return NextResponse.json({
    success: true,
    reminded,
    errors: errors.length,
    month: monthYear,
  });
}
