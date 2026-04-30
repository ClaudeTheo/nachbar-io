// POST /api/prevention/booking/checkout
// Erstellt Stripe Checkout Session oder Pilot-Einschreibung
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPreventionCheckout } from "@/modules/praevention/services/payment.service";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";

export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const body = await req.json();
    const { courseId, payerType, payerUserId, payerName, payerEmail, insuranceProvider, insuranceConfigId } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId erforderlich" },
        { status: 400 },
      );
    }

    const origin = req.headers.get("origin") || "https://nachbar-io.vercel.app";

    const result = await createPreventionCheckout({
      courseId,
      userId: payerType === "caregiver" && payerUserId ? payerUserId : user.id,
      userEmail: user.email || "",
      payerType: payerType || "self",
      payerUserId: payerType === "caregiver" ? user.id : undefined,
      payerName,
      payerEmail: payerEmail || user.email || "",
      insuranceProvider,
      insuranceConfigId,
      origin,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Prevention checkout error:", err);
    const message = err instanceof Error ? err.message : "Interner Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
