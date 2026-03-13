"use client";

// components/testing/BugReportButton.tsx
// Nachbar.io — Floating Bug-Report Button fuer Tester
// Sammelt automatisch Screenshot, Console-Errors, Browser-Info und sendet Bug-Report

import { useState } from "react";
import { Bug, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTestModeOptional } from "./TestModeProvider";

export function BugReportButton() {
  const testMode = useTestModeOptional();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");

  // Nur fuer Tester sichtbar
  if (!testMode?.isTester) return null;

  const handleSubmit = async () => {
    await testMode.submitBugReport(comment || undefined);
    setComment("");
    setOpen(false);
  };

  return (
    <>
      {/* Floating Action Button — unten-links, ueber der BottomNav */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-alert-amber shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
        aria-label="Bug melden"
        data-testid="bug-report-fab"
      >
        <Bug className="h-5 w-5 text-white" />
      </button>

      {/* Bug-Report Sheet von unten */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-anthrazit">
              <Bug className="h-5 w-5 text-alert-amber" />
              Bug melden
            </SheetTitle>
            <SheetDescription>
              Screenshot und technische Daten werden automatisch erfasst.
              Optional koennen Sie beschreiben, was aufgefallen ist.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Optionaler Kommentar */}
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              placeholder="Was ist aufgefallen? (optional)"
              className="min-h-[80px] resize-none text-base"
              maxLength={500}
            />
            <p className="text-right text-xs text-muted-foreground">
              {comment.length}/500
            </p>

            {/* Was wird gesammelt — Info */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-anthrazit">Automatisch erfasst:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>Screenshot der aktuellen Seite</li>
                <li>Fehlermeldungen aus der Konsole</li>
                <li>Seiten-URL und Browser-Info</li>
              </ul>
            </div>

            {/* Aktionen */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={testMode.bugReportLoading}
              >
                <X className="mr-1 h-4 w-4" />
                Abbrechen
              </Button>
              <Button
                className="flex-1 bg-alert-amber hover:bg-alert-amber/90"
                onClick={handleSubmit}
                disabled={testMode.bugReportLoading}
              >
                {testMode.bugReportLoading ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Send className="mr-1 h-4 w-4" />
                    Bug melden
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
