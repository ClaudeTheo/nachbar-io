import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeReputationStats } from "@/lib/reputation";

/**
 * POST /api/reputation/recompute
 *
 * Berechnet die Reputation-Stats eines Nutzers neu und speichert sie im Cache.
 * Kann nach wichtigen Aktionen aufgerufen werden (Einladung angenommen, Hilfe geleistet, etc.)
 *
 * Body: { userId?: string }
 * - userId: Optional. Wenn nicht angegeben, wird der aktuelle Nutzer verwendet.
 * - Nur Admins duerfen fremde User-IDs angeben.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  let targetUserId = user.id;

  // Optionaler userId-Parameter (nur fuer Admins)
  try {
    const body = await request.json();
    if (body.userId && body.userId !== user.id) {
      // Pruefen ob Admin
      const { data: adminCheck } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!adminCheck?.is_admin) {
        return NextResponse.json(
          { error: "Nur Admins duerfen fremde Nutzer neu berechnen" },
          { status: 403 }
        );
      }
      targetUserId = body.userId;
    }
  } catch {
    // Leerer Body ist ok — eigener Nutzer wird verwendet
  }

  try {
    const stats = await computeReputationStats(supabase, targetUserId);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (err) {
    console.error("Reputation-Neuberechnung fehlgeschlagen:", err);
    return NextResponse.json(
      { error: "Neuberechnung fehlgeschlagen" },
      { status: 500 }
    );
  }
}
