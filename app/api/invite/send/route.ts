import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { generateSecureCode } from "@/lib/invite-codes";
import { sendInvitationEmail } from "@/lib/email";
import { getUserQuarterId } from "@/lib/quarters/helpers";
import {
  checkInviteLimit,
  getUserPlan,
  sendInviteSms,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  validatePhone,
  type InviteChannel,
} from "@/lib/invitations";

const VALID_METHODS: InviteChannel[] = ["email", "whatsapp", "code", "sms"];

/**
 * POST /api/invite/send
 *
 * Verifizierter Nutzer laedt einen Nachbarn ein.
 * Body: {
 *   street, houseNumber,
 *   method: 'email' | 'whatsapp' | 'code' | 'sms',
 *   target?: string (E-Mail),
 *   recipientName?: string,
 *   recipientPhone?: string
 * }
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
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges Anfrage-Format" }, { status: 400 });
  }
  const { street, houseNumber, method, target, recipientName, recipientPhone } = body;

  if (!street || !houseNumber || !method) {
    return NextResponse.json(
      { error: "Straße, Hausnummer und Methode sind erforderlich" },
      { status: 400 }
    );
  }

  if (!VALID_METHODS.includes(method)) {
    return NextResponse.json(
      { error: "Ungültige Einladungsmethode" },
      { status: 400 }
    );
  }

  // Kanal-spezifische Validierung
  if (method === "email" && !target) {
    return NextResponse.json(
      { error: "E-Mail-Adresse ist erforderlich" },
      { status: 400 }
    );
  }
  if (method === "sms" && !recipientPhone) {
    return NextResponse.json(
      { error: "Telefonnummer ist erforderlich für SMS-Einladungen" },
      { status: 400 }
    );
  }
  if (method === "sms") {
    const { valid } = validatePhone(recipientPhone);
    if (!valid) {
      return NextResponse.json(
        { error: "Ungültige Telefonnummer. Bitte im Format +49... oder 0... eingeben." },
        { status: 400 }
      );
    }
  }

  // Plan-basiertes Rate-Limit pruefen
  const userPlan = await getUserPlan(supabase, user.id);
  const { allowed, remaining, limit } = await checkInviteLimit(supabase, user.id, userPlan);
  if (!allowed) {
    return NextResponse.json(
      {
        error: `Sie haben Ihr Einladungslimit erreicht (${limit} Einladungen). ${
          userPlan === "free"
            ? "Mit Nachbar Plus können Sie mehr Nachbarn einladen."
            : "Bitte warten Sie, bis bestehende Einladungen angenommen oder abgelaufen sind."
        }`,
        limit,
        remaining: 0,
        upgradable: userPlan === "free",
      },
      { status: 429 }
    );
  }

  // Quartier-ID des Einladenden ermitteln (fuer Haushalt + Einladung)
  const inviterQuarterId = await getUserQuarterId(supabase, user.id);

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server-Konfigurationsfehler" }, { status: 500 });
    }
    const adminDb = createAdminClient(supabaseUrl, serviceKey);

    // Koordinaten aus dem Quartier des Einladenden ermitteln
    let baseLat = 47.5535;
    let baseLng = 7.9640;
    if (inviterQuarterId) {
      const { data: quarter } = await supabase
        .from("quarters")
        .select("center_lat, center_lng")
        .eq("id", inviterQuarterId)
        .single();
      if (quarter) {
        baseLat = quarter.center_lat;
        baseLng = quarter.center_lng;
      }
    }

    const houseNum = parseInt(String(houseNumber), 10) || 0;
    const { data: newHH, error: hhErr } = await adminDb
      .from("households")
      .insert({
        street_name: street,
        house_number: String(houseNumber).trim(),
        lat: baseLat,
        lng: baseLng + houseNum * 0.0005,
        verified: false,
        invite_code: generateSecureCode(),
        quarter_id: inviterQuarterId,
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

  // Registrierungs-URL generieren
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://quartierapp.de";
  const registerUrl = `${baseUrl}/register?invite=${inviteCode}&ref=${user.id}`;

  // Einladung speichern (erweiterte Felder)
  const { error: insertError } = await supabase
    .from("neighbor_invitations")
    .insert({
      inviter_id: user.id,
      household_id: householdId,
      invite_method: method,
      invite_target: target || recipientPhone || null,
      invite_code: inviteCode,
      status: "sent",
      recipient_name: recipientName || null,
      recipient_phone: recipientPhone || null,
      quarter_id: inviterQuarterId,
    });

  if (insertError) {
    return NextResponse.json(
      { error: `Einladung konnte nicht erstellt werden: ${insertError.message}` },
      { status: 500 }
    );
  }

  // Personalisierte WhatsApp-URL (fuer alle Methoden als Fallback)
  const whatsappText = buildWhatsAppMessage(profile.display_name, recipientName, registerUrl);
  const whatsappUrl = buildWhatsAppUrl(whatsappText, recipientPhone);

  // Kanal-spezifischer Versand
  let emailSent = false;
  let smsSent = false;

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
      console.warn("[invite] E-Mail-Versand fehlgeschlagen:", emailResult.error);
    }
  }

  if (method === "sms" && recipientPhone) {
    const smsResult = await sendInviteSms(
      recipientPhone,
      profile.display_name,
      recipientName,
      registerUrl
    );
    smsSent = smsResult.sent;

    // SMS-Status in DB aktualisieren
    if (smsSent) {
      await supabase
        .from("neighbor_invitations")
        .update({ sms_sent: true })
        .eq("invite_code", inviteCode);
    }
    if (!smsResult.sent) {
      console.warn("[invite] SMS-Versand fehlgeschlagen:", smsResult.error);
    }
  }

  return NextResponse.json({
    success: true,
    inviteCode,
    registerUrl,
    whatsappUrl,
    method,
    emailSent,
    smsSent,
    remaining: remaining - 1,
  });
}
