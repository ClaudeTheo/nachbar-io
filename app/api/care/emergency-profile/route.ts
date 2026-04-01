// API: GET/PUT /api/care/emergency-profile
// Notfallmappe laden und speichern — verschluesselt mit AES-256-GCM
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/modules/care/services/crypto";

// GET: Profil laden (eigenes oder via Caregiver-Link)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const userId = req.nextUrl.searchParams.get("userId") || user.id;

  // Zugriffspruefung: eigenes Profil oder Caregiver-Link
  if (userId !== user.id) {
    const { data: link } = await supabase
      .from("caregiver_links")
      .select("id")
      .eq("resident_id", userId)
      .eq("caregiver_id", user.id)
      .is("revoked_at", null)
      .maybeSingle();

    if (!link) {
      return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
    }
  }

  const { data: profile } = await supabase
    .from("emergency_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ level1: null, level2: null, level3: null });
  }

  // Entschluesseln
  const level1 = profile.level1_encrypted
    ? JSON.parse(decrypt(profile.level1_encrypted))
    : null;
  const level2 = profile.level2_encrypted
    ? JSON.parse(decrypt(profile.level2_encrypted))
    : null;
  const level3 = profile.level3_encrypted
    ? JSON.parse(decrypt(profile.level3_encrypted))
    : null;

  return NextResponse.json({
    id: profile.id,
    level1,
    level2,
    level3,
    pdfToken: profile.pdf_token,
    updatedAt: profile.updated_at,
  });
}

// PUT: Profil speichern (verschluesselt)
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json();
  const { userId, level1, level2, level3 } = body;
  const targetUserId = userId || user.id;

  // Zugriffspruefung
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

  // Validierung: Level 1 ist Pflicht
  if (!level1 || !level1.fullName || !level1.dateOfBirth) {
    return NextResponse.json(
      { error: "Name und Geburtsdatum sind Pflichtfelder" },
      { status: 400 },
    );
  }

  // Verschluesseln
  const level1Encrypted = encrypt(JSON.stringify(level1));
  const level2Encrypted = level2 ? encrypt(JSON.stringify(level2)) : null;
  const level3Encrypted = level3 ? encrypt(JSON.stringify(level3)) : null;

  // Upsert
  const { data: existing } = await supabase
    .from("emergency_profiles")
    .select("id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("emergency_profiles")
      .update({
        level1_encrypted: level1Encrypted,
        level2_encrypted: level2Encrypted,
        level3_encrypted: level3Encrypted,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", targetUserId);

    if (error) {
      console.error("Notfallmappe Update fehlgeschlagen:", error);
      return NextResponse.json(
        { error: "Speichern fehlgeschlagen" },
        { status: 500 },
      );
    }
  } else {
    const { error } = await supabase.from("emergency_profiles").insert({
      user_id: targetUserId,
      level1_encrypted: level1Encrypted,
      level2_encrypted: level2Encrypted,
      level3_encrypted: level3Encrypted,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Notfallmappe Insert fehlgeschlagen:", error);
      return NextResponse.json(
        { error: "Erstellen fehlgeschlagen" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ success: true });
}
