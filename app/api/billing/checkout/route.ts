// POST /api/billing/checkout
// Erstellt eine Stripe Checkout Session — oder aktiviert kostenlos fuer Early Adopter
// Business-Logik in billing-checkout.service.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createBillingCheckout,
  provisionPlanResources,
} from "@/lib/services/billing-checkout.service";
import { handleServiceError } from "@/lib/services/service-error";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const enabled = await isFeatureEnabledServer(supabase, "BILLING_ENABLED");
  if (!enabled) {
    return NextResponse.json(
      { error: "Feature in Vorbereitung" },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const origin = request.nextUrl?.origin ?? new URL(request.url).origin;
    const result = await createBillingCheckout(
      supabase,
      user.id,
      user.email,
      body,
      origin,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

// Export fuer Tests und Webhook-Nutzung
export { provisionPlanResources };
