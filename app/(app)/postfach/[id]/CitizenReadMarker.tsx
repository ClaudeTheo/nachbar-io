"use client";

// Unsichtbare Komponente: Setzt citizen_read_until beim Oeffnen des Threads
// Gleisches Pattern wie PostfachReadMarker in nachbar-civic (Schritt 1)

import { useEffect } from "react";

interface Props {
  threadId: string;
}

export default function CitizenReadMarker({ threadId }: Props) {
  useEffect(() => {
    fetch(`/api/postfach/${threadId}`, { method: "PATCH" }).catch(() => {
      // Stilles Scheitern — Lesen ist wichtiger als Read-Tracking
    });
  }, [threadId]);

  return null;
}
