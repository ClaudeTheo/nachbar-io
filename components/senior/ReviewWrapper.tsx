// components/senior/ReviewWrapper.tsx
// Task H-3: Client-Wrapper der das Transkript aus sessionStorage liest
// und an ReviewView weitergibt. Ohne Transkript → Redirect zur Mic-Seite.

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
  const [transcript, setTranscript] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(
      `schreiben_transcript_${recipientIndex}`,
    );
    if (!stored) {
      router.replace(`/schreiben/mic/${recipientIndex}`);
      return;
    }
    setTranscript(stored);
  }, [recipientIndex, router]);

  if (!transcript) return null;

  return (
    <ReviewView
      recipientName={recipientName}
      recipientIndex={recipientIndex}
      recipientPhone={recipientPhone}
      transcript={transcript}
    />
  );
}
