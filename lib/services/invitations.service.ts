// Nachbar.io — Einladungs-Service
// Zentralisiert Nachbar-Einladungs-Logik (E-Mail, WhatsApp, SMS, Code)
// Business-Logik aus: invite/send

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
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

// ============================================================
// Konstanten
// ============================================================

const VALID_METHODS: InviteChannel[] = ["email", "whatsapp", "code", "sms"];

// ============================================================
// Einladung senden
// ============================================================

export interface SendInvitationParams {
  street: string;
  houseNumber: string;
  method: string;
  target?: string;
  recipientName?: string;
  recipientPhone?: string;
}

export interface SendInvitationResult {
  success: true;
  inviteCode: string;
  registerUrl: string;
  whatsappUrl: string;
  method: string;
  emailSent: boolean;
  smsSent: boolean;
  remaining: number;
}

/**
 * Nachbar-Einladung versenden (E-Mail, WhatsApp, SMS oder Code).
 * Erstellt ggf. Haushalt, generiert Invite-Code, versendet via gewaehltem Kanal.
 */
export async function sendInvitation(
  supabase: SupabaseClient,
  userId: string,
  params: SendInvitationParams,
): Promise<SendInvitationResult> {
  const { street, houseNumber, method, target, recipientName, recipientPhone } =
    params;

  // Nutzer-Profil pruefen (muss verifiziert sein)
  const { data: profile } = await supabase
    .from("users")
    .select("trust_level, display_name")
    .eq("id", userId)
    .single();

  if (
    !profile ||
    !["verified", "trusted", "admin"].includes(profile.trust_level)
  ) {
    throw new ServiceError(
      "Nur verifizierte Nutzer können Nachbarn einladen",
      403,
    );
  }

  // Eingabe-Validierung
  if (!street || !houseNumber || !method) {
    throw new ServiceError(
      "Straße, Hausnummer und Methode sind erforderlich",
      400,
    );
  }

  if (!VALID_METHODS.includes(method as InviteChannel)) {
    throw new ServiceError("Ungültige Einladungsmethode", 400);
  }

  // Kanal-spezifische Validierung
  if (method === "email" && !target) {
    throw new ServiceError("E-Mail-Adresse ist erforderlich", 400);
  }
  if (method === "sms" && !recipientPhone) {
    throw new ServiceError(
      "Telefonnummer ist erforderlich für SMS-Einladungen",
      400,
    );
  }
  if (method === "sms") {
    const { valid } = validatePhone(recipientPhone);
    if (!valid) {
      throw new ServiceError(
        "Ungültige Telefonnummer. Bitte im Format +49... oder 0... eingeben.",
        400,
      );
    }
  }

  // Plan-basiertes Rate-Limit pruefen
  const userPlan = await getUserPlan(supabase, userId);
  const { allowed, remaining, limit } = await checkInviteLimit(
    supabase,
    userId,
    userPlan,
  );
  if (!allowed) {
    throw new ServiceError(
      `Sie haben Ihr Einladungslimit erreicht (${limit} Einladungen). ${
        userPlan === "free"
          ? "Mit Nachbar Plus können Sie mehr Nachbarn einladen."
          : "Bitte warten Sie, bis bestehende Einladungen angenommen oder abgelaufen sind."
      }`,
      429,
      undefined,
      { limit, remaining: 0, upgradable: userPlan === "free" },
    );
  }

  // Quartier-ID des Einladenden ermitteln
  const inviterQuarterId = await getUserQuarterId(supabase, userId);

  // Haushalt suchen oder automatisch anlegen
  const householdId = await findOrCreateHousehold(
    supabase,
    street,
    houseNumber,
    inviterQuarterId,
  );

  // Einladungscode generieren
  const inviteCode = generateSecureCode();

  // Registrierungs-URL generieren
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://quartierapp.de";
  const registerUrl = `${baseUrl}/register?invite=${inviteCode}&ref=${userId}`;

  // Einladung speichern
  const { error: insertError } = await supabase
    .from("neighbor_invitations")
    .insert({
      inviter_id: userId,
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
    throw new ServiceError(
      `Einladung konnte nicht erstellt werden: ${insertError.message}`,
      500,
    );
  }

  // Personalisierte WhatsApp-URL (fuer alle Methoden als Fallback)
  const whatsappText = buildWhatsAppMessage(
    profile.display_name,
    recipientName,
    registerUrl,
  );
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
      console.warn(
        "[invite] E-Mail-Versand fehlgeschlagen:",
        emailResult.error,
      );
    }
  }

  if (method === "sms" && recipientPhone) {
    const smsResult = await sendInviteSms(
      recipientPhone,
      profile.display_name,
      recipientName,
      registerUrl,
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

  return {
    success: true,
    inviteCode,
    registerUrl,
    whatsappUrl,
    method,
    emailSent,
    smsSent,
    remaining: remaining - 1,
  };
}

// ============================================================
// Hilfsfunktionen
// ============================================================

/**
 * Haushalt suchen oder automatisch anlegen (mit Admin-Client fuer RLS-Bypass).
 */
async function findOrCreateHousehold(
  supabase: SupabaseClient,
  street: string,
  houseNumber: string,
  inviterQuarterId: string | null,
): Promise<string> {
  const { data: existingHousehold } = await supabase
    .from("households")
    .select("id")
    .eq("street_name", street)
    .eq("house_number", houseNumber)
    .maybeSingle();

  if (existingHousehold) {
    return existingHousehold.id;
  }

  // Admin-Client fuer Haushalt-Erstellung (bypassed RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new ServiceError("Server-Konfigurationsfehler", 500);
  }
  const adminDb = createAdminClient(supabaseUrl, serviceKey);

  // Koordinaten aus dem Quartier des Einladenden ermitteln
  let baseLat = 47.5535;
  let baseLng = 7.964;
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
    throw new ServiceError("Haushalt konnte nicht erstellt werden", 500);
  }

  return newHH.id;
}
