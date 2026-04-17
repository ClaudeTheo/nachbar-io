"use client";

// Chat-Input: Text + Bild-Upload + Audio-Aufnahme.
// Senior-Mode-konform: min 80px Touch-Targets, grosse Schrift.

import { useRef, useState } from "react";
import { Send, Image as ImageIcon, Mic } from "lucide-react";
import { AudioRecorder } from "./AudioRecorder";
import {
  requestSignedUploadUrl,
  uploadBlobToSignedUrl,
} from "@/lib/chat/client";
import type { ChatMediaScope } from "@/modules/chat/services/media-upload.service";

interface ChatInputProps {
  scope: ChatMediaScope;
  ownerId: string;
  onSend: (input: {
    content?: string;
    media_type?: "image" | "audio";
    media_url?: string;
    media_duration_sec?: number;
  }) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({
  scope,
  ownerId,
  onSend,
  disabled,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [showAudio, setShowAudio] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleTextSend() {
    const content = text.trim();
    if (!content || uploading || disabled) return;
    setError(null);
    try {
      await onSend({ content });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Senden fehlgeschlagen");
    }
  }

  async function handleImagePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // reset fuer erneute Wahl
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Nur Bilder erlaubt");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Bild zu gross (max 10 MB)");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const { signed_url, path } = await requestSignedUploadUrl(
        scope,
        ownerId,
        file.type,
      );
      await uploadBlobToSignedUrl(signed_url, file, file.type);
      await onSend({
        media_type: "image",
        media_url: path,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  async function handleAudioComplete(
    blob: Blob,
    durationSec: number,
    mimeType: string,
  ) {
    setShowAudio(false);
    setError(null);
    setUploading(true);
    try {
      const { signed_url, path } = await requestSignedUploadUrl(
        scope,
        ownerId,
        mimeType,
      );
      await uploadBlobToSignedUrl(signed_url, blob, mimeType);
      await onSend({
        media_type: "audio",
        media_url: path,
        media_duration_sec: durationSec,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  if (showAudio) {
    return (
      <div className="border-t border-[#2D3142]/10 bg-white p-3">
        <AudioRecorder
          onComplete={handleAudioComplete}
          onCancel={() => setShowAudio(false)}
        />
      </div>
    );
  }

  return (
    <div className="border-t border-[#2D3142]/10 bg-white p-3">
      {error ? (
        <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || disabled}
          aria-label="Bild senden"
          className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl border border-[#2D3142]/20 bg-white text-[#2D3142] disabled:opacity-50"
        >
          <ImageIcon className="h-6 w-6" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImagePick}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => setShowAudio(true)}
          disabled={uploading || disabled}
          aria-label="Sprachnachricht aufnehmen"
          className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl border border-[#2D3142]/20 bg-white text-[#2D3142] disabled:opacity-50"
        >
          <Mic className="h-6 w-6" />
        </button>

        <div className="flex flex-1 items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleTextSend();
              }
            }}
            placeholder="Nachricht schreiben..."
            rows={1}
            disabled={uploading || disabled}
            className="min-h-20 flex-1 resize-none rounded-2xl border border-[#2D3142]/20 bg-white px-4 py-3 text-base text-[#2D3142] placeholder:text-[#2D3142]/50 focus:border-[#4CAF87] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleTextSend}
            disabled={!text.trim() || uploading || disabled}
            aria-label="Nachricht senden"
            className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-[#4CAF87] text-white disabled:opacity-50"
          >
            <Send className="h-6 w-6" />
          </button>
        </div>
      </div>

      {uploading ? (
        <div className="mt-2 text-center text-sm text-[#2D3142]/70">
          Wird hochgeladen...
        </div>
      ) : null}
    </div>
  );
}
