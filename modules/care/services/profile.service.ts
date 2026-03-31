// modules/care/services/profile.service.ts
// Nachbar.io — Pflege-Profil lesen und aktualisieren (Business Logic)

import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
import { requireCareAccess } from "@/lib/care/api-helpers";
import {
  encryptFields,
  decryptFields,
  encryptEmergencyContacts,
  decryptEmergencyContacts,
  CARE_PROFILES_ENCRYPTED_FIELDS,
} from "@/lib/care/field-encryption";
import { checkCareConsent } from "@/lib/care/consent";
import { ServiceError } from "@/lib/services/service-error";
import type {
  CareLevel,
  EscalationConfig,
  EmergencyContact,
} from "@/lib/care/types";

// Gültige Pflegestufen
const VALID_CARE_LEVELS: CareLevel[] = ["none", "1", "2", "3", "4", "5"];

// Gültige Kontakt-Rollen
const VALID_CONTACT_ROLES = [
  "relative",
  "care_service",
  "neighbor",
  "other",
] as const;

// Uhrzeit-Format prüfen (HH:MM)
function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

// Notfallkontakt validieren
function isValidContact(contact: unknown): contact is EmergencyContact {
  if (!contact || typeof contact !== "object") return false;
  const c = contact as Record<string, unknown>;
  return (
    typeof c.name === "string" &&
    c.name.length > 0 &&
    typeof c.phone === "string" &&
    typeof c.role === "string" &&
    VALID_CONTACT_ROLES.includes(
      c.role as (typeof VALID_CONTACT_ROLES)[number],
    ) &&
    typeof c.priority === "number" &&
    typeof c.relationship === "string"
  );
}

// Eskalationskonfiguration validieren
function isValidEscalationConfig(config: unknown): config is EscalationConfig {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.escalate_to_level_2_after_minutes === "number" &&
    c.escalate_to_level_2_after_minutes > 0 &&
    typeof c.escalate_to_level_3_after_minutes === "number" &&
    c.escalate_to_level_3_after_minutes > 0 &&
    typeof c.escalate_to_level_4_after_minutes === "number" &&
    c.escalate_to_level_4_after_minutes > 0
  );
}

// GET — Pflege-Profil lesen (mit Zugriffsprüfung bei Fremd-Zugriff)
export async function getCareProfile(
  supabase: SupabaseClient,
  userId: string,
  seniorId: string,
) {
  // Zugriffsprüfung bei Fremd-Zugriff
  if (seniorId !== userId) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) {
      throw new ServiceError("Kein Zugriff auf dieses Profil", 403);
    }
  }

  const { data, error } = await supabase
    .from("care_profiles")
    .select("*")
    .eq("user_id", seniorId)
    .maybeSingle();

  if (error) {
    console.error("[care/profile] Profil-Abfrage fehlgeschlagen:", error);
    throw new ServiceError("Profil konnte nicht geladen werden", 500);
  }

  if (!data) return data;

  // Gesundheitsfelder entschlüsseln (Art. 9 DSGVO)
  const decrypted = decryptFields(data, CARE_PROFILES_ENCRYPTED_FIELDS);

  // Telefonnummern in Notfallkontakten entschlüsseln
  if (decrypted.emergency_contacts) {
    decrypted.emergency_contacts = decryptEmergencyContacts(
      decrypted.emergency_contacts as Array<Record<string, unknown>>,
    );
  }

  return decrypted;
}

// PUT — Pflege-Profil erstellen oder aktualisieren
export async function updateCareProfile(
  supabase: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
) {
  // Art. 9 DSGVO: Einwilligung prüfen
  const hasConsent = await checkCareConsent(supabase, userId, "care_profile");
  if (!hasConsent) {
    throw new ServiceError(
      "Einwilligung erforderlich",
      403,
      "consent_required",
      { feature: "care_profile" },
    );
  }

  const {
    care_level,
    emergency_contacts,
    medical_notes,
    preferred_hospital,
    insurance_number,
    checkin_times,
    checkin_enabled,
    escalation_config,
  } = body;

  // Validierung: Pflegestufe
  if (care_level !== undefined) {
    if (!VALID_CARE_LEVELS.includes(care_level as CareLevel)) {
      throw new ServiceError(
        `Ungültige Pflegestufe: "${care_level}". Erlaubt: ${VALID_CARE_LEVELS.join(", ")}`,
        400,
      );
    }
  }

  // Validierung: Check-in-Zeiten
  if (checkin_times !== undefined) {
    if (!Array.isArray(checkin_times)) {
      throw new ServiceError("checkin_times muss ein Array sein", 400);
    }
    for (const time of checkin_times) {
      if (typeof time !== "string" || !isValidTime(time)) {
        throw new ServiceError(
          `Ungültige Uhrzeit: "${time}". Format: HH:MM`,
          400,
        );
      }
    }
  }

  // Validierung: Notfallkontakte
  if (emergency_contacts !== undefined) {
    if (!Array.isArray(emergency_contacts)) {
      throw new ServiceError("emergency_contacts muss ein Array sein", 400);
    }
    for (let i = 0; i < emergency_contacts.length; i++) {
      if (!isValidContact(emergency_contacts[i])) {
        throw new ServiceError(
          `Ungültiger Notfallkontakt an Position ${i + 1}. Erforderlich: name, phone, role, priority, relationship`,
          400,
        );
      }
    }
  }

  // Validierung: Eskalationskonfiguration
  if (escalation_config !== undefined) {
    if (!isValidEscalationConfig(escalation_config)) {
      throw new ServiceError(
        "Ungültige Eskalationskonfiguration. Erforderlich: escalate_to_level_2/3/4_after_minutes (positive Zahlen)",
        400,
      );
    }
  }

  // Update-Objekt aufbauen (nur gesetzte Felder)
  const updateData: Record<string, unknown> = { user_id: userId };

  if (care_level !== undefined) updateData.care_level = care_level;
  if (emergency_contacts !== undefined)
    updateData.emergency_contacts = emergency_contacts;
  if (medical_notes !== undefined)
    updateData.medical_notes = medical_notes || null;
  if (preferred_hospital !== undefined)
    updateData.preferred_hospital = preferred_hospital || null;
  if (insurance_number !== undefined)
    updateData.insurance_number = insurance_number || null;
  if (checkin_times !== undefined) updateData.checkin_times = checkin_times;
  if (checkin_enabled !== undefined)
    updateData.checkin_enabled = !!checkin_enabled;
  if (escalation_config !== undefined)
    updateData.escalation_config = escalation_config;

  // Telefonnummern in Notfallkontakten verschlüsseln (DSGVO Art. 9)
  if (updateData.emergency_contacts) {
    updateData.emergency_contacts = encryptEmergencyContacts(
      updateData.emergency_contacts as Array<Record<string, unknown>>,
    );
  }

  // Gesundheitsfelder verschlüsseln (Art. 9 DSGVO)
  const encryptedData = encryptFields(
    updateData,
    CARE_PROFILES_ENCRYPTED_FIELDS,
  );

  // Upsert: Erstellen falls nicht vorhanden, sonst aktualisieren
  const { data: profile, error } = await supabase
    .from("care_profiles")
    .upsert(encryptedData, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("[care/profile] Profil-Upsert fehlgeschlagen:", error);
    throw new ServiceError("Profil konnte nicht gespeichert werden", 500);
  }

  // Audit-Log: Profil-Änderung protokollieren
  try {
    await writeAuditLog(supabase, {
      seniorId: userId,
      actorId: userId,
      eventType: "profile_updated",
      referenceType: "care_profiles",
      referenceId: profile.id,
      metadata: {
        updatedFields: Object.keys(updateData).filter((k) => k !== "user_id"),
      },
    });
  } catch (auditError) {
    console.error("[care/profile] Audit-Log fehlgeschlagen:", auditError);
  }

  // Entschlüsselt zurückgeben
  const decryptedProfile = decryptFields(profile, CARE_PROFILES_ENCRYPTED_FIELDS);

  // Telefonnummern in Notfallkontakten entschlüsseln
  if (decryptedProfile.emergency_contacts) {
    decryptedProfile.emergency_contacts = decryptEmergencyContacts(
      decryptedProfile.emergency_contacts as Array<Record<string, unknown>>,
    );
  }

  return decryptedProfile;
}
