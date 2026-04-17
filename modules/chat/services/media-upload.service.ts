// Media-Upload-Service: Signed Upload URLs fuer chat-media-Bucket
// Pfad-Konvention (RLS-enforced in Mig 162):
//   direct/{conversation_id}/{uuid}.{ext}
//   chat/{chat_group_id}/{uuid}.{ext}

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

export type ChatMediaScope = "direct" | "chat";
export type ChatMediaType = "image" | "audio";

export interface SignedUploadResult {
  signed_url: string;
  token: string;
  path: string;
  public_url: string;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
};

function randomUuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Fallback (Node < 14.17 — sollte nicht auftreten in Next.js 16)
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Erstellt eine Signed-Upload-URL fuer eine Chat-Mediendatei.
 * Der Pfad folgt der RLS-Konvention; wenn User nicht berechtigt ist,
 * scheitert der tatsaechliche Upload an der RLS-Policy.
 */
export async function createSignedUploadUrl(
  supabase: SupabaseClient,
  params: {
    scope: ChatMediaScope;
    ownerId: string; // conversation_id oder chat_group_id
    mimeType: string;
  },
): Promise<SignedUploadResult> {
  const ext = EXTENSION_BY_MIME[params.mimeType];
  if (!ext) {
    throw new ServiceError(
      `Nicht unterstuetzter MIME-Typ: ${params.mimeType}`,
      400,
      "unsupported_mime",
    );
  }
  if (params.scope !== "direct" && params.scope !== "chat") {
    throw new ServiceError("Ungueltiger scope", 400, "invalid_scope");
  }

  const path = `${params.scope}/${params.ownerId}/${randomUuid()}.${ext}`;

  const { data, error } = await supabase.storage
    .from("chat-media")
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new ServiceError(
      "Upload-URL konnte nicht erstellt werden",
      500,
      "signed_url_failed",
      { details: error?.message },
    );
  }

  // getPublicUrl funktioniert fuer private Buckets nicht direkt zum Abruf,
  // aber liefert den konsistenten Pfad zum spaeteren createSignedUrl zum Lesen.
  const { data: pub } = supabase.storage.from("chat-media").getPublicUrl(path);

  return {
    signed_url: data.signedUrl,
    token: data.token,
    path,
    public_url: pub.publicUrl,
  };
}

/**
 * Erstellt eine Signed-Read-URL zum Anzeigen einer Mediendatei (kurzlebig).
 */
export async function createSignedReadUrl(
  supabase: SupabaseClient,
  path: string,
  expiresInSec: number = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("chat-media")
    .createSignedUrl(path, expiresInSec);

  if (error || !data) {
    throw new ServiceError(
      "Lese-URL konnte nicht erstellt werden",
      500,
      "signed_read_failed",
      { details: error?.message },
    );
  }

  return data.signedUrl;
}
