// GET /api/hilfe/federal-states — Öffentliche Bundesland-Regeln
import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/services/service-error";
import { listFederalStates } from "@/modules/hilfe/services/hilfe-core.service";

export async function GET() {
  // Öffentliche Referenzdaten, keine Auth erforderlich
  try {
    return NextResponse.json(listFederalStates());
  } catch (error) {
    return handleServiceError(error);
  }
}
