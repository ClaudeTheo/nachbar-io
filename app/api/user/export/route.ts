// GET /api/user/export
// DSGVO Art. 20 — Recht auf Datenportabilität
// Business-Logik in user-account.service.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportUserData } from "@/lib/services/user-account.service";
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
    const exportData = await exportUserData(supabase, user.id);

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
