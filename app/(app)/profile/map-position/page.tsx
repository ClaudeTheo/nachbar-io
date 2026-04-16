"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  getMapPositionEmptyState,
  hasQuarterSvgMap,
} from "@/lib/map-position";
import {
  MAP_W,
  MAP_H,
  STREET_LABELS,
  STREET_CODE_TO_NAME,
  COLOR_CFG,
  DEFAULT_HOUSES,
  type MapHouseData,
  type LampColor,
  type StreetCode,
} from "@/lib/map-houses";
import { toast } from "sonner";

const PositionConfirmMap = dynamic(
  () => import("@/components/municipal/GpsPickerMap"),
  { ssr: false },
);

interface BwSyncResult {
  success: true;
  requiresConfirmation?: false;
  address: {
    streetName: string;
    houseNumber: string;
    postalCode: string | null;
    city: string | null;
  };
  previous: { lat: number; lng: number } | null;
  official: { lat: number; lng: number };
  distanceMeters: number | null;
  inspectedCount: number;
  metadataSaved: boolean;
}

interface BwCandidateResult {
  success: true;
  requiresConfirmation: true;
  address: {
    streetName: string;
    houseNumber: string;
    postalCode: string | null;
    city: string | null;
  };
  candidate: {
    lat: number;
    lng: number;
    streetName: string | null;
    houseNumber: string;
    postalCode: string | null;
    city: string | null;
    confidence: "street_only" | "nearest_building";
    distanceMeters: number | null;
  };
  inspectedCount: number;
}

type BwResolveResponse = BwSyncResult | BwCandidateResult | { error?: string };

interface PositionConfirmResult {
  success: true;
  previous: { lat: number; lng: number } | null;
  confirmed: { lat: number; lng: number };
  distanceMeters: number | null;
  manualOverride: boolean;
  metadataSaved: boolean;
  source: string;
  accuracy: string;
}

export default function MapPositionPage() {
  const _router = useRouter();
  const { user } = useAuth();
  const svgRef = useRef<SVGSVGElement>(null);
  const [houses, setHouses] = useState<MapHouseData[]>(DEFAULT_HOUSES);
  const [myHouse, setMyHouse] = useState<MapHouseData | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  // Haushalt-Info fuer Create-Fall
  const [householdInfo, setHouseholdInfo] = useState<{
    householdId: string;
    streetName: string;
    houseNumber: string;
    streetCode: StreetCode;
    quarterId: string;
  } | null>(null);
  const [isNewEntry, setIsNewEntry] = useState(false);
  const [householdLinked, setHouseholdLinked] = useState(false);
  const [unsupportedAddressLabel, setUnsupportedAddressLabel] = useState<
    string | null
  >(null);
  const [bwAddress, setBwAddress] = useState<{
    streetName: string;
    houseNumber: string;
  } | null>(null);
  const [geoPosition, setGeoPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingGeoPosition, setPendingGeoPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [quarterMeta, setQuarterMeta] = useState<{
    city: string | null;
    state: string | null;
    postalCode: string | null;
  }>({
    city: null,
    state: null,
    postalCode: null,
  });
  const [bwSyncLoading, setBwSyncLoading] = useState(false);
  const [bwSyncResult, setBwSyncResult] = useState<BwSyncResult | null>(null);
  const [bwCandidate, setBwCandidate] = useState<
    BwCandidateResult["candidate"] | null
  >(null);
  const [positionConfirmLoading, setPositionConfirmLoading] = useState(false);
  const [positionConfirmResult, setPositionConfirmResult] =
    useState<PositionConfirmResult | null>(null);

  // Quartier-Name fuer Anzeige (BUG-22: falsches Quartier)
  const [quarterName, setQuarterName] = useState<string | null>(null);
  const [quarterHasSvgMap, setQuarterHasSvgMap] = useState(true);

  useEffect(() => {
    async function init() {
      if (!user) return;
      const supabase = createClient();

      // Quartier des Users ermitteln (BUG-22 Fix)
      let quarterId: string | null = null;
      let quarterSlug: string | null = null;
      const { data: hm } = await supabase
        .from("household_members")
        .select("households(quarter_id)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (hm?.households) {
        const hh = hm.households as unknown as { quarter_id: string };
        quarterId = hh.quarter_id;
      }

      // Quartier-Name laden
      if (quarterId) {
        const { data: q } = await supabase
          .from("quarters")
          .select("name, slug, city, state, postal_code")
          .eq("id", quarterId)
          .maybeSingle();
        if (q) {
          setQuarterName(q.name);
          quarterSlug = q.slug;
          setQuarterMeta({
            city: q.city ?? null,
            state: q.state ?? null,
            postalCode: q.postal_code ?? null,
          });
        }
      }

      // Haeuser laden — nur fuer das eigene Quartier (BUG-22 Fix)
      const query = supabase
        .from("map_houses")
        .select("id, house_number, street_code, x, y, default_color")
        .order("street_code");
      // Quarter-Filter falls vorhanden
      if (quarterId) {
        query.eq("quarter_id", quarterId);
      }
      const { data: mapData } = await query;

      const loadedHouses: MapHouseData[] =
        mapData && mapData.length > 0
          ? mapData.map((h) => ({
              id: h.id,
              num: h.house_number,
              s: h.street_code as StreetCode,
              x: h.x,
              y: h.y,
              defaultColor: h.default_color as LampColor,
            }))
          : DEFAULT_HOUSES;

      setHouses(loadedHouses);
      setQuarterHasSvgMap(
        hasQuarterSvgMap({
          slug: quarterSlug,
          mapHouseCount: mapData?.length ?? 0,
        }),
      );

      // Eigenen Haushalt finden
      const { data: membership } = await supabase
        .from("household_members")
        .select("household_id, households(street_name, house_number, lat, lng)")
        .eq("user_id", user.id)
        .not("verified_at", "is", null)
        .limit(1)
        .maybeSingle();

      if (membership) {
        setHouseholdLinked(true);
        const hh = membership.households as unknown as {
          street_name: string;
          house_number: string;
          lat: number | null;
          lng: number | null;
        } | null;
        if (hh) {
          setBwAddress({
            streetName: hh.street_name,
            houseNumber: hh.house_number,
          });
          if (
            typeof hh.lat === "number" &&
            typeof hh.lng === "number" &&
            Math.abs(hh.lat) > 0 &&
            Math.abs(hh.lng) > 0
          ) {
            setGeoPosition({ lat: hh.lat, lng: hh.lng });
            setPendingGeoPosition({ lat: hh.lat, lng: hh.lng });
          }
          const addressLabel = `${hh.street_name} ${hh.house_number}`;
          const code = (
            Object.entries(STREET_CODE_TO_NAME) as [StreetCode, string][]
          ).find(([, name]) => name === hh.street_name)?.[0];

          if (!code) {
            setUnsupportedAddressLabel(addressLabel);
          }

          if (code && quarterId) {
            setHouseholdInfo({
              householdId: membership.household_id,
              streetName: hh.street_name,
              houseNumber: hh.house_number,
              streetCode: code,
              quarterId,
            });

            // Suche bestehendes Haus auf der Karte
            const found = loadedHouses.find(
              (h) => h.s === code && h.num === hh.house_number,
            );
            if (found) {
              // Bestehender Eintrag — Update-Modus
              setMyHouse(found);
              setPosition({ x: found.x, y: found.y });
            } else {
              // Kein Eintrag — Create-Modus (Punkt in der Mitte)
              setIsNewEntry(true);
              const newHouse: MapHouseData = {
                id: `${code.toLowerCase()}${hh.house_number}`,
                num: hh.house_number,
                s: code,
                x: Math.round(MAP_W / 2),
                y: Math.round(MAP_H / 2),
                defaultColor: "green",
              };
              setMyHouse(newHouse);
              setPosition({ x: newHouse.x, y: newHouse.y });
              setHasChanged(true); // Sofort als geaendert markieren
            }
          }
        }
      }

      setLoading(false);
    }
    init();
  }, [user]);

  const isBwQuarter = quarterMeta.state
    ? quarterMeta.state.toLowerCase().includes("baden")
    : false;
  const supportsLeafletConfirmation = isBwQuarter || !quarterHasSvgMap;
  const suggestedGeoPosition = bwCandidate
    ? { lat: bwCandidate.lat, lng: bwCandidate.lng }
    : bwSyncResult
      ? bwSyncResult.official
      : geoPosition;
  const pendingGeoChanged =
    !!suggestedGeoPosition &&
    !!pendingGeoPosition &&
    (Math.abs(suggestedGeoPosition.lat - pendingGeoPosition.lat) > 0.0000001 ||
      Math.abs(suggestedGeoPosition.lng - pendingGeoPosition.lng) > 0.0000001);

  async function handleBwSync() {
    setBwSyncLoading(true);
    try {
      const response = await fetch("/api/household/position/resolve-bw", {
        method: "POST",
      });
      const data = (await response.json()) as BwResolveResponse;

      if (!response.ok || !("success" in data && data.success)) {
        const message =
          "error" in data && typeof data.error === "string"
            ? data.error
            : undefined;
        toast.error(
          message || "Amtliche Hauskoordinate konnte nicht geladen werden.",
        );
        return;
      }

      if (data.requiresConfirmation) {
        // Nicht-exakter Treffer: Kandidat in den Confirm-Flow einspielen,
        // NICHT speichern — der Nutzer muss den Pin bestaetigen.
        setBwCandidate(data.candidate);
        setBwSyncResult(null);
        setPendingGeoPosition({
          lat: data.candidate.lat,
          lng: data.candidate.lng,
        });
        setPositionConfirmResult(null);
        toast.message(
          "Kein exakter Treffer — bitte Pin pruefen und bestaetigen.",
        );
        return;
      }

      setBwSyncResult(data);
      setBwCandidate(null);
      setGeoPosition(data.official);
      setPendingGeoPosition(data.official);
      setPositionConfirmResult(null);
      toast.success("Amtliche Hauskoordinate gespeichert.");
    } catch {
      toast.error("Amtliche Hauskoordinate konnte nicht geladen werden.");
    } finally {
      setBwSyncLoading(false);
    }
  }

  async function handleConfirmGeoPosition() {
    if (!pendingGeoPosition) return;

    setPositionConfirmLoading(true);
    try {
      // Wenn der Punkt aus einem nicht-exakten BW-Kandidaten stammt und der
      // Nutzer ihn nicht verschoben hat: source/accuracy vom Kandidaten uebernehmen.
      const candidateConfirmSource =
        bwCandidate && !pendingGeoChanged
          ? "lgl_bw_address_match"
          : null;
      const candidateConfirmAccuracy =
        bwCandidate && !pendingGeoChanged
          ? bwCandidate.confidence === "nearest_building"
            ? "building"
            : "street"
          : null;

      const response = await fetch("/api/household/position/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat: pendingGeoPosition.lat,
          lng: pendingGeoPosition.lng,
          manualOverride: pendingGeoChanged,
          source: candidateConfirmSource,
          accuracy: candidateConfirmAccuracy,
        }),
      });
      const data = (await response.json()) as
        | PositionConfirmResult
        | { error?: string };

      if (!response.ok || !("success" in data && data.success)) {
        const message = "error" in data ? data.error : undefined;
        toast.error(message || "Position konnte nicht bestätigt werden.");
        return;
      }

      setPositionConfirmResult(data);
      setGeoPosition(data.confirmed);
      setPendingGeoPosition(data.confirmed);
      setBwCandidate(null);
      toast.success("Leaflet-Position bestätigt.");
    } catch {
      toast.error("Position konnte nicht bestätigt werden.");
    } finally {
      setPositionConfirmLoading(false);
    }
  }

  // SVG-Koordinaten aus Mouse/Touch-Event berechnen
  const toSvgCoords = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.round(((clientX - rect.left) / rect.width) * MAP_W);
    const y = Math.round(((clientY - rect.top) / rect.height) * MAP_H);
    return {
      x: Math.max(10, Math.min(MAP_W - 10, x)),
      y: Math.max(10, Math.min(MAP_H - 10, y)),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!myHouse) return;
      e.preventDefault();
      setDragging(true);
      (e.target as SVGElement).setPointerCapture(e.pointerId);
    },
    [myHouse],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const coords = toSvgCoords(e.clientX, e.clientY);
      if (coords) {
        setPosition(coords);
        setHasChanged(true);
      }
    },
    [dragging, toSvgCoords],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  async function handleSave() {
    if (!myHouse || !position || !hasChanged || !householdInfo) return;
    setSaving(true);

    const supabase = createClient();

    if (isNewEntry) {
      // Neuen Eintrag erstellen
      const { error } = await supabase.from("map_houses").upsert(
        {
          id: myHouse.id,
          house_number: householdInfo.houseNumber,
          street_code: householdInfo.streetCode,
          x: position.x,
          y: position.y,
          default_color: "green",
          household_id: householdInfo.householdId,
          quarter_id: householdInfo.quarterId,
        },
        { onConflict: "id" },
      );

      if (error) {
        toast.error("Position konnte nicht gespeichert werden.");
      } else {
        toast.success("Position gespeichert!");
        setHasChanged(false);
        setIsNewEntry(false);
      }
    } else {
      // Bestehenden Eintrag aktualisieren
      const { error } = await supabase
        .from("map_houses")
        .update({ x: position.x, y: position.y })
        .eq("id", myHouse.id);

      if (error) {
        toast.error("Position konnte nicht gespeichert werden.");
      } else {
        toast.success("Position gespeichert!");
        setHasChanged(false);
      }
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const emptyState = getMapPositionEmptyState({
    isAuthenticated: Boolean(user),
    householdLinked,
    addressLabel: unsupportedAddressLabel,
  });
  const hideEmptyStateBecauseQuarterMapUnavailable =
    !myHouse && !quarterHasSvgMap && Boolean(quarterName);

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <PageHeader
        title="Kartenposition"
        subtitle={
          isNewEntry
            ? "Setzen Sie die Position Ihres Hauses auf der Karte"
            : "Passen Sie die Position Ihres Hauses auf der Karte an"
        }
        backHref="/profile"
        className="mb-4"
      />

      {householdLinked && isBwQuarter && bwAddress && (
        <div
          className="rounded-xl border border-quartier-green/25 bg-quartier-green/5 p-4"
          data-testid="bw-house-coordinate-card"
        >
          <p className="text-sm font-semibold text-anthrazit">
            Amtliche Hauskoordinate fuer Leaflet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {bwAddress.streetName} {bwAddress.houseNumber}
            {(quarterMeta.postalCode || quarterMeta.city) &&
              ` · ${quarterMeta.postalCode ?? ""} ${quarterMeta.city ?? ""}`.trim()}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Dieser Schritt zieht die Hauskoordinate direkt aus dem LGL-BW-Dienst
            und schreibt sie in die bestehende Leaflet-Quelle Ihres Haushalts.
          </p>

          <div className="mt-3 rounded-lg border border-border bg-background/80 p-3 text-xs text-muted-foreground">
            <p data-testid="bw-house-coordinate-current">
              Aktuell gespeichert:{" "}
              {geoPosition
                ? `${geoPosition.lat.toFixed(6)}, ${geoPosition.lng.toFixed(6)}`
                : "keine Geo-Koordinate"}
            </p>
            {bwSyncResult && (
              <>
                <p
                  className="mt-1 text-anthrazit"
                  data-testid="bw-house-coordinate-result"
                >
                  Amtlicher Treffer: {bwSyncResult.official.lat.toFixed(6)},{" "}
                  {bwSyncResult.official.lng.toFixed(6)}
                </p>
                {bwSyncResult.distanceMeters != null && (
                  <p
                    className="mt-1"
                    data-testid="bw-house-coordinate-distance"
                  >
                    Abweichung zur bisherigen Position:{" "}
                    {bwSyncResult.distanceMeters} m
                  </p>
                )}
              </>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleBwSync}
              disabled={bwSyncLoading}
              className="bg-quartier-green hover:bg-quartier-green/90"
              data-testid="bw-house-coordinate-sync-button"
            >
              {bwSyncLoading
                ? "Amtliche Koordinate wird geladen..."
                : "Amtliche Hauskoordinate laden"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Danach sehen Leaflet-Karten diesen Punkt direkt.
            </span>
          </div>

          {bwSyncResult && !bwSyncResult.metadataSaved && (
            <p className="mt-3 text-xs text-alert-amber">
              Die Koordinate wurde gespeichert, aber die neuen
              Positions-Metadaten fehlen in der angebundenen Datenbank noch.
              Der verifizierte Leaflet-Filter wird erst nach Migration 156
              wirksam.
            </p>
          )}
        </div>
      )}

      {householdLinked && supportsLeafletConfirmation && pendingGeoPosition && (
        <div
          className="rounded-xl border border-border bg-background p-4 shadow-sm"
          data-testid="bw-house-coordinate-confirm-card"
        >
          <p className="text-sm font-semibold text-anthrazit">
            Leaflet-Punkt prüfen und bestätigen
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ziehen Sie den Marker bei Bedarf auf das richtige Gebäude und
            bestätigen Sie erst dann die Position.
          </p>

          {bwCandidate && (
            <p
              className="mt-2 rounded-md border border-alert-amber/30 bg-alert-amber/10 p-2 text-xs text-anthrazit"
              data-testid="bw-house-coordinate-candidate-hint"
            >
              Kein exakter amtlicher Treffer für {bwCandidate.streetName ?? ""}{" "}
              {bwCandidate.houseNumber}.{" "}
              {bwCandidate.confidence === "nearest_building"
                ? "Nächstgelegenes Gebäude übernommen"
                : "Straße erkannt, Hausnummer nicht eindeutig"}
              {bwCandidate.distanceMeters != null &&
                ` · ${bwCandidate.distanceMeters} m vom Hinweispunkt`}
              . Bitte prüfen und ggf. verschieben.
            </p>
          )}

          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            <PositionConfirmMap
              lat={pendingGeoPosition.lat}
              lng={pendingGeoPosition.lng}
              onLocationChange={(lat, lng) => setPendingGeoPosition({ lat, lng })}
            />
          </div>

          <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p data-testid="bw-house-coordinate-confirm-current">
              Gespeichert:{" "}
              {geoPosition
                ? `${geoPosition.lat.toFixed(6)}, ${geoPosition.lng.toFixed(6)}`
                : "keine Geo-Koordinate"}
            </p>
            <p className="mt-1" data-testid="bw-house-coordinate-confirm-pending">
              Zur Bestätigung: {pendingGeoPosition.lat.toFixed(6)},{" "}
              {pendingGeoPosition.lng.toFixed(6)}
            </p>
            {positionConfirmResult && (
              <p className="mt-1 text-anthrazit">
                Bestätigt. Quelle: {positionConfirmResult.source} · Genauigkeit:{" "}
                {positionConfirmResult.accuracy}
                {positionConfirmResult.distanceMeters != null &&
                  ` · ${positionConfirmResult.distanceMeters} m Änderung`}
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleConfirmGeoPosition}
              disabled={positionConfirmLoading}
              className="bg-quartier-green hover:bg-quartier-green/90"
              data-testid="bw-house-coordinate-confirm-button"
            >
              {positionConfirmLoading
                ? "Position wird bestätigt..."
                : pendingGeoChanged
                  ? "Angepasste Position bestätigen"
                  : "Position bestätigen"}
            </Button>

            {geoPosition && pendingGeoChanged && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingGeoPosition(geoPosition)}
              >
                Auf gespeicherten Punkt zurücksetzen
              </Button>
            )}
          </div>

          {positionConfirmResult && !positionConfirmResult.metadataSaved && (
            <p className="mt-3 text-xs text-alert-amber">
              Die Koordinate ist gespeichert. Die Verifizierungs-Metadaten werden
              erst geschrieben, sobald Migration 156 auf der Ziel-DB vorhanden
              ist.
            </p>
          )}
        </div>
      )}

      {/* BUG-22: Hinweis wenn Quartier keine SVG-Karte hat */}
      {!quarterHasSvgMap && (
        <div className="rounded-lg border border-alert-amber/30 bg-alert-amber/5 p-4 text-center">
          <p className="text-sm text-anthrazit">
            Für Ihr Quartier{quarterName ? ` (${quarterName})` : ""} ist die
            Kartenansicht noch in Vorbereitung.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sie können Ihre Position aktuell über &quot;Profil bearbeiten&quot; → Adresse anpassen.
          </p>
        </div>
      )}

      {!myHouse ? (
        hideEmptyStateBecauseQuarterMapUnavailable ? null : (
        <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
          <p className="font-medium text-anthrazit">{emptyState.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {emptyState.body}
          </p>
        </div>
        )
      ) : !quarterHasSvgMap ? null : (
        <>
          {/* Info */}
          <div className="mb-3 rounded-lg border border-quartier-green/20 bg-quartier-green/5 p-3">
            <p className="text-sm text-quartier-green">
              <strong>
                {STREET_LABELS[myHouse.s]} {myHouse.num}
              </strong>{" "}
              — Ziehen Sie den grünen Punkt an die richtige Position.
            </p>
          </div>

          {/* Mini-Karte */}
          <div className="overflow-hidden rounded-xl border border-border shadow-md">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              width="100%"
              className="block touch-none"
            >
              <image
                href="/map-quartier.jpg"
                x={0}
                y={0}
                width={MAP_W}
                height={MAP_H}
                preserveAspectRatio="xMidYMid slice"
              />

              {/* Alle Haeuser (gedimmt) */}
              {houses.map((h) => {
                if (h.id === myHouse.id) return null;
                return (
                  <circle
                    key={h.id}
                    cx={h.x}
                    cy={h.y}
                    r={8}
                    fill="rgba(100,116,139,0.5)"
                    stroke="rgba(100,116,139,0.3)"
                    strokeWidth={1}
                    style={{ pointerEvents: "none" }}
                  />
                );
              })}

              {/* Eigenes Haus (draggbar) */}
              {position && (
                <g
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  style={{ cursor: dragging ? "grabbing" : "grab" }}
                >
                  {/* Pulsierender Ring */}
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={24}
                    fill="rgba(34,197,94,0.2)"
                    style={{ pointerEvents: "none" }}
                  >
                    <animate
                      attributeName="r"
                      values="20;28;20"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.4;0.1;0.4"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Glow */}
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={20}
                    fill={COLOR_CFG.green.glow}
                    style={{ pointerEvents: "none" }}
                  />

                  {/* Haupt-Punkt */}
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={14}
                    fill={COLOR_CFG.green.fill}
                    stroke="white"
                    strokeWidth={2.5}
                    style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }}
                  />

                  {/* Hausnummer */}
                  <text
                    x={position.x}
                    y={position.y + 4}
                    textAnchor="middle"
                    fill="white"
                    fontSize={myHouse.num.length > 2 ? "8" : "10"}
                    fontWeight="700"
                    fontFamily="'Segoe UI', sans-serif"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {myHouse.num}
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Koordinaten-Anzeige */}
          {position && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Position: {position.x}, {position.y}
              {hasChanged && " (geändert)"}
            </p>
          )}

          {/* Speichern-Button */}
          <div className="mt-3 flex justify-end">
            <Button
              disabled={!hasChanged || saving}
              onClick={handleSave}
              className="gap-2 bg-quartier-green hover:bg-quartier-green/90"
            >
              <Save className="h-4 w-4" />
              {saving ? "Speichern..." : "Position speichern"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
