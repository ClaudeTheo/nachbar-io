import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendInvitation } from "@/lib/services/invitations.service";
import { handleServiceError } from "@/lib/services/service-error";

/**
 * POST /api/invite/send
 *
 * Verifizierter Nutzer lädt einen Nachbarn ein.
 * Body: {
 *   street, houseNumber,
 *   method: 'email' | 'whatsapp' | 'code' | 'sms',
 *   target?: string (E-Mail),
 *   recipientName?: string,
 *   recipientPhone?: string
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const result = await sendInvitation(supabase, user.id, {
      street: body.street,
      houseNumber: body.houseNumber,
      method: body.method,
      target: body.target,
      recipientName: body.recipientName,
      recipientPhone: body.recipientPhone,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
