// Nachbar.io — Registration-Service
// Komplette Registrierung serverseitig: User erstellen, Profil, Haushalt, Verifizierung.
// Extrahiert aus app/api/register/complete/route.ts (461 LOC → Service).

import type { SupabaseClient } from "@supabase/supabase-js";
import { safeInsertNotification } from "@/lib/notifications-server";
import { generateSecureCode, generateTempPassword } from "@/lib/invite-codes";
import { ServiceError } from "@/lib/services/service-error";

// ============================================================
// Typen
// ============================================================

export interface RegistrationInput {
  email: string;
  password?: string;
  displayName: string;
  uiMode?: "active" | "senior";
  householdId?: string;
  streetName?: string;
  houseNumber?: string;
  lat?: number;
  lng?: number;
  postalCode?: string;
  city?: string;
  verificationMethod?: string;
  inviteCode?: string;
  referrerId?: string;
  quarterId?: string;
}

export interface RegistrationResult {
  success: true;
  userId: string;
  verificationMethod?: string;
}

// ============================================================
// Hauptfunktion
// ============================================================

/**
 * Komplette Registrierung serverseitig:
 * 1. User per Admin-API erstellen (kein Rate Limit, keine E-Mail-Bestätigung)
 * 2. Profil erstellen
 * 3. Haushalt suchen/erstellen + Zuordnung
 * 4. Verifizierungsanfrage erstellen
 *
 * Verwendet Service-Role um RLS-Probleme und Rate Limits zu umgehen.
 */
export async function completeRegistration(
  adminDb: SupabaseClient,
  input: RegistrationInput,
): Promise<RegistrationResult> {
  const {
    email,
    password,
    displayName,
    uiMode,
    streetName,
    houseNumber,
    lat,
    lng,
    verificationMethod,
    inviteCode,
    referrerId,
    quarterId: bodyQuarterId,
  } = input;
  let householdId = input.householdId;

  if (!displayName?.trim()) {
    throw new ServiceError("Anzeigename ist erforderlich", 400);
  }

  if (!email) {
    throw new ServiceError("E-Mail-Adresse ist erforderlich.", 400);
  }

  // User serverseitig per Admin-API erstellen
  const userId = await createOrReuseAuthUser(adminDb, email, password);

  // 0. Haushalt suchen oder erstellen (bei Adress-Registrierung ohne Invite-Code)
  if (!householdId && streetName && houseNumber) {
    householdId = await findOrCreateHousehold(adminDb, {
      streetName,
      houseNumber,
      lat,
      lng,
      bodyQuarterId,
    });
  }

  // 1. User-Profil erstellen
  await createUserProfile(
    adminDb,
    userId,
    displayName,
    uiMode,
    verificationMethod,
  );

  // 2. Haushalt-Zuordnung + Verifizierung + Einladung
  if (householdId) {
    await assignHouseholdAndVerify(adminDb, {
      householdId,
      userId,
      verificationMethod,
      inviteCode,
      referrerId,
      displayName,
    });
  }

  return {
    success: true,
    userId,
    verificationMethod,
  };
}

// ============================================================
// Hilfsfunktionen
// ============================================================

/** Auth-User erstellen oder verwaisten Auth-User wiederverwenden */
async function createOrReuseAuthUser(
  adminDb: SupabaseClient,
  email: string,
  password?: string,
): Promise<string> {
  // Temporäres Passwort generieren wenn keins mitgesendet wird
  // (Supabase erfordert ein Passwort bei admin.createUser)
  const userPassword = password || generateTempPassword();

  // B-1 Pilot-Entscheidung (2026-03-18):
  // email_confirm: true = Account wird sofort als bestätigt markiert.
  // Im Pilot mit Invite-Code-Pflicht akzeptabel: Code-Besitz dient als
  // Verifikation (nur Personen mit gültigem Invite-Code können sich registrieren).
  //
  // WICHTIG — NICHT für öffentlichen Rollout ohne Invite-Gate geeignet:
  // Ohne Invite-Code-Pflicht könnte ein Angreifer beliebige E-Mail-Adressen
  // registrieren, ohne den Besitz nachzuweisen.
  // Vor öffentlichem Rollout: email_confirm auf false setzen und
  // Supabase E-Mail-Bestätigung erzwingen (Confirm Signup Template).
  const { data: newUser, error: createError } =
    await adminDb.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
    });

  if (createError) {
    console.error("User-Erstellung fehlgeschlagen:", createError);

    // Spezialfall: E-Mail bereits in auth.users aber KEIN Profil (orphaned)
    // → Auth-User wiederverwenden statt Fehler
    if (createError.message?.includes("already been registered")) {
      const { data: existingUsers } = await adminDb.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u: { email?: string }) =>
          u.email?.toLowerCase() === email.toLowerCase(),
      );

      if (existingUser) {
        // Prüfen ob ein Profil existiert
        const { data: existingProfile } = await adminDb
          .from("users")
          .select("id")
          .eq("id", existingUser.id)
          .maybeSingle();

        if (!existingProfile) {
          // Orphaned Auth-User: Profil fehlt → wiederverwenden
          console.warn(
            `[Register] Orphaned Auth-User ${existingUser.id} wird repariert`,
          );
          return existingUser.id;
        } else {
          // Vollständig registrierter User → Login empfehlen
          throw new ServiceError(
            "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.",
            409,
          );
        }
      } else {
        throw new ServiceError(
          "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.",
          409,
        );
      }
    } else {
      throw new ServiceError(
        `Registrierung fehlgeschlagen: ${createError.message}`,
        500,
      );
    }
  }

  if (!newUser?.user) {
    throw new ServiceError("User konnte nicht erstellt werden.", 500);
  }
  return newUser.user.id;
}

/** Haushalt suchen oder erstellen (bei Adress-Registrierung ohne Invite-Code) */
async function findOrCreateHousehold(
  adminDb: SupabaseClient,
  opts: {
    streetName: string;
    houseNumber: string;
    lat?: number;
    lng?: number;
    bodyQuarterId?: string;
  },
): Promise<string | undefined> {
  const { streetName, houseNumber, lat, lng, bodyQuarterId } = opts;
  const trimmedHouseNumber = String(houseNumber).trim();
  const hasCoords = typeof lat === "number" && typeof lng === "number";

  if (!trimmedHouseNumber) return undefined;

  // Quartier-ID ermitteln: aus Body, via PostGIS Clustering, oder Fallback
  let quarterId: string | null = bodyQuarterId || null;

  if (hasCoords) {
    if (!quarterId) {
      // Automatische Quartier-Zuweisung via PostGIS Clustering
      const { assignUserToQuarter } =
        await import("@/lib/geo/quarter-clustering");
      try {
        quarterId = await assignUserToQuarter(lat!, lng!);
      } catch (err) {
        console.error("Quartier-Clustering fehlgeschlagen:", err);
      }
    }
  } else {
    // Straßenname nicht in STREET_COORDS (andere Straße in Bad Säckingen)
    // Trotzdem Haushalt erstellen mit Quartier-Fallback-Koordinaten
    console.warn(
      `Straße nicht in Pilotgebiet: "${streetName}" — erstelle Haushalt mit Fallback-Koordinaten`,
    );
  }

  if (!quarterId) {
    const { data: quarter } = await adminDb
      .from("quarters")
      .select("id")
      .limit(1)
      .single();
    if (quarter) quarterId = quarter.id;
  }

  // Bestehenden Haushalt suchen
  const { data: existing } = await adminDb
    .from("households")
    .select("id")
    .eq("street_name", streetName)
    .eq("house_number", trimmedHouseNumber)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Neuen Haushalt anlegen
  const defaultLat = 47.5535; // Bad Säckingen Zentrum
  const defaultLng = 7.964;
  const newInviteCode = generateSecureCode();

  const insertData: Record<string, unknown> = {
    street_name: streetName,
    house_number: trimmedHouseNumber,
    lat: hasCoords ? lat : defaultLat,
    lng: hasCoords ? lng : defaultLng,
    verified: false,
    invite_code: newInviteCode,
  };
  // quarter_id setzen damit QuarterProvider den Haushalt findet
  if (quarterId) insertData.quarter_id = quarterId;

  const { data: newHousehold, error: insertError } = await adminDb
    .from("households")
    .insert(insertData)
    .select("id")
    .single();

  if (insertError) {
    // Race-Condition: Erneut suchen
    if (insertError.code === "23505") {
      const { data: retry } = await adminDb
        .from("households")
        .select("id")
        .eq("street_name", streetName)
        .eq("house_number", trimmedHouseNumber)
        .maybeSingle();
      if (retry) return retry.id;
    } else {
      console.error("Haushalt-Erstellung fehlgeschlagen:", insertError);
      // Fallback: Trotzdem nach bestehendem Haushalt suchen
      const { data: fallback } = await adminDb
        .from("households")
        .select("id")
        .eq("street_name", streetName)
        .eq("house_number", trimmedHouseNumber)
        .maybeSingle();
      if (fallback) return fallback.id;
    }
  } else if (newHousehold) {
    return newHousehold.id;
  }

  return undefined;
}

/** User-Profil erstellen (mit Rollback bei Fehler) */
async function createUserProfile(
  adminDb: SupabaseClient,
  userId: string,
  displayName: string,
  uiMode?: string,
  verificationMethod?: string,
): Promise<void> {
  // Trust-Level abhängig von Verifikationsmethode:
  // - Invite-Code: sofort 'verified' (B2B-Track, vertrauenswürdiger Kanal)
  // - Adresse manuell: 'new' (B2C-Track, muss per Vouching verifiziert werden)
  // PILOT_AUTO_VERIFY=true: Alle Nutzer auf 'verified' (Pilot-Modus)
  const pilotAutoVerify = process.env.PILOT_AUTO_VERIFY === "true";
  const trustLevel = pilotAutoVerify
    ? "verified"
    : verificationMethod === "invite_code" ||
        verificationMethod === "neighbor_invite"
      ? "verified"
      : "new";

  const { error: profileError } = await adminDb.from("users").upsert(
    {
      id: userId,
      email_hash: "",
      display_name: displayName.trim(),
      ui_mode: uiMode || "active",
      role: "resident", // Vier-Versionen-Modell: Standard-Rolle für Bewohner
      trust_level: trustLevel,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    console.error("Profil-Fehler:", profileError);
    // Auth-User wieder löschen, damit kein verwaister Account zurückbleibt
    // (sonst: "Email bereits registriert" bei erneutem Versuch)
    try {
      await adminDb.auth.admin.deleteUser(userId);
      console.warn(
        `[Register] Auth-User ${userId} nach Profil-Fehler bereinigt`,
      );
    } catch (cleanupErr) {
      console.error("[Register] Auth-User-Cleanup fehlgeschlagen:", cleanupErr);
    }
    throw new ServiceError(
      `Profil konnte nicht erstellt werden: ${profileError.message}`,
      500,
    );
  }
}

/** Haushalt-Zuordnung, Verifizierung und Einladungs-Handling */
async function assignHouseholdAndVerify(
  adminDb: SupabaseClient,
  opts: {
    householdId: string;
    userId: string;
    verificationMethod?: string;
    inviteCode?: string;
    referrerId?: string;
    displayName: string;
  },
): Promise<void> {
  const {
    householdId,
    userId,
    verificationMethod,
    inviteCode,
    referrerId,
    displayName,
  } = opts;

  // Pilotphase: Alle Nutzer werden sofort verifiziert (verified_at gesetzt)
  // Damit können sie die App direkt nutzen (RLS: is_verified_member())
  const { error: memberError } = await adminDb
    .from("household_members")
    .insert({
      household_id: householdId,
      user_id: userId,
      verification_method: verificationMethod || "address_manual",
      verified_at: new Date().toISOString(), // Pilot: sofort verifiziert
    });

  if (memberError) {
    console.error("Mitglied-Fehler:", memberError);
    // Nicht blockierend — Registrierung trotzdem abschließen
  }

  // Bei manueller Adress-Verifikation: Anfrage trotzdem erstellen (für Admin-Übersicht)
  if (verificationMethod === "address_manual") {
    const { error: requestError } = await adminDb
      .from("verification_requests")
      .insert({
        user_id: userId,
        household_id: householdId,
        method: "address_manual",
        status: "approved", // Pilot: direkt approved
        reviewed_at: new Date().toISOString(),
      });

    if (requestError) {
      console.error("Verifizierungsanfrage-Fehler:", requestError);
      // Nicht blockierend
    }
  }

  // Bei Nachbar-Einladung: Einladung als akzeptiert markieren + Punkte
  if (verificationMethod === "neighbor_invite" && inviteCode) {
    const normalizedCode = inviteCode.replace(/[-\s]/g, "").toUpperCase();

    const { error: inviteErr } = await adminDb
      .from("neighbor_invitations")
      .update({
        status: "converted",
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
        converted_user_id: userId,
        converted_at: new Date().toISOString(),
      })
      .eq("invite_code", normalizedCode)
      .eq("status", "sent");

    if (inviteErr) {
      console.error("Einladung-Update fehlgeschlagen:", inviteErr);
    }

    // Punkte für den Einladenden
    if (referrerId) {
      const { error: pointsErr } = await adminDb
        .from("reputation_points")
        .insert({
          user_id: referrerId,
          points: 50,
          reason: "neighbor_invited",
          reference_id: userId,
        });

      if (pointsErr) {
        console.error("Reputationspunkte-Fehler:", pointsErr);
      }

      await safeInsertNotification(adminDb, {
        user_id: referrerId,
        type: "neighbor_invited",
        title: "Nachbar registriert!",
        body: `${displayName.trim()} hat Ihre Einladung angenommen. +50 Punkte!`,
        reference_id: userId,
        reference_type: "user",
      });
    }
  }
}
