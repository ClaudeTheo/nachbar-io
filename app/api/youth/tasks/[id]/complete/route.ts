// app/api/youth/tasks/[id]/complete/route.ts
// Jugend-Modul: Aufgabe abschliessen + Punkte buchen (Thin Wrapper)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { completeYouthTask } from "@/modules/youth/services/youth-routes.service";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params;
    const result = await completeYouthTask(supabase, user.id, id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleServiceError(error);
  }
}
