// components/care/KioskReminderForm.tsx
// Nachbar.io — Erinnerungen erstellen und verwalten fuer den Kiosk (Caregiver-Seite)
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Calendar,
  Check,
  Clock,
  Loader2,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";

interface KioskReminder {
  id: string;
  household_id: string;
  created_by: string;
  type: "appointment" | "sticky";
  title: string;
  scheduled_at: string | null;
  acknowledged_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface KioskReminderFormProps {
  householdId: string;
}

export function KioskReminderForm({ householdId }: KioskReminderFormProps) {
  const [reminders, setReminders] = useState<KioskReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formular-State
  const [type, setType] = useState<"sticky" | "appointment">("sticky");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  // Erinnerungen laden
  const fetchReminders = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `/api/caregiver/kiosk-reminders?household_id=${householdId}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Laden");
      }
      const data = await res.json();
      setReminders(data.reminders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Erinnerung erstellen
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    setCreating(true);
    setError(null);

    try {
      // scheduled_at zusammenbauen fuer Termine
      let scheduledAt: string | undefined;
      if (type === "appointment") {
        if (!date) {
          setError("Bitte ein Datum auswählen");
          setCreating(false);
          return;
        }
        const timeStr = time || "09:00";
        scheduledAt = new Date(`${date}T${timeStr}:00`).toISOString();
      }

      const res = await fetch("/api/caregiver/kiosk-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          household_id: householdId,
          type,
          title: title.trim(),
          scheduled_at: scheduledAt,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erstellen fehlgeschlagen");
      }

      // Formular zuruecksetzen und Liste neu laden
      setTitle("");
      setDate("");
      setTime("");
      await fetchReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setCreating(false);
    }
  };

  // Erinnerung loeschen
  const deleteReminder = async (reminderId: string) => {
    if (!confirm("Diese Erinnerung wirklich löschen?")) return;

    setError(null);
    try {
      const res = await fetch(`/api/caregiver/kiosk-reminders/${reminderId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Löschen fehlgeschlagen");
      }

      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    }
  };

  // Datum formatieren
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted rounded w-1/2" />
        <div className="h-24 bg-muted rounded" />
        <div className="h-16 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fehler */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Neue Erinnerung erstellen */}
      <form onSubmit={handleCreate} className="rounded-xl border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-anthrazit">
          Neue Erinnerung
        </h3>

        {/* Typ-Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("sticky")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              type === "sticky"
                ? "bg-quartier-green text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <StickyNote className="h-4 w-4" />
            Notiz
          </button>
          <button
            type="button"
            onClick={() => setType("appointment")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              type === "appointment"
                ? "bg-quartier-green text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Termin
          </button>
        </div>

        {/* Titel */}
        <div>
          <label htmlFor="reminder-title" className="block text-sm font-medium text-anthrazit mb-1">
            Titel
          </label>
          <input
            id="reminder-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "sticky"
                ? "z.B. Fenster schließen bei Regen"
                : "z.B. Arzttermin Dr. Müller"
            }
            maxLength={80}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-quartier-green"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {title.length} / 80
          </p>
        </div>

        {/* Datum + Uhrzeit (nur fuer Termine) */}
        {type === "appointment" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reminder-date" className="block text-sm font-medium text-anthrazit mb-1">
                Datum
              </label>
              <input
                id="reminder-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quartier-green"
              />
            </div>
            <div>
              <label htmlFor="reminder-time" className="block text-sm font-medium text-anthrazit mb-1">
                Uhrzeit
              </label>
              <input
                id="reminder-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quartier-green"
              />
            </div>
          </div>
        )}

        {/* Erstellen-Button */}
        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-quartier-green px-4 py-2.5 text-sm font-medium text-white hover:bg-quartier-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Wird erstellt...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Erinnerung erstellen
            </>
          )}
        </button>
      </form>

      {/* Liste bestehender Erinnerungen */}
      {reminders.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-muted p-8 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium text-anthrazit">
            Keine Erinnerungen
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Erstellen Sie Notizen oder Termine, die auf dem Kiosk-Terminal
            angezeigt werden.
          </p>
        </div>
      )}

      {reminders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-anthrazit">
            Bestehende Erinnerungen ({reminders.length})
          </h3>

          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="rounded-lg border bg-card p-3 flex items-start gap-3"
            >
              {/* Typ-Icon */}
              <div
                className={`flex-shrink-0 rounded-full p-2 ${
                  reminder.type === "appointment"
                    ? "bg-info-blue/10 text-info-blue"
                    : "bg-alert-amber/10 text-alert-amber"
                }`}
              >
                {reminder.type === "appointment" ? (
                  <Calendar className="h-4 w-4" />
                ) : (
                  <StickyNote className="h-4 w-4" />
                )}
              </div>

              {/* Inhalt */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-anthrazit">
                  {reminder.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {/* Typ-Badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${
                      reminder.type === "appointment"
                        ? "bg-info-blue/10 text-info-blue"
                        : "bg-alert-amber/10 text-alert-amber"
                    }`}
                  >
                    {reminder.type === "appointment" ? "Termin" : "Notiz"}
                  </span>

                  {/* Termin-Datum */}
                  {reminder.scheduled_at && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(reminder.scheduled_at)}
                    </span>
                  )}

                  {/* Bestaetigungsstatus (Sticky) */}
                  {reminder.type === "sticky" && reminder.acknowledged_at && (
                    <span className="inline-flex items-center gap-1 rounded bg-quartier-green/10 px-1.5 py-0.5 text-xs font-medium text-quartier-green">
                      <Check className="h-3 w-3" />
                      Bestätigt
                    </span>
                  )}

                  {/* Erstellt am */}
                  <span className="text-xs text-muted-foreground">
                    Erstellt: {formatDate(reminder.created_at)}
                  </span>
                </div>
              </div>

              {/* Loeschen-Button */}
              <button
                onClick={() => deleteReminder(reminder.id)}
                className="flex-shrink-0 rounded-full p-2 text-muted-foreground hover:text-emergency-red hover:bg-red-50 transition-colors"
                title="Löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
