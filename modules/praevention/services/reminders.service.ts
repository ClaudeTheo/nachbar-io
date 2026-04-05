// Praevention — Benachrichtigungs/Reminder-Service
// Cron-tauglich: IMMER getAdminSupabase() verwenden, nie createClient()
// 5 Reminder-Typen: daily, weekly_24h, weekly_1h, caregiver_inactivity, reimbursement

import { getAdminSupabase } from "@/lib/supabase/admin";

const PILOT_MODE = process.env.NEXT_PUBLIC_PILOT_MODE === "true";

interface ReminderResult {
  type: string;
  sent: number;
  errors: number;
}

// Taegliche Uebungs-Erinnerung an alle aktiven Teilnehmer
export async function sendDailyReminder(): Promise<ReminderResult> {
  const adminDb = getAdminSupabase();
  let sent = 0;
  let errors = 0;

  // Aktive Enrollments ohne heutige Session
  const today = new Date().toISOString().split("T")[0];

  const { data: enrollments } = await adminDb
    .from("prevention_enrollments")
    .select(
      `
      id, user_id,
      course:prevention_courses!inner(id, status, title)
    `,
    )
    .is("completed_at", null)
    .filter("course.status", "eq", "active");

  if (!enrollments || enrollments.length === 0)
    return { type: "daily", sent: 0, errors: 0 };

  for (const enrollment of enrollments) {
    // Pruefen ob heute schon eine Session existiert
    const { count } = await adminDb
      .from("prevention_sessions")
      .select("id", { count: "exact", head: true })
      .eq("enrollment_id", enrollment.id)
      .gte("started_at", `${today}T00:00:00`)
      .lte("started_at", `${today}T23:59:59`);

    if ((count ?? 0) > 0) continue; // Schon geuebt

    // Push-Nachricht via prevention_messages (system_reminder)
    const courseTitle =
      (enrollment.course as unknown as { title: string })?.title ||
      "Präventionskurs";
    const { error } = await adminDb.from("prevention_messages").insert({
      course_id: (enrollment.course as unknown as { id: string })?.id,
      sender_id: enrollment.user_id,
      recipient_id: enrollment.user_id,
      message_type: "system_reminder",
      subject: "Tägliche Übung",
      body: `Guten Tag! Ihre heutige Übung im Kurs "${courseTitle}" wartet auf Sie. Nur 10-15 Minuten für mehr Gelassenheit.`,
    });

    if (error) {
      errors++;
    } else {
      sent++;
    }
  }

  return { type: "daily", sent, errors };
}

// Woechentliche Erinnerung 24h vor Gruppen-Einheit
export async function sendWeeklyReminder(
  hoursAhead: 24 | 1,
): Promise<ReminderResult> {
  const adminDb = getAdminSupabase();
  let sent = 0;
  let errors = 0;

  const now = new Date();
  const targetStart = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  const targetEnd = new Date(targetStart.getTime() + 60 * 60 * 1000); // 1h Fenster

  // Gruppen-Calls im Zeitfenster
  const { data: calls } = await adminDb
    .from("prevention_group_calls")
    .select("id, course_id, scheduled_at, week_number")
    .gte("scheduled_at", targetStart.toISOString())
    .lte("scheduled_at", targetEnd.toISOString());

  if (!calls || calls.length === 0)
    return { type: `weekly_${hoursAhead}h`, sent: 0, errors: 0 };

  for (const call of calls) {
    // Alle Teilnehmer des Kurses
    const { data: enrollments } = await adminDb
      .from("prevention_enrollments")
      .select("user_id")
      .eq("course_id", call.course_id)
      .is("completed_at", null);

    if (!enrollments) continue;

    const schedDate = new Date(call.scheduled_at).toLocaleString("de-DE", {
      dateStyle: "long",
      timeStyle: "short",
    });

    for (const e of enrollments) {
      const { error } = await adminDb.from("prevention_messages").insert({
        course_id: call.course_id,
        sender_id: e.user_id,
        recipient_id: e.user_id,
        message_type: "system_reminder",
        subject:
          hoursAhead === 24
            ? "Gruppen-Sitzung morgen"
            : "Gruppen-Sitzung in 1 Stunde",
        body: `Ihre Gruppen-Sitzung (Woche ${call.week_number}) findet am ${schedDate} statt.`,
      });

      if (error) errors++;
      else sent++;
    }
  }

  return { type: `weekly_${hoursAhead}h`, sent, errors };
}

// Caregiver-Inaktivitaets-Benachrichtigung (>3 Tage keine Uebung)
export async function sendCaregiverInactivityNotice(): Promise<ReminderResult> {
  const adminDb = getAdminSupabase();
  let sent = 0;
  let errors = 0;

  const threeDaysAgo = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Aktive Enrollments mit Sichtbarkeits-Consent fuer Caregiver
  const { data: consents } = await adminDb
    .from("prevention_visibility_consent")
    .select("enrollment_id, user_id")
    .eq("viewer_type", "caregiver")
    .is("revoked_at", null);

  if (!consents || consents.length === 0)
    return { type: "caregiver_inactivity", sent: 0, errors: 0 };

  for (const consent of consents) {
    // Letzte Session pruefen
    const { data: lastSession } = await adminDb
      .from("prevention_sessions")
      .select("completed_at")
      .eq("enrollment_id", consent.enrollment_id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Nur benachrichtigen wenn >3 Tage inaktiv
    if (lastSession?.completed_at && lastSession.completed_at > threeDaysAgo)
      continue;

    // Bewohner-Name laden
    const { data: resident } = await adminDb
      .from("users")
      .select("display_name")
      .eq("id", consent.user_id)
      .single();

    // Alle Caregiver des Bewohners
    const { data: links } = await adminDb
      .from("caregiver_links")
      .select("caregiver_id")
      .eq("resident_id", consent.user_id)
      .is("revoked_at", null);

    if (!links || links.length === 0) continue;

    const residentName = resident?.display_name || "Ihr Angehöriger";

    for (const link of links) {
      // Enrollment-Course-ID laden
      const { data: enrollment } = await adminDb
        .from("prevention_enrollments")
        .select("course_id")
        .eq("id", consent.enrollment_id)
        .single();

      if (!enrollment) continue;

      const { error } = await adminDb.from("prevention_messages").insert({
        course_id: enrollment.course_id,
        sender_id: consent.user_id,
        recipient_id: link.caregiver_id,
        message_type: "system_reminder",
        subject: "Inaktivität im Präventionskurs",
        body: `${residentName} hat seit über 3 Tagen keine Übung im Präventionskurs durchgeführt. Vielleicht möchten Sie nachfragen, ob alles in Ordnung ist.`,
      });

      if (error) errors++;
      else sent++;
    }
  }

  return { type: "caregiver_inactivity", sent, errors };
}

// Erstattungs-Erinnerung (4 Wochen nach Einreichung ohne Bestaetigung)
export async function sendReimbursementReminder(): Promise<ReminderResult> {
  const adminDb = getAdminSupabase();
  let sent = 0;
  let errors = 0;

  const fourWeeksAgo = new Date(
    Date.now() - 28 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Einreichungen aelter als 4 Wochen ohne Bestaetigung
  const { data: enrollments } = await adminDb
    .from("prevention_enrollments")
    .select("id, user_id, course_id, reimbursement_submitted_at")
    .eq("reimbursement_reminder_enabled", true)
    .not("reimbursement_submitted_at", "is", null)
    .is("reimbursement_confirmed_at", null)
    .lte("reimbursement_submitted_at", fourWeeksAgo);

  if (!enrollments || enrollments.length === 0)
    return { type: "reimbursement", sent: 0, errors: 0 };

  for (const e of enrollments) {
    const { error } = await adminDb.from("prevention_messages").insert({
      course_id: e.course_id,
      sender_id: e.user_id,
      recipient_id: e.user_id,
      message_type: "system_reminder",
      subject: "Erstattung — Nachfrage empfohlen",
      body: "Sie haben Ihre Erstattung vor über 4 Wochen eingereicht. Falls Sie noch keine Rückmeldung erhalten haben, empfehlen wir, bei Ihrer Krankenkasse nachzufragen.",
    });

    if (error) errors++;
    else sent++;
  }

  return { type: "reimbursement", sent, errors };
}
