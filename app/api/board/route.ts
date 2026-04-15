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
    console.error("[board] Quartier konnte nicht aufgeloest werden:", error);
    return null;
  }

  return data?.[0]?.id ?? null;
}

export async function GET() {
  try {
    const adminDb = getAdminSupabase();
    const quarterId = await resolvePilotQuarterId(adminDb);

    let query = adminDb
      .from("help_requests")
      .select("id, title, description, created_at, user:users(display_name)")
      .eq("category", "board")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20);

    if (quarterId) {
      query = query.eq("quarter_id", quarterId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[board] Eintraege konnten nicht geladen werden:", error);
      return NextResponse.json(
        { error: "Schwarzes Brett konnte nicht geladen werden" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      (data ?? []).map((post) => ({
        id: post.id,
        title: post.title || "Beitrag",
        content: post.description || post.title || "",
        author:
          (post.user as { display_name?: string } | null)?.display_name ||
          "Nachbar",
        created_at: post.created_at,
      })),
    );
  } catch (error) {
    console.error("[board] Route fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Schwarzes Brett konnte nicht geladen werden" },
      { status: 500 },
    );
  }
}
