"use client";

// Welle SB-2 — „Erster gemeinsamer Moment".
// Zeigt das neueste Familienfoto gross auf dem Senior-Home, darunter ein
// grosser Sprachantwort-Knopf. Die Antwort verwendet den bestehenden Chat-Stack
// wieder (openConversation -> signed upload -> sendDirectMessage) und faengt den
// Fall „noch kein akzeptierter Kontakt" senior-freundlich ab.
// Wording-Regel (Plan): geteilter Moment, kein „Bericht"/„Monitoring".

import { useState } from "react";
import { Mic } from "lucide-react";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import {
  openConversation,
  requestSignedUploadUrl,
  uploadBlobToSignedUrl,
  sendDirectMessage,
} from "@/lib/chat/client";

export interface FamilienMomentPhoto {
  url: string | null;
  caption: string | null;
  uploaderId: string;
}

type Mode = "idle" | "recording" | "sending" | "sent" | "error";

function isNoContactError(err: unknown): boolean {
  const e = err as { status?: number; code?: string } | null;
  return e?.code === "no_accepted_contact" || e?.status === 403;
}

export function FamilienMomentCard({
  photo,
  heading = "Neu von Ihrer Familie",
}: {
  photo: FamilienMomentPhoto | null;
  /** Ueberschrift + aria-label der Karte. Default = SB-2-Wortlaut. */
  heading?: string;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [errorText, setErrorText] = useState<string>("");

  // Ohne sichtbares Foto wird die Karte nicht angezeigt (additiv, kein Leerzustand).
  if (!photo || !photo.url) return null;

  async function handleAudioComplete(
    blob: Blob,
    durationSec: number,
    mimeType: string,
  ) {
    setMode("sending");
    setErrorText("");
    try {
      const conversation = await openConversation(photo!.uploaderId);
      const { signed_url, path } = await requestSignedUploadUrl(
        "direct",
        conversation.id,
        mimeType,
      );
      await uploadBlobToSignedUrl(signed_url, blob, mimeType);
      await sendDirectMessage(conversation.id, {
        media_type: "audio",
        media_url: path,
        media_duration_sec: durationSec,
      });
      setMode("sent");
    } catch (err) {
      setMode("error");
      setErrorText(
        isNoContactError(err)
          ? "Sie können antworten, sobald Sie mit Ihrer Familie verbunden sind."
          : "Das Senden hat nicht geklappt. Bitte versuchen Sie es später erneut.",
      );
    }
  }

  return (
    <section
      aria-label={heading}
      data-testid="familien-moment-card"
      className="mt-8 rounded-2xl border-2 border-anthrazit/15 bg-white p-4"
    >
      <h2 className="mb-3 text-xl font-bold text-anthrazit">{heading}</h2>

      {/* Signed-URL ist dynamisch -> klassisches img statt next/image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.caption ?? "Familienfoto"}
        className="w-full rounded-2xl object-cover"
        style={{ maxHeight: "320px" }}
      />

      {photo.caption ? (
        <p className="mt-3 text-center text-lg leading-snug text-anthrazit">
          {photo.caption}
        </p>
      ) : null}

      <div className="mt-4">
        {mode === "recording" ? (
          <AudioRecorder
            onComplete={handleAudioComplete}
            onCancel={() => setMode("idle")}
          />
        ) : mode === "sending" ? (
          <p
            className="text-center text-base text-anthrazit/70"
            data-testid="familien-moment-status"
          >
            Ihre Sprachnachricht wird gesendet …
          </p>
        ) : mode === "sent" ? (
          <p
            className="text-center text-base font-semibold text-quartier-green"
            data-testid="familien-moment-status"
          >
            Ihre Sprachnachricht wurde gesendet.
          </p>
        ) : mode === "error" ? (
          <div className="text-center">
            <p
              className="mb-3 text-base text-anthrazit"
              data-testid="familien-moment-status"
            >
              {errorText}
            </p>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="inline-flex items-center justify-center rounded-2xl border-2 border-anthrazit/20 bg-white px-6 text-base font-semibold text-anthrazit"
              style={{ minHeight: "80px" }}
            >
              Zurück
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMode("recording")}
            data-testid="familien-moment-voice-reply"
            aria-label="Mit einer Sprachnachricht antworten"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-quartier-green px-6 text-lg font-bold text-white focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
            style={{ minHeight: "80px", touchAction: "manipulation" }}
          >
            <Mic className="h-7 w-7" />
            Antworten
          </button>
        )}
      </div>
    </section>
  );
}
