"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { useQuarter } from "@/lib/quarters";

export default function PollNewPage() {
  const router = useRouter();
  const { currentQuarter } = useQuarter();
  const [step, setStep] = useState(1);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addOption() {
    if (options.length < 6) setOptions([...options, ""]);
  }

  function removeOption(idx: number) {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  }

  function updateOption(idx: number, value: string) {
    const copy = [...options];
    copy[idx] = value;
    setOptions(copy);
  }

  const validOptions = options.filter((o) => o.trim().length > 0);
  const canProceed = question.trim().length > 0 && validOptions.length >= 2;

  async function handleSubmit() {
    if (!canProceed) return;
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { user } = await getCachedUser(supabase);
      if (!user) {
        setError("Nicht angemeldet.");
        setSaving(false);
        return;
      }

      // Umfrage erstellen
      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({
          user_id: user.id,
          quarter_id: currentQuarter?.id,
          question: question.trim(),
          multiple_choice: multipleChoice,
          status: "active",
        })
        .select()
        .single();

      if (pollError || !poll) {
        toast.error("Speichern fehlgeschlagen.");
        setError("Speichern fehlgeschlagen.");
        setSaving(false);
        return;
      }

      // Optionen erstellen
      const optionRows = validOptions.map((label, idx) => ({
        poll_id: poll.id,
        label: label.trim(),
        sort_order: idx,
      }));

      const { error: optError } = await supabase.from("poll_options").insert(optionRows);

      if (optError) {
        toast.error("Optionen konnten nicht gespeichert werden.");
        setSaving(false);
        return;
      }

      toast.success("Umfrage erstellt!");
      setStep(3);
    } catch {
      toast.error("Netzwerkfehler.");
      setError("Netzwerkfehler.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/polls" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Neue Umfrage</h1>
      </div>

      {/* Schrittanzeige */}
      <div className="flex gap-1">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-quartier-green" : "bg-muted"}`} />
        ))}
      </div>

      {/* Schritt 1: Frage + Optionen */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-anthrazit">Ihre Frage</label>
            <Input
              placeholder="z.B. 'Interesse an einem Straßenfest im Sommer?'"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
            />
            <p className="mt-1 text-xs text-muted-foreground">{question.length}/200</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-anthrazit">Antwort-Optionen</label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button onClick={() => removeOption(idx)} className="shrink-0 rounded-lg p-2 hover:bg-muted">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button
                onClick={addOption}
                className="mt-2 flex items-center gap-1 text-sm text-quartier-green hover:underline"
              >
                <Plus className="h-4 w-4" /> Option hinzufügen
              </button>
            )}
          </div>

          {/* Mehrfachauswahl */}
          <label className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
            <input
              type="checkbox"
              checked={multipleChoice}
              onChange={(e) => setMultipleChoice(e.target.checked)}
              className="h-4 w-4 rounded border-border text-quartier-green"
            />
            <span className="text-sm text-anthrazit">Mehrfachauswahl erlauben</span>
          </label>

          <Button
            onClick={() => setStep(2)}
            disabled={!canProceed}
            className="w-full bg-quartier-green hover:bg-quartier-green-dark"
          >
            Vorschau
          </Button>
        </div>
      )}

      {/* Schritt 2: Vorschau + Absenden */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Vorschau Ihrer Umfrage:</p>
          <div className="rounded-xl border-2 border-border bg-white p-5">
            <h3 className="text-lg font-bold text-anthrazit">{question}</h3>
            <div className="mt-3 space-y-2">
              {validOptions.map((opt, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-anthrazit">
                  {opt}
                </div>
              ))}
            </div>
            {multipleChoice && (
              <p className="mt-2 text-xs text-muted-foreground">Mehrfachauswahl möglich</p>
            )}
          </div>

          {error && <p className="text-sm text-emergency-red">{error}</p>}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Zurück</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
            >
              {saving ? "Wird erstellt..." : "Umfrage starten"}
            </Button>
          </div>
        </div>
      )}

      {/* Schritt 3: Erfolg */}
      {step === 3 && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-quartier-green/10">
            <Check className="h-8 w-8 text-quartier-green" />
          </div>
          <h2 className="text-lg font-bold text-anthrazit">Umfrage gestartet!</h2>
          <p className="mt-2 text-muted-foreground">Ihre Nachbarn können jetzt abstimmen.</p>
          <Button onClick={() => router.push("/polls")} className="mt-4 bg-quartier-green hover:bg-quartier-green-dark">
            Zu den Umfragen
          </Button>
        </div>
      )}
    </div>
  );
}
