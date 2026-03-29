// POST /api/hilfe/checkout — Stripe Checkout Session erstellen
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { createHilfeCheckout } from "@/modules/hilfe/services/hilfe-billing.service";

export async function POST(_request: NextRequest) {
  try {
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

    const result = await createHilfeCheckout(supabase, user.id, user.email);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
