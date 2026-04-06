// app/api/admin/youth/moderation/restore/route.ts
// Admin-Endpunkt: Jugendschutz-Moderation — gesperrten Inhalt wiederherstellen

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // --- Auth: nur Admins ---
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
      .single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
    }

    // --- Body validieren ---
    const body = await req.json();
    const { itemId } = body;
    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json(
        { error: "itemId ist erforderlich (string)" },
        { status: 400 }
      );
    }

    // --- Admin-DB: Append-Only — bestehenden Eintrag laden, neuen restored-Eintrag anlegen ---
    const adminDb = getAdminSupabase();

    // 1. Bestehenden suspended-Eintrag laden und validieren
    const { data: existing, error: lookupError } = await adminDb
      .from("youth_moderation_log")
      .select("id, action, target_type, target_id")
      .eq("id", itemId)
      .single();

    if (lookupError || !existing) {
      return NextResponse.json(
        { error: "Moderation-Eintrag nicht gefunden" },
        { status: 404 },
      );
    }

    if (existing.action !== "suspended") {
      return NextResponse.json(
        { error: "Nur gesperrte Inhalte können wiederhergestellt werden" },
        { status: 400 },
      );
    }

    // 2. Neuen restored-Eintrag INSERT (Audit-Historie bleibt erhalten)
    const { error: insertError } = await adminDb
      .from("youth_moderation_log")
      .insert({
        target_type: existing.target_type,
        target_id: existing.target_id,
        action: "restored",
        reason: `Wiederhergestellt durch Admin (Ref: ${itemId})`,
        moderator_id: user.id,
      });

    if (insertError) {
      console.error("[admin/youth/moderation/restore] DB-Fehler:", insertError);
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/youth/moderation/restore] Unerwarteter Fehler:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
