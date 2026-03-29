// app/api/youth/consent/send/route.ts
// Jugend-Modul: Elternfreigabe-Token per SMS senden (Thin Wrapper)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { sendYouthConsentSms } from "@/modules/youth/services/youth-routes.service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await sendYouthConsentSms(
      supabase,
      { id: user.id, user_metadata: user.user_metadata },
      body.guardian_phone,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }
    return handleServiceError(error);
  }
}
