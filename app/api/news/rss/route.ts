import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { aggregateRssFeeds } from "@/lib/services/news-rss.service";
import { handleServiceError } from "@/lib/services/service-error";
import { verifyCronSecret } from "@/lib/security/cron-secret";
import { writeCronHeartbeat } from "@/lib/care/cron-heartbeat";

export async function GET(request: Request) {
  try {
    // Auth-Check: Nur via Cron-Secret oder Admin
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET nicht konfiguriert — RSS-Endpunkt blockiert");
      return NextResponse.json(
        { error: "Server nicht konfiguriert" },
        { status: 500 },
      );
    }

    if (!verifyCronSecret(authHeader, cronSecret)) {
      // Fallback: Admin-Check via Supabase
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: "Nicht autorisiert" },
          { status: 401 },
        );
      }
      const { data: profile } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.is_admin) {
        return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
      }
    }

    const supabase = await createClient();
    const result = await aggregateRssFeeds(supabase);
    // Heartbeat schreiben (FMEA Monitoring-Vollabdeckung) — egal ob Cron oder Admin
    await writeCronHeartbeat(getAdminSupabase(), "news_rss", {
      result: typeof result === "object" ? result : { value: result },
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
