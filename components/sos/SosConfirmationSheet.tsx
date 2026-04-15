"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, Users, X } from "lucide-react";
import { useSos } from "./SosContext";

/**
 * SOS-Bestaetigungsblatt: Erscheint von unten, bietet 3 Optionen:
 * 1. 112 anrufen (tel:-Link, KEIN Auto-Dial)
 * 2. Angehoerige benachrichtigen (Push an Caregivers — Platzhalter)
 * 3. Abbrechen
 */
export function SosConfirmationSheet() {
  const { isOpen, closeSos } = useSos();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "no-contacts";
    text: string;
  } | null>(null);

  // Escape-Taste schliesst das Sheet
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeSos();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeSos]);

  // Fokus auf das Sheet setzen, wenn es geoeffnet wird
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.focus();
    }
  }, [isOpen]);

  // Feedback zuruecksetzen wenn Sheet geschlossen wird
  useEffect(() => {
    if (!isOpen) {
      setFeedback(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Benachrichtigung an Angehoerige via API
  async function handleNotifyCaregivers() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/sos/notify-family", { method: "POST" });
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: "Benachrichtigung fehlgeschlagen. Bitte versuchen Sie es erneut.",
        });
        return;
      }
      const data = await res.json();
      if (data.notified === 0 && data.failed === 0) {
        setFeedback({
          type: "no-contacts",
          text: "Keine Angehörigen hinterlegt.",
        });
      } else if (data.notified > 0) {
        setFeedback({
          type: "success",
          text: `${data.notified} Angehörige benachrichtigt.`,
        });
        setTimeout(() => closeSos(), 3000);
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Benachrichtigung fehlgeschlagen. Bitte versuchen Sie es erneut.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Hintergrund-Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeSos}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="SOS — Was brauchen Sie?"
        tabIndex={-1}
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-2xl bg-white px-4 pb-8 pt-6 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Griff-Indikator */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />

        {/* Titel */}
        <h2 className="mb-6 text-center text-xl font-bold text-anthrazit">
          Was brauchen Sie?
        </h2>

        {/* 1. Notruf 112 */}
        <a
          href="tel:112"
          className="mb-3 flex w-full items-center gap-4 rounded-xl bg-[#EF4444] p-4 text-white transition-colors hover:bg-red-600 active:bg-red-700"
          style={{ minHeight: "80px", touchAction: "manipulation" }}
          data-testid="sos-call-112"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
            <Phone className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold">112 anrufen</p>
            <p className="text-sm text-white/80">Feuerwehr / Rettungsdienst</p>
          </div>
        </a>

        {/* 2. Angehoerige benachrichtigen */}
        {feedback ? (
          <div
            className={`mb-3 flex w-full items-center justify-center rounded-xl p-4 text-center font-medium ${
              feedback.type === "success"
                ? "bg-green-100 text-green-800"
                : feedback.type === "no-contacts"
                  ? "bg-gray-100 text-gray-600"
                  : "bg-red-100 text-red-800"
            }`}
            style={{ minHeight: "80px" }}
            data-testid="sos-notify-feedback"
          >
            {feedback.text}
          </div>
        ) : (
          <button
            onClick={handleNotifyCaregivers}
            disabled={loading}
            className={`mb-3 flex w-full items-center gap-4 rounded-xl bg-[#F59E0B] p-4 text-white transition-colors hover:bg-amber-600 active:bg-amber-700 ${
              loading ? "opacity-50" : ""
            }`}
            style={{ minHeight: "80px", touchAction: "manipulation" }}
            data-testid="sos-notify-caregivers"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
              <Users className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold">Angehörige benachrichtigen</p>
              <p className="text-sm text-white/80">
                Push-Nachricht an Ihre Familie
              </p>
            </div>
          </button>
        )}

        {/* 3. Abbrechen */}
        <button
          onClick={closeSos}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl p-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 active:bg-gray-200"
          data-testid="sos-cancel"
        >
          <X className="h-4 w-4" />
          Abbrechen
        </button>
      </div>
    </>
  );
}
