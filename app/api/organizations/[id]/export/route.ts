// app/api/organizations/[id]/export/route.ts
// Nachbar.io — CSV/XLSX-Export für Pro Community Organisationen

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { generateCsv, generateXlsx } from "@/lib/export";
import {
  requireAuth,
  requireSubscription,
  requireOrgAccess,
  requireAdmin,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  validateExportParams,
  fetchExportData,
  generateExportFilename,
} from "@/modules/admin/services/organizations.service";

export const dynamic = "force-dynamic";

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/organizations/[id]/export?format=csv|xlsx&type=residents|alerts|checkins
 * Exportiert Organisationsdaten als CSV oder XLSX Datei-Download.
 * Erfordert Pro-Abo + org_admin oder Plattform-Admin.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth-Guard
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Abo-Guard: Pro erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, "pro");
  if (sub instanceof NextResponse) return sub;

  // Org-Zugriffs-Guard: Admin-Rolle erforderlich (oder Plattform-Admin als Fallback)
  const org = await requireOrgAccess(auth.supabase, auth.user.id, id, "admin");
  if (org instanceof NextResponse) {
    const isPlatformAdmin = await requireAdmin(auth.supabase, auth.user.id);
    if (!isPlatformAdmin) return org;
  }

  try {
    // Query-Parameter validieren
    const { searchParams } = request.nextUrl;
    const { format, type } = validateExportParams(
      searchParams.get("format"),
      searchParams.get("type"),
    );

    // Daten laden
    const exportData = await fetchExportData(getServiceDb(), id, type);

    // Dateiname generieren
    const filename = generateExportFilename(type, format);

    // Export generieren
    if (format === "csv") {
      const csv = generateCsv(exportData.headers, exportData.rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // XLSX
    const xlsxBuffer = await generateXlsx(exportData.headers, exportData.rows);
    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleServiceError(error);
  }
}
