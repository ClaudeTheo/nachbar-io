// POST /api/hilfe/checkout — Stripe Checkout Session erstellen
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/hilfe/stripe";

export async function POST(request: NextRequest) {
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

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Zahlungssystem nicht konfiguriert" },
      { status: 503 },
    );
  }

  const priceId = process.env.STRIPE_HILFE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Preis nicht konfiguriert" },
      { status: 503 },
    );
  }

  // Helfer-Profil laden
  const { data: helper } = await supabase
    .from("neighborhood_helpers")
    .select("id, subscription_status, stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!helper) {
    return NextResponse.json(
      { error: "Kein Helfer-Profil gefunden" },
      { status: 404 },
    );
  }

  if (helper.subscription_status === "active") {
    return NextResponse.json({ error: "Abo bereits aktiv" }, { status: 400 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://nachbar-io.vercel.app";

  // Stripe Customer erstellen oder wiederverwenden
  let customerId = helper.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { helper_id: helper.id, user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from("neighborhood_helpers")
      .update({ stripe_customer_id: customerId })
      .eq("id", helper.id);
  }

  // Checkout Session erstellen
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card", "sepa_debit"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/hilfe/abo?success=true`,
    cancel_url: `${appUrl}/hilfe/abo?cancelled=true`,
    metadata: { helper_id: helper.id },
    locale: "de",
    subscription_data: {
      metadata: { helper_id: helper.id },
    },
  });

  return NextResponse.json({ url: session.url });
}
