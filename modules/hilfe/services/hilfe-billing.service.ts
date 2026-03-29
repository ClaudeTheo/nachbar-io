// Nachbar Hilfe — Billing-Service fuer Checkout, Subscription, Monatsberichte, Pflege-Profil
// Extrahierte Business-Logik aus /api/hilfe/checkout, /api/hilfe/subscription,
// /api/hilfe/monthly-report, /api/hilfe/monthly-report/send, /api/hilfe/care-profile

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { getStripe } from "@/modules/hilfe/services/stripe";
import { generateMonthlyReport } from "@/modules/hilfe/services/pdf-monthly-report";
import { canAccessBilling } from "@/modules/hilfe/services/feature-gate";
import { sendMonthlyReportEmail } from "@/modules/hilfe/services/email";
import { encryptField, decryptField } from "@/lib/care/field-encryption";
import type Stripe from "stripe";

// --- Checkout ---

/** Stripe Checkout Session erstellen fuer Helfer-Abo */
export async function createHilfeCheckout(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string,
) {
  const stripe = getStripe();
  if (!stripe) {
    throw new ServiceError("Zahlungssystem nicht konfiguriert", 503);
  }

  const priceId = process.env.STRIPE_HILFE_PRICE_ID;
  if (!priceId) {
    throw new ServiceError("Preis nicht konfiguriert", 503);
  }

  // Helfer-Profil laden
  const { data: helper } = await supabase
    .from("neighborhood_helpers")
    .select("id, subscription_status, stripe_customer_id")
    .eq("user_id", userId)
    .single();

  if (!helper) {
    throw new ServiceError("Kein Helfer-Profil gefunden", 404);
  }

  if (helper.subscription_status === "active") {
    throw new ServiceError("Abo bereits aktiv", 400);
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://nachbar-io.vercel.app";

  // Stripe Customer erstellen oder wiederverwenden
  let customerId = helper.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { helper_id: helper.id, user_id: userId },
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

  return { url: session.url };
}

// --- Subscription ---

/** Subscription-Status des Helfers laden */
export async function getSubscription(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: helper } = await supabase
    .from("neighborhood_helpers")
    .select(
      "subscription_status, stripe_subscription_id, trial_receipt_used, subscription_paused_at, subscription_cancelled_at",
    )
    .eq("user_id", userId)
    .single();

  if (!helper) {
    throw new ServiceError("Kein Helfer-Profil", 404);
  }

  return helper;
}

/** Subscription verwalten (pause/resume/cancel) */
export async function updateSubscription(
  supabase: SupabaseClient,
  userId: string,
  action: string,
) {
  const stripe = getStripe();
  if (!stripe) {
    throw new ServiceError("Zahlungssystem nicht konfiguriert", 503);
  }

  const { data: helper } = await supabase
    .from("neighborhood_helpers")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .single();

  if (!helper?.stripe_subscription_id) {
    throw new ServiceError("Kein aktives Abo", 404);
  }

  const subId = helper.stripe_subscription_id;

  switch (action) {
    case "pause":
      await stripe.subscriptions.update(subId, {
        pause_collection: { behavior: "void" },
      });
      return { success: true, action: "paused" };

    case "resume":
      await stripe.subscriptions.update(subId, {
        pause_collection:
          "" as unknown as Stripe.SubscriptionUpdateParams.PauseCollection,
      });
      return { success: true, action: "resumed" };

    case "cancel":
      await stripe.subscriptions.update(subId, {
        cancel_at_period_end: true,
      });
      return { success: true, action: "cancel_scheduled" };

    default:
      throw new ServiceError("Unbekannte Aktion", 400);
  }
}

// --- Monatsberichte ---

/** Bestehende Monatsberichte laden (optional gefiltert) */
export async function listMonthlyReports(
  supabase: SupabaseClient,
  userId: string,
  residentId?: string | null,
  month?: string | null,
) {
  // Helfer-Profil laden
  const { data: helper } = await supabase
    .from("neighborhood_helpers")
    .select("id, subscription_status, trial_receipt_used")
    .eq("user_id", userId)
    .single();

  if (!helper) {
    throw new ServiceError("Kein Helfer-Profil", 404);
  }

  // Feature-Gate pruefen
  if (
    !canAccessBilling(helper.subscription_status, helper.trial_receipt_used)
  ) {
    throw new ServiceError("Abrechnungs-Modul erforderlich", 403);
  }

  // Bestehende Reports laden
  let query = supabase
    .from("help_monthly_reports")
    .select("*")
    .eq("helper_id", helper.id);

  if (residentId) query = query.eq("resident_id", residentId);
  if (month) query = query.eq("month_year", month);

  const { data: reports } = await query.order("created_at", {
    ascending: false,
  });
  return reports || [];
}

/** Monatsbericht generieren + PDF speichern */
export async function generateMonthlyReportForResident(
  supabase: SupabaseClient,
  userId: string,
  residentId: string,
  monthYear: string,
) {
  if (!residentId || !monthYear) {
    throw new ServiceError("resident_id und month_year erforderlich", 400);
  }

  // Helfer-Profil laden
  const { data: helper } = await supabase
    .from("neighborhood_helpers")
    .select(
      "id, user_id, subscription_status, trial_receipt_used, federal_state, date_of_birth, hourly_rate_cents",
    )
    .eq("user_id", userId)
    .single();

  if (!helper) {
    throw new ServiceError("Kein Helfer-Profil", 404);
  }

  if (
    !canAccessBilling(helper.subscription_status, helper.trial_receipt_used)
  ) {
    throw new ServiceError("Abrechnungs-Modul erforderlich", 403);
  }

  // Verbindung pruefen
  const { data: connection } = await supabase
    .from("helper_connections")
    .select("id")
    .eq("helper_id", helper.id)
    .eq("resident_id", residentId)
    .not("confirmed_at", "is", null)
    .is("revoked_at", null)
    .single();

  if (!connection) {
    throw new ServiceError(
      "Keine bestaetigte Verbindung mit diesem Bewohner",
      403,
    );
  }

  // Sessions des Monats laden
  const [year, month] = monthYear.split("-");
  const startDate = `${year}-${month}-01`;
  const endDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const endDate = `${year}-${month}-${endDay.toString().padStart(2, "0")}`;

  const { data: sessions } = await supabase
    .from("help_sessions")
    .select(
      "*, help_matches!inner(helper_id, request_id, help_requests!inner(user_id))",
    )
    .eq("help_matches.helper_id", helper.id)
    .eq("help_matches.help_requests.user_id", residentId)
    .gte("session_date", startDate)
    .lte("session_date", endDate)
    .in("status", ["signed", "receipt_created"]);

  if (!sessions || sessions.length === 0) {
    throw new ServiceError("Keine Einsaetze in diesem Monat", 404);
  }

  // Senior-Profil laden
  const { data: careProfile } = await supabase
    .from("care_profiles_hilfe")
    .select("*")
    .eq("user_id", residentId)
    .single();

  // Benutzer-Daten laden
  const {
    data: { user: seniorUser },
  } = await supabase.auth.admin.getUserById(residentId);
  const {
    data: { user: helperUser },
  } = await supabase.auth.admin.getUserById(userId);

  const totalAmountCents = sessions.reduce(
    (sum: number, s: { total_amount_cents: number }) =>
      sum + s.total_amount_cents,
    0,
  );

  // PDF generieren
  const pdf = generateMonthlyReport({
    helperName: helperUser?.user_metadata?.full_name || "Helfer",
    helperAddress: helperUser?.user_metadata?.address || "",
    seniorName: seniorUser?.user_metadata?.full_name || "Bewohner",
    seniorAddress: seniorUser?.user_metadata?.address || "",
    insuranceName: careProfile?.insurance_name || "",
    insuranceNumber: careProfile?.insurance_number_encrypted || "",
    careLevel: careProfile?.care_level || 1,
    monthYear: monthYear,
    sessions: sessions.map(
      (s: {
        session_date: string;
        start_time: string;
        end_time: string;
        duration_minutes: number;
        activity_category: string;
        total_amount_cents: number;
      }) => ({
        date: s.session_date,
        startTime: s.start_time,
        endTime: s.end_time,
        durationMinutes: s.duration_minutes,
        category: s.activity_category,
        amountCents: s.total_amount_cents,
      }),
    ),
    totalAmountCents,
    hourlyRateCents: helper.hourly_rate_cents,
  });

  // PDF in Supabase Storage speichern
  const fileName = `monthly-reports/${helper.id}/${residentId}/${monthYear}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("hilfe")
    .upload(fileName, pdf, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    console.error("[monthly-report] Upload fehlgeschlagen:", uploadError);
    throw new ServiceError("PDF-Upload fehlgeschlagen", 500);
  }

  const { data: urlData } = supabase.storage
    .from("hilfe")
    .getPublicUrl(fileName);

  // Report in DB speichern
  const { data: report, error: insertError } = await supabase
    .from("help_monthly_reports")
    .upsert(
      {
        helper_id: helper.id,
        resident_id: residentId,
        month_year: monthYear,
        pdf_url: urlData.publicUrl,
        total_sessions: sessions.length,
        total_amount_cents: totalAmountCents,
      },
      { onConflict: "helper_id,resident_id,month_year" },
    )
    .select()
    .single();

  if (insertError) {
    throw new ServiceError(insertError.message, 500);
  }

  return report;
}

// --- Monatsbericht senden ---

/** Monatsbericht per E-Mail versenden */
export async function sendMonthlyReport(
  supabase: SupabaseClient,
  userId: string,
  reportId: string,
  toEmail: string,
) {
  if (!reportId || !toEmail) {
    throw new ServiceError("report_id und to_email erforderlich", 400);
  }

  // Report laden (RLS stellt sicher: nur eigene)
  const { data: report } = await supabase
    .from("help_monthly_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (!report) {
    throw new ServiceError("Report nicht gefunden", 404);
  }

  // PDF aus Storage laden
  const { data: pdfData, error: downloadError } = await supabase.storage
    .from("hilfe")
    .download(report.pdf_url.split("/hilfe/")[1] || "");

  if (downloadError || !pdfData) {
    throw new ServiceError("PDF konnte nicht geladen werden", 500);
  }

  const pdfBuffer = Buffer.from(await pdfData.arrayBuffer());

  // Helfer- und Senior-Namen laden
  const { data: helperUser } = await supabase.auth.admin.getUserById(userId);
  const { data: seniorUser } = await supabase.auth.admin.getUserById(
    report.resident_id,
  );

  const result = await sendMonthlyReportEmail({
    to: toEmail,
    helperName: helperUser?.user?.user_metadata?.full_name || "Helfer",
    seniorName: seniorUser?.user?.user_metadata?.full_name || "Bewohner",
    monthYear: report.month_year,
    totalSessions: report.total_sessions,
    totalAmountCents: report.total_amount_cents,
    pdfBuffer,
  });

  if (!result.success) {
    throw new ServiceError(
      result.error || "E-Mail-Versand fehlgeschlagen",
      500,
    );
  }

  // Report als gesendet markieren
  await supabase
    .from("help_monthly_reports")
    .update({ sent_to_email: toEmail, sent_at: new Date().toISOString() })
    .eq("id", reportId);

  return { success: true };
}

// --- Pflege-Profil ---

// Gueltige Pflegestufen (1-5)
const VALID_CARE_LEVELS = [1, 2, 3, 4, 5] as const;

/** Pflege-Profil des Nutzers laden */
export async function getCareProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("hilfe_care_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[hilfe/care-profile] Abfrage fehlgeschlagen:", error);
    throw new ServiceError("Profil konnte nicht geladen werden", 500);
  }

  if (!data) {
    throw new ServiceError("Kein Pflege-Profil vorhanden", 404);
  }

  // Versichertennummer entschluesseln
  return {
    ...data,
    insurance_number_encrypted: decryptField(data.insurance_number_encrypted),
  };
}

/** Pflege-Profil erstellen oder aktualisieren */
export async function updateCareProfile(
  supabase: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
) {
  const { care_level, insurance_name, insurance_number } = body;

  // Validierung: Pflegestufe (1-5, Pflichtfeld)
  if (care_level === undefined || care_level === null) {
    throw new ServiceError("care_level ist erforderlich", 400);
  }
  if (
    typeof care_level !== "number" ||
    !VALID_CARE_LEVELS.includes(
      care_level as (typeof VALID_CARE_LEVELS)[number],
    )
  ) {
    throw new ServiceError(
      `Ungueltige Pflegestufe: "${care_level}". Erlaubt: 1, 2, 3, 4, 5`,
      400,
    );
  }

  // Validierung: Kassenname (Pflichtfeld)
  if (
    !insurance_name ||
    typeof insurance_name !== "string" ||
    (insurance_name as string).trim().length === 0
  ) {
    throw new ServiceError("insurance_name ist erforderlich", 400);
  }

  // Validierung: Versichertennummer (Pflichtfeld)
  if (
    !insurance_number ||
    typeof insurance_number !== "string" ||
    (insurance_number as string).trim().length === 0
  ) {
    throw new ServiceError("insurance_number ist erforderlich", 400);
  }

  // Versichertennummer verschluesseln (Art. 9 DSGVO)
  const encryptedNumber = encryptField(insurance_number as string);

  // Budget-Defaults nach Pflegestufe (in Cents)
  const budgetByCareLevel: Record<number, number> = {
    1: 12500, // 125 EUR
    2: 12500,
    3: 12500,
    4: 12500,
    5: 12500,
  };

  const upsertData = {
    user_id: userId,
    care_level,
    insurance_name: (insurance_name as string).trim(),
    insurance_number_encrypted: encryptedNumber,
    monthly_budget_cents: budgetByCareLevel[care_level as number] ?? 12500,
    updated_at: new Date().toISOString(),
  };

  // Upsert: Erstellen oder aktualisieren
  const { data: profile, error } = await supabase
    .from("hilfe_care_profiles")
    .upsert(upsertData, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("[hilfe/care-profile] Upsert fehlgeschlagen:", error);
    throw new ServiceError("Profil konnte nicht gespeichert werden", 500);
  }

  // Entschluesselt zurueckgeben
  return {
    ...profile,
    insurance_number_encrypted: decryptField(
      profile.insurance_number_encrypted,
    ),
  };
}
