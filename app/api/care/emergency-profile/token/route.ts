// API: POST /api/care/emergency-profile/token
// Generiert einen temporaeren PDF-Token (72h Gueltigkeit) fuer QR-Code-Zugriff
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { userId } = await req.json();
  const targetUserId = userId || user.id;

  // Zugriffspruefung: eigenes Profil oder Caregiver
  if (targetUserId !== user.id) {
    const { data: link } = await supabase
      .from("caregiver_links")
      .select("id")
      .eq("resident_id", targetUserId)
      .eq("caregiver_id", user.id)
      .is("revoked_at", null)
      .maybeSingle();

    if (!link) {
      return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
    }
  }

  // Profil muss existieren
  const { data: profile } = await supabase
    .from("emergency_profiles")
    .select("id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { error: "Keine Notfallmappe vorhanden" },
      { status: 404 },
    );
  }

  // Token generieren (72h Gueltigkeit)
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("emergency_profiles")
    .update({
      pdf_token: token,
      pdf_token_expires_at: expiresAt,
    })
    .eq("user_id", targetUserId);

  if (error) {
    console.error("Token-Generierung fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Token konnte nicht generiert werden" },
      { status: 500 },
    );
  }

  return NextResponse.json({ token, expiresAt });
}
