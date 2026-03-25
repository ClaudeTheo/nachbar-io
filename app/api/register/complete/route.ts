import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { safeInsertNotification } from "@/lib/notifications-server";
import { generateSecureCode, generateTempPassword } from "@/lib/invite-codes";

/**
 * POST /api/register/complete
 *
 * Komplette Registrierung serverseitig:
 * 1. User per Admin-API erstellen (kein Rate Limit, keine E-Mail-Bestaetigung)
 * 2. Profil erstellen
 * 3. Haushalt suchen/erstellen + Zuordnung
 * 4. Verifizierungsanfrage erstellen
 *
 * Verwendet Service-Role um RLS-Probleme und Rate Limits zu umgehen.
 *
 * Body: {
 *   email: string,
 *   password?: string,         // Optional seit Magic-Link-Umstellung
 *   displayName: string,
 *   uiMode: 'active' | 'senior',
 *   householdId?: string,
 *   streetName?: string,
 *   houseNumber?: string,
 *   verificationMethod: string,
 *   inviteCode?: string,
 *   referrerId?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      displayName,
      uiMode,
      streetName,
      houseNumber,
      lat,
      lng,
      postalCode,
      city,
      verificationMethod,
      inviteCode,
      referrerId,
      quarterId: bodyQuarterId,
    } = body;
    let { householdId } = body;

    if (!displayName?.trim()) {
      return NextResponse.json(
        { error: "Anzeigename ist erforderlich" },
        { status: 400 }
      );
    }

    const adminDb = getAdminSupabase();
    let userId = "";

    // User serverseitig per Admin-API erstellen
    // Passwort ist seit Magic-Link-Umstellung optional:
    // - Mit Passwort: Klassischer Flow (Fallback, Tester)
    // - Ohne Passwort: Magic Link Flow (Standard ab 2026-03)
    if (email) {
      // Temporaeres Passwort generieren wenn keins mitgesendet wird
      // (Supabase erfordert ein Passwort bei admin.createUser)
      const userPassword = password || generateTempPassword();

      // B-1 Pilot-Entscheidung (2026-03-18):
      // email_confirm: true = Account wird sofort als bestaetigt markiert.
      // Im Pilot mit Invite-Code-Pflicht akzeptabel: Code-Besitz dient als
      // Verifikation (nur Personen mit gueltigem Invite-Code koennen sich registrieren).
      //
      // WICHTIG — NICHT fuer oeffentlichen Rollout ohne Invite-Gate geeignet:
      // Ohne Invite-Code-Pflicht koennte ein Angreifer beliebige E-Mail-Adressen
      // registrieren, ohne den Besitz nachzuweisen.
      // Vor oeffentlichem Rollout: email_confirm auf false setzen und
      // Supabase E-Mail-Bestaetigung erzwingen (Confirm Signup Template).
      const { data: newUser, error: createError } = await adminDb.auth.admin.createUser({
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
            (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
          );

          if (existingUser) {
            // Pruefen ob ein Profil existiert
            const { data: existingProfile } = await adminDb
              .from("users")
              .select("id")
              .eq("id", existingUser.id)
              .maybeSingle();

            if (!existingProfile) {
              // Orphaned Auth-User: Profil fehlt → wiederverwenden
              console.warn(`[Register] Orphaned Auth-User ${existingUser.id} wird repariert`);
              userId = existingUser.id;
              // Weiter mit Profil-Erstellung unten
            } else {
              // Vollstaendig registrierter User → Login empfehlen
              return NextResponse.json(
                { error: "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an." },
                { status: 409 }
              );
            }
          } else {
            return NextResponse.json(
              { error: "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an." },
              { status: 409 }
            );
          }
        } else {
          return NextResponse.json(
            { error: `Registrierung fehlgeschlagen: ${createError.message}` },
            { status: 500 }
          );
        }
      }

      // userId kann bereits gesetzt sein (Orphan-Repair-Pfad)
      if (!userId) {
        if (!newUser?.user) {
          return NextResponse.json(
            { error: "User konnte nicht erstellt werden." },
            { status: 500 }
          );
        }
        userId = newUser.user.id;
      }
    } else {
      return NextResponse.json(
        { error: "E-Mail-Adresse ist erforderlich." },
        { status: 400 }
      );
    }

    // 0. Haushalt suchen oder erstellen (bei Adress-Registrierung ohne Invite-Code)
    if (!householdId && streetName && houseNumber) {
      const trimmedHouseNumber = String(houseNumber).trim();
      // Koordinaten kommen vom Client (Photon Geocoding)
      const hasCoords = typeof lat === 'number' && typeof lng === 'number';

      if (trimmedHouseNumber) {
        // Quartier-ID ermitteln: aus Body, via PostGIS Clustering, oder Fallback
        let quarterId: string | null = bodyQuarterId || null;
        if (!quarterId && hasCoords) {
          // Automatische Quartier-Zuweisung via PostGIS Clustering
          const { assignUserToQuarter } = await import('@/lib/geo/quarter-clustering');
          try {
            quarterId = await assignUserToQuarter(lat, lng);
          } catch (err) {
            console.error('Quartier-Clustering fehlgeschlagen:', err);
          }
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
          householdId = existing.id;
        } else {
          // Neuen Haushalt anlegen
          const newInviteCode = generateSecureCode();

          const insertData: Record<string, unknown> = {
            street_name: streetName,
            house_number: trimmedHouseNumber,
            lat: hasCoords ? lat : 0,
            lng: hasCoords ? lng : 0,
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
              if (retry) householdId = retry.id;
            } else {
              console.error("Haushalt-Erstellung fehlgeschlagen:", insertError);
              // Fallback: Trotzdem nach bestehendem Haushalt suchen
              const { data: fallback } = await adminDb
                .from("households")
                .select("id")
                .eq("street_name", streetName)
                .eq("house_number", trimmedHouseNumber)
                .maybeSingle();
              if (fallback) householdId = fallback.id;
            }
          } else if (newHousehold) {
            householdId = newHousehold.id;
          }
        }
      } else if (trimmedHouseNumber) {
        // Straßenname nicht in STREET_COORDS (andere Straße in Bad Saeckingen)
        // Trotzdem Haushalt erstellen mit Quartier-Fallback-Koordinaten
        console.warn(`Straße nicht in Pilotgebiet: "${streetName}" — erstelle Haushalt mit Fallback-Koordinaten`);

        // Quartier-ID ermitteln
        let quarterId: string | null = bodyQuarterId || null;
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
          householdId = existing.id;
        } else {
          // Neuen Haushalt mit Quartier-Zentrum als Fallback-Koordinaten erstellen
          const defaultLat = 47.5535; // Bad Saeckingen Zentrum
          const defaultLng = 7.9640;
          const newInviteCode = generateSecureCode();

          const insertData: Record<string, unknown> = {
            street_name: streetName,
            house_number: trimmedHouseNumber,
            lat: defaultLat,
            lng: defaultLng,
            verified: false,
            invite_code: newInviteCode,
          };
          if (quarterId) insertData.quarter_id = quarterId;

          const { data: newHousehold, error: insertError } = await adminDb
            .from("households")
            .insert(insertData)
            .select("id")
            .single();

          if (insertError) {
            if (insertError.code === "23505") {
              const { data: retry } = await adminDb
                .from("households")
                .select("id")
                .eq("street_name", streetName)
                .eq("house_number", trimmedHouseNumber)
                .maybeSingle();
              if (retry) householdId = retry.id;
            } else {
              console.error("Haushalt-Erstellung (Fallback) fehlgeschlagen:", insertError);
            }
          } else if (newHousehold) {
            householdId = newHousehold.id;
          }
        }
      }
    }

    // 1. User-Profil erstellen
    // Trust-Level abhaengig von Verifikationsmethode:
    // - Invite-Code: sofort 'verified' (B2B-Track, vertrauenswuerdiger Kanal)
    // - Adresse manuell: 'new' (B2C-Track, muss per Vouching verifiziert werden)
    // PILOT_AUTO_VERIFY=true: Alle Nutzer auf 'verified' (Pilot-Modus)
    const pilotAutoVerify = process.env.PILOT_AUTO_VERIFY === "true";
    const trustLevel = pilotAutoVerify
      ? "verified"
      : (verificationMethod === "invite_code" || verificationMethod === "neighbor_invite")
        ? "verified"
        : "new";

    const { error: profileError } = await adminDb.from("users").upsert({
      id: userId,
      email_hash: "",
      display_name: displayName.trim(),
      ui_mode: uiMode || "active",
      role: "resident",  // Vier-Versionen-Modell: Standard-Rolle fuer Bewohner
      trust_level: trustLevel,
    }, { onConflict: "id" });

    if (profileError) {
      console.error("Profil-Fehler:", profileError);
      // Auth-User wieder loeschen, damit kein verwaister Account zurueckbleibt
      // (sonst: "Email bereits registriert" bei erneutem Versuch)
      try {
        await adminDb.auth.admin.deleteUser(userId);
        console.warn(`[Register] Auth-User ${userId} nach Profil-Fehler bereinigt`);
      } catch (cleanupErr) {
        console.error("[Register] Auth-User-Cleanup fehlgeschlagen:", cleanupErr);
      }
      return NextResponse.json(
        { error: `Profil konnte nicht erstellt werden: ${profileError.message}` },
        { status: 500 }
      );
    }

    // 2. Haushalt-Zuordnung erstellen
    if (householdId) {
      // Pilotphase: Alle Nutzer werden sofort verifiziert (verified_at gesetzt)
      // Damit koennen sie die App direkt nutzen (RLS: is_verified_member())
      const { error: memberError } = await adminDb.from("household_members").insert({
        household_id: householdId,
        user_id: userId,
        verification_method: verificationMethod || "address_manual",
        verified_at: new Date().toISOString(), // Pilot: sofort verifiziert
      });

      if (memberError) {
        console.error("Mitglied-Fehler:", memberError);
        // Nicht blockierend — Registrierung trotzdem abschliessen
      }

      // 3. Bei manueller Adress-Verifikation: Anfrage trotzdem erstellen (fuer Admin-Uebersicht)
      if (verificationMethod === "address_manual") {
        const { error: requestError } = await adminDb.from("verification_requests").insert({
          user_id: userId,
          household_id: householdId,
          method: "address_manual",
          status: "approved",  // Pilot: direkt approved
          reviewed_at: new Date().toISOString(),
        });

        if (requestError) {
          console.error("Verifizierungsanfrage-Fehler:", requestError);
          // Nicht blockierend
        }
      }

      // 4. Bei Einladungscode: verified_at bereits oben gesetzt (Pilot: alle sofort verifiziert)

      // 5. Bei Nachbar-Einladung: Einladung als akzeptiert markieren + Punkte
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

        // verified_at bereits oben gesetzt (Pilot: alle sofort verifiziert)

        // Punkte fuer den Einladenden
        if (referrerId) {
          const { error: pointsErr } = await adminDb.from("reputation_points").insert({
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

    return NextResponse.json({
      success: true,
      userId,
      verificationMethod,
    });
  } catch (err) {
    console.error("Registrierung-Complete Fehler:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
