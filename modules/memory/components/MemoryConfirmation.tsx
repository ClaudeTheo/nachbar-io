"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MemoryConfirmationProps {
  /** Vorgeschlagener Fakt-Text */
  value: string;
  /** Tool-Parameter fuer Bestaetigung */
  toolParams: Record<string, unknown>;
  /** Callback bei Bestaetigung */
  onConfirm: (params: Record<string, unknown>) => void;
  /** Callback bei Ablehnung */
  onReject: () => void;
}

export function MemoryConfirmation({
  value,
  toolParams,
  onConfirm,
  onReject,
}: MemoryConfirmationProps) {
  const [decided, setDecided] = useState<"confirmed" | "rejected" | null>(null);

  function handleConfirm() {
    setDecided("confirmed");
    onConfirm(toolParams);
  }

  function handleReject() {
    setDecided("rejected");
    onReject();
  }

  if (decided === "confirmed") {
    return (
      <div className="rounded-xl bg-quartier-green/10 px-4 py-3">
        <p className="text-sm text-quartier-green">
          ✓ Ich merke mir: &ldquo;{value}&rdquo;
        </p>
      </div>
    );
  }

  if (decided === "rejected") {
    return null;
  }

  return (
    <div className="rounded-xl border border-quartier-green/30 bg-card p-4 shadow-soft">
      <p className="mb-3 text-sm text-anthrazit">
        Soll ich mir merken: &ldquo;{value}&rdquo;?
      </p>
      <div className="flex gap-3">
        <Button
          onClick={handleConfirm}
          className="h-12 flex-1 bg-quartier-green text-sm hover:bg-quartier-green-dark"
        >
          Ja, merken
        </Button>
        <Button
          onClick={handleReject}
          variant="outline"
          className="h-12 flex-1 text-sm"
        >
          Nein
        </Button>
      </div>
    </div>
  );
}
