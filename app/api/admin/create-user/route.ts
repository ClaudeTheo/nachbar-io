import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { generateTempPassword } from "@/lib/invite-codes";

// Service-Role Client fuer Admin-Operationen (User-Erstellung)
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert");
  }
  return createClient(url, key);
}

/**
 * POST /api/admin/create-user
 *
 * Admin erstellt ein Konto fuer einen Nachbarn (z.B. Senioren).
 * Body: { displayName, street, houseNumber, email?, uiMode?, verified? }
 * Gibt temporaeres Passwort zurueck (einmalig sichtbar).
 */
export async function POST(request: NextRequest) {
  // 1. Admin-Check mit Session-basiertem Client
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
  }

  // 2. Body parsen
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Anfrage-Format" }, { status: 400 });
  }
  const {
    displayName,
    street,
    houseNumber,
    email,
    uiMode = "senior",
    verified = true,
  } = body;

  if (!displayName || !street || !houseNumber) {
    return NextResponse.json(
      { error: "Name, Strasse und Hausnummer sind erforderlich" },
      { status: 400 }
    );
  }

  // 3. Haushalt pruefen
  const adminSupabase = getAdminSupabase();
  const { data: household, error: householdError } = await adminSupabase
    .from("households")
    .select("id")
    .eq("street_name", street)
    .eq("house_number", houseNumber)
    .maybeSingle();

  if (householdError) {
    return NextResponse.json(
      { error: `Haushalt-Suche fehlgeschlagen: ${householdError.message}` },
      { status: 500 }
    );
  }

  if (!household) {
    return NextResponse.json(
      { error: `Haushalt ${street} ${houseNumber} nicht gefunden` },
      { status: 404 }
    );
  }

  // 4. Temporaeres Passwort + E-Mail generieren
  const tempPassword = generateTempPassword();
  const userEmail = email || `${displayName.toLowerCase().replace(/[^a-z0-9]/g, "")}.${Date.now()}@nachbar.io`;

  // 5. Auth-User erstellen (Service-Role = Admin-Rechte)
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: userEmail,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json(
      { error: `Konto konnte nicht erstellt werden: ${authError.message}` },
      { status: 500 }
    );
  }

  if (!authData.user) {
    return NextResponse.json(
      { error: "Konto-Erstellung fehlgeschlagen" },
      { status: 500 }
    );
  }

  // 6. User-Profil erstellen
  const { error: profileError } = await adminSupabase.from("users").insert({
    id: authData.user.id,
    email_hash: "",
    display_name: displayName.trim(),
    ui_mode: uiMode,
    trust_level: verified ? "verified" : "new",
    is_tester: true,  // Pilotphase: alle Nutzer sind Tester
  });

  if (profileError) {
    console.error("Profil-Fehler:", profileError);
    // Rollback: Auth-User loeschen, da Konto ohne Profil unbenutzbar
    const { error: rollbackError } = await adminSupabase.auth.admin.deleteUser(authData.user.id);
    if (rollbackError) {
      console.error("Rollback Auth-User-Loeschung fehlgeschlagen:", rollbackError);
    }
    return NextResponse.json(
      { error: `Profil konnte nicht erstellt werden: ${profileError.message}` },
      { status: 500 }
    );
  }

  // 7. Haushalt-Zuordnung erstellen
  const { error: memberError } = await adminSupabase.from("household_members").insert({
    household_id: household.id,
    user_id: authData.user.id,
    verification_method: "admin_created",
  });

  if (memberError) {
    console.error("Mitglied-Fehler:", memberError);
    // Kein Rollback — Konto existiert, Admin wird ueber fehlende Zuordnung informiert
    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      email: userEmail,
      tempPassword,
      displayName: displayName.trim(),
      household: `${street} ${houseNumber}`,
      warning: `Haushalt-Zuordnung fehlgeschlagen: ${memberError.message}`,
    });
  }

  return NextResponse.json({
    success: true,
    userId: authData.user.id,
    email: userEmail,
    tempPassword,
    displayName: displayName.trim(),
    household: `${street} ${houseNumber}`,
  });
}
