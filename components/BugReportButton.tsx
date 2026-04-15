"use client";

// components/BugReportButton.tsx
// Nachbar.io — Floating Bug-Report Button für alle Nutzer
// Sammelt automatisch Console-Errors, Browser-Info und sendet Bug-Report
// Unterstützt anonymen Modus (ohne Login) für Login-/Onboarding-Seiten

import { useState, useEffect, useRef, useCallback, useContext } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { QuarterContext } from "@/lib/quarters";
import { resolveFabVisibility } from "@/lib/ui/fabVisibility";
import { toast } from "sonner";

// Konsolen-Fehler global erfassen
interface CapturedError {
  level: string;
  message: string;
  timestamp: string;
}

interface BugReportButtonProps {
  anonymous?: boolean;
}

export function BugReportButton({ anonymous = false }: BugReportButtonProps) {
  const [fabVisible, setFabVisible] = useState(true);
  // Sicherer Quartier-Zugriff: useContext gibt null zurück wenn kein Provider
  // (im Gegensatz zu useQuarter() das wirft). Fuer Login-/Onboarding-Seiten.
  const quarterCtx = useContext(QuarterContext);
  const quarterId = anonymous ? null : (quarterCtx?.currentQuarter?.id ?? null);

  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const consoleErrorsRef = useRef<CapturedError[]>([]);
  const originalConsoleError = useRef<typeof console.error | null>(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setFabVisible((currentVisible) =>
        resolveFabVisibility({
          currentY,
          previousY: lastScrollYRef.current,
          innerWidth: window.innerWidth,
          currentVisible,
        }),
      );

      lastScrollYRef.current = currentY;
    };

    lastScrollYRef.current = window.scrollY;
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // Console.error wrappen um Fehler zu erfassen
  useEffect(() => {
    if (!originalConsoleError.current) {
      originalConsoleError.current = console.error;
    }
    const origError = originalConsoleError.current;

    console.error = (...args: unknown[]) => {
      origError.apply(console, args);
      try {
        const message = args.map(a =>
          typeof a === "string" ? a : JSON.stringify(a)
        ).join(" ");
        // Eigene BugReport-Logs nicht erfassen (Endlos-Loop)
        if (message.includes("[BugReport]")) return;
        consoleErrorsRef.current = [
          ...consoleErrorsRef.current.slice(-19),
          { level: "error", message, timestamp: new Date().toISOString() },
        ];
      } catch { /* ignorieren */ }
    };

    return () => {
      console.error = origError;
    };
  }, []);

  // Screenshot erstellen (gemeinsame Logik)
  const captureScreenshot = useCallback(async (): Promise<Blob | null> => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(document.documentElement, {
        scale: 0.75,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: window.innerWidth,
        height: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      });
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, "image/jpeg", 0.6)
      );
      return blob;
    } catch (err) {
      console.error("[BugReport] Screenshot fehlgeschlagen:", err);
      return null;
    }
  }, []);

  // Browser- und Seiten-Info sammeln (gemeinsam)
  const collectMetadata = useCallback(() => {
    const browserInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      screenSize: { width: screen.width, height: screen.height },
      devicePixelRatio: window.devicePixelRatio,
      online: navigator.onLine,
      platform: navigator.platform,
    };

    const pageMeta = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      pathname: window.location.pathname,
      search: window.location.search,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    };

    return { browserInfo, pageMeta };
  }, []);

  // Anonymer Submit-Handler
  const handleAnonymousSubmit = useCallback(async () => {
    setLoading(true);
    try {
      // Screenshot als Base64 Data-URL (kein Storage-Zugriff ohne Auth)
      let screenshotUrl: string | null = null;
      const blob = await captureScreenshot();
      if (blob) {
        // Max 500KB — größere Screenshots überspringen
        if (blob.size <= 500 * 1024) {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          screenshotUrl = dataUrl;
        } else {
          console.error("[BugReport] Screenshot zu groß für anonymen Report:", blob.size);
        }
      }

      const { browserInfo, pageMeta } = collectMetadata();

      // POST an anonymen Endpoint
      const res = await fetch("/api/bug-reports/anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_url: window.location.href,
          page_title: document.title,
          screenshot_url: screenshotUrl,
          console_errors: consoleErrorsRef.current,
          browser_info: browserInfo,
          page_meta: pageMeta,
          user_comment: comment?.trim() || null,
          website: honeypot, // Honeypot-Feld für Spam-Schutz
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Bug-Report fehlgeschlagen");
      }

      toast.success("Bug-Report gesendet! Vielen Dank.");
      setComment("");
      setOpen(false);
    } catch (err) {
      console.error("[BugReport] Fehler:", err);
      toast.error("Bug-Report konnte nicht gesendet werden.");
    } finally {
      setLoading(false);
    }
  }, [comment, honeypot, captureScreenshot, collectMetadata]);

  // Authentifizierter Submit-Handler (bestehende Logik)
  const handleAuthenticatedSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { user } = await getCachedUser(supabase);
      if (!user) throw new Error("Nicht eingeloggt");

      // 1. Screenshot via html2canvas + Supabase Storage
      let screenshotUrl: string | undefined;
      const blob = await captureScreenshot();
      if (blob) {
        const uuid = crypto.randomUUID();
        const path = `bug-reports/${user.id}/${uuid}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(path, blob, { contentType: "image/jpeg" });

        if (uploadError) {
          console.error("[BugReport] Storage-Upload fehlgeschlagen:", uploadError.message);
        } else {
          const { data: urlData } = supabase.storage
            .from("images")
            .getPublicUrl(path);
          screenshotUrl = urlData.publicUrl;
        }
      }

      // 2. Metadaten sammeln
      const { browserInfo, pageMeta } = collectMetadata();

      // 3. Admin-Check: eigene Reports direkt freigeben
      const { data: profileCheck } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      const isAdmin = profileCheck?.is_admin === true;

      // 4. Bug-Report in DB speichern
      const { error: insertError } = await supabase
        .from("bug_reports")
        .insert({
          user_id: user.id,
          quarter_id: quarterId,
          page_url: window.location.href,
          page_title: document.title,
          screenshot_url: screenshotUrl,
          console_errors: consoleErrorsRef.current,
          browser_info: browserInfo,
          page_meta: pageMeta,
          user_comment: comment?.trim() || null,
          status: isAdmin ? "approved" : "new",
        });

      if (insertError) throw insertError;

      toast.success("Bug-Report gesendet! Vielen Dank.");
      setComment("");
      setOpen(false);
    } catch (err) {
      console.error("[BugReport] Fehler:", err);
      toast.error("Bug-Report konnte nicht gesendet werden.");
    } finally {
      setLoading(false);
    }
  }, [quarterId, comment, captureScreenshot, collectMetadata]);

  // Handler-Auswahl basierend auf anonymous-Prop
  const handleSubmit = anonymous ? handleAnonymousSubmit : handleAuthenticatedSubmit;

  return (
    <>
      {/* Floating Action Button — unten-links, über der BottomNav */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-24 left-3 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-alert-amber shadow-lg transition-all active:scale-95 sm:left-4 sm:h-12 sm:w-12 sm:hover:scale-110 sm:hover:shadow-xl ${
          fabVisible ? "fab-visible" : "fab-hidden"
        }`}
        aria-label="Bug melden"
        aria-haspopup="dialog"
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
              Optional können Sie beschreiben, was aufgefallen ist.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Honeypot-Feld für Spam-Schutz (nur im anonymen Modus) */}
            {anonymous && (
              <input
                name="website"
                type="text"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
                aria-hidden="true"
                data-testid="feedback-extra"
              />
            )}

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
                disabled={loading}
              >
                <X className="mr-1 h-4 w-4" />
                Abbrechen
              </Button>
              <Button
                className="flex-1 bg-alert-amber hover:bg-alert-amber/90"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
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
