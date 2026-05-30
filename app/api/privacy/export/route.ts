// POST /api/privacy/export — DSGVO Art. 15 Auskunft + Art. 20 Datenportabilität
// Gibt alle personenbezogenen Daten des authentifizierten Nutzers als JSON zurueck.
// Business-Logik in lib/services/gdpr/account-export.service.ts (Single Source).

import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/care/api-helpers";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { exportAccountData } from "@/lib/services/gdpr/account-export.service";

export async function POST() {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  try {
    // Service-Role für Vollständigkeit (kein RLS-Blindspot); Filter strikt auf user.id
    const result = await exportAccountData(getAdminSupabase(), auth.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
