// app/api/admin/households/route.ts
// Admin-Endpunkt: Haushalte inkl. invite_code + memberCount fuers Admin-Panel.
//
// households.invite_code ist seit Mig 20260530160000 fuer Browser-Clients gesperrt.
// Der Lesepfad fuer Admins laeuft daher server-seitig:
//  - Haushalts-SICHTBARKEIT bleibt RLS-bestimmt (user-scoped SSR-Client) — super_admin
//    sieht alle Quartiere, quarter_admin nur das eigene. Kein Scope-Bug moeglich.
//  - invite_code wird nur fuer genau die schon sichtbaren IDs via Service-Role
//    angereichert (kein cross-quarter-Leak, kein IDOR — IDs stammen aus dem RLS-Query).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { HOUSEHOLD_SELECT_COLUMNS } from "@/lib/services/household.service";

export const dynamic = "force-dynamic";

export async function GET() {
  // --- Auth: nur Admins ---
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  // --- Sichtbarkeit via RLS (user-scoped, ohne invite_code) ---
  const { data: visibleData, error: hErr } = await supabase
    .from("households")
    .select(HOUSEHOLD_SELECT_COLUMNS)
    .order("street_name", { ascending: true });
  if (hErr) {
    console.error("[admin/households] DB-Fehler (households):", hErr);
    return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
  }
  // select() mit Spalten-Variable liefert keinen praezisen Type -> ueber unknown casten
  const visible = (visibleData ?? []) as unknown as Array<
    Record<string, unknown> & { id: string }
  >;
  const ids = visible.map((h) => h.id);
  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  // --- memberCount (user-scoped, wie bisher im Admin-Client) ---
  const { data: memberData } = await supabase
    .from("household_members")
    .select("household_id")
    .in("household_id", ids);
  const memberCounts = new Map<string, number>();
  for (const m of (memberData ?? []) as Array<{ household_id: string }>) {
    memberCounts.set(m.household_id, (memberCounts.get(m.household_id) ?? 0) + 1);
  }

  // --- invite_code nur fuer die sichtbaren IDs (Service-Role, umgeht Spaltenschutz) ---
  const adminDb = getAdminSupabase();
  const { data: codeData, error: cErr } = await adminDb
    .from("households")
    .select("id, invite_code")
    .in("id", ids);
  if (cErr) {
    console.error("[admin/households] DB-Fehler (invite_code):", cErr);
    return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
  }
  const codeById = new Map<string, string>();
  for (const c of (codeData ?? []) as Array<{ id: string; invite_code: string }>) {
    codeById.set(c.id, c.invite_code);
  }

  // --- Anreichern: Liste als Array zurueckgeben (CLAUDE.md: nie { items: [...] }) ---
  const enriched = visible.map((h) => ({
    ...h,
    invite_code: codeById.get(h.id) ?? "",
    memberCount: memberCounts.get(h.id) ?? 0,
  }));

  return NextResponse.json(enriched);
}
