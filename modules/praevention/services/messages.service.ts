// Praevention — Nachrichten-Service
// Broadcast + Einzelnachrichten vom Kursleiter an Teilnehmer

import { createClient } from "@/lib/supabase/server";

export interface PreventionMessage {
  id: string;
  course_id: string;
  sender_id: string;
  recipient_id: string | null;
  message_type: "broadcast" | "individual" | "system_reminder";
  subject: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
  sender?: { display_name: string };
  recipient?: { display_name: string } | null;
}

// Broadcast an alle Teilnehmer eines Kurses
export async function sendBroadcast(
  courseId: string,
  senderId: string,
  subject: string,
  body: string,
): Promise<PreventionMessage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_messages")
    .insert({
      course_id: courseId,
      sender_id: senderId,
      recipient_id: null,
      message_type: "broadcast",
      subject,
      body,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PreventionMessage;
}

// Einzelnachricht an Teilnehmer
export async function sendIndividual(
  courseId: string,
  senderId: string,
  recipientId: string,
  subject: string,
  body: string,
): Promise<PreventionMessage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_messages")
    .insert({
      course_id: courseId,
      sender_id: senderId,
      recipient_id: recipientId,
      message_type: "individual",
      subject,
      body,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PreventionMessage;
}

// Nachrichten fuer einen Nutzer laden
export async function getMessagesForUser(
  userId: string,
  courseId?: string,
): Promise<PreventionMessage[]> {
  const supabase = await createClient();

  let query = supabase
    .from("prevention_messages")
    .select("*, sender:users!prevention_messages_sender_id_fkey(display_name)")
    .or(`recipient_id.eq.${userId},recipient_id.is.null`)
    .order("created_at", { ascending: false });

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as PreventionMessage[];
}

// Gesendete Nachrichten fuer Kursleiter laden
export async function getSentMessages(
  senderId: string,
  courseId: string,
): Promise<PreventionMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prevention_messages")
    .select(
      "*, recipient:users!prevention_messages_recipient_id_fkey(display_name)",
    )
    .eq("course_id", courseId)
    .eq("sender_id", senderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PreventionMessage[];
}

// Nachricht als gelesen markieren
export async function markAsRead(messageId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prevention_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) throw error;
}
