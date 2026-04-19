// modules/voice/components/onboarding/MemoryConfirmDialog.tsx
// Welle C C6 — Confirm-Dialog fuer KI-Memory-Vorschlaege.
//
// Wird vom Onboarding-Wizard angezeigt, wenn das save_memory-Tool im
// mode='confirm' antwortet (sensitiver Wert, Quote knapp etc.). Senior-
// freundlich: zwei grosse Buttons, deutsche Labels, klare Hierarchie.

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PendingConfirmation } from "@/modules/voice/hooks/useOnboardingTurn";
import type { MemoryCategory } from "@/modules/memory/types";

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  profile: "Profil",
  routine: "Tagesablauf",
  preference: "Vorliebe",
  contact: "Kontakt",
  care_need: "Pflege-Hinweis",
  personal: "Persoenlich",
};

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
  if (!item) return null;

  const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;

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
          <div className="mt-1 text-xl font-medium text-[#2D3142]">
            {item.value}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={onConfirm}
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
