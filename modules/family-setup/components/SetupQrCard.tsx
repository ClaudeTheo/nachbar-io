"use client";

import { Check, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SetupQrCardProps {
  setupUrl: string;
  shortCode: string;
  expiresAt?: string;
  kind: "child" | "senior";
}

export function SetupQrCard({
  setupUrl,
  shortCode,
  expiresAt,
  kind,
}: SetupQrCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard?.writeText(shortCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-lg border border-[#ebe5dd] bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
        <div className="mx-auto flex h-[180px] w-[180px] items-center justify-center rounded-lg bg-white p-2">
          <QRCodeSVG value={setupUrl} size={156} level="M" />
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-anthrazit">
              {kind === "child" ? "Kinderzugang bereit" : "Senior-Zugang bereit"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              QR scannen oder den Kurzcode manuell eingeben.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-md bg-[#f5f0eb] px-3 py-2 font-mono text-base font-semibold tracking-wider text-anthrazit">
              {shortCode}
            </div>
            <Button type="button" variant="outline" size="icon" onClick={copyCode} aria-label="Kurzcode kopieren">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Diesen QR-Code nicht öffentlich teilen.{" "}
            {kind === "senior"
              ? "Die Angehörigen-Verknüpfung wird vorbereitet; sensible Daten bleiben geschützt, bis der Senior zustimmt."
              : "Kinder können den Zugang nur über diesen Eltern-Code starten."}
          </p>
          {expiresAt && (
            <p className="text-xs text-muted-foreground">
              Gültig bis {new Date(expiresAt).toLocaleString("de-DE")}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
