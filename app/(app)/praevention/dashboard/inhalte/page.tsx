"use client";

// /praevention/dashboard/inhalte — KI-Prompts bearbeiten (pro Woche)
// Kursleiter kann System-Prompts anpassen, versioniert

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";

interface WeekContent {
  id: string;
  week_number: number;
  title: string;
  description: string | null;
  ki_system_prompt: string | null;
  prompt_version: number;
}

export default function InhaltePage() {
  const [contents, setContents] = useState<WeekContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedWeek, setSavedWeek] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Alle 8 Wochen laden
        const weekContents: WeekContent[] = [];
        for (let w = 1; w <= 8; w++) {
          const res = await fetch(`/api/prevention/materials/${w}`);
          if (res.ok) {
            const data = await res.json();
            weekContents.push(data);
          }
        }
        setContents(weekContents);
      } catch {
        // Fehler ignorieren
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const startEdit = (week: number, prompt: string | null) => {
    setEditingWeek(week);
    setEditPrompt(prompt ?? "");
    setSavedWeek(null);
  };

  const cancelEdit = () => {
    setEditingWeek(null);
    setEditPrompt("");
  };

  const savePrompt = async () => {
    if (editingWeek === null) return;
    setSaving(true);

    try {
      // Content-Update via Dashboard-API (Kursleiter-berechtigt)
      const content = contents.find((c) => c.week_number === editingWeek);
      if (!content) return;

      const res = await fetch("/api/prevention/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: content.id,
          kiSystemPrompt: editPrompt,
        }),
      });

      if (res.ok) {
        // Lokal aktualisieren
        setContents((prev) =>
          prev.map((c) =>
            c.week_number === editingWeek
              ? {
                  ...c,
                  ki_system_prompt: editPrompt,
                  prompt_version: c.prompt_version + 1,
                }
              : c,
          ),
        );
        setSavedWeek(editingWeek);
        setEditingWeek(null);
      }
    } catch {
      // Fehler ignorieren
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/praevention/dashboard"
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-800">
            Kurs-Inhalte & KI-Prompts
          </h1>
          <p className="text-xs text-gray-500">
            Wöchentliche System-Prompts bearbeiten
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          Wird geladen...
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: 8 }, (_, i) => {
            const week = i + 1;
            const content = contents.find((c) => c.week_number === week);
            const isEditing = editingWeek === week;

            return (
              <div key={week} className="rounded-xl border border-gray-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium text-gray-800">
                    Woche {week}
                    {content?.title ? `: ${content.title}` : ""}
                  </h3>
                  {content?.prompt_version && (
                    <span className="text-xs text-gray-400">
                      v{content.prompt_version}
                    </span>
                  )}
                </div>

                {content?.description && (
                  <p className="mb-3 text-sm text-gray-600">
                    {content.description}
                  </p>
                )}

                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      rows={8}
                      className="w-full rounded-lg border border-gray-200 p-3 text-sm font-mono focus:border-emerald-400 focus:outline-none"
                      placeholder="KI-System-Prompt für diese Woche..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={savePrompt}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? "Speichern..." : "Speichern"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {content?.ki_system_prompt ? (
                      <pre className="mb-3 max-h-24 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                        {content.ki_system_prompt.slice(0, 200)}
                        {content.ki_system_prompt.length > 200 ? "..." : ""}
                      </pre>
                    ) : (
                      <p className="mb-3 text-sm text-gray-400">
                        Kein System-Prompt hinterlegt
                      </p>
                    )}
                    <button
                      onClick={() =>
                        startEdit(week, content?.ki_system_prompt ?? null)
                      }
                      className="text-sm text-emerald-600 hover:underline"
                    >
                      Bearbeiten
                    </button>
                    {savedWeek === week && (
                      <span className="ml-3 text-sm text-emerald-600">
                        ✓ Gespeichert
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
