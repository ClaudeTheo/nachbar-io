// Nachbar.io — Patienten-API: Terminverhandlung (Bestätigen/Gegenvorschlag/Ablehnen)
import { NextRequest, NextResponse } from "next/server";
import { canTransition, type AppointmentStatus } from "@/lib/consultation/appointment-status";
import { createCareLogger } from "@/lib/care/logger";
import { requireAuth, requireSubscription, unauthorizedResponse } from "@/lib/care/api-helpers";
import { sendAppointmentPush, sendAppointmentEmail } from "@/lib/consultation/notifications";

const ACTION_TO_STATUS: Record<string, AppointmentStatus> = {
  confirm: "confirmed",
  counter_propose: "counter_proposed",
  decline: "declined",
  cancel: "cancelled",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = createCareLogger("care/consultations/PATCH");
  const { id } = await params;

  // Auth
  const auth = await requireAuth();
  if (!auth) {
    log.done(401);
    return unauthorizedResponse();
  }

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  const body = await req.json();
  const { action, scheduled_at } = body;

  if (!action || !ACTION_TO_STATUS[action]) {
    log.done(400);
    return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
  }

  // Aktuellen Termin laden
  const { data: slot, error: fetchError } = await supabase
    .from("consultation_slots")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !slot) {
    log.done(404);
    return NextResponse.json({ error: "Termin nicht gefunden" }, { status: 404 });
  }

  // Pruefen ob Nutzer Patient dieses Termins ist
  if (slot.booked_by !== user.id) {
    log.done(403);
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  }

  // Rolle bestimmen: proposed_by zeigt auf den Vorschlagenden
  const actor = "patient" as const;
  const proposedBy = slot.proposed_by === slot.host_user_id ? "doctor" : "patient";
  const targetStatus = ACTION_TO_STATUS[action];

  if (!canTransition(slot.status as AppointmentStatus, targetStatus, actor, proposedBy)) {
    log.done(422);
    return NextResponse.json(
      { error: `Übergang von ${slot.status} nach ${targetStatus} nicht erlaubt` },
      { status: 422 }
    );
  }

  // Update vorbereiten
  const updateData: Record<string, unknown> = {
    status: targetStatus,
    status_changed_at: new Date().toISOString(),
  };

  if (action === "counter_propose") {
    if (!scheduled_at) {
      log.done(400);
      return NextResponse.json({ error: "Neues Datum erforderlich" }, { status: 400 });
    }
    updateData.previous_scheduled_at = slot.scheduled_at;
    updateData.scheduled_at = scheduled_at;
    updateData.counter_proposed_at = new Date().toISOString();
    updateData.proposed_by = user.id;
  }

  if (action === "confirm") {
    // Jitsi-Raum-URL setzen bei Bestaetigung
    // provider_type wird NICHT geaendert — gehoert zur Identitaet des Slots
    const roomId = `nachbar-${id.slice(0, 8)}`;
    updateData.join_url = `https://meet.jit.si/${roomId}`;
  }

  if (action === "cancel") {
    updateData.cancelled_by = user.id;
  }

  const { error: updateError } = await supabase
    .from("consultation_slots")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    log.error("update_error", updateError.message);
    log.done(500);
    return NextResponse.json({ error: "Aktualisierung fehlgeschlagen" }, { status: 500 });
  }

  log.info("appointment_action", { slotId: id, action, targetStatus });

  // Benachrichtigung an Arzt senden (async, nicht blockierend)
  const doctorId = slot.host_user_id ?? slot.doctor_id;
  if (doctorId) {
    const { data: patient } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .single();
    const patientName = patient?.display_name ?? "Patient";
    const scheduledAt = (updateData.scheduled_at as string) ?? slot.scheduled_at;
    const event = targetStatus === "confirmed" ? "confirmed"
      : targetStatus === "counter_proposed" ? "counter_proposed"
      : targetStatus === "declined" ? "declined"
      : "cancelled";

    // Push + E-Mail (fire-and-forget, Fehler nicht blockierend)
    sendAppointmentPush(doctorId, event, patientName, scheduledAt).catch(() => {});

    const { data: doctor } = await supabase
      .from("users")
      .select("email")
      .eq("id", doctorId)
      .single();
    if (doctor?.email) {
      sendAppointmentEmail(doctor.email, event, patientName, scheduledAt).catch(() => {});
    }
  }

  log.done(200);
  return NextResponse.json({ success: true, status: targetStatus });
}
