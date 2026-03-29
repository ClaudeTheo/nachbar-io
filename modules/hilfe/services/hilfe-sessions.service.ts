// Nachbar Hilfe — Sessions-Service fuer Einsatz-Dokumentation
// Extrahierte Business-Logik aus /api/hilfe/sessions, /api/hilfe/sessions/[id]/receipt, /api/hilfe/sessions/[id]/sign

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import {
  generateReceipt,
  type ReceiptData,
} from "@/modules/hilfe/services/pdf-receipt";

// --- Hilfsfunktionen ---

/**
 * Parst "HH:MM" in Minuten seit Mitternacht.
 * Gibt null zurueck bei ungueltigem Format.
 */
function parseTimeToMinutes(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// --- Sessions auflisten ---

/** Eigene Hilfe-Sessions auflisten (als Helfer oder Bewohner) */
export async function listSessions(supabase: SupabaseClient) {
  // Sessions laden, bei denen der Nutzer als Helfer oder Bewohner beteiligt ist
  // Ueber help_matches -> help_requests die Zuordnung pruefen
  const { data, error } = await supabase
    .from("help_sessions")
    .select("*")
    .order("session_date", { ascending: false });

  if (error) {
    console.error("[hilfe/sessions] Laden fehlgeschlagen:", error);
    throw new ServiceError("Sessions konnten nicht geladen werden", 500);
  }

  return data ?? [];
}

// --- Session erstellen ---

/** Eingabedaten fuer eine neue Session */
export interface CreateSessionInput {
  match_id?: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  activity_category?: string;
  activity_description?: string | null;
  hourly_rate_cents?: number;
}

/** Neue Hilfe-Session erstellen mit automatischer Dauer- und Betragsberechnung */
export async function createSession(
  supabase: SupabaseClient,
  body: CreateSessionInput,
) {
  const {
    match_id,
    session_date,
    start_time,
    end_time,
    activity_category,
    activity_description,
    hourly_rate_cents,
  } = body;

  // Pflichtfeld: match_id
  if (!match_id) {
    throw new ServiceError("match_id ist erforderlich", 400);
  }

  // Pflichtfelder pruefen
  if (
    !session_date ||
    !start_time ||
    !end_time ||
    !activity_category ||
    hourly_rate_cents === undefined
  ) {
    throw new ServiceError(
      "Pflichtfelder: session_date, start_time, end_time, activity_category, hourly_rate_cents",
      400,
    );
  }

  // Zeitvalidierung: end_time muss nach start_time liegen
  const startMinutes = parseTimeToMinutes(start_time);
  const endMinutes = parseTimeToMinutes(end_time);

  if (startMinutes === null || endMinutes === null) {
    throw new ServiceError("Ungültiges Zeitformat (erwartet HH:MM)", 400);
  }

  if (endMinutes <= startMinutes) {
    throw new ServiceError("end_time muss nach start_time liegen", 400);
  }

  // Automatische Berechnung
  const duration_minutes = endMinutes - startMinutes;
  const total_amount_cents = Math.round(
    (duration_minutes / 60) * hourly_rate_cents,
  );

  const { data: session, error: insertError } = await supabase
    .from("help_sessions")
    .insert({
      match_id,
      session_date,
      start_time,
      end_time,
      duration_minutes,
      activity_category,
      activity_description: activity_description ?? null,
      hourly_rate_cents,
      total_amount_cents,
      helper_signature_url: null,
      resident_signature_url: null,
      status: "draft",
    })
    .select()
    .single();

  if (insertError || !session) {
    console.error("[hilfe/sessions] Erstellen fehlgeschlagen:", insertError);
    throw new ServiceError("Session konnte nicht erstellt werden", 500);
  }

  return session;
}

// --- Quittung generieren ---

/** Eingabedaten fuer Bewohner und Helfer bei Quittungserstellung */
export interface GenerateReceiptInput {
  resident: ReceiptData["resident"];
  helper: ReceiptData["helper"];
}

/** PDF-Quittung generieren und in Supabase Storage hochladen */
export async function generateSessionReceipt(
  supabase: SupabaseClient,
  sessionId: string,
  body: GenerateReceiptInput,
) {
  // Session laden
  const { data: session, error: sessionError } = await supabase
    .from("help_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new ServiceError("Session nicht gefunden", 404);
  }

  // Pruefen ob bereits eine Quittung existiert
  if (session.status === "receipt_created") {
    throw new ServiceError("Quittung wurde bereits erstellt", 409);
  }

  // Session muss signiert sein
  if (session.status !== "signed") {
    throw new ServiceError(
      "Session muss zuerst von beiden Parteien unterschrieben werden",
      400,
    );
  }

  if (!body.resident || !body.helper) {
    throw new ServiceError("resident und helper Daten sind erforderlich", 400);
  }

  // PDF generieren
  const receiptData: ReceiptData = {
    resident: body.resident,
    helper: body.helper,
    session: {
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_minutes: session.duration_minutes,
      activity_category: session.activity_category,
      activity_description: session.activity_description,
      hourly_rate_cents: session.hourly_rate_cents,
      total_amount_cents: session.total_amount_cents,
    },
    signatures: {
      helper: session.helper_signature_url ?? "",
      resident: session.resident_signature_url ?? "",
    },
  };

  const pdfBytes = generateReceipt(receiptData);

  // PDF in Supabase Storage hochladen
  const fileName = `receipt_${sessionId}_${Date.now()}.pdf`;
  const storagePath = `hilfe/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("[hilfe/receipt] Upload fehlgeschlagen:", uploadError);
    throw new ServiceError("PDF-Upload fehlgeschlagen", 500);
  }

  // Oeffentliche URL holen
  const { data: urlData } = supabase.storage
    .from("receipts")
    .getPublicUrl(storagePath);

  const pdfUrl = urlData.publicUrl;

  // help_receipts Eintrag erstellen
  const { data: receipt, error: receiptError } = await supabase
    .from("help_receipts")
    .insert({
      session_id: sessionId,
      pdf_url: pdfUrl,
      submitted_to_insurer: false,
    })
    .select()
    .single();

  if (receiptError || !receipt) {
    console.error("[hilfe/receipt] DB-Eintrag fehlgeschlagen:", receiptError);
    throw new ServiceError("Quittung konnte nicht gespeichert werden", 500);
  }

  // Session-Status aktualisieren
  const { error: updateError } = await supabase
    .from("help_sessions")
    .update({ status: "receipt_created" })
    .eq("id", sessionId);

  if (updateError) {
    console.error("[hilfe/receipt] Status-Update fehlgeschlagen:", updateError);
    // Quittung wurde erstellt, nur Status-Update schlug fehl — trotzdem Erfolg zurueckgeben
  }

  return { pdf_url: pdfUrl, receipt_id: receipt.id };
}

// --- Quittung abrufen ---

/** Bestehende Quittung fuer eine Session laden */
export async function getReceipt(supabase: SupabaseClient, sessionId: string) {
  const { data: receipt, error } = await supabase
    .from("help_receipts")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (error || !receipt) {
    throw new ServiceError("Keine Quittung für diese Session gefunden", 404);
  }

  return receipt;
}

// --- Unterschrift hochladen ---

/** Eingabedaten fuer die Signatur */
export interface UploadSignatureInput {
  role?: string;
  signature_data_url?: string;
}

/** Unterschrift (Helfer oder Bewohner) speichern und ggf. Status auf 'signed' setzen */
export async function uploadSignature(
  supabase: SupabaseClient,
  sessionId: string,
  body: UploadSignatureInput,
) {
  const { role, signature_data_url } = body;

  // Rolle validieren
  if (!role || (role !== "helper" && role !== "resident")) {
    throw new ServiceError('role muss "helper" oder "resident" sein', 400);
  }

  if (!signature_data_url) {
    throw new ServiceError("signature_data_url ist erforderlich", 400);
  }

  // Session laden um aktuellen Stand der Unterschriften zu pruefen
  const { data: existingSession, error: fetchError } = await supabase
    .from("help_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (fetchError || !existingSession) {
    throw new ServiceError("Session nicht gefunden", 404);
  }

  // Signatur-Feld bestimmen
  const signatureField =
    role === "helper" ? "helper_signature_url" : "resident_signature_url";
  const otherField =
    role === "helper" ? "resident_signature_url" : "helper_signature_url";

  // Pruefen ob nach dem Update beide Signaturen vorhanden sind
  const bothSigned = existingSession[otherField] !== null;
  const updatePayload: Record<string, unknown> = {
    [signatureField]: signature_data_url,
  };

  // Wenn beide Signaturen vorhanden -> Status auf 'signed' setzen
  if (bothSigned) {
    updatePayload.status = "signed";
  }

  const { data: updated, error: updateError } = await supabase
    .from("help_sessions")
    .update(updatePayload)
    .eq("id", sessionId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error("[hilfe/sessions/sign] Update fehlgeschlagen:", updateError);
    throw new ServiceError("Signatur konnte nicht gespeichert werden", 500);
  }

  return updated;
}
