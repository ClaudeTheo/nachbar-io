"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MemoryCategory } from "../types";

const CATEGORY_OPTIONS: { value: MemoryCategory; label: string; description: string }[] = [
  { value: "profile", label: "Profil", description: "Name, Anrede, Geburtstag" },
  { value: "routine", label: "Routinen", description: "Tägliche Gewohnheiten" },
  { value: "preference", label: "Vorlieben", description: "Was mag die Person" },
  { value: "contact", label: "Kontakte", description: "Wichtige Personen" },
  { value: "care_need", label: "Alltagsbedürfnisse", description: "Wobei Hilfe gebraucht wird" },
];

interface CaregiverMemoryEditorProps {
  /** User-ID des Seniors */
  seniorId: string;
  /** Name des Seniors (Anzeige) */
  seniorName: string;
  /** Callback nach erfolgreichem Speichern */
  onSaved?: () => void;
}

export function CaregiverMemoryEditor({
  seniorId,
  seniorName,
  onSaved,
}: CaregiverMemoryEditorProps) {
  const [category, setCategory] = useState<MemoryCategory>("profile");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    if (!key.trim() || !value.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/memory/facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          key: key.trim().toLowerCase().replace(/\s+/g, "_"),
          value: value.trim(),
          targetUserId: seniorId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Gespeichert!" });
        setKey("");
        setValue("");
        onSaved?.();
      } else {
        const errors: Record<string, string> = {
          no_consent: "Diese Kategorie ist nicht aktiviert.",
          medical_blocked: "Medizinische Inhalte dürfen nicht gespeichert werden.",
          limit_reached: "Maximale Anzahl Einträge erreicht.",
        };
        setMessage({ type: "error", text: errors[data.error] || "Fehler beim Speichern." });
      }
    } catch {
      setMessage({ type: "error", text: "Verbindungsfehler. Bitte erneut versuchen." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
      <div>
        <h3 className="text-lg font-semibold text-anthrazit">
          Gedächtnis für {seniorName} befüllen
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Bitte nur Dinge eintragen, die dauerhaft gelten. Keine Diagnosen,
          Medikamente oder Vitalwerte.
        </p>
      </div>

      {/* Kategorie wählen */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-anthrazit">
          Kategorie
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCategory(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                category === opt.value
                  ? "bg-quartier-green text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {CATEGORY_OPTIONS.find((o) => o.value === category)?.description}
        </p>
      </div>

      {/* Schlüssel */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-anthrazit">
          Kurzbezeichnung
        </label>
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="z.B. Lieblingskaffee, Tochter Name"
          className="w-full rounded-xl border px-4 py-3 text-sm"
        />
      </div>

      {/* Wert */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-anthrazit">
          Was soll sich der Assistent merken?
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="z.B. Trinkt morgens Kaffee schwarz, Tochter heißt Anna"
          className="w-full rounded-xl border px-4 py-3 text-sm"
        />
      </div>

      {message && (
        <Badge
          variant={message.type === "success" ? "default" : "destructive"}
          className="text-xs"
        >
          {message.text}
        </Badge>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || !key.trim() || !value.trim()}
        className="h-12 w-full bg-quartier-green hover:bg-quartier-green-dark"
      >
        {saving ? "Wird gespeichert…" : "Eintrag speichern"}
      </Button>
    </div>
  );
}
