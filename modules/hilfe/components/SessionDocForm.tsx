"use client";

import { useState, useMemo, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import SignaturePad from "@/modules/hilfe/components/SignaturePad";
import {
  HELP_CATEGORY_LABELS,
  type HelpCategory,
  type HelpSessionStatus,
} from "@/modules/hilfe/services/types";

interface Props {
  matchId: string;
  helperRate?: number; // Stundensatz in Cent
}

/**
 * Formular zur Einsatz-Dokumentation einer Nachbarschaftshilfe-Session.
 * Enthält Zeiterfassung, Tätigkeitskategorie, zwei Unterschriftenfelder
 * und automatische Berechnung von Dauer und Betrag.
 */
export default function SessionDocForm({ matchId, helperRate = 0 }: Props) {
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState<HelpCategory>("shopping");
  const [description, setDescription] = useState("");
  const [helperSignature, setHelperSignature] = useState<string | null>(null);
  const [residentSignature, setResidentSignature] = useState<string | null>(
    null,
  );
  const [status, setStatus] = useState<HelpSessionStatus>("draft");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dauer in Minuten berechnen
  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    return diff > 0 ? diff : 0;
  }, [startTime, endTime]);

  // Betrag in EUR berechnen
  const totalAmountEur = useMemo(() => {
    if (durationMinutes <= 0 || helperRate <= 0) return "0,00";
    const cents = Math.round((durationMinutes / 60) * helperRate);
    return (cents / 100).toFixed(2).replace(".", ",");
  }, [durationMinutes, helperRate]);

  // Stundensatz formatiert
  const rateDisplay = (helperRate / 100).toFixed(2).replace(".", ",");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Session erstellen
      const res = await fetch("/api/hilfe/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          session_date: sessionDate,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: durationMinutes,
          activity_category: category,
          activity_description: description || null,
          hourly_rate_cents: helperRate,
          total_amount_cents: Math.round((durationMinutes / 60) * helperRate),
        }),
      });

      if (!res.ok) {
        throw new Error("Einsatz konnte nicht gespeichert werden.");
      }

      const session = await res.json();
      const sessionId = session.id;

      // Unterschriften hochladen
      if (helperSignature) {
        await fetch(`/api/hilfe/sessions/${sessionId}/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "helper",
            signature_data_url: helperSignature,
          }),
        });
      }

      if (residentSignature) {
        await fetch(`/api/hilfe/sessions/${sessionId}/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "resident",
            signature_data_url: residentSignature,
          }),
        });
      }

      // Status aktualisieren
      setStatus(helperSignature && residentSignature ? "signed" : "draft");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const statusLabels: Record<HelpSessionStatus, string> = {
    draft: "Entwurf",
    signed: "Unterschrieben",
    receipt_created: "Quittung erstellt",
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 p-4">
      <h2 className="text-2xl font-bold text-[#2D3142]">
        Einsatz dokumentieren
      </h2>

      {/* Status-Anzeige */}
      <div className="rounded-lg bg-gray-50 p-3">
        <span className="text-sm text-gray-500">Status: </span>
        <span className="font-medium">{statusLabels[status]}</span>
      </div>

      {/* Datum */}
      <div className="flex flex-col gap-2">
        <label htmlFor="session-date" className="text-sm font-medium">
          Datum
        </label>
        <input
          id="session-date"
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          className="min-h-[80px] rounded-md border border-border px-4 text-lg"
          required
        />
      </div>

      {/* Startzeit */}
      <div className="flex flex-col gap-2">
        <label htmlFor="start-time" className="text-sm font-medium">
          Startzeit
        </label>
        <input
          id="start-time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="min-h-[80px] rounded-md border border-border px-4 text-lg"
          required
        />
      </div>

      {/* Endzeit */}
      <div className="flex flex-col gap-2">
        <label htmlFor="end-time" className="text-sm font-medium">
          Endzeit
        </label>
        <input
          id="end-time"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="min-h-[80px] rounded-md border border-border px-4 text-lg"
          required
        />
      </div>

      {/* Berechnete Werte */}
      <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
        <div>
          <span className="text-sm text-gray-500">Dauer</span>
          <p className="text-lg font-semibold" data-testid="duration-display">
            {durationMinutes} Minuten
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Betrag</span>
          <p className="text-lg font-semibold">{totalAmountEur} EUR</p>
        </div>
      </div>

      {/* Stundensatz (readonly) */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Stundensatz</span>
        <p className="min-h-[80px] flex items-center rounded-md border border-border bg-gray-50 px-4 text-lg">
          {rateDisplay} EUR/Stunde
        </p>
      </div>

      {/* Tätigkeit */}
      <div className="flex flex-col gap-2">
        <label htmlFor="category" className="text-sm font-medium">
          Tätigkeit
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as HelpCategory)}
          className="min-h-[80px] rounded-md border border-border px-4 text-lg"
          required
        >
          {(
            Object.entries(HELP_CATEGORY_LABELS) as [HelpCategory, string][]
          ).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Beschreibung */}
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-medium">
          Beschreibung (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="min-h-[80px] rounded-md border border-border px-4 py-3 text-lg"
        />
      </div>

      {/* Unterschriften */}
      <div className="space-y-4">
        <SignaturePad
          label="Unterschrift Helfer"
          onSign={(dataUrl) => setHelperSignature(dataUrl)}
        />
        <SignaturePad
          label="Unterschrift Pflegebedürftiger"
          onSign={(dataUrl) => setResidentSignature(dataUrl)}
        />
      </div>

      {/* Fehlermeldung */}
      {error && (
        <p className="rounded-md bg-red-50 p-3 text-red-700">{error}</p>
      )}

      {/* Absenden */}
      <Button
        type="submit"
        disabled={submitting}
        className="min-h-[80px] w-full text-lg font-semibold"
      >
        {submitting ? "Wird gespeichert…" : "Einsatz dokumentieren"}
      </Button>
    </form>
  );
}
