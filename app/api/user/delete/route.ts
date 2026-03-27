import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * POST /api/user/delete
 *
 * DSGVO Art. 17 — Recht auf Löschung
 * Loescht das Nutzerkonto und alle zugehörigen Daten.
 * Erfordert Bestätigung via { confirmText: "KONTO LÖSCHEN" }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Bestätigungs-Text prüfen (Schutz gegen versehentliches Löschen)
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

  // Admin-Client für Auth-User-Löschung (erfordert Service-Role-Key)
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
    // 1. Nutzerdaten aus verknüpften Tabellen löschen
    //    (Die meisten haben ON DELETE CASCADE, aber sicherheitshalber explizit)
    const userId = user.id;
    const errors: string[] = [];

    // Kaskaden-Löschung mit Fehler-Tracking
    const cascadeDeletes: { table: string; filter: [string, string] }[] = [
      { table: "push_subscriptions", filter: ["user_id", userId] },
      { table: "notifications", filter: ["user_id", userId] },
      { table: "reputation_points", filter: ["user_id", userId] },
      { table: "neighbor_invitations", filter: ["inviter_id", userId] },
      { table: "verification_requests", filter: ["user_id", userId] },
      { table: "vacation_modes", filter: ["user_id", userId] },
      { table: "household_members", filter: ["user_id", userId] },
    ];

    for (const { table, filter } of cascadeDeletes) {
      const { error } = await adminSupabase.from(table).delete().eq(filter[0], filter[1]);
      if (error) {
        console.error(`DSGVO-Löschung ${table} fehlgeschlagen:`, error.message);
        errors.push(table);
      }
    }

    // Nutzerprofil aus users-Tabelle entfernen
    const { error: profileDeleteError } = await adminSupabase.from("users").delete().eq("id", userId);
    if (profileDeleteError) {
      console.error("DSGVO-Löschung users fehlgeschlagen:", profileDeleteError.message);
      errors.push("users");
    }

    // Bei kritischen Fehlern abbrechen BEVOR Auth-User gelöscht wird
    if (errors.length > 0) {
      console.error(`DSGVO-Löschung unvollständig (${errors.join(", ")}), Auth-User bleibt erhalten`);
      return NextResponse.json(
        { error: `Daten konnten nicht vollständig gelöscht werden (${errors.join(", ")}). Bitte kontaktieren Sie den Admin.` },
        { status: 500 }
      );
    }

    // 2. Auth-User löschen (erst wenn alle Daten entfernt — sonst verwaiste Daten)
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Auth-User-Löschung fehlgeschlagen:", deleteError);
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
    console.error("Konto-Löschung fehlgeschlagen:", err);
    return NextResponse.json(
      { error: "Interner Fehler bei der Kontolöschung" },
      { status: 500 }
    );
  }
}
