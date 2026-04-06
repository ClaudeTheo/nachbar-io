// lib/civic/attachment-utils.ts
// Validierung + Upload-Helper fuer Civic-Postfach-Attachments
// DUPLIZIERT in nachbar-civic (separate Git-Repos, kein Shared Lib moeglich)

import { SupabaseClient } from "@supabase/supabase-js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES_PER_MESSAGE = 3;
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const SIGNED_URL_EXPIRY = 3600; // 1 Stunde (konsistent mit nachbar-arzt)

// Dateinamen-Sanitisierung (P2.2): Path-Traversal, Null-Bytes, Laenge
function sanitizeFilename(raw: string): string {
  let name = raw
    .replace(/[/\\]/g, "")
    .replace(/\.\./g, "")
    .replace(/\0/g, "")
    .trim();
  if (name.length > 200) {
    const dotIdx = name.lastIndexOf(".");
    if (dotIdx > 0) {
      const ext = name.slice(dotIdx);
      name = name.slice(0, 200 - ext.length) + ext;
    } else {
      name = name.slice(0, 200);
    }
  }
  return name || "attachment";
}

// Extension aus MIME-Type ableiten (nicht aus Dateiname — sicherer)
function extFromMime(mime: string): string {
  switch (mime) {
    case "application/pdf": return "pdf";
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    default: return "bin";
  }
}

export interface AttachmentValidationError {
  error: string;
  status: number;
}

export interface ValidatedFile {
  file: File;
  sanitizedName: string;
}

// Dateien aus FormData extrahieren und validieren
export function validateAttachmentFiles(
  formData: FormData,
): { files: ValidatedFile[] } | AttachmentValidationError {
  const rawFiles = formData.getAll("files");
  const files: ValidatedFile[] = [];

  for (const raw of rawFiles) {
    if (!(raw instanceof File) || raw.size === 0) continue;
    files.push({ file: raw, sanitizedName: sanitizeFilename(raw.name) });
  }

  if (files.length > MAX_FILES_PER_MESSAGE) {
    return {
      error: `Maximal ${MAX_FILES_PER_MESSAGE} Dateien pro Nachricht erlaubt`,
      status: 400,
    };
  }

  for (const { file } of files) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        error: `Dateityp ${file.type} nicht erlaubt. Erlaubt: PDF, JPG, PNG`,
        status: 400,
      };
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        error: "Datei zu gross (max. 10 MB)",
        status: 400,
      };
    }
  }

  return { files };
}

// Dateien in Supabase Storage hochladen + DB-Eintraege erstellen
export async function uploadAttachments(
  admin: SupabaseClient,
  messageId: string,
  orgId: string,
  uploadedBy: string,
  files: ValidatedFile[],
): Promise<{ error?: string }> {
  for (const { file, sanitizedName } of files) {
    const fileId = crypto.randomUUID();
    const ext = extFromMime(file.type);
    const storagePath = `${orgId}/${messageId}/${fileId}.${ext}`;

    // 1. Storage-Upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from("civic-attachments")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[attachment] Storage-Upload fehlgeschlagen:", uploadError.message);
      return { error: "Datei-Upload fehlgeschlagen" };
    }

    // 2. DB-Eintrag
    const { error: dbError } = await admin
      .from("civic_message_attachments")
      .insert({
        id: fileId,
        message_id: messageId,
        storage_path: storagePath,
        filename: sanitizedName,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: uploadedBy,
      });

    if (dbError) {
      console.error("[attachment] DB-Insert fehlgeschlagen:", dbError.message);
      // Storage aufräumen
      await admin.storage.from("civic-attachments").remove([storagePath]);
      return { error: "Datei-Eintrag speichern fehlgeschlagen" };
    }
  }

  return {};
}

// Signed URL fuer Download generieren
export async function createSignedDownloadUrl(
  admin: SupabaseClient,
  storagePath: string,
): Promise<{ url?: string; error?: string }> {
  const { data, error } = await admin.storage
    .from("civic-attachments")
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    console.error("[attachment] Signed URL fehlgeschlagen:", error?.message);
    return { error: "Download-URL konnte nicht erstellt werden" };
  }

  return { url: data.signedUrl };
}

// Attachment-Metadaten fuer eine Liste von Message-IDs laden
export async function loadAttachmentsForMessages(
  admin: SupabaseClient,
  messageIds: string[],
): Promise<Record<string, Array<{
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
}>>> {
  if (messageIds.length === 0) return {};

  const { data } = await admin
    .from("civic_message_attachments")
    .select("id, message_id, filename, file_size, mime_type")
    .in("message_id", messageIds)
    .order("created_at", { ascending: true });

  const result: Record<string, Array<{
    id: string;
    filename: string;
    file_size: number;
    mime_type: string;
  }>> = {};

  for (const att of data ?? []) {
    if (!result[att.message_id]) result[att.message_id] = [];
    result[att.message_id].push({
      id: att.id,
      filename: att.filename,
      file_size: att.file_size,
      mime_type: att.mime_type,
    });
  }

  return result;
}
