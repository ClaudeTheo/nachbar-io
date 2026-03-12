"use client";

// components/testing/TesterWelcomeDialog.tsx
// Nachbar.io — Willkommensdialog fuer Tester nach dem ersten Login
// Zeigt sich nur wenn is_tester=true und tester_welcome_seen=false

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function TesterWelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pruefen ob der Dialog gezeigt werden soll
  useEffect(() => {
    async function check() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: profile } = await supabase
          .from("users")
          .select("is_tester, settings")
          .eq("id", user.id)
          .single();

        if (!profile?.is_tester) { setLoading(false); return; }

        const settings = (profile.settings as Record<string, unknown>) ?? {};
        if (settings.tester_welcome_seen !== true) {
          setOpen(true);
        }
      } catch {
        // Silent fail — Dialog nicht anzeigen
      } finally {
        setLoading(false);
      }
    }
    check();
  }, []);

  // Dialog schliessen und Flag setzen
  const handleDismiss = useCallback(async () => {
    setOpen(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("settings")
        .eq("id", user.id)
        .single();

      const settings = (data?.settings as Record<string, unknown>) ?? {};
      await supabase
        .from("users")
        .update({ settings: { ...settings, tester_welcome_seen: true } })
        .eq("id", user.id);
    } catch {
      // Silent fail — beim naechsten Login erneut anzeigen
    }
  }, []);

  if (loading || !open) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleDismiss(); }}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">🧪</span>
            Willkommen als Tester!
          </DialogTitle>
          <DialogDescription className="text-left">
            Vielen Dank, dass Sie Nachbar.io testen. Ihr Feedback hilft, die App
            für die gesamte Nachbarschaft zu verbessern.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Test-Panel Erklaerung */}
          <div className="rounded-lg border bg-quartier-green/5 p-3">
            <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-quartier-green">
              <span>📋</span> Das Test-Panel
            </h4>
            <p className="text-sm text-muted-foreground">
              Unten rechts sehen Sie ein schwebendes Badge mit Ihrem Fortschritt.
              Tippen Sie darauf, um das Test-Panel zu öffnen und einzelne Funktionen zu bewerten.
            </p>
          </div>

          {/* Auto-Tracking Hinweis */}
          <div className="rounded-lg border bg-blue-50 p-3">
            <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-blue-700">
              <span>📊</span> Automatisches Tracking
            </h4>
            <p className="text-sm text-blue-600/80">
              Wir erfassen automatisch, welche Bereiche der App Sie besuchen.
              So können wir sehen, ob alle Funktionen ausreichend getestet wurden.
            </p>
          </div>

          {/* Testumfang */}
          <div className="rounded-lg border bg-amber-50 p-3">
            <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-amber-700">
              <span>🎯</span> Was erwartet Sie?
            </h4>
            <ul className="space-y-1.5 text-sm text-amber-600/80">
              <li className="flex items-start gap-2">
                <span className="mt-px">•</span>
                <span><strong>11 Testbereiche</strong> mit insgesamt 60 Prüfpunkten</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-px">•</span>
                <span>Geschätzte Dauer: <strong>ca. 1 Stunde</strong> (jederzeit pausierbar)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-px">•</span>
                <span>Manche Tests brauchen <strong>einen zweiten Tester</strong></span>
              </li>
            </ul>
          </div>

          {/* Anleitung-Link */}
          <div className="text-center">
            <Link
              href="/testanleitung"
              className="text-sm font-medium text-quartier-green hover:underline"
              onClick={() => handleDismiss()}
            >
              Ausführliche Testanleitung lesen →
            </Link>
          </div>
        </div>

        {/* Start-Button */}
        <div className="mt-2 flex justify-center">
          <Button
            onClick={handleDismiss}
            className="w-full bg-quartier-green hover:bg-quartier-green/90"
          >
            Los geht&apos;s! 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
