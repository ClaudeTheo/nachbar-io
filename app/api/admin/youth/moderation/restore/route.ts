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

    // --- Admin-DB: action auf 'restored' setzen ---
    const adminDb = getAdminSupabase();
    const { error } = await adminDb
      .from("youth_moderation_log")
      .update({ action: "restored" })
      .eq("id", itemId);

    if (error) {
      console.error("[admin/youth/moderation/restore] DB-Fehler:", error);
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/youth/moderation/restore] Unerwarteter Fehler:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
