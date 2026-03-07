"use client";

import { useState } from "react";
import { QrCode, Plus, Download, Copy, Check, Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Household } from "@/lib/supabase/types";
import { QUARTIER_STREETS } from "@/lib/constants";
import { toast } from "sonner";

interface InviteCodeManagerProps {
  households: (Household & { memberCount: number })[];
  onRefresh: () => void;
}

export function InviteCodeManager({ households, onRefresh }: InviteCodeManagerProps) {
  const [newStreet, setNewStreet] = useState("");
  const [newHouseNumber, setNewHouseNumber] = useState("");
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Code-Statistiken
  const usedCodes = households.filter(h => h.memberCount > 0).length;
  const unusedCodes = households.filter(h => h.memberCount === 0).length;

  // Invite-Code generieren (Kuerzel + laufende Nummer)
  function generateInviteCode(street: string, existingCodes: string[]): string {
    // Strassenkuerzel
    const prefixMap: Record<string, string> = {
      "Purkersdorfer Strasse": "PKD",
      "Purkersdorfer Straße": "PKD",
      "Sanarystrasse": "SAN",
      "Sanarystraße": "SAN",
      "Oberer Rebberg": "ORB",
    };
    const prefix = prefixMap[street] ?? street.substring(0, 3).toUpperCase();

    // Hoechste Nummer finden
    const existing = existingCodes
      .filter(c => c.startsWith(prefix))
      .map(c => parseInt(c.replace(prefix, ""), 10))
      .filter(n => !isNaN(n));

    const nextNum = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(nextNum).padStart(3, "0")}`;
  }

  // Neuen Haushalt + Code anlegen
  async function createHousehold() {
    if (!newStreet || !newHouseNumber) {
      toast.error("Bitte Strasse und Hausnummer angeben");
      return;
    }

    setCreating(true);
    const supabase = createClient();

    // Pruefen ob Haushalt schon existiert
    const { data: existing } = await supabase
      .from("households")
      .select("id")
      .eq("street_name", newStreet)
      .eq("house_number", newHouseNumber)
      .maybeSingle();

    if (existing) {
      toast.error("Dieser Haushalt existiert bereits");
      setCreating(false);
      return;
    }

    // Code generieren
    const allCodes = households.map(h => h.invite_code);
    const code = generateInviteCode(newStreet, allCodes);

    // Standardkoordinaten (Quartierszentrum) falls nicht angegeben
    const lat = newLat ? parseFloat(newLat) : 47.5617;
    const lng = newLng ? parseFloat(newLng) : 7.9483;

    const { error } = await supabase
      .from("households")
      .insert({
        street_name: newStreet,
        house_number: newHouseNumber,
        invite_code: code,
        lat,
        lng,
        verified: false,
      });

    if (error) {
      toast.error("Fehler beim Erstellen: " + error.message);
    } else {
      toast.success(`Haushalt erstellt mit Code: ${code}`);
      setNewHouseNumber("");
      setNewLat("");
      setNewLng("");
      onRefresh();
    }
    setCreating(false);
  }

  // Code in Zwischenablage kopieren
  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success("Code kopiert!");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  // Alle QR-Codes als Druckansicht oeffnen
  function openPrintView(street?: string) {
    const codes = street
      ? households.filter(h => h.street_name === street)
      : households;

    // HTML fuer Druckansicht erstellen
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR-Codes${street ? ` — ${street}` : ""} — Nachbar.io</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; text-align: center; page-break-inside: avoid; }
          .card img { width: 150px; height: 150px; }
          .card h3 { margin: 8px 0 4px; font-size: 14px; }
          .card p { margin: 0; font-size: 12px; color: #666; }
          .code { font-family: monospace; font-size: 18px; font-weight: bold; color: #4CAF87; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>Nachbar.io — Einladungs-Codes${street ? ` fuer ${street}` : ""}</h1>
        <p class="no-print"><button onclick="window.print()">Drucken</button></p>
        <div class="grid">
          ${codes.map(h => `
            <div class="card">
              <img src="/api/qr?code=${h.invite_code}&size=300" alt="QR ${h.invite_code}" />
              <h3>${h.street_name} ${h.house_number}</h3>
              <p class="code">${h.invite_code}</p>
              <p>Scannen zum Registrieren</p>
            </div>
          `).join("")}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  // Strassen gruppieren
  const streets = [...new Set(households.map(h => h.street_name))];

  return (
    <div className="space-y-4">
      {/* Statistiken */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-anthrazit">{households.length}</p>
          <p className="text-[10px] text-muted-foreground">Gesamt-Codes</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-quartier-green">{usedCodes}</p>
          <p className="text-[10px] text-muted-foreground">Verwendet</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{unusedCodes}</p>
          <p className="text-[10px] text-muted-foreground">Unbenutzt</p>
        </Card>
      </div>

      {/* Neuen Haushalt anlegen */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-anthrazit flex items-center gap-2">
            <Plus className="h-4 w-4" /> Neuen Haushalt anlegen
          </p>

          <div className="space-y-2">
            <select
              value={newStreet}
              onChange={(e) => setNewStreet(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Strasse waehlen...</option>
              {QUARTIER_STREETS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Hausnr."
                value={newHouseNumber}
                onChange={(e) => setNewHouseNumber(e.target.value)}
              />
              <Input
                placeholder="Lat (opt.)"
                value={newLat}
                onChange={(e) => setNewLat(e.target.value)}
                type="number"
                step="0.0001"
              />
              <Input
                placeholder="Lng (opt.)"
                value={newLng}
                onChange={(e) => setNewLng(e.target.value)}
                type="number"
                step="0.0001"
              />
            </div>

            <Button
              className="w-full"
              onClick={createHousehold}
              disabled={creating || !newStreet || !newHouseNumber}
            >
              {creating ? "Wird erstellt..." : "Haushalt + Code erstellen"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR-Batch-Druck */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-semibold text-anthrazit flex items-center gap-2">
            <Printer className="h-4 w-4" /> QR-Codes drucken
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => openPrintView()}
            >
              <QrCode className="h-3 w-3 mr-1" /> Alle ({households.length})
            </Button>
            {streets.map((street) => (
              <Button
                key={street}
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => openPrintView(street)}
              >
                {street.replace("Straße", "Str.").replace("Strasse", "Str.")}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Code-Liste */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Unbenutzte Codes</p>
        {households
          .filter(h => h.memberCount === 0)
          .map((h) => (
            <div key={h.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-300" />
                <span className="text-sm">{h.street_name} {h.house_number}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-sm font-bold text-quartier-green">{h.invite_code}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => copyCode(h.invite_code)}
                >
                  {copiedCode === h.invite_code ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}

        {households.filter(h => h.memberCount === 0).length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Alle Codes sind vergeben!
          </p>
        )}
      </div>
    </div>
  );
}
