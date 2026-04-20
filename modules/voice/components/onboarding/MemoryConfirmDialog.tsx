// modules/voice/components/onboarding/MemoryConfirmDialog.tsx
// Welle C C6 + C8-UX — Confirm-Dialog fuer KI-Memory-Vorschlaege.
//
// Wird vom Onboarding-Wizard angezeigt, wenn das save_memory-Tool im
// mode='confirm' antwortet (sensitiver Wert, Quote knapp, niedrige
// Confidence etc.).
//
// Senior-UX (C8-Modernisierung):
// - TTS-Autoplay beim Oeffnen (useTtsPlayback) — Senior muss nicht lesen
// - Key + Value werden beide angezeigt, nicht nur der Wert
// - Beruhigungs-Hinweis "Sie koennen es jederzeit wieder loeschen"
// - Kategorie-Labels konsistent zu /profil/gedaechtnis
// - Leichte Vibration (20 ms) beim Oeffnen als sanfter Aufmerksamkeits-
//   Impuls, wie eine Schulter-Beruehrung
// - 80 px Touch-Targets (wie bisher)

"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PendingConfirmation } from "@/modules/voice/hooks/useOnboardingTurn";
import type { MemoryCategory } from "@/modules/memory/types";
import { useTtsPlayback } from "@/modules/voice/hooks/useTtsPlayback";

// Konsistent zu modules/memory/components/SeniorMemoryFactList.tsx —
// dieselben Woerter, damit der Senior in Confirm-Dialog und
// /profil/gedaechtnis nicht mit unterschiedlichen Begriffen verwirrt wird.
const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  profile: "Profil",
  routine: "Routinen",
  preference: "Vorlieben",
  contact: "Kontakte",
  care_need: "Alltagsbedarf",
  personal: "Persoenlich",
};

function humanizeKey(key: string): string {
  const spaced = key.replace(/_+/g, " ").trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function buildSpokenText(keyLabel: string, value: string): string {
  return `Soll ich mir das merken: ${keyLabel}. ${value}. Sie koennen es jederzeit wieder loeschen.`;
}

interface MemoryConfirmDialogProps {
  item: PendingConfirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MemoryConfirmDialog({
  item,
  onConfirm,
  onCancel,
}: MemoryConfirmDialogProps) {
  const { play, stop } = useTtsPlayback();

  // TTS-Autoplay + sanfte Vibration beim Oeffnen.
  // Achtung: nur ausloesen wenn item tatsaechlich gesetzt ist — sonst wuerde
  // der Hook beim reinen Mounten schon loslaufen.
  useEffect(() => {
    if (!item) return;

    // Haptic-Feedback (Android/iOS). Fehler werden stumm geschluckt
    // (z.B. Desktop ohne vibrate-API).
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      try {
        navigator.vibrate(20);
      } catch {
        // ignore
      }
    }

    const keyLabel = humanizeKey(item.key);
    void play(buildSpokenText(keyLabel, item.value));

    return () => {
      stop();
    };
    // Wir wollen genau pro neuem item neu starten — play/stop sind stabile
    // useCallback-Refs aus useTtsPlayback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  if (!item) return null;

  const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;
  const keyLabel = humanizeKey(item.key);

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogTitle className="text-2xl font-semibold text-[#2D3142]">
          Soll ich mir das merken?
        </DialogTitle>
        <DialogDescription className="text-base text-[#2D3142]/70">
          Ich habe folgende Information aus dem Gespraech entnommen:
        </DialogDescription>

        <div className="my-4 rounded-xl border border-[#4CAF87]/30 bg-[#4CAF87]/5 p-4">
          <div className="text-sm uppercase tracking-wide text-[#2D3142]/60">
            {categoryLabel}
          </div>
          <div className="mt-1 text-lg font-semibold text-[#2D3142]">
            {keyLabel}
          </div>
          <div className="mt-1 text-xl font-medium text-[#2D3142]">
            {item.value}
          </div>
        </div>

        <p className="mb-3 text-sm text-[#2D3142]/70">
          Sie koennen diesen Eintrag jederzeit wieder loeschen.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            onClick={onConfirm}
            autoFocus
            className="w-full rounded-xl bg-[#4CAF87] text-lg font-semibold text-white hover:bg-[#4CAF87]/90"
            style={{ minHeight: "80px", touchAction: "manipulation" }}
          >
            Ja, speichern
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full rounded-xl border-[#2D3142]/20 text-lg font-medium text-[#2D3142]"
            style={{ minHeight: "80px", touchAction: "manipulation" }}
          >
            Nein, danke
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
