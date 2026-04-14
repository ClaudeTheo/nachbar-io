import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function resolvePilotQuarterId(adminDb: ReturnType<typeof getAdminSupabase>) {
  const { data, error } = await adminDb
    .from("quarters")
    .select("id")
    .in("slug", ["bad-saeckingen", "pilotquartier"])
    .limit(1);

  if (error) {
    console.error(
      "[quartier-info/news] Quartier konnte nicht aufgeloest werden:",
      error,
    );
    return null;
  }

  return data?.[0]?.id ?? null;
}

function getSourceLabel(sourceUrl: string | null) {
  if (!sourceUrl) return "Quartiersnews";

  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "Quartiersnews";
  }
}

export async function GET() {
  try {
    const adminDb = getAdminSupabase();
    const quarterId = await resolvePilotQuarterId(adminDb);

    let query = adminDb
      .from("news_items")
      .select(
        "source_url, original_title, ai_summary, published_at, created_at, quarter_id",
      )
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(20);

    if (quarterId) {
      query = query.or(`quarter_id.eq.${quarterId},quarter_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "[quartier-info/news] Nachrichten konnten nicht geladen werden:",
        error,
      );
      return NextResponse.json(
        { error: "Nachrichten konnten nicht geladen werden" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      (data ?? []).map((item) => ({
        title: item.original_title,
        description: item.ai_summary,
        pubDate: item.published_at ?? item.created_at,
        link: item.source_url ?? "#",
        source: getSourceLabel(item.source_url),
      })),
    );
  } catch (error) {
    console.error("[quartier-info/news] Route fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Nachrichten konnten nicht geladen werden" },
      { status: 500 },
    );
  }
}
