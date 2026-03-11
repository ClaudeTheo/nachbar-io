import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { safeInsertNotification } from "@/lib/notifications-server";

// Service-Role Client fuer Registrierungs-Operationen (umgeht RLS)
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
 * Schliesst die Registrierung serverseitig ab.
 * Erstellt User-Profil, Haushalt-Zuordnung, Verifizierungsanfrage.
 * Verwendet Service-Role um RLS-Probleme zu vermeiden.
 *
 * Body: {
 *   userId: string,
 *   displayName: string,
 *   uiMode: 'active' | 'senior',
 *   householdId?: string,
 *   verificationMethod: string,
 *   inviteCode?: string,
 *   referrerId?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth-Check: Nur eingeloggte Nutzer
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      userId,
      displayName,
      uiMode,
      householdId,
      verificationMethod,
      inviteCode,
      referrerId,
    } = body;

    // Sicherheits-Check: userId muss dem eingeloggten Nutzer entsprechen
    if (userId !== user.id) {
      return NextResponse.json(
        { error: "Nicht autorisiert — userId stimmt nicht" },
        { status: 403 }
      );
    }

    if (!displayName?.trim()) {
      return NextResponse.json(
        { error: "Anzeigename ist erforderlich" },
        { status: 400 }
      );
    }

    const adminDb = getAdminSupabase();

    // 1. User-Profil erstellen
    const { error: profileError } = await adminDb.from("users").insert({
      id: userId,
      email_hash: "",
      display_name: displayName.trim(),
      ui_mode: uiMode || "active",
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
        // Einladungscode normalisieren (Bindestriche entfernen, Grossbuchstaben)
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

          // Benachrichtigung an den Einladenden (mit Constraint-Fallback)
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
