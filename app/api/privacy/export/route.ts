// POST /api/privacy/export — DSGVO Art. 15 Auskunft + Art. 20 Datenportabilitaet
// Gibt alle persoenlichen Daten des authentifizierten Nutzers als JSON zurueck

import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { exportPrivacyData } from "@/lib/services/privacy-export.service";

export async function POST() {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  try {
    const result = await exportPrivacyData(auth.supabase, auth.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
