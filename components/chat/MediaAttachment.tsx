"use client";

// Rendert Chat-Medien: Bild oder Audio-Player.
// Holt signed read-URL beim Mount (privater Bucket).

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface MediaAttachmentProps {
  mediaType: "image" | "audio";
  mediaPath: string; // Pfad im chat-media-Bucket
  durationSec?: number | null;
}

export function MediaAttachment({
  mediaType,
  mediaPath,
  durationSec,
}: MediaAttachmentProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.storage
      .from("chat-media")
      .createSignedUrl(mediaPath, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setError("Medium konnte nicht geladen werden");
          return;
        }
        setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaPath]);

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">
        {error}
      </div>
    );
  }

  if (!url) {
    return (
      <div className="h-12 w-48 animate-pulse rounded-lg bg-[#2D3142]/10" />
    );
  }

  if (mediaType === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Bild-Anhang"
        className="max-h-80 max-w-full rounded-xl object-contain"
      />
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#2D3142]/5 p-3">
      <audio controls src={url} className="max-w-full">
        <track kind="captions" />
      </audio>
      {durationSec ? (
        <span className="text-sm text-[#2D3142]/70">{durationSec}s</span>
      ) : null}
    </div>
  );
}
