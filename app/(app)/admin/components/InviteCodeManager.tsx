"use client";

import { useState, useEffect } from "react";
import { QrCode, Plus, Copy, Check, Printer, Trash2, RotateCcw, Clock, Ban, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Household } from "@/lib/supabase/types";
import { QUARTIER_STREETS } from "@/lib/constants";
import { generateSecureCode, generateQuarterCode, formatCode, extractQuarterPrefix } from "@/lib/invite-codes";
import type { Quarter } from "@/lib/quarters/types";
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
  const [revoking, setRevoking] = useState<string | null>(null);
  const [showUsed, setShowUsed] = useState(false);
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [selectedQuarterId, setSelectedQuarterId] = useState<string>("all");

  // Quartiere laden
  useEffect(() => {
    async function loadQuarters() {
      const supabase = createClient();
      const { data } = await supabase
        .from("quarters")
        .select("*")
        .eq("status", "active")
        .order("name");
      if (data) setQuarters(data as Quarter[]);
    }
    loadQuarters();
  }, []);

  // Ausgewaehltes Quartier-Objekt
  const selectedQuarter = quarters.find(q => q.id === selectedQuarterId);

  // Gefilterte Haushalte nach Quartier
  const filteredHouseholds = selectedQuarterId === "all"
    ? households
    : households.filter(h => h.quarter_id === selectedQuarterId);

  // Code-Statistiken (gefiltert)
  const usedCodes = filteredHouseholds.filter(h => h.memberCount > 0).length;
  const unusedCodes = filteredHouseholds.filter(h => h.memberCount === 0).length;

  // Kryptografisch sicheren Invite-Code generieren — mit Quartier-Prefix falls verfuegbar
  function generateInviteCode(): string {
    if (selectedQuarter?.invite_prefix) {
      return generateQuarterCode(selectedQuarter.invite_prefix);
    }
    return generateSecureCode();
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

    // Kryptografisch sicheren Code generieren
    const code = generateInviteCode();

    const lat = newLat ? parseFloat(newLat) : 47.5617;
    const lng = newLng ? parseFloat(newLng) : 7.9483;

    const insertData: Record<string, unknown> = {
      street_name: newStreet,
      house_number: newHouseNumber,
      invite_code: code,
      lat,
      lng,
      verified: false,
    };
    // Quartier-Zuordnung, falls ein Quartier ausgewaehlt ist
    if (selectedQuarter) {
      insertData.quarter_id = selectedQuarter.id;
    }

    const { error } = await supabase
      .from("households")
      .insert(insertData);

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

  // Code widerrufen (Haushalt ohne Mitglieder loeschen)
  async function revokeCode(householdId: string, code: string) {
    setRevoking(householdId);
    const supabase = createClient();

    const { error } = await supabase
      .from("households")
      .delete()
      .eq("id", householdId);

    if (error) {
      toast.error("Fehler beim Widerrufen: " + error.message);
    } else {
      toast.success(`Code ${code} widerrufen`);
      onRefresh();
    }
    setRevoking(null);
  }

  // Code erneuern (kryptografisch sicheren Code generieren fuer bestehenden Haushalt)
  async function regenerateCode(householdId: string, quarterId?: string) {
    const supabase = createClient();
    // Quartier-Prefix fuer Haushalt ermitteln
    const quarter = quarterId ? quarters.find(q => q.id === quarterId) : selectedQuarter;
    const newCode = quarter?.invite_prefix
      ? generateQuarterCode(quarter.invite_prefix)
      : generateSecureCode();

    const { error } = await supabase
      .from("households")
      .update({ invite_code: newCode })
      .eq("id", householdId);

    if (error) {
      toast.error("Fehler beim Erneuern: " + error.message);
    } else {
      toast.success(`Neuer Code: ${newCode}`);
      onRefresh();
    }
  }

  // Alle QR-Codes als Druckansicht oeffnen
  function openPrintView(street?: string) {
    const codes = street
      ? filteredHouseholds.filter(h => h.street_name === street)
      : filteredHouseholds;

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
              <img src="/api/qr?code=${formatCode(h.invite_code)}&size=300" alt="QR ${formatCode(h.invite_code)}" />
              <h3>${h.street_name} ${h.house_number}</h3>
              <p class="code">${formatCode(h.invite_code)}</p>
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

  // Strassen gruppieren (nur gefilterte Haushalte)
  const streets = [...new Set(filteredHouseholds.map(h => h.street_name))];
  const unusedHouseholds = filteredHouseholds.filter(h => h.memberCount === 0);
  const usedHouseholds = filteredHouseholds.filter(h => h.memberCount > 0);

  // Quartier-Name aus ID ermitteln (fuer Badges)
  function getQuarterName(quarterId?: string): string | null {
    if (!quarterId) return null;
    const q = quarters.find(qr => qr.id === quarterId);
    return q?.name ?? null;
  }

  // Quartier-Prefix aus Invite-Code oder quarter_id ermitteln (fuer Badge-Anzeige)
  function getQuarterBadge(household: Household): string | null {
    // Zuerst ueber quarter_id
    const name = getQuarterName(household.quarter_id);
    if (name) return name;
    // Fallback: Prefix aus Code extrahieren
    const prefix = extractQuarterPrefix(household.invite_code);
    return prefix;
  }

  return (
    <div className="space-y-4">
      {/* Quartier-Filter */}
      {quarters.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                value={selectedQuarterId}
                onChange={(e) => setSelectedQuarterId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Alle Quartiere</option>
                {quarters.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name} {q.invite_prefix ? `(${q.invite_prefix})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiken */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-anthrazit">{filteredHouseholds.length}</p>
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
              <QrCode className="h-3 w-3 mr-1" /> Alle ({filteredHouseholds.length})
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

      {/* Unbenutzte Codes mit Aktionen */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Unbenutzte Codes ({unusedHouseholds.length})
        </p>
        {unusedHouseholds.map((h) => (
          <div key={h.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gray-300" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm">{h.street_name} {h.house_number}</span>
                <span className="font-mono text-sm font-bold text-quartier-green">{formatCode(h.invite_code)}</span>
                {getQuarterBadge(h) && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {getQuarterBadge(h)}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Code kopieren */}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => copyCode(h.invite_code)}
                title="Code kopieren"
              >
                {copiedCode === h.invite_code ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              {/* Code erneuern */}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => regenerateCode(h.id, h.quarter_id)}
                title="Neuen Code generieren"
              >
                <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
              </Button>
              {/* Code widerrufen (Haushalt loeschen) */}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => revokeCode(h.id, h.invite_code)}
                disabled={revoking === h.id}
                title="Code widerrufen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {unusedHouseholds.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Alle Codes sind vergeben!
          </p>
        )}
      </div>

      {/* Verwendete Codes (einklappbar) */}
      <div className="space-y-2">
        <button
          onClick={() => setShowUsed(!showUsed)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-anthrazit transition-colors"
        >
          <Check className="h-3 w-3" />
          Verwendete Codes ({usedHouseholds.length})
          <span className="text-[10px]">{showUsed ? "▲" : "▼"}</span>
        </button>

        {showUsed && usedHouseholds.map((h) => (
          <div key={h.id} className="flex items-center justify-between bg-quartier-green/5 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-quartier-green" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm">{h.street_name} {h.house_number}</span>
                <span className="font-mono text-xs text-muted-foreground">{formatCode(h.invite_code)}</span>
                {getQuarterBadge(h) && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {getQuarterBadge(h)}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="default" className="text-[10px]">
                {h.memberCount} Bew.
              </Badge>
              {/* Code erneuern (fuer den Fall, dass er kompromittiert wurde) */}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => regenerateCode(h.id, h.quarter_id)}
                title="Code erneuern (alter Code wird ungueltig)"
              >
                <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
