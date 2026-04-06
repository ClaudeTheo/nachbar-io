// GET /api/security/dashboard — Security-Events + Stats fuer Admins
// Auth: Nur org_admins (ueber Supabase RLS)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  const hours = parseInt(request.nextUrl.searchParams.get("hours") ?? "24", 10);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // Events laden (RLS filtert automatisch auf Admins)
  const { data: events } = await supabase
    .from("security_events")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);

  // Aggregierte Stats
  const { data: stats } = await supabase
    .from("security_events")
    .select("severity, trap_type")
    .gte("created_at", since);

  const summary = {
    total: stats?.length ?? 0,
    bySeverity: {
      critical: stats?.filter((s) => s.severity === "critical").length ?? 0,
      high: stats?.filter((s) => s.severity === "high").length ?? 0,
      warning: stats?.filter((s) => s.severity === "warning").length ?? 0,
      info: stats?.filter((s) => s.severity === "info").length ?? 0,
    },
    byTrap: Object.fromEntries(
      [
        "fake_admin",
        "honeypot",
        "enumeration",
        "idor",
        "brute_force",
        "scanner_header",
        "cron_probe",
      ].map((t) => [t, stats?.filter((s) => s.trap_type === t).length ?? 0]),
    ),
    unresolved: stats?.filter(() => true).length ?? 0, // RLS filtert
  };

  return NextResponse.json({ events: events ?? [], summary });
}
