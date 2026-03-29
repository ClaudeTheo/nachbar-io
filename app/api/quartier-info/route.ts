// GET /api/quartier-info?quarter_id=...
// Liefert alle Quartier-Informationen (Wetter, Pollen, NINA, Muell, OEPNV etc.)
// Business-Logik in quartier-info.service.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQuartierInfo } from "@/lib/services/quartier-info.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const quarterId = searchParams.get("quarter_id");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler" },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const result = await getQuartierInfo(supabase, quarterId ?? "");
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
