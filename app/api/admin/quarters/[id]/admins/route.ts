import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Hilfsfunktion: Super-Admin Auth prüfen
async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    return { error: NextResponse.json({ error: "Nur Super-Admins" }, { status: 403 }) };
  }
  return { user };
}

// Service-Client für cross-quarter Zugriff
function getAdminDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/admin/quarters/[id]/admins
 * Liste aller Admins für ein Quartier.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  const adminDb = getAdminDb();

  // Quarter-Admins mit User-Infos laden
  const { data: admins, error } = await adminDb
    .from("quarter_admins")
    .select("id, quarter_id, user_id, assigned_at, assigned_by")
    .eq("quarter_id", id);

  if (error) {
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }

  // User-Infos separat laden (da kein FK-Join möglich über Service-Client)
  const userIds = (admins ?? []).map((a) => a.user_id);
  const { data: users } = userIds.length > 0
    ? await adminDb
        .from("users")
        .select("id, display_name, email_hash")
        .in("id", userIds)
    : { data: [] };

  const usersMap = new Map((users ?? []).map((u) => [u.id, u]));

  const adminsWithUsers = (admins ?? []).map((a) => ({
    ...a,
    user: usersMap.get(a.user_id) ?? null,
  }));

  return NextResponse.json(adminsWithUsers);
}

/**
 * POST /api/admin/quarters/[id]/admins
 * Benutzer als Quartier-Admin zuweisen.
 * Body: { user_id: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { user_id } = body;

  if (!user_id) {
    return NextResponse.json({ error: "user_id ist erforderlich" }, { status: 400 });
  }

  const adminDb = getAdminDb();

  // Prüfen ob Quartier existiert
  const { data: quarter } = await adminDb
    .from("quarters")
    .select("id")
    .eq("id", id)
    .single();
  if (!quarter) {
    return NextResponse.json({ error: "Quartier nicht gefunden" }, { status: 404 });
  }

  // Prüfen ob User existiert
  const { data: targetUser } = await adminDb
    .from("users")
    .select("id, role")
    .eq("id", user_id)
    .single();
  if (!targetUser) {
    return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
  }

  // Prüfen ob bereits zugewiesen
  const { data: existing } = await adminDb
    .from("quarter_admins")
    .select("id")
    .eq("quarter_id", id)
    .eq("user_id", user_id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Benutzer ist bereits Admin dieses Quartiers" }, { status: 409 });
  }

  // Quarter-Admin Eintrag erstellen
  const { data: created, error } = await adminDb
    .from("quarter_admins")
    .insert({
      quarter_id: id,
      user_id,
      assigned_by: auth.user!.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }

  // Rolle auf quarter_admin setzen wenn aktuell nur 'user'
  if (targetUser.role === "user") {
    await adminDb
      .from("users")
      .update({ role: "quarter_admin" })
      .eq("id", user_id);
  }

  return NextResponse.json(created, { status: 201 });
}

/**
 * DELETE /api/admin/quarters/[id]/admins
 * Quartier-Admin entfernen.
 * Body: { user_id: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { user_id } = body;

  if (!user_id) {
    return NextResponse.json({ error: "user_id ist erforderlich" }, { status: 400 });
  }

  const adminDb = getAdminDb();

  // Quarter-Admin Eintrag löschen
  const { error } = await adminDb
    .from("quarter_admins")
    .delete()
    .eq("quarter_id", id)
    .eq("user_id", user_id);

  if (error) {
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }

  // Prüfen ob User noch andere Quarter-Admin-Zuweisungen hat
  const { count } = await adminDb
    .from("quarter_admins")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user_id);

  // Wenn keine weiteren Zuweisungen, Rolle auf 'user' zurücksetzen
  if ((count ?? 0) === 0) {
    // Nur zurücksetzen wenn nicht super_admin
    const { data: userProfile } = await adminDb
      .from("users")
      .select("role")
      .eq("id", user_id)
      .single();

    if (userProfile?.role === "quarter_admin") {
      await adminDb
        .from("users")
        .update({ role: "user" })
        .eq("id", user_id);
    }
  }

  return NextResponse.json({ message: "Quartier-Admin entfernt" });
}
