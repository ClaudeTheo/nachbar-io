// app/api/youth/consent/revoke/route.ts
// Jugend-Modul: Elternfreigabe widerrufen (Thin Wrapper)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { revokeYouthConsent } from "@/modules/youth/services/youth-routes.service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const headers = {
      ip: request.headers.get("x-forwarded-for") || "",
      userAgent: request.headers.get("user-agent") || "",
    };
    const result = await revokeYouthConsent(supabase, body, headers);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }
    return handleServiceError(error);
  }
}
