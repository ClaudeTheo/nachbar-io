// components/senior/ReviewWrapper.tsx
// Task H-3: Client-Wrapper der das Transkript aus sessionStorage liest
// und an ReviewView weitergibt. Ohne Transkript → Redirect zur Mic-Seite.
//
// Welle S2 (A3:3): Zusaetzlich der Direkt-Tippen-Pfad. Setzt die Mic-Seite das
// Flag `schreiben_tippen_${index}`, oeffnet die View ohne Transkript direkt im
// Bearbeitungsmodus (leere Textarea) — der Senior kann tippen, auch wenn die
// Spracherkennung/KI (AI_PROVIDER_OFF) gar nicht verfuegbar ist.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ReviewView } from "@/components/senior/ReviewView";

export interface ReviewWrapperProps {
  recipientName: string;
  recipientIndex: number;
  recipientPhone: string;
}

export function ReviewWrapper({
  recipientName,
  recipientIndex,
  recipientPhone,
}: ReviewWrapperProps) {
  const router = useRouter();
  const [transcript] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(`schreiben_transcript_${recipientIndex}`);
  });
  const [typeMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(`schreiben_tippen_${recipientIndex}`) === "1";
  });

  useEffect(() => {
    // Direkt-Tippen-Flag aufraeumen — gilt nur fuer diesen Aufruf.
    if (typeMode) {
      sessionStorage.removeItem(`schreiben_tippen_${recipientIndex}`);
      return;
    }
    if (!transcript) {
      router.replace(`/schreiben/mic/${recipientIndex}`);
    }
  }, [recipientIndex, router, transcript, typeMode]);

  if (!transcript && !typeMode) return null;

  return (
    <ReviewView
      recipientName={recipientName}
      recipientIndex={recipientIndex}
      recipientPhone={recipientPhone}
      transcript={transcript ?? ""}
      startInEditMode={typeMode}
    />
  );
}
