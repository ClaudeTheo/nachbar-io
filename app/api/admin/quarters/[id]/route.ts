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
 * GET /api/admin/quarters/[id]
 * Einzelnes Quartier mit vollständigen Stats laden.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  const adminDb = getAdminDb();

  const { data: quarter, error } = await adminDb
    .from("quarters")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !quarter) {
    return NextResponse.json({ error: "Quartier nicht gefunden" }, { status: 404 });
  }

  // Stats aggregieren
  const [households, residents, alerts, activeAlerts] = await Promise.all([
    adminDb
      .from("households")
      .select("*", { count: "exact", head: true })
      .eq("quarter_id", id),
    // Bewohner über household_members zählen (users hat kein quarter_id)
    adminDb
      .from("household_members")
      .select("*, households!inner(quarter_id)", { count: "exact", head: true })
      .eq("households.quarter_id", id),
    // Alerts im Quartier (letzte 24h)
    adminDb
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("quarter_id", id)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    // Alle aktiven Alerts im Quartier
    adminDb
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("quarter_id", id)
      .eq("status", "active"),
  ]);

  return NextResponse.json({
    ...quarter,
    stats: {
      householdCount: households.count ?? 0,
      residentCount: residents.count ?? 0,
      activeAlerts: alerts.count ?? 0,
      activePosts: activeAlerts.count ?? 0,
    },
  });
}

/**
 * PUT /api/admin/quarters/[id]
 * Quartier-Felder aktualisieren.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();

  // Erlaubte Felder für Update
  const allowedFields = [
    "name", "city", "state", "description", "settings", "map_config",
    "status", "invite_prefix", "max_households", "contact_email",
    "center_lat", "center_lng", "zoom_level",
    "bounds_sw_lat", "bounds_sw_lng", "bounds_ne_lat", "bounds_ne_lng",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Keine Felder zum Aktualisieren" }, { status: 400 });
  }

  // Status-Transitionen validieren
  if (updateData.status) {
    const adminDb = getAdminDb();
    const { data: current } = await adminDb
      .from("quarters")
      .select("status")
      .eq("id", id)
      .single();

    if (current) {
      const validTransitions: Record<string, string[]> = {
        draft: ["active"],
        active: ["archived"],
        archived: [], // Kein Zurück
      };
      const allowed = validTransitions[current.status] ?? [];
      if (!allowed.includes(updateData.status as string)) {
        return NextResponse.json(
          { error: `Status-Übergang von '${current.status}' nach '${updateData.status}' nicht erlaubt` },
          { status: 400 }
        );
      }
    }
  }

  updateData.updated_at = new Date().toISOString();

  const adminDb = getAdminDb();
  const { data: updated, error } = await adminDb
    .from("quarters")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }

  return NextResponse.json(updated);
}

/**
 * DELETE /api/admin/quarters/[id]
 * Soft-Delete: Status auf 'archived' setzen (KEIN Hard-Delete).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  const adminDb = getAdminDb();

  const { data: updated, error } = await adminDb
    .from("quarters")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }

  return NextResponse.json({ message: "Quartier archiviert", quarter: updated });
}
