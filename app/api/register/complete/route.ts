import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { safeInsertNotification } from "@/lib/notifications-server";
import { generateSecureCode } from "@/lib/invite-codes";

// Service-Role Client fuer Registrierungs-Operationen (umgeht RLS + Rate Limits)
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert");
  }
  return createClient(url, key);
}

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
 *   password: string,
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
      verificationMethod,
      inviteCode,
      referrerId,
      // Legacy: userId fuer alte Clients die noch client-seitig signUp machen
      userId: legacyUserId,
    } = body;
    let { householdId } = body;

    if (!displayName?.trim()) {
      return NextResponse.json(
        { error: "Anzeigename ist erforderlich" },
        { status: 400 }
      );
    }

    const adminDb = getAdminSupabase();
    let userId: string;

    // Neuer Flow: User serverseitig per Admin-API erstellen
    if (email && password) {
      const { data: newUser, error: createError } = await adminDb.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Sofort bestaetigt — kein E-Mail-Zwang im Pilot
      });

      if (createError) {
        console.error("User-Erstellung fehlgeschlagen:", createError);

        // Benutzerfreundliche Fehlermeldungen
        if (createError.message?.includes("already been registered")) {
          return NextResponse.json(
            { error: "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an." },
            { status: 409 }
          );
        }

        return NextResponse.json(
          { error: `Registrierung fehlgeschlagen: ${createError.message}` },
          { status: 500 }
        );
      }

      if (!newUser?.user) {
        return NextResponse.json(
          { error: "User konnte nicht erstellt werden." },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
    } else if (legacyUserId) {
      // Legacy-Fallback: Client hat signUp bereits gemacht
      userId = legacyUserId;
    } else {
      return NextResponse.json(
        { error: "E-Mail und Passwort sind erforderlich." },
        { status: 400 }
      );
    }

    // 0. Haushalt suchen oder erstellen (bei Adress-Registrierung ohne Invite-Code)
    if (!householdId && streetName && houseNumber) {
      const STREET_COORDS: Record<string, { lat: number; lng: number }> = {
        "Purkersdorfer Straße": { lat: 47.5631, lng: 7.9480 },
        "Sanarystraße": { lat: 47.5619, lng: 7.9480 },
        "Oberer Rebberg": { lat: 47.5604, lng: 7.9480 },
      };

      const trimmedHouseNumber = String(houseNumber).trim();
      const coords = STREET_COORDS[streetName];

      if (coords && trimmedHouseNumber) {
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
          const houseNum = parseInt(trimmedHouseNumber, 10) || 0;
          const lngOffset = houseNum * 0.0005;
          const newInviteCode = generateSecureCode();

          const { data: newHousehold, error: insertError } = await adminDb
            .from("households")
            .insert({
              street_name: streetName,
              house_number: trimmedHouseNumber,
              lat: coords.lat,
              lng: coords.lng + lngOffset,
              verified: false,
              invite_code: newInviteCode,
            })
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
            }
          } else if (newHousehold) {
            householdId = newHousehold.id;
          }
        }
      }
    }

    // 1. User-Profil erstellen
    const { error: profileError } = await adminDb.from("users").insert({
      id: userId,
      email_hash: "",
      display_name: displayName.trim(),
      ui_mode: uiMode || "active",
      is_tester: true,  // Pilotphase: alle Nutzer sind Tester
    });

    if (profileError) {
      console.error("Profil-Fehler:", profileError);
      return NextResponse.json(
        { error: `Profil konnte nicht erstellt werden: ${profileError.message}` },
        { status: 500 }
      );
    }

    // 2. Haushalt-Zuordnung erstellen
    if (householdId) {
      const { error: memberError } = await adminDb.from("household_members").insert({
        household_id: householdId,
        user_id: userId,
        verification_method: verificationMethod || "address_manual",
      });

      if (memberError) {
        console.error("Mitglied-Fehler:", memberError);
        // Nicht blockierend — Registrierung trotzdem abschliessen
      }

      // 3. Bei manueller Adress-Verifikation: Anfrage erstellen
      if (verificationMethod === "address_manual") {
        const { error: requestError } = await adminDb.from("verification_requests").insert({
          user_id: userId,
          household_id: householdId,
          method: "address_manual",
          status: "pending",
        });

        if (requestError) {
          console.error("Verifizierungsanfrage-Fehler:", requestError);
          // Nicht blockierend
        }
      }

      // 4. Bei Einladungscode: sofort verifizieren
      if (verificationMethod === "invite_code") {
        const { error: verifyMemberErr } = await adminDb
          .from("household_members")
          .update({ verified_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("household_id", householdId);

        if (verifyMemberErr) {
          console.error("Haushalt-Verifizierung fehlgeschlagen:", verifyMemberErr);
        }

        const { error: trustErr } = await adminDb
          .from("users")
          .update({ trust_level: "verified" })
          .eq("id", userId);

        if (trustErr) {
          console.error("Trust-Level-Update fehlgeschlagen:", trustErr);
        }
      }

      // 5. Bei Nachbar-Einladung: Einladung als akzeptiert markieren + Punkte
      if (verificationMethod === "neighbor_invite" && inviteCode) {
        const normalizedCode = inviteCode.replace(/[-\s]/g, "").toUpperCase();

        const { error: inviteErr } = await adminDb
          .from("neighbor_invitations")
          .update({
            status: "accepted",
            accepted_at: new Date().toISOString(),
            accepted_by: userId,
          })
          .eq("invite_code", normalizedCode)
          .eq("status", "sent");

        if (inviteErr) {
          console.error("Einladung-Update fehlgeschlagen:", inviteErr);
        }

        // Sofort verifizieren (Einladender buergt)
        const { error: verifyMemberErr } = await adminDb
          .from("household_members")
          .update({ verified_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("household_id", householdId);

        if (verifyMemberErr) {
          console.error("Haushalt-Verifizierung fehlgeschlagen:", verifyMemberErr);
        }

        const { error: trustErr } = await adminDb
          .from("users")
          .update({ trust_level: "verified" })
          .eq("id", userId);

        if (trustErr) {
          console.error("Trust-Level-Update fehlgeschlagen:", trustErr);
        }

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
