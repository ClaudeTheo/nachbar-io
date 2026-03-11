import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { generateSecureCode } from "@/lib/invite-codes";
import { sendInvitationEmail } from "@/lib/email";

// Ungefaehre Koordinaten pro Strasse
const STREET_COORDS: Record<string, { lat: number; lng: number }> = {
  "Purkersdorfer Straße": { lat: 47.5631, lng: 7.9480 },
  "Sanarystraße": { lat: 47.5619, lng: 7.9480 },
  "Oberer Rebberg": { lat: 47.5604, lng: 7.9480 },
};

/**
 * POST /api/invite/send
 *
 * Verifizierter Nutzer laedt einen Nachbarn ein.
 * Body: { street, houseNumber, method: 'email' | 'whatsapp' | 'code', target?: string }
 * Gibt den generierten Einladungscode zurueck.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Nutzer-Profil pruefen (muss verifiziert sein)
  const { data: profile } = await supabase
    .from("users")
    .select("trust_level, display_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["verified", "trusted", "admin"].includes(profile.trust_level)) {
    return NextResponse.json(
      { error: "Nur verifizierte Nutzer können Nachbarn einladen" },
      { status: 403 }
    );
  }

  // Body parsen
  const body = await request.json();
  const { street, houseNumber, method, target } = body;

  if (!street || !houseNumber || !method) {
    return NextResponse.json(
      { error: "Strasse, Hausnummer und Methode sind erforderlich" },
      { status: 400 }
    );
  }

  // E-Mail-Adresse validieren bei E-Mail-Methode
  if (method === "email" && !target) {
    return NextResponse.json(
      { error: "E-Mail-Adresse ist erforderlich" },
      { status: 400 }
    );
  }

  // Offene Einladungen pruefen (Spam-Schutz: max 5)
  const { count: openCount } = await supabase
    .from("neighbor_invitations")
    .select("id", { count: "exact", head: true })
    .eq("inviter_id", user.id)
    .eq("status", "sent");

  if ((openCount ?? 0) >= 5) {
    return NextResponse.json(
      { error: "Sie haben bereits 5 offene Einladungen. Bitte warten Sie, bis diese angenommen oder abgelaufen sind." },
      { status: 429 }
    );
  }

  // Haushalt suchen oder automatisch anlegen
  let householdId: string;

  const { data: existingHousehold } = await supabase
    .from("households")
    .select("id")
    .eq("street_name", street)
    .eq("house_number", houseNumber)
    .maybeSingle();

  if (existingHousehold) {
    householdId = existingHousehold.id;
  } else {
    // Haushalt direkt per Service-Role anlegen (kein interner fetch noetig)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server-Konfigurationsfehler" }, { status: 500 });
    }
    const adminDb = createAdminClient(supabaseUrl, serviceKey);
    const coords = STREET_COORDS[street];
    if (!coords) {
      return NextResponse.json({ error: "Unbekannte Straße" }, { status: 400 });
    }
    const houseNum = parseInt(String(houseNumber), 10) || 0;
    const { data: newHH, error: hhErr } = await adminDb
      .from("households")
      .insert({
        street_name: street,
        house_number: String(houseNumber).trim(),
        lat: coords.lat,
        lng: coords.lng + houseNum * 0.0005,
        verified: false,
        invite_code: generateSecureCode(),
      })
      .select("id")
      .single();

    if (hhErr || !newHH) {
      console.error("Haushalt-Erstellung fehlgeschlagen:", hhErr);
      return NextResponse.json({ error: "Haushalt konnte nicht erstellt werden" }, { status: 500 });
    }
    householdId = newHH.id;
  }

  // Einladungscode generieren
  const inviteCode = generateSecureCode();

  // Einladung speichern
  const { error: insertError } = await supabase
    .from("neighbor_invitations")
    .insert({
      inviter_id: user.id,
      household_id: householdId,
      invite_method: method,
      invite_target: target || null,
      invite_code: inviteCode,
      status: "sent",
    });

  if (insertError) {
    return NextResponse.json(
      { error: `Einladung konnte nicht erstellt werden: ${insertError.message}` },
      { status: 500 }
    );
  }

  // Registrierungs-URL generieren
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nachbar.io";
  const registerUrl = `${baseUrl}/register?invite=${inviteCode}&ref=${user.id}`;

  // WhatsApp-Text vorbereiten
  const whatsappText = `Hallo! Ich bin ${profile.display_name} und nutze Nachbar.io – unsere Quartiers-App. Möchten Sie auch dabei sein? Registrieren Sie sich hier: ${registerUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  // E-Mail versenden (asynchron, Fehler nicht blockierend)
  let emailSent = false;
  if (method === "email" && target) {
    const emailResult = await sendInvitationEmail({
      to: target,
      inviterName: profile.display_name,
      inviteCode,
      registerUrl,
      streetName: street,
      houseNumber,
    });
    emailSent = emailResult.success;
    if (!emailResult.success) {
      console.warn("E-Mail-Versand fehlgeschlagen:", emailResult.error);
    }
  }

  return NextResponse.json({
    success: true,
    inviteCode,
    registerUrl,
    whatsappUrl,
    method,
    emailSent,
  });
}
