// app/api/care/sos/[id]/route.ts
// Nachbar.io — SOS-Detail-Endpunkt: Abfrage und Status-Änderung einzelner Alerts (Thin Route)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getSosAlert,
  updateSosStatus,
} from "@/modules/care/services/sos.service";

// GET /api/care/sos/[id] — Einzelnen SOS-Alert mit Antworten und Senior-Profil abrufen
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  try {
    const result = await getSosAlert(supabase, user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

// PATCH /api/care/sos/[id] — SOS-Alert schließen oder abbrechen
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  let body: { status?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const result = await updateSosStatus(supabase, user.id, id, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
