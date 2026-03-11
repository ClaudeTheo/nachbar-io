import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSecureCode } from "@/lib/invite-codes";

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

  // Haushalt pruefen
  const { data: household } = await supabase
    .from("households")
    .select("id")
    .eq("street_name", street)
    .eq("house_number", houseNumber)
    .maybeSingle();

  if (!household) {
    return NextResponse.json(
      { error: `Haushalt ${street} ${houseNumber} nicht gefunden` },
      { status: 404 }
    );
  }

  // Einladungscode generieren
  const inviteCode = generateSecureCode();

  // Einladung speichern
  const { error: insertError } = await supabase
    .from("neighbor_invitations")
    .insert({
      inviter_id: user.id,
      household_id: household.id,
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

  return NextResponse.json({
    success: true,
    inviteCode,
    registerUrl,
    whatsappUrl,
    method,
  });
}
