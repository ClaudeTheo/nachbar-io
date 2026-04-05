// GET /api/prevention/dashboard — Kursleiter-Dashboard-Daten
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDashboardOverview } from "@/modules/praevention/services/dashboard.service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  // Kursleiter-Berechtigung pruefen
  const { data: course } = await supabase
    .from("prevention_courses")
    .select("id")
    .eq("instructor_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!course) {
    return NextResponse.json(
      { error: "Kein Zugriff — nur fuer Kursleiter" },
      { status: 403 },
    );
  }

  const overview = await getDashboardOverview(user.id);

  if (!overview) {
    return NextResponse.json(
      { error: "Dashboard-Daten nicht verfuegbar" },
      { status: 404 },
    );
  }

  return NextResponse.json(overview);
}
