"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { KiHelpPulseDot } from "@/components/ki-help/KiHelpPulseDot";
import { KI_HELP_FAQ } from "@/lib/ki-help/faq-content";

// Touchpoint 2 des KI-Hilfe-Begleiters: Tap auf Pulse-Dot oeffnet Bottom-Sheet
// mit 7 vordefinierten Q&A. Komplett client-side, kein LLM, kein Backend, kein Persist.
// Kontrollierter Modus (open/onOpenChange) wie BugReportButton.tsx — beim Schliessen
// wird openId zurueckgesetzt, damit Wieder-Oeffnen alle Items collapsed zeigt.
export function KiHelpFaqSheet() {
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setOpenId(null);
  }

  return (
    <>
      <KiHelpPulseDot
        asButton
        ariaLabel="Hilfe zur KI-Hilfe öffnen"
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-lg rounded-t-2xl p-0"
        >
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="text-base font-semibold text-anthrazit">
              Häufige Fragen zur KI-Hilfe
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Vordefinierte Fragen und Antworten zur optionalen KI-Hilfe — fest
              geschrieben, kein Live-Modell.
            </SheetDescription>
          </SheetHeader>
          <div className="max-h-[70vh] overflow-y-auto p-4">
            <ul className="space-y-2">
              {KI_HELP_FAQ.map(({ id, question, answer }) => {
                const isOpen = openId === id;
                const buttonId = `ki-help-faq-button-${id}`;
                const panelId = `ki-help-faq-panel-${id}`;
                return (
                  <li key={id} className="rounded-lg border border-border">
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenId(isOpen ? null : id)}
                      className="flex w-full items-start justify-between gap-3 p-3 text-left"
                    >
                      <span className="font-medium text-anthrazit">
                        {question}
                      </span>
                      <ChevronDown
                        className={
                          "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform " +
                          (isOpen ? "rotate-180" : "")
                        }
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <p
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        className="border-t border-border p-3 text-sm text-muted-foreground"
                      >
                        {answer}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
