// app/api/hilfe/budget/route.ts
// Nachbar Hilfe — Entlastungsbetrag-Tracker: Monatsbudget und Verbrauch abfragen

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { getBudgetSummary } from "@/modules/hilfe/services/hilfe-core.service";

// GET /api/hilfe/budget — Budget-Zusammenfassung für den aktuellen Monat
export async function GET() {
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
    const summary = await getBudgetSummary(supabase);
    return NextResponse.json(summary);
  } catch (error) {
    return handleServiceError(error);
  }
}
