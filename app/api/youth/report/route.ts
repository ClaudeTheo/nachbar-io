// app/api/youth/report/route.ts
// Jugend-Modul: Melde-System — Inhalte melden (Thin Wrapper)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { reportYouthContent } from "@/modules/youth/services/youth-routes.service";

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
    const result = await reportYouthContent(supabase, user.id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }
    return handleServiceError(error);
  }
}
