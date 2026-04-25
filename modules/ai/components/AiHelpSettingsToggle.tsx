"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function AiHelpSettingsToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/ai")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { enabled?: boolean }) => {
        if (!cancelled) {
          setEnabled(data.enabled === true);
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

  function updateEnabled(next: boolean) {
    setError(null);
    const previous = enabled;
    setEnabled(next);
    startTransition(async () => {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_enabled: next }),
      });
      if (!res.ok) {
        setEnabled(previous);
        setError("KI-Einstellung konnte nicht gespeichert werden.");
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <Sparkles className="mt-1 h-5 w-5 shrink-0 text-quartier-green" />
          <div>
            <p className="font-semibold text-anthrazit">KI-Hilfe verwenden</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Vorlesen, Sprachbefehle und Assistent bleiben standardmaessig aus.
              Die App funktioniert auch ohne KI-Hilfe.
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          disabled={!loaded || isPending}
          onCheckedChange={updateEnabled}
          aria-label="KI-Hilfe verwenden"
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Ein Wechsel wird mit Zeitstempel im internen Audit-Log Ihres Accounts
        vermerkt. Personenbezogene KI-Nutzung bleibt zusaetzlich durch
        Anbieterfreigabe und AVV-Status gesperrt.
      </p>
      {error && <p className="mt-2 text-sm text-emergency-red">{error}</p>}
    </div>
  );
}
