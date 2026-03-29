// Nachbar.io — Service-Layer fuer Consent-Routen (Art. 9 DSGVO)
// Extrahierte Business-Logik aus consent/route.ts und consent/revoke/route.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { writeAuditLog } from "@/lib/care/audit";
import { getConsentsForUser } from "@/lib/care/consent";
import { CURRENT_CONSENT_VERSION } from "@/lib/care/constants";
import { CONSENT_FEATURES } from "@/lib/care/types";
import type { CareConsentFeature } from "@/lib/care/types";

// Mapping: Welche Tabellen werden bei Datenloeschung betroffen?
const FEATURE_DATA_TABLES: Record<
  CareConsentFeature,
  { table: string; column: string }[]
> = {
  sos: [{ table: "care_sos_alerts", column: "reporter_id" }],
  checkin: [{ table: "care_checkins", column: "senior_id" }],
  medications: [
    { table: "care_medication_logs", column: "senior_id" },
    { table: "care_medications", column: "senior_id" },
  ],
  care_profile: [{ table: "care_profiles", column: "user_id" }],
  emergency_contacts: [],
};

/**
 * Alle Consents eines Nutzers laden
 */
export async function getConsents(supabase: SupabaseClient, userId: string) {
  const consents = await getConsentsForUser(supabase, userId);
  const hasAny = Object.values(consents).some((c) => c.granted);
  return { consents, has_any_consent: hasAny };
}

/**
 * Consents erteilen/aktualisieren — validiert Features, Abhaengigkeiten, Upsert + History + Audit
 */
export async function updateConsents(
  supabase: SupabaseClient,
  userId: string,
  features: Record<string, boolean>,
) {
  if (!features || typeof features !== "object") {
    throw new ServiceError("features-Objekt erforderlich", 400);
  }

  // Validierung: Nur gueltige Feature-Keys
  const validFeatures = new Set<string>(CONSENT_FEATURES);
  for (const key of Object.keys(features)) {
    if (!validFeatures.has(key)) {
      throw new ServiceError(
        `Ungültiges Feature: "${key}". Erlaubt: ${CONSENT_FEATURES.join(", ")}`,
        400,
      );
    }
  }

  // Abhaengigkeitsregel: emergency_contacts erfordert sos
  if (features.emergency_contacts && !features.sos) {
    throw new ServiceError(
      "Notfallkontakte erfordern die SOS-Einwilligung",
      400,
    );
  }

  const now = new Date().toISOString();
  const changedFeatures: string[] = [];

  // Aktuelle Consents laden (fuer History-Vergleich)
  const currentConsents = await getConsentsForUser(supabase, userId);

  // Upsert fuer jedes Feature
  for (const feature of CONSENT_FEATURES) {
    if (!(feature in features)) continue;

    const newGranted = features[feature] === true;
    const currentGranted = currentConsents[feature]?.granted ?? false;

    // Nur aendern wenn sich der Status geaendert hat
    if (newGranted === currentGranted) continue;

    const consentData: Record<string, unknown> = {
      user_id: userId,
      feature,
      granted: newGranted,
      consent_version: CURRENT_CONSENT_VERSION,
      updated_at: now,
    };

    if (newGranted) {
      consentData.granted_at = now;
      consentData.revoked_at = null;
    } else {
      consentData.revoked_at = now;
    }

    const { data: upserted, error } = await supabase
      .from("care_consents")
      .upsert(consentData, { onConflict: "user_id,feature" })
      .select()
      .single();

    if (error) {
      console.error(
        `[care/consent] Upsert fehlgeschlagen für ${feature}:`,
        error,
      );
      continue;
    }

    // History-Eintrag
    await supabase.from("care_consent_history").insert({
      consent_id: upserted.id,
      user_id: userId,
      feature,
      action: newGranted ? "granted" : "revoked",
      consent_version: CURRENT_CONSENT_VERSION,
    });

    changedFeatures.push(`${feature}:${newGranted ? "granted" : "revoked"}`);
  }

  // Audit-Log
  if (changedFeatures.length > 0) {
    try {
      await writeAuditLog(supabase, {
        seniorId: userId,
        actorId: userId,
        eventType: "consent_updated",
        metadata: { changes: changedFeatures },
      });
    } catch (err) {
      console.error("[care/consent] Audit-Log fehlgeschlagen:", err);
    }
  }

  // Aktualisierte Consents zurueckgeben
  const updatedConsents = await getConsentsForUser(supabase, userId);
  const hasAny = Object.values(updatedConsents).some((c) => c.granted);

  return { consents: updatedConsents, has_any_consent: hasAny };
}

/**
 * Consent widerrufen mit optionaler Datenloeschung (Art. 17 DSGVO)
 */
export async function revokeConsent(
  supabase: SupabaseClient,
  userId: string,
  feature: string,
  deleteData: boolean,
) {
  // Validierung
  if (!feature || !(CONSENT_FEATURES as readonly string[]).includes(feature)) {
    throw new ServiceError(
      `Ungültiges Feature: "${feature}". Erlaubt: ${CONSENT_FEATURES.join(", ")}`,
      400,
    );
  }

  const now = new Date().toISOString();
  const revokedFeatures: string[] = [feature];

  // Consent widerrufen
  const { data: consent, error } = await supabase
    .from("care_consents")
    .update({ granted: false, revoked_at: now, updated_at: now })
    .eq("user_id", userId)
    .eq("feature", feature)
    .select()
    .single();

  if (error) {
    console.error(
      `[care/consent/revoke] Widerruf fehlgeschlagen für ${feature}:`,
      error,
    );
    throw new ServiceError("Widerruf fehlgeschlagen", 500);
  }

  // History-Eintrag
  await supabase.from("care_consent_history").insert({
    consent_id: consent.id,
    user_id: userId,
    feature,
    action: "revoked",
    consent_version: CURRENT_CONSENT_VERSION,
  });

  // Abhaengigkeit: sos-Widerruf → emergency_contacts auch widerrufen
  if (feature === "sos") {
    const { data: ecConsent } = await supabase
      .from("care_consents")
      .select("id, granted")
      .eq("user_id", userId)
      .eq("feature", "emergency_contacts")
      .maybeSingle();

    if (ecConsent?.granted) {
      await supabase
        .from("care_consents")
        .update({ granted: false, revoked_at: now, updated_at: now })
        .eq("id", ecConsent.id);

      await supabase.from("care_consent_history").insert({
        consent_id: ecConsent.id,
        user_id: userId,
        feature: "emergency_contacts",
        action: "revoked",
        consent_version: CURRENT_CONSENT_VERSION,
      });

      revokedFeatures.push("emergency_contacts");
    }
  }

  // Optionale Datenloeschung
  if (deleteData) {
    const tables = FEATURE_DATA_TABLES[feature as CareConsentFeature] ?? [];
    for (const { table, column } of tables) {
      await supabase.from(table).delete().eq(column, userId);
    }

    if (feature === "emergency_contacts") {
      await supabase
        .from("care_profiles")
        .update({ emergency_contacts: null })
        .eq("user_id", userId);
    }
  }

  // Audit-Log
  try {
    await writeAuditLog(supabase, {
      seniorId: userId,
      actorId: userId,
      eventType: "consent_revoked",
      metadata: { features: revokedFeatures, delete_data: deleteData },
    });
  } catch (err) {
    console.error("[care/consent/revoke] Audit-Log fehlgeschlagen:", err);
  }

  return { revoked: revokedFeatures, data_deleted: deleteData };
}
