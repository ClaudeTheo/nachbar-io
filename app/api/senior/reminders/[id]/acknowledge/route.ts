// POST /api/senior/reminders/[id]/acknowledge — „Gesehen"-Quittung (Welle SB-4)
//
// Cookie-Auth fuer „wer quittiert"; die eigentliche Autorisierung + das Setzen
// von acknowledged_at laeuft im Service via Admin-Client (RLS-UPDATE bewusst
// nicht geoeffnet). Rate-Limit: middleware-Default /api/ (60/min).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { acknowledgeSeniorReminder } from "@/modules/care/services/senior-kiosk.service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
  }

  try {
    const admin = getAdminSupabase();
    const result = await acknowledgeSeniorReminder(admin, user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
