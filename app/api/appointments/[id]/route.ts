// app/api/appointments/[id]/route.ts
// Nachbar.io — Termin absagen (DELETE)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/appointments/[id]
 * Eigenen Termin absagen: Setzt status auf 'cancelled' und loescht patient_id.
 * Nur fuer den eigenen Termin (patient_id = user.id).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth pruefen
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  // Nur eigene Termine absagen (patient_id = user.id)
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "cancelled", patient_id: null })
    .eq("id", id)
    .eq("patient_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[appointments] Fehler beim Absagen:", error);
    // PGRST116 = kein Ergebnis → Termin nicht gefunden oder nicht eigener
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Termin nicht gefunden oder keine Berechtigung" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Termin konnte nicht abgesagt werden" },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
