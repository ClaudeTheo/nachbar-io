import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aggregateRssFeeds } from "@/lib/services/news-rss.service";
import { handleServiceError } from "@/lib/services/service-error";

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

    if (authHeader !== `Bearer ${cronSecret}`) {
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
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
