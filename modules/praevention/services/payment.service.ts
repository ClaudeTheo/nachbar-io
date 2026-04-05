// Praevention — Zahlungs-Service
// Stripe Checkout (SEPA, Card, PayPal) + Invoice + Webhook-Handling
// Im PILOT_MODE werden Zahlungen uebersprungen (direkte Einschreibung)

import { stripe } from "@/lib/stripe";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { enrollInCourse } from "./enrollments.service";

const PILOT_MODE = process.env.NEXT_PUBLIC_PILOT_MODE === "true";

// Kurs-Preis in Cent (149 EUR Selbstzahler)
const PREVENTION_COURSE_PRICE_CENTS = 14900;
const PREVENTION_COURSE_CURRENCY = "eur";

export interface CheckoutParams {
  courseId: string;
  userId: string;
  userEmail: string;
  payerType: "self" | "caregiver" | "organization";
  payerUserId?: string;
  payerName?: string;
  payerEmail?: string;
  insuranceProvider?: string;
  insuranceConfigId?: string;
  origin: string;
}

export interface CheckoutResult {
  type: "pilot_free" | "stripe_checkout" | "stripe_invoice";
  url?: string | null;
  enrollmentId?: string;
  invoiceId?: string;
}

// Stripe Checkout Session erstellen (SEPA, Card, PayPal)
export async function createPreventionCheckout(
  params: CheckoutParams,
): Promise<CheckoutResult> {
  // Pilot-Modus: Direkt kostenlos einschreiben
  if (PILOT_MODE) {
    const enrollment = await enrollInCourse({
      courseId: params.courseId,
      userId: params.userId,
      payerType: "pilot_free",
      payerUserId: params.payerUserId,
      payerName: params.payerName,
      payerEmail: params.payerEmail,
      insuranceProvider: params.insuranceProvider,
      insuranceConfigId: params.insuranceConfigId,
    });
    return { type: "pilot_free", enrollmentId: enrollment.id };
  }

  if (!stripe) {
    throw new Error("Zahlungen sind derzeit nicht verfügbar.");
  }

  const metadata: Record<string, string> = {
    user_id: params.userId,
    course_id: params.courseId,
    payer_type: params.payerType,
    product: "prevention_course",
  };

  if (params.payerUserId) metadata.payer_user_id = params.payerUserId;
  if (params.payerName) metadata.payer_name = params.payerName;
  if (params.payerEmail) metadata.payer_email = params.payerEmail;
  if (params.insuranceProvider)
    metadata.insurance_provider = params.insuranceProvider;
  if (params.insuranceConfigId)
    metadata.insurance_config_id = params.insuranceConfigId;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.payerEmail || params.userEmail,
    payment_method_types: ["card", "sepa_debit"],
    line_items: [
      {
        price_data: {
          currency: PREVENTION_COURSE_CURRENCY,
          product_data: {
            name: "Aktiv im Quartier — Präventionskurs (8 Wochen)",
            description:
              "ZPP-zertifizierter Stressbewältigungskurs mit KI-Begleitung",
          },
          unit_amount: PREVENTION_COURSE_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    success_url: `${params.origin}/praevention/buchen?success=true&course_id=${params.courseId}`,
    cancel_url: `${params.origin}/praevention/buchen?cancelled=true`,
    metadata,
  });

  return { type: "stripe_checkout", url: session.url };
}

// Stripe Invoice erstellen (Kauf auf Rechnung fuer Organisationen)
export async function createPreventionInvoice(params: {
  courseId: string;
  userId: string;
  userEmail: string;
  orgName: string;
  orgEmail: string;
}): Promise<CheckoutResult> {
  if (PILOT_MODE) {
    const enrollment = await enrollInCourse({
      courseId: params.courseId,
      userId: params.userId,
      payerType: "organization",
    });
    return { type: "pilot_free", enrollmentId: enrollment.id };
  }

  if (!stripe) {
    throw new Error("Zahlungen sind derzeit nicht verfügbar.");
  }

  // Stripe Customer erstellen oder finden
  const customers = await stripe.customers.list({
    email: params.orgEmail,
    limit: 1,
  });
  let customer = customers.data[0];

  if (!customer) {
    customer = await stripe.customers.create({
      email: params.orgEmail,
      name: params.orgName,
      metadata: {
        user_id: params.userId,
        type: "prevention_org",
      },
    });
  }

  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: "send_invoice",
    days_until_due: 14,
    metadata: {
      user_id: params.userId,
      course_id: params.courseId,
      product: "prevention_course",
      payer_type: "organization",
    },
  });

  await stripe.invoiceItems.create({
    customer: customer.id,
    invoice: invoice.id,
    amount: PREVENTION_COURSE_PRICE_CENTS,
    currency: PREVENTION_COURSE_CURRENCY,
    description: "Aktiv im Quartier — Präventionskurs (8 Wochen)",
  });

  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
  await stripe.invoices.sendInvoice(finalizedInvoice.id);

  return { type: "stripe_invoice", invoiceId: finalizedInvoice.id };
}

// Webhook: Zahlung bestaetigt → Enrollment aktivieren
export async function handlePreventionPaymentSuccess(
  paymentIntentOrInvoice: {
    metadata?: Record<string, string> | null;
    amount?: number;
    amount_paid?: number;
    id: string;
  },
  eventType: "checkout" | "invoice",
): Promise<{ enrollmentId: string } | null> {
  const metadata = paymentIntentOrInvoice.metadata;
  if (!metadata || metadata.product !== "prevention_course") return null;

  const { user_id, course_id, payer_type } = metadata;
  if (!user_id || !course_id) return null;

  const adminDb = getAdminSupabase();

  // Pruefen ob bereits eingeschrieben
  const { data: existing } = await adminDb
    .from("prevention_enrollments")
    .select("id")
    .eq("user_id", user_id)
    .eq("course_id", course_id)
    .maybeSingle();

  if (existing) {
    // Schon eingeschrieben — nur Zahlung protokollieren
    await adminDb.from("prevention_payments").insert({
      enrollment_id: existing.id,
      stripe_payment_id: paymentIntentOrInvoice.id,
      amount_cents:
        paymentIntentOrInvoice.amount ||
        paymentIntentOrInvoice.amount_paid ||
        PREVENTION_COURSE_PRICE_CENTS,
      payment_type: "self_pay",
      payment_method:
        eventType === "invoice" ? "invoice" : "card",
      status: "paid",
      payer_user_id: metadata.payer_user_id || user_id,
      insurance_name: metadata.insurance_provider || null,
    });
    return { enrollmentId: existing.id };
  }

  // Einschreiben
  const { data: enrollment, error } = await adminDb
    .from("prevention_enrollments")
    .insert({
      course_id,
      user_id,
      payer_type: (payer_type as "self" | "caregiver" | "organization") || "self",
      payer_user_id: metadata.payer_user_id || null,
      payer_name: metadata.payer_name || null,
      payer_email: metadata.payer_email || null,
      insurance_provider: metadata.insurance_provider || null,
      insurance_config_id: metadata.insurance_config_id || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Prevention enrollment nach Zahlung fehlgeschlagen:", error);
    return null;
  }

  // Zahlung protokollieren
  await adminDb.from("prevention_payments").insert({
    enrollment_id: enrollment.id,
    stripe_payment_id: paymentIntentOrInvoice.id,
    amount_cents:
      paymentIntentOrInvoice.amount ||
      paymentIntentOrInvoice.amount_paid ||
      PREVENTION_COURSE_PRICE_CENTS,
    payment_type: "self_pay",
    payment_method: eventType === "invoice" ? "invoice" : "card",
    status: "paid",
    payer_user_id: metadata.payer_user_id || user_id,
    insurance_name: metadata.insurance_provider || null,
  });

  return { enrollmentId: enrollment.id };
}
