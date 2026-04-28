"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles, X } from "lucide-react";
import { AiAssistanceLevelPicker } from "@/components/ki-help/AiAssistanceLevelPicker";
import type { AiAssistanceLevel } from "@/lib/ki-help/ai-assistance-levels";

type ApiState = {
  enabled?: boolean;
  assistanceLevel?: AiAssistanceLevel;
};

function levelFromApi(data: ApiState): AiAssistanceLevel {
  if (data.assistanceLevel) return data.assistanceLevel;
  return data.enabled === true ? "basic" : "off";
}

export function AiHelpSettingsToggle() {
  const [level, setLevel] = useState<AiAssistanceLevel>("off");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLockHint, setShowLockHint] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/ai")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: ApiState) => {
        if (!cancelled) {
          setLevel(levelFromApi(data));
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("KI-Einstellung konnte nicht geladen werden.");
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateLevel(next: AiAssistanceLevel) {
    setError(null);
    const previous = level;
    setLevel(next);
    startTransition(async () => {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_assistance_level: next }),
      });
      if (!res.ok) {
        setLevel(previous);
        setError("KI-Einstellung konnte nicht gespeichert werden.");
        return;
      }
      const data = (await res.json()) as ApiState;
      setLevel(levelFromApi(data));
    });
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-1 h-5 w-5 shrink-0 text-quartier-green" />
        <div>
          <p className="font-semibold text-anthrazit">KI-Hilfe verwenden</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vorlesen, Sprachbefehle und Assistent bleiben standardmaessig aus.
            Die App funktioniert auch ohne KI-Hilfe.
          </p>
        </div>
      </div>

      <AiAssistanceLevelPicker
        className="mt-4"
        mode="settings"
        value={level}
        onChange={updateLevel}
        onLockedClick={() => setShowLockHint(true)}
        disabled={!loaded || isPending}
      />

      {showLockHint && (
        <div className="mt-3 rounded-lg border border-quartier-green/25 bg-quartier-green/5 p-3 text-sm text-anthrazit">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold">Persönlich ist noch gesperrt.</p>
              <p>
                Diese Stufe kommt mit Phase 2, sobald die nötigen
                Schutzmaßnahmen aktiv sind.
              </p>
              <p>
                Wir informieren Sie dann. Sie entscheiden neu, ob Sie diese
                Stufe nutzen möchten.
              </p>
            </div>
            <button
              type="button"
              aria-label="Hinweis schließen"
              onClick={() => setShowLockHint(false)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/70"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Ein Wechsel wird mit Zeitstempel im internen Audit-Log Ihres Accounts
        vermerkt. Personenbezogene KI-Nutzung bleibt zusaetzlich durch
        Anbieterfreigabe und AVV-Status gesperrt.
      </p>
      {error && <p className="mt-2 text-sm text-emergency-red">{error}</p>}
    </div>
  );
}
