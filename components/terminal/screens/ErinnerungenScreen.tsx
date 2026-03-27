"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Bell, Check, Calendar, StickyNote } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

interface StickyItem {
  id: string;
  title: string;
  created_at: string;
}

interface AppointmentItem {
  id: string;
  title: string;
  scheduled_at: string;
  expires_at: string | null;
}

export default function ErinnerungenScreen() {
  const { setActiveScreen, token } = useTerminal();
  const [stickies, setStickies] = useState<StickyItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReminders = useCallback(async () => {
    try {
      const res = await fetch(`/api/device/reminders?token=${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();
      setStickies(data.stickies ?? []);
      setAppointments(data.appointments ?? []);
    } catch (err) {
      console.error("[Erinnerungen] Fehler:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const acknowledgeSticky = async (reminderId: string) => {
    try {
      const res = await fetch("/api/device/reminder-ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderId, token }),
      });
      if (res.ok) {
        setStickies((prev) => prev.filter((s) => s.id !== reminderId));
      }
    } catch (err) {
      console.error("[Erinnerungen] Ack-Fehler:", err);
    }
  };

  // Termine nach Tag gruppieren
  const groupedAppointments = appointments.reduce<Record<string, AppointmentItem[]>>((acc, apt) => {
    const dateKey = new Date(apt.scheduled_at).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Berlin",
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(apt);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[32px] text-anthrazit/60">Erinnerungen werden geladen...</p>
      </div>
    );
  }

  const isEmpty = stickies.length === 0 && appointments.length === 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Zurück + Titel */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <button
          onClick={() => setActiveScreen("home")}
          className="flex items-center justify-center h-[70px] w-[70px] rounded-2xl bg-anthrazit text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-10 w-10" />
        </button>
        <h1 className="text-[36px] font-bold text-anthrazit">Erinnerungen</h1>
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6">
          <Bell className="h-24 w-24 text-quartier-green-dark/40" />
          <p className="text-[32px] font-medium text-anthrazit/60 text-center">
            Keine Erinnerungen vorhanden
          </p>
          <p className="text-[22px] text-anthrazit/40 text-center">
            Ihre Angehörigen können Notizen und Termine für Sie erstellen
          </p>
        </div>
      )}

      {/* Sticky Notes */}
      {stickies.length > 0 && (
        <div className="mb-6 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="h-6 w-6 text-alert-amber" />
            <span className="text-[24px] font-semibold text-anthrazit">Notizen</span>
          </div>
          <div className="flex flex-col gap-3">
            {stickies.map((sticky) => (
              <div
                key={sticky.id}
                className="flex items-center gap-4 bg-alert-amber/15 border-2 border-alert-amber/30 rounded-2xl px-6 py-4"
              >
                <p className="text-[28px] font-medium text-anthrazit flex-1">{sticky.title}</p>
                <button
                  onClick={() => acknowledgeSticky(sticky.id)}
                  className="flex items-center justify-center h-[70px] w-[70px] rounded-2xl bg-quartier-green text-white active:scale-95 transition-transform shrink-0"
                >
                  <Check className="h-10 w-10" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Termine */}
      {Object.entries(groupedAppointments).map(([dateLabel, apts]) => (
        <div key={dateLabel} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-6 w-6 text-info-blue" />
            <span className="text-[24px] font-semibold text-anthrazit">{dateLabel}</span>
          </div>
          <div className="flex flex-col gap-3">
            {apts.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center gap-4 bg-info-blue/10 border-2 border-info-blue/20 rounded-2xl px-6 py-4"
              >
                <span className="text-[28px] font-bold text-info-blue shrink-0">
                  {new Date(apt.scheduled_at).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Europe/Berlin",
                  })}
                </span>
                <p className="text-[28px] font-medium text-anthrazit">{apt.title}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
