import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * POST /api/user/delete
 *
 * DSGVO Art. 17 — Recht auf Loeschung
 * Loescht das Nutzerkonto und alle zugehoerigen Daten.
 * Erfordert Bestaetigung via { confirmText: "KONTO LÖSCHEN" }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Bestaetigungs-Text pruefen (Schutz gegen versehentliches Loeschen)
  try {
    const body = await request.json();
    if (body.confirmText !== "KONTO LÖSCHEN") {
      return NextResponse.json(
        { error: "Bitte bestätigen Sie die Löschung mit dem korrekten Text" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 }
    );
  }

  // Admin-Client fuer Auth-User-Loeschung (erfordert Service-Role-Key)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler" },
      { status: 500 }
    );
  }
  const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Nutzerdaten aus verknuepften Tabellen loeschen
    //    (Die meisten haben ON DELETE CASCADE, aber sicherheitshalber explizit)
    const userId = user.id;

    // Push-Subscriptions entfernen
    await adminSupabase.from("push_subscriptions").delete().eq("user_id", userId);

    // Notifications entfernen
    await adminSupabase.from("notifications").delete().eq("user_id", userId);

    // Reputation-Punkte entfernen
    await adminSupabase.from("reputation_points").delete().eq("user_id", userId);

    // Einladungen (als Einladender) entfernen
    await adminSupabase.from("neighbor_invitations").delete().eq("inviter_id", userId);

    // Verifizierungsanfragen entfernen
    await adminSupabase.from("verification_requests").delete().eq("user_id", userId);

    // Urlaubsmodus entfernen
    await adminSupabase.from("vacation_modes").delete().eq("user_id", userId);

    // Haushaltsmitgliedschaft entfernen
    await adminSupabase.from("household_members").delete().eq("user_id", userId);

    // Nutzerprofil aus users-Tabelle entfernen
    await adminSupabase.from("users").delete().eq("id", userId);

    // 2. Auth-User loeschen (entfernt auch Session/Token)
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Auth-User-Loeschung fehlgeschlagen:", deleteError);
      return NextResponse.json(
        { error: "Konto konnte nicht vollständig gelöscht werden. Bitte kontaktieren Sie den Admin." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Ihr Konto und alle zugehörigen Daten wurden gelöscht.",
    });
  } catch (err) {
    console.error("Konto-Loeschung fehlgeschlagen:", err);
    return NextResponse.json(
      { error: "Interner Fehler bei der Kontolöschung" },
      { status: 500 }
    );
  }
}
