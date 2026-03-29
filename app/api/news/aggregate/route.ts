import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runNewsAggregation } from "@/lib/services/news-aggregate.service";
import { handleServiceError } from "@/lib/services/service-error";

/**
 * POST /api/news/aggregate
 *
 * KI-Newsaggregation via Claude API.
 * Wird als Cron-Job aufgerufen — geschützt per CRON_SECRET.
 *
 * DSGVO-Regel: NUR öffentliche Nachrichtentexte werden an die API gesendet.
 * KEINE personenbezogenen Daten, KEINE Adressdaten, KEINE Nutzerdaten.
 */
export async function POST(request: NextRequest) {
  // Auth: Per CRON_SECRET oder Admin-Session
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  const supabase = await createClient();

  if (!isCron) {
    // Fallback: Admin-Check via Session
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
      .single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
    }
  }

  try {
    const result = await runNewsAggregation(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
