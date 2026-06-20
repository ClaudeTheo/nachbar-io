"use client";

// modules/family-setup/components/PairSeniorDeviceCard.tsx
// S2-7 (b): "Geraet verbinden" — Angehoeriger erzeugt einen 6-stelligen Verbindungs-Code
// fuer das Senioren-Geraet (Befund A2:3). UI-Bruecke zur bestehenden Route
// POST /api/device/pair/start-code; der Senior gibt den Code am Numpad ("Ich habe einen
// Code", /pair) ein. Mini-Audit GRUEN (docs/plans/handoff/2026-06-14-s2-7-family-setup-mini-audit.md):
// start-code ist caregiver_links-autorisiert — diese Komponente fuegt keine neue Auth-Flaeche hinzu.

import { useState } from "react";
import { Smartphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PairSeniorDeviceCardProps {
  seniorId: string;
  seniorName?: string;
}

interface PairCodeState {
  code: string;
  expiresInMinutes: number;
}

export function PairSeniorDeviceCard({
  seniorId,
  seniorName,
}: PairSeniorDeviceCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<PairCodeState | null>(null);

  async function generateCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/device/pair/start-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senior_user_id: seniorId }),
      });
      if (!res.ok) {
        setError(
          res.status === 503
            ? "Die Geräte-Verbindung ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut."
            : res.status === 403
              ? "Sie haben keinen aktiven Zugriff auf dieses Konto."
              : "Der Code konnte nicht erzeugt werden. Bitte versuchen Sie es erneut.",
        );
        setPairCode(null);
        return;
      }
      const data = (await res.json()) as { code: string; expires_in: number };
      setPairCode({
        code: data.code,
        expiresInMinutes: Math.max(1, Math.round((data.expires_in ?? 600) / 60)),
      });
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setPairCode(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-quartier-green" />
        <span className="text-sm font-medium text-anthrazit">
          Gerät verbinden
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Erzeugen Sie einen Verbindungs-Code und geben Sie ihn am Senioren-Gerät
        unter „Ich habe einen Code“ ein
        {seniorName ? `, um ${seniorName} zu verbinden` : ""}.
      </p>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {error}
        </div>
      )}

      {pairCode ? (
        <div className="space-y-2">
          <p
            data-testid="pair-code"
            className="text-center font-mono text-4xl font-bold tracking-[0.3em] text-anthrazit"
          >
            {pairCode.code}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Gültig für {pairCode.expiresInMinutes} Minuten. Geben Sie den Code am
            Senioren-Gerät ein.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateCode}
            disabled={loading}
            className="w-full"
          >
            Neuen Code erzeugen
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={generateCode}
          disabled={loading}
          className="w-full gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Code erzeugen
        </Button>
      )}
    </div>
  );
}
