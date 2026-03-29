import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { createUserByAdmin } from "@/modules/admin/services/create-user.service";

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
    return NextResponse.json({ error: "Ungültiges Anfrage-Format" }, { status: 400 });
  }
  const { displayName, street, houseNumber, email, uiMode, verified, quarter_id } = body;

  if (!displayName || !street || !houseNumber) {
    return NextResponse.json(
      { error: "Name, Straße und Hausnummer sind erforderlich" },
      { status: 400 }
    );
  }

  // 3. Service aufrufen
  try {
    const adminSupabase = getAdminSupabase();
    const result = await createUserByAdmin(adminSupabase, {
      displayName,
      street,
      houseNumber,
      email,
      uiMode,
      verified,
      quarter_id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
