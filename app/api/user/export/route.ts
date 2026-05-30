// GET /api/user/export
// DSGVO Art. 15/20 — Auskunft + Datenportabilität
// Business-Logik in lib/services/gdpr/account-export.service.ts (Single Source)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { exportAccountData } from "@/lib/services/gdpr/account-export.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    // Service-Role für Vollständigkeit (kein RLS-Blindspot); Filter strikt auf user.id
    const exportData = await exportAccountData(getAdminSupabase(), user.id);

    // Als JSON-Download zurueckgeben
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="nachbar-io-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    return handleServiceError(error);
  }
}
