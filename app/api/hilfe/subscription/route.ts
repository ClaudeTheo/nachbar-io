// GET /api/hilfe/subscription — Subscription-Status
// POST /api/hilfe/subscription — Abo-Verwaltung (pause/resume/cancel)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/hilfe/stripe";

export async function GET() {
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

  const { data: helper } = await supabase
    .from("neighborhood_helpers")
    .select(
      "subscription_status, stripe_subscription_id, trial_receipt_used, subscription_paused_at, subscription_cancelled_at",
    )
    .eq("user_id", user.id)
    .single();

  if (!helper) {
    return NextResponse.json({ error: "Kein Helfer-Profil" }, { status: 404 });
  }

  return NextResponse.json(helper);
}

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

  const { action } = await request.json();

  const { data: helper } = await supabase
    .from("neighborhood_helpers")
    .select("stripe_subscription_id")
    .eq("user_id", user.id)
    .single();

  if (!helper?.stripe_subscription_id) {
    return NextResponse.json({ error: "Kein aktives Abo" }, { status: 404 });
  }

  const subId = helper.stripe_subscription_id;

  switch (action) {
    case "pause":
      await stripe.subscriptions.update(subId, {
        pause_collection: { behavior: "void" },
      });
      return NextResponse.json({ success: true, action: "paused" });

    case "resume":
      await stripe.subscriptions.update(subId, {
        pause_collection:
          "" as unknown as Stripe.SubscriptionUpdateParams.PauseCollection,
      });
      return NextResponse.json({ success: true, action: "resumed" });

    case "cancel":
      await stripe.subscriptions.update(subId, {
        cancel_at_period_end: true,
      });
      return NextResponse.json({ success: true, action: "cancel_scheduled" });

    default:
      return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  }
}
