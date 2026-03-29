// app/api/care/consent/revoke/route.ts
// Art. 9 Einwilligungswiderruf mit optionaler Datenlöschung

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { revokeConsent } from "@/modules/care/services/consent-routes.service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  let body: { feature?: string; delete_data?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const result = await revokeConsent(
      supabase,
      user.id,
      body.feature ?? "",
      body.delete_data ?? false,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
