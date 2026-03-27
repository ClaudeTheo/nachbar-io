"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "moderation_disclosure_accepted";

/**
 * Einmaliger Hinweis auf KI-gestuetzte Inhaltsmoderation.
 * Wird vor dem ersten Beitrag angezeigt (Apple Guideline 5.1.1(i)).
 * Zustimmung in localStorage gespeichert.
 */
export function ModerationDisclosure({ onAccept }: { onAccept?: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Nur anzeigen wenn noch nicht akzeptiert
    if (typeof window !== "undefined") {
      const accepted = localStorage.getItem(STORAGE_KEY);
      if (!accepted) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpen(true);
      }
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setOpen(false);
    onAccept?.();
  }

  // Bereits akzeptiert — nichts rendern
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) handleAccept();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hinweis zur Inhaltsmoderation</DialogTitle>
          <DialogDescription>
            Zum Schutz unserer Community werden Beiträge automatisch geprüft.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm text-muted-foreground">
          <p>
            QuartierApp nutzt eine <strong>KI-gestützte Moderation</strong>, um
            unsere Community vor Spam, Belästigung und betrügerischen Inhalten
            zu schützen.
          </p>
          <p>
            Dabei werden Texte Ihrer Beiträge, Anzeigen und Nachrichten an
            unseren Auftragsverarbeiter (Anthropic PBC) zur Prüfung übermittelt.
            Die Inhalte werden <strong>nicht dauerhaft gespeichert</strong> und
            nicht zum KI-Training verwendet.
          </p>
          <p>
            Weitere Informationen finden Sie in unserer{" "}
            <Link href="/datenschutz" className="text-quartier-green underline">
              Datenschutzerklärung
            </Link>
            .
          </p>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            className="w-full bg-quartier-green hover:bg-quartier-green-dark"
          >
            Verstanden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Prüft ob die Moderation-Disclosure bereits akzeptiert wurde.
 * Nutzbar in Formularen: Erst Disclosure anzeigen, dann Post erlauben.
 */
export function isModerationDisclosureAccepted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== null;
}
