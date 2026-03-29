import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapeNews } from "@/lib/services/news-scraper.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function GET(request: Request) {
  // Auth-Check: Nur via Cron-Secret oder Admin
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET nicht konfiguriert — Scrape-Endpunkt blockiert");
    return NextResponse.json(
      { error: "Server nicht konfiguriert" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
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

  try {
    const result = await scrapeNews();
    return NextResponse.json(result);
  } catch (err) {
    console.error("News-Scraper Fehler:", err);
    return handleServiceError(err);
  }
}
