// app/api/youth/report/route.ts
// Jugend-Modul: Melde-System — Inhalte melden (Thin Wrapper)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { reportYouthContent } from "@/modules/youth/services/youth-routes.service";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const moduleEnabled = await isFeatureEnabledServer(supabase, "YOUTH_MODULE");
  if (!moduleEnabled) {
    return NextResponse.json({ error: "Jugend-Modul nicht verfügbar" }, { status: 404 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await reportYouthContent(supabase, user.id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }
    return handleServiceError(error);
  }
}
