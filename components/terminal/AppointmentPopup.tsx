"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

const POPUP_POLL_MS = 60 * 1000;
const AUTO_DISMISS_MS = 5 * 60 * 1000;

interface UpcomingAppointment {
  id: string;
  title: string;
  scheduled_at: string;
}

export default function AppointmentPopup() {
  const { token } = useTerminal();
  const [popup, setPopup] = useState<UpcomingAppointment | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkUpcoming = useCallback(async () => {
    try {
      const res = await fetch(`/api/device/reminders?token=${encodeURIComponent(token)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.upcomingPopup && !dismissed.has(data.upcomingPopup.id)) {
        setPopup(data.upcomingPopup);
      }
    } catch {
      // Stille Fehler — Popup ist nicht kritisch
    }
  }, [token, dismissed]);

  useEffect(() => {
    checkUpcoming();
    const interval = setInterval(checkUpcoming, POPUP_POLL_MS);
    return () => clearInterval(interval);
  }, [checkUpcoming]);

  useEffect(() => {
    if (!popup) return;
    autoDismissRef.current = setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(popup.id));
      setPopup(null);
    }, AUTO_DISMISS_MS);
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [popup]);

  const dismiss = () => {
    if (popup) {
      setDismissed((prev) => new Set(prev).add(popup.id));
      setPopup(null);
    }
  };

  if (!popup) return null;

  const timeStr = new Date(popup.scheduled_at).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

  return (
    <div className="fixed inset-0 z-[45] flex flex-col items-center justify-center bg-anthrazit/95">
      <Bell className="h-24 w-24 text-alert-amber mb-6 animate-bounce" />
      <p className="text-[32px] text-white/80 mb-2">In Kürze:</p>
      <p className="text-[48px] font-bold text-white text-center mb-2 px-8">
        {popup.title}
      </p>
      <p className="text-[32px] text-alert-amber font-semibold mb-12">
        um {timeStr} Uhr
      </p>
      <button
        onClick={dismiss}
        className="flex items-center gap-4 px-12 py-6 rounded-3xl bg-quartier-green text-white active:scale-95 transition-transform"
      >
        <Check className="h-10 w-10" />
        <span className="text-[36px] font-bold">Verstanden</span>
      </button>
      <p className="absolute bottom-8 text-[18px] text-white/30">
        Verschwindet automatisch in 5 Minuten
      </p>
    </div>
  );
}
