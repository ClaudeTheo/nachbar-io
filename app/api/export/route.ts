// app/api/export/route.ts
// Nachbar.io — CSV/XLSX-Export API fuer B2B-Organisationen (Thin Wrapper)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportData } from "@/lib/services/export.service";
import { handleServiceError } from "@/lib/services/service-error";
import {
  generateTypedCsv,
  generateTypedXlsx,
  getExportFilename,
} from "@/lib/export";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Auth pruefen
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 },
      );
    }

    // Geschaeftslogik im Service
    const { rows, type, format } = await exportData(supabase, user.id, {
      type: searchParams.get("type"),
      format: searchParams.get("format"),
      quarterId: searchParams.get("quarter_id"),
    });

    // Export generieren
    const filename = getExportFilename(type, format);

    if (format === "xlsx") {
      const buffer = generateTypedXlsx(rows, type);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // CSV
    const csv = generateTypedCsv(rows, type);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleServiceError(error);
  }
}
