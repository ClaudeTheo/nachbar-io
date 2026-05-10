"use client";

// Welle W11 — Admin-UI fuer OEPNV-Stops je Quartier.
// Workflow: Quartier auswaehlen -> "Stops vorschlagen" (Discover via EFA-BW)
// -> Auswahl per Checkbox -> "Auswahl speichern" (Apply in municipal_config).

import { useCallback, useEffect, useState } from "react";
import { Bus, Loader2, MapPin, RefreshCw, Save, Search, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface QuarterRow {
  id: string;
  name: string;
  city?: string | null;
}

interface DiscoveredStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  distanceMeters: number | null;
}

interface DiscoveryResponse {
  quarterId: string;
  quarterName: string;
  centerLat: number | null;
  centerLng: number | null;
  stops: DiscoveredStop[];
  fetchedAt: string;
  errors: string[];
}

export function OepnvStopsManager() {
  const [quarters, setQuarters] = useState<QuarterRow[]>([]);
  const [loadingQuarters, setLoadingQuarters] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [selectedStopIds, setSelectedStopIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const loadQuarters = useCallback(async () => {
    setLoadingQuarters(true);
    try {
      const res = await fetch("/api/admin/quarters");
      if (!res.ok) {
        toast.error("Quartiere konnten nicht geladen werden.");
        setQuarters([]);
        return;
      }
      const data = (await res.json()) as QuarterRow[];
      setQuarters(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Netzwerkfehler beim Laden der Quartiere.");
      setQuarters([]);
    } finally {
      setLoadingQuarters(false);
    }
  }, []);

  useEffect(() => {
    loadQuarters();
  }, [loadQuarters]);

  async function handleDiscover() {
    if (!selectedId) return;
    setDiscovering(true);
    setDiscovery(null);
    try {
      const res = await fetch(
        `/api/admin/quarters/${selectedId}/oepnv-stops/discover`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`Fehler: ${err?.error ?? "Discover fehlgeschlagen"}`);
        return;
      }
      const data = (await res.json()) as DiscoveryResponse;
      setDiscovery(data);
      // Standard: alle vorgeschlagenen Stops vorausgewaehlt.
      setSelectedStopIds(new Set(data.stops.map((s) => s.id)));
    } catch {
      toast.error("Netzwerkfehler bei Stop-Suche.");
    } finally {
      setDiscovering(false);
    }
  }

  function toggleStop(id: string) {
    setSelectedStopIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApply() {
    if (!selectedId || !discovery) return;
    setSaving(true);
    const payload = {
      stops: discovery.stops
        .filter((s) => selectedStopIds.has(s.id))
        .map((s) => ({ id: s.id, name: s.name })),
    };
    try {
      const res = await fetch(`/api/admin/quarters/${selectedId}/oepnv-stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`Fehler: ${err?.error ?? "Speichern fehlgeschlagen"}`);
        return;
      }
      const data = (await res.json()) as { savedCount: number };
      toast.success(`${data.savedCount} Stop(s) gespeichert.`);
    } catch {
      toast.error("Netzwerkfehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  const selectedQuarter = quarters.find((q) => q.id === selectedId);
  const checkedCount = selectedStopIds.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bus className="h-5 w-5 text-quartier-green" />
        <h2 className="text-lg font-semibold text-anthrazit">OEPNV-Stops</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Vorschlaege aus EFA-BW (Karlsruhe-Region) im Umkreis des Quartier-Centers.
        Auswahl wird in <code>municipal_config.oepnv_stops</code> gespeichert.
      </p>

      {/* Schritt 1: Quartier waehlen */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-anthrazit">
              1. Quartier waehlen
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadQuarters}
              disabled={loadingQuarters}
              aria-label="Quartiere neu laden"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingQuarters ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {loadingQuarters ? (
            <p className="text-xs text-muted-foreground">Lade Quartiere...</p>
          ) : quarters.length === 0 ? (
            <p className="text-xs text-muted-foreground">Keine Quartiere gefunden.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {quarters.map((q) => {
                const isActive = q.id === selectedId;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(q.id);
                      setDiscovery(null);
                      setSelectedStopIds(new Set());
                    }}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      isActive
                        ? "border-quartier-green bg-quartier-green/5"
                        : "border-border bg-white hover:bg-muted/50"
                    }`}
                  >
                    <div className="text-sm font-medium text-anthrazit">{q.name}</div>
                    {q.city ? (
                      <div className="text-xs text-muted-foreground">{q.city}</div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schritt 2: Discover */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-anthrazit">
              2. Stops vorschlagen
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={handleDiscover}
              disabled={!selectedId || discovering}
            >
              {discovering ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5 mr-1" />
              )}
              Stops vorschlagen
            </Button>
          </div>

          {selectedQuarter ? (
            <p className="text-xs text-muted-foreground">
              Quartier: <strong>{selectedQuarter.name}</strong>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Bitte zuerst ein Quartier auswaehlen.
            </p>
          )}

          {discovery && discovery.errors.length > 0 ? (
            <div className="rounded-lg border border-alert-amber/40 bg-alert-amber/5 p-3 space-y-1">
              <div className="flex items-center gap-2 text-alert-amber font-medium text-sm">
                <TriangleAlert className="h-4 w-4" />
                Hinweis
              </div>
              {discovery.errors.map((e, i) => (
                <p key={i} className="text-xs text-anthrazit">
                  {e}
                </p>
              ))}
            </div>
          ) : null}

          {discovery && discovery.stops.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {discovery.stops.length} Stop(s) gefunden, {checkedCount} ausgewaehlt
              </p>
              <ul className="space-y-1">
                {discovery.stops.map((s) => {
                  const id = `oepnv-stop-${s.id}`;
                  const checked = selectedStopIds.has(s.id);
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStop(s.id)}
                        className="h-5 w-5 rounded border-gray-300 text-quartier-green focus:ring-quartier-green"
                      />
                      <label
                        htmlFor={id}
                        className="flex-1 cursor-pointer text-sm text-anthrazit"
                      >
                        {s.name}
                      </label>
                      {s.distanceMeters != null ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {Math.round(s.distanceMeters)} m
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Schritt 3: Apply */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-anthrazit">
              3. Auswahl speichern
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={!selectedId || !discovery || saving || checkedCount === 0}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1" />
              )}
              Auswahl speichern
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Schreibt nur <code>id</code> + <code>name</code> der ausgewaehlten Stops.
            Senior-App und Quartier-Info-Hub lesen diese Liste.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
