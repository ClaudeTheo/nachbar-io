"use client";

import { useMemoryFacts } from "@/modules/memory/hooks/useMemoryFacts";
import { MemoryFactList } from "@/modules/memory/components/MemoryFactList";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import type { MemoryConsentType } from "@/modules/memory/types";

const CONSENT_LABELS: Record<MemoryConsentType, string> = {
  memory_basis: "Profil, Routinen, Vorlieben, Kontakte",
  memory_care: "Alltagsbedürfnisse",
  memory_personal: "Private Notizen",
};

export default function GedaechtnisPage() {
  const { facts, consents, loading, deleteFact, updateFact, resetFacts, reload } =
    useMemoryFacts();

  async function toggleConsent(type: MemoryConsentType, currentlyGranted: boolean) {
    const endpoint = currentlyGranted
      ? "/api/memory/consent/revoke"
      : "/api/memory/consent/grant";
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent_type: type }),
    });
    reload();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // Consent-Map aufbauen
  const consentMap = new Map(
    consents.map((c) => [c.consent_type, c.granted && !c.revoked_at]),
  );

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-anthrazit">Mein Gedächtnis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Das KI-Gedächtnis ist freiwillig. Die App funktioniert auch ohne
          KI-Gedächtnis weiter. Jeder Eintrag kann bearbeitet oder gelöscht
          werden.
        </p>
      </div>

      {/* Consent-Toggles */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Einwilligungen
        </h2>
        {(Object.keys(CONSENT_LABELS) as MemoryConsentType[]).map((type) => {
          const granted = consentMap.get(type) ?? false;
          return (
            <div
              key={type}
              className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-soft"
            >
              <span className="text-sm text-anthrazit">{CONSENT_LABELS[type]}</span>
              <Switch
                checked={granted}
                onCheckedChange={() => toggleConsent(type, granted)}
                aria-label={CONSENT_LABELS[type]}
              />
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">
          Wenn Sie eine Kategorie deaktivieren, werden alle zugehörigen Einträge
          sofort und unwiderruflich gelöscht.
        </p>
      </div>

      {/* Fakten-Liste */}
      <MemoryFactList
        facts={facts}
        onDelete={deleteFact}
        onUpdate={updateFact}
        onReset={resetFacts}
      />

      <p className="text-center text-xs text-muted-foreground">
        {facts.length} von 70 Einträgen belegt
      </p>
    </div>
  );
}
