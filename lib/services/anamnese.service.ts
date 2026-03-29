// Nachbar.io — Anamnese-Service: Token-basierter Anamnese-Bogen (GET + POST)
// Extrahiert aus app/api/anamnese/[token]/route.ts [Wave 5g]

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "./service-error";
import { encryptField } from "@/lib/care/field-encryption";

/** Ergebnis von getAnamneseForm */
export interface AnamneseFormResult {
  form_id: string;
  template_name: string;
  template_description: string | null;
  fields: unknown[];
}

/** Ergebnis von submitAnamneseForm */
export interface AnamneseSubmitResult {
  success: true;
  message: string;
}

/**
 * Laedt ein Anamnese-Formular anhand des Zugangs-Tokens.
 * Kein User-Login noetig — Token-basierter Zugriff mit Admin-Supabase (RLS bypass).
 */
export async function getAnamneseForm(
  adminSupabase: SupabaseClient,
  token: string,
): Promise<AnamneseFormResult> {
  if (!token || token.length < 10) {
    throw new ServiceError("Ungültiger Token.", 400);
  }

  // Formular mit Vorlage laden
  const { data: form, error } = await adminSupabase
    .from("anamnesis_forms")
    .select("id, status, expires_at, template_id")
    .eq("access_token", token)
    .single();

  if (error || !form) {
    throw new ServiceError("Bogen nicht gefunden.", 404);
  }

  if (form.status !== "pending") {
    throw new ServiceError("Dieser Bogen wurde bereits ausgefüllt.", 410);
  }

  if (form.expires_at && new Date(form.expires_at) < new Date()) {
    throw new ServiceError("Dieser Bogen ist abgelaufen.", 410);
  }

  // Vorlage laden (Felder, Name, Beschreibung)
  let templateData = null;
  if (form.template_id) {
    const { data: tpl } = await adminSupabase
      .from("anamnesis_templates")
      .select("name, description, fields")
      .eq("id", form.template_id)
      .single();
    templateData = tpl;
  }

  return {
    form_id: form.id,
    template_name: templateData?.name ?? "Anamnese-Bogen",
    template_description: templateData?.description ?? null,
    fields: templateData?.fields ?? [],
  };
}

/**
 * Speichert Anamnese-Antworten verschluesselt (AES-256-GCM).
 * Optimistic Lock: Update nur wenn Status noch "pending".
 */
export async function submitAnamneseForm(
  adminSupabase: SupabaseClient,
  token: string,
  body: { answers?: unknown },
): Promise<AnamneseSubmitResult> {
  if (!token || token.length < 10) {
    throw new ServiceError("Ungültiger Token.", 400);
  }

  // Bogen laden und pruefen
  const { data: form, error: formError } = await adminSupabase
    .from("anamnesis_forms")
    .select("id, status, expires_at")
    .eq("access_token", token)
    .single();

  if (formError || !form) {
    throw new ServiceError("Bogen nicht gefunden.", 404);
  }

  if (form.status !== "pending") {
    throw new ServiceError("Dieser Bogen wurde bereits ausgefüllt.", 410);
  }

  if (form.expires_at && new Date(form.expires_at) < new Date()) {
    throw new ServiceError("Dieser Bogen ist abgelaufen.", 410);
  }

  const { answers } = body;

  if (!answers || !Array.isArray(answers)) {
    throw new ServiceError("Antworten müssen ein Array sein.", 400);
  }

  // Antworten verschluesseln (AES-256-GCM)
  const encrypted = encryptField(JSON.stringify(answers));

  if (!encrypted) {
    throw new ServiceError("Verschlüsselung fehlgeschlagen.", 500);
  }

  // Bogen aktualisieren
  const { error: updateError } = await adminSupabase
    .from("anamnesis_forms")
    .update({
      form_data_encrypted: encrypted,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", form.id)
    .eq("status", "pending"); // Optimistic Lock: Nur wenn noch pending

  if (updateError) {
    console.error("Anamnese-Submit Fehler:", updateError);
    throw new ServiceError("Bogen konnte nicht gespeichert werden.", 500);
  }

  return {
    success: true,
    message: "Vielen Dank! Ihr Anamnese-Bogen wurde erfolgreich eingereicht.",
  };
}
