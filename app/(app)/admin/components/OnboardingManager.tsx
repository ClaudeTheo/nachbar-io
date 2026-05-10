"use client";

// Welle W4-FULL — Admin-UI fuer Onboarding-Pipeline.
// Workflow: Quartier auswaehlen -> Domain eingeben -> "Onboarding starten"
// (POST /api/admin/quarters/[id]/onboard) -> Vorschau Feeds/Stops/Events
// -> "Stops uebernehmen" (POST /api/admin/quarters/[id]/oepnv-stops).

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bus,
  Calendar,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
  Rss,
  Save,
  Wand2,
} from "lucide-react";
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

interface CrawledEvent {
  source: "rss" | "ical";
  feedUrl: string;
  uid: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  link: string | null;
  isAllDay: boolean;
}

interface OnboardingResult {
  quarterId: string;
  domain: string | null;
  feeds: { rss: string | null; ical: string | null };
  stops: DiscoveredStop[];
  events: CrawledEvent[];
  fetchedFromRss: number;
  fetchedFromIcal: number;
  errors: string[];
}

export function OnboardingManager() {
  const [quarters, setQuarters] = useState<QuarterRow[]>([]);
  const [loadingQuarters, setLoadingQuarters] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [domain, setDomain] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [applyingStops, setApplyingStops] = useState(false);
  const [applyingEvents, setApplyingEvents] = useState(false);

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

  async function handleRun() {
    if (!selectedId) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/quarters/${selectedId}/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`Fehler: ${err?.error ?? "Onboarding fehlgeschlagen"}`);
        return;
      }
      const data = (await res.json()) as OnboardingResult;
      setResult(data);
    } catch {
      toast.error("Netzwerkfehler beim Onboarding.");
    } finally {
      setRunning(false);
    }
  }

  async function handleApplyEvents() {
    if (!selectedId || !result) return;
    setApplyingEvents(true);
    try {
      const res = await fetch(
        `/api/admin/quarters/${selectedId}/events/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events: result.events }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`Fehler: ${err?.error ?? "Events-Apply fehlgeschlagen"}`);
        return;
      }
      const data = (await res.json()) as { savedCount: number; syncedAt: string };
      toast.success(`${data.savedCount} Event(s) als Quartier-Events gespeichert.`);
    } catch {
      toast.error("Netzwerkfehler beim Speichern der Events.");
    } finally {
      setApplyingEvents(false);
    }
  }

  async function handleApplyStops() {
    if (!selectedId || !result) return;
    setApplyingStops(true);
    try {
      const payload = {
        stops: result.stops.map((s) => ({ id: s.id, name: s.name })),
      };
      const res = await fetch(
        `/api/admin/quarters/${selectedId}/oepnv-stops`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`Fehler: ${err?.error ?? "Stops-Apply fehlgeschlagen"}`);
        return;
      }
      const data = (await res.json()) as { savedCount: number };
      toast.success(`${data.savedCount} Stop(s) als OEPNV gespeichert.`);
    } catch {
      toast.error("Netzwerkfehler beim Speichern der Stops.");
    } finally {
      setApplyingStops(false);
    }
  }

  const selectedQuarter = quarters.find((q) => q.id === selectedId);
  const feedsCount =
    (result?.feeds.rss ? 1 : 0) + (result?.feeds.ical ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 className="h-5 w-5 text-quartier-green" />
        <h2 className="text-lg font-semibold text-anthrazit">
          Onboarding-Pipeline
        </h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Probt Stadt-Domain auf RSS/iCal-Feeds (Welle J), schlaegt OEPNV-Stops vor
        (Welle H) und crawlt initiale Events (Welle W10). Alle Schritte
        non-destructive — nichts wird ohne Klick gespeichert.
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
                      setResult(null);
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

      {/* Schritt 2: Domain + Run */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <span className="text-sm font-medium text-anthrazit">
            2. Stadt-Domain (optional) + Onboarding starten
          </span>

          <div className="space-y-2">
            <label
              htmlFor="onboard-domain"
              className="text-xs text-muted-foreground"
            >
              Stadt-Domain (z.B. https://www.badsaeckingen.de) — leer lassen
              wenn nur OEPNV-Stops geprueft werden sollen.
            </label>
            <input
              id="onboard-domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="https://www.example-stadt.de"
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quartier-green"
            />
          </div>

          <div className="flex items-center justify-between">
            {selectedQuarter ? (
              <p className="text-xs text-muted-foreground">
                Quartier: <strong>{selectedQuarter.name}</strong>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Bitte zuerst ein Quartier auswaehlen.
              </p>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={handleRun}
              disabled={!selectedId || running}
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 mr-1" />
              )}
              Onboarding starten
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ergebnis-Sektionen */}
      {result ? (
        <>
          {/* Feeds */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Rss className="h-4 w-4 text-quartier-green" />
                <span className="text-sm font-medium text-anthrazit">
                  Feeds: {feedsCount} gefunden
                </span>
              </div>
              {feedsCount === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Keine Feeds gefunden — Stadt-Domain hat keinen Standard-Pfad
                  fuer RSS/iCal-Veranstaltungen.
                </p>
              ) : (
                <ul className="space-y-1 text-xs text-anthrazit">
                  {result.feeds.rss ? (
                    <li>
                      RSS:{" "}
                      <code className="rounded bg-muted px-1">
                        {result.feeds.rss}
                      </code>
                    </li>
                  ) : null}
                  {result.feeds.ical ? (
                    <li>
                      iCal:{" "}
                      <code className="rounded bg-muted px-1">
                        {result.feeds.ical}
                      </code>
                    </li>
                  ) : null}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Stops */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bus className="h-4 w-4 text-quartier-green" />
                  <span className="text-sm font-medium text-anthrazit">
                    {result.stops.length} Stop(s) im Umkreis
                  </span>
                </div>
                {result.stops.length > 0 ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleApplyStops}
                    disabled={applyingStops}
                  >
                    {applyingStops ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1" />
                    )}
                    Stops uebernehmen
                  </Button>
                ) : null}
              </div>
              {result.stops.length > 0 ? (
                <ul className="space-y-1">
                  {result.stops.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2 text-sm text-anthrazit"
                    >
                      <span>{s.name}</span>
                      {s.distanceMeters != null ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {Math.round(s.distanceMeters)} m
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  EFA-BW liefert keine Stops im Umkreis dieser Quartier-Mitte.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Events */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-quartier-green" />
                  <span className="text-sm font-medium text-anthrazit">
                    {result.events.length} Event(s) initial gecrawlt
                  </span>
                </div>
                {result.events.length > 0 ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleApplyEvents}
                    disabled={applyingEvents}
                  >
                    {applyingEvents ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1" />
                    )}
                    Events uebernehmen
                  </Button>
                ) : null}
              </div>
              {result.events.length > 0 ? (
                <ul className="space-y-1">
                  {result.events.slice(0, 10).map((e, i) => (
                    <li
                      key={`${e.uid ?? i}-${e.startDate}`}
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-anthrazit"
                    >
                      <div className="font-medium">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.startDate}
                        {e.location ? ` · ${e.location}` : ""}
                        {` · Quelle: ${e.source}`}
                      </div>
                    </li>
                  ))}
                  {result.events.length > 10 ? (
                    <li className="text-xs text-muted-foreground">
                      ... und {result.events.length - 10} weitere.
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Keine Events gefunden — Feed leer oder ausserhalb Datumsfilter.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Errors */}
          {result.errors.length > 0 ? (
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-alert-amber">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Hinweise / Fehler aus den Schritten
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-anthrazit">
                  {result.errors.map((e, i) => (
                    <li key={i} className="rounded bg-alert-amber/5 px-2 py-1">
                      {e}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
