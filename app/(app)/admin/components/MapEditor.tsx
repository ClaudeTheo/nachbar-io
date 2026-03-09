"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Plus, Save, Trash2, GripVertical, X, Users, Home, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  MAP_W, MAP_H, STREET_LABELS, COLOR_CFG, DEFAULT_HOUSES,
  type MapHouseData, type LampColor, type StreetCode,
} from "@/lib/map-houses";
import type { User, Household, HouseholdMember } from "@/lib/supabase/types";

// ============================================================
// TYPEN
// ============================================================
interface HouseholdWithMembers extends Household {
  members: (HouseholdMember & { user?: Pick<User, "display_name" | "avatar_url"> })[];
}

// ============================================================
// HAUPTKOMPONENTE
// ============================================================
export function MapEditor() {
  // Karten-State
  const [houses, setHouses] = useState<MapHouseData[]>([]);
  const [originalHouses, setOriginalHouses] = useState<MapHouseData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Nutzer-State (fuer Panel)
  const [showUsers, setShowUsers] = useState(false);
  const [householdMap, setHouseholdMap] = useState<Record<string, HouseholdWithMembers>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Drag-State
  const [dragState, setDragState] = useState<{
    houseId: string; startX: number; startY: number; origX: number; origY: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Neues-Haus Formular
  const [newHouse, setNewHouse] = useState<{
    num: string; s: StreetCode; defaultColor: LampColor; x: number; y: number;
  } | null>(null);

  // ============================================================
  // DATEN LADEN
  // ============================================================
  const loadHouses = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("map_houses")
        .select("id, house_number, street_code, x, y, default_color")
        .order("street_code");

      if (!error && data && data.length > 0) {
        const mapped: MapHouseData[] = data.map(h => ({
          id: h.id,
          num: h.house_number,
          s: h.street_code as StreetCode,
          x: h.x,
          y: h.y,
          defaultColor: h.default_color as LampColor,
        }));
        setHouses(mapped);
        setOriginalHouses(JSON.parse(JSON.stringify(mapped)));
      } else {
        // Fallback auf Hardcoded
        setHouses([...DEFAULT_HOUSES]);
        setOriginalHouses(JSON.parse(JSON.stringify(DEFAULT_HOUSES)));
      }
    } catch {
      setHouses([...DEFAULT_HOUSES]);
      setOriginalHouses(JSON.parse(JSON.stringify(DEFAULT_HOUSES)));
    }
    setLoading(false);
  }, []);

  // Haushalte + Mitglieder laden (fuer Nutzerverwaltung)
  const loadHouseholds = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const supabase = createClient();
      const [{ data: hData }, { data: mData }, { data: uData }] = await Promise.all([
        supabase.from("households").select("*"),
        supabase.from("household_members").select("*, user:users(display_name, avatar_url)"),
        supabase.from("users").select("id, display_name, avatar_url, email_hash, ui_mode, trust_level, is_admin, created_at, last_seen, settings"),
      ]);

      const households = (hData ?? []) as Household[];
      const members = (mData ?? []) as (HouseholdMember & { user?: Pick<User, "display_name" | "avatar_url"> })[];
      const users = (uData ?? []) as User[];

      // Haushalte nach Strasse+Hausnummer gruppieren (key = "PS:11")
      const map: Record<string, HouseholdWithMembers> = {};
      households.forEach(h => {
        // Strassen-Code ermitteln
        const code = Object.entries(STREET_LABELS).find(
          ([, name]) => h.street_name === name || h.street_name.includes(name.replace(" Str.", "").replace("straße", "str"))
        )?.[0] ?? "";
        const key = `${code}:${h.house_number}`;
        map[key] = {
          ...h,
          members: members.filter(m => m.household_id === h.id),
        };
      });

      setHouseholdMap(map);
      setAllUsers(users);
    } catch {
      toast.error("Nutzerdaten konnten nicht geladen werden");
    }
    setLoadingUsers(false);
  }, []);

  useEffect(() => { loadHouses(); }, [loadHouses]);

  // ============================================================
  // AENDERUNGSERKENNUNG
  // ============================================================
  const hasChanges = JSON.stringify(houses) !== JSON.stringify(originalHouses);

  const changeCount = (() => {
    let count = 0;
    const origById: Record<string, MapHouseData> = {};
    originalHouses.forEach(h => { origById[h.id] = h; });
    houses.forEach(h => {
      const orig = origById[h.id];
      if (!orig || orig.x !== h.x || orig.y !== h.y || orig.num !== h.num || orig.s !== h.s || orig.defaultColor !== h.defaultColor) count++;
    });
    // Geloeschte zaehlen
    const currentIds: Record<string, boolean> = {};
    houses.forEach(h => { currentIds[h.id] = true; });
    originalHouses.forEach(h => { if (!currentIds[h.id]) count++; });
    return count;
  })();

  // ============================================================
  // SVG KOORDINATEN
  // ============================================================
  function screenToSvg(clientX: number, clientY: number): { x: number; y: number } {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: Math.round(Math.max(0, Math.min(MAP_W, ((clientX - rect.left) / rect.width) * MAP_W))),
      y: Math.round(Math.max(0, Math.min(MAP_H, ((clientY - rect.top) / rect.height) * MAP_H))),
    };
  }

  // ============================================================
  // DRAG HANDLER
  // ============================================================
  function handlePointerDown(e: React.PointerEvent, houseId: string) {
    e.preventDefault();
    e.stopPropagation();
    const h = houses.find(h => h.id === houseId);
    if (!h) return;
    setDragState({ houseId, startX: e.clientX, startY: e.clientY, origX: h.x, origY: h.y });
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState) return;
    const dx = Math.abs(e.clientX - dragState.startX);
    const dy = Math.abs(e.clientY - dragState.startY);
    if (dx < 4 && dy < 4) return; // Schwelle: Klick vs. Drag

    const { x, y } = screenToSvg(e.clientX, e.clientY);
    setHouses(prev => prev.map(h =>
      h.id === dragState.houseId ? { ...h, x, y } : h
    ));
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragState) return;
    const dx = Math.abs(e.clientX - dragState.startX);
    const dy = Math.abs(e.clientY - dragState.startY);
    if (dx < 4 && dy < 4) {
      // Klick — Haus auswaehlen
      setSelectedId(dragState.houseId);
      setNewHouse(null);
    }
    setDragState(null);
  }

  // Klick auf leere Kartenflaeche
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!isAddMode) {
      setSelectedId(null);
      return;
    }
    const { x, y } = screenToSvg(e.clientX, e.clientY);
    setNewHouse({ num: "", s: "PS", defaultColor: "green", x, y });
    setSelectedId(null);
    setIsAddMode(false);
  }

  // ============================================================
  // HAUS AKTIONEN
  // ============================================================
  function addHouse() {
    if (!newHouse || !newHouse.num.trim()) {
      toast.error("Hausnummer eingeben");
      return;
    }
    const id = `${newHouse.s.toLowerCase()}${newHouse.num.replace(/\s/g, "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    if (houses.some(h => h.id === id)) {
      toast.error(`ID "${id}" existiert bereits`);
      return;
    }
    const house: MapHouseData = {
      id,
      num: newHouse.num.trim(),
      s: newHouse.s,
      x: newHouse.x,
      y: newHouse.y,
      defaultColor: newHouse.defaultColor,
    };
    setHouses(prev => [...prev, house]);
    setSelectedId(id);
    setNewHouse(null);
    toast.success(`Haus ${STREET_LABELS[house.s]} ${house.num} hinzugefuegt`);
  }

  function deleteHouse(id: string) {
    const h = houses.find(h => h.id === id);
    if (!h) return;
    setHouses(prev => prev.filter(h => h.id !== id));
    setSelectedId(null);
    toast.success(`Haus ${STREET_LABELS[h.s]} ${h.num} entfernt`);
  }

  function updateHouse(id: string, updates: Partial<MapHouseData>) {
    setHouses(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  }

  // ============================================================
  // SPEICHERN
  // ============================================================
  async function saveHouses() {
    setSaving(true);
    try {
      const supabase = createClient();

      // Geloeschte Haeuser ermitteln
      const currentIds = new Set(houses.map(h => h.id));
      const deletedIds = originalHouses.filter(h => !currentIds.has(h.id)).map(h => h.id);

      if (deletedIds.length > 0) {
        const { error } = await supabase.from("map_houses").delete().in("id", deletedIds);
        if (error) { toast.error("Fehler beim Loeschen"); setSaving(false); return; }
      }

      // Alle aktuellen upserten
      const { error } = await supabase.from("map_houses").upsert(
        houses.map(h => ({
          id: h.id,
          house_number: h.num,
          street_code: h.s,
          x: h.x,
          y: h.y,
          default_color: h.defaultColor,
        }))
      );

      if (error) {
        toast.error("Fehler beim Speichern");
      } else {
        toast.success(`${houses.length} Haeuser gespeichert`);
        setOriginalHouses(JSON.parse(JSON.stringify(houses)));
      }
    } catch {
      toast.error("Speichern fehlgeschlagen");
    }
    setSaving(false);
  }

  // ============================================================
  // HILFSWERTE
  // ============================================================
  const selectedHouse = houses.find(h => h.id === selectedId);
  const streetCounts = {
    PS: houses.filter(h => h.s === "PS").length,
    SN: houses.filter(h => h.s === "SN").length,
    OR: houses.filter(h => h.s === "OR").length,
  };

  // Haushalt fuer ausgewaehltes Haus
  const selectedHousehold = selectedHouse
    ? householdMap[`${selectedHouse.s}:${selectedHouse.num}`] ?? null
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <MapPin className="h-6 w-6 animate-pulse text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Karte wird geladen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-anthrazit" />
          <h2 className="font-semibold text-anthrazit">Karten-Editor</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showUsers ? "default" : "outline"}
            className="text-xs h-8"
            onClick={() => {
              setShowUsers(!showUsers);
              if (!showUsers && allUsers.length === 0) loadHouseholds();
            }}
          >
            <Users className="h-3.5 w-3.5 mr-1" />
            Bewohner
          </Button>
          <Button
            size="sm"
            variant={isAddMode ? "default" : "outline"}
            className="text-xs h-8"
            onClick={() => { setIsAddMode(!isAddMode); setNewHouse(null); }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Haus
          </Button>
          <Button
            size="sm"
            className="text-xs h-8"
            disabled={!hasChanges || saving}
            onClick={saveHouses}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "..." : hasChanges ? `Speichern (${changeCount})` : "Gespeichert"}
          </Button>
        </div>
      </div>

      {isAddMode && (
        <div className="rounded-lg border border-quartier-green/30 bg-quartier-green/5 p-3 text-sm text-quartier-green">
          Klicken Sie auf die Karte, um ein neues Haus zu platzieren.
          <Button size="sm" variant="ghost" className="ml-2 text-xs h-6" onClick={() => setIsAddMode(false)}>
            Abbrechen
          </Button>
        </div>
      )}

      {/* SVG Karte */}
      <Card className="overflow-hidden">
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            width="100%"
            className="block"
            style={{ cursor: isAddMode ? "crosshair" : "default", touchAction: "none" }}
            onClick={handleSvgClick}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <image href="/map-quartier.jpg" x={0} y={0} width={MAP_W} height={MAP_H} preserveAspectRatio="xMidYMid slice" />

            {/* Haus-Marker */}
            {houses.map((h) => {
              const cfg = COLOR_CFG[h.defaultColor];
              const isSelected = selectedId === h.id;
              const isDragging = dragState?.houseId === h.id;

              return (
                <g
                  key={h.id}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  onPointerDown={(e) => handlePointerDown(e, h.id)}
                >
                  {/* Glow */}
                  <circle cx={h.x} cy={h.y} r={isSelected ? 24 : 18} fill={cfg.glow} style={{ pointerEvents: "none" }} />

                  {/* Auswahl-Ring */}
                  {isSelected && (
                    <circle cx={h.x} cy={h.y} r={18} fill="none" stroke="white" strokeWidth={2.5} strokeDasharray="4 3" />
                  )}

                  {/* Lampen-Punkt */}
                  <circle
                    cx={h.x} cy={h.y} r={12}
                    fill={cfg.fill} stroke={cfg.ring} strokeWidth={1.5}
                    style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.5))" }}
                  />

                  {/* Glanzpunkt */}
                  <circle cx={h.x - 3} cy={h.y - 3} r={4} fill="rgba(255,255,255,0.35)" style={{ pointerEvents: "none" }} />

                  {/* Hausnummer */}
                  <text
                    x={h.x} y={h.y + 4}
                    textAnchor="middle" fill="white"
                    fontSize={h.num.length > 2 ? "8" : "10"}
                    fontWeight="700" fontFamily="'Segoe UI', sans-serif"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {h.num}
                  </text>

                  {/* Drag-Indikator bei Auswahl */}
                  {isSelected && !isDragging && (
                    <text
                      x={h.x} y={h.y - 20}
                      textAnchor="middle" fill="white"
                      fontSize="8" fontFamily="'Segoe UI', sans-serif"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      ⇄ Ziehen
                    </text>
                  )}
                </g>
              );
            })}

            {/* Neues-Haus Vorschau */}
            {newHouse && (
              <g style={{ pointerEvents: "none" }}>
                <circle cx={newHouse.x} cy={newHouse.y} r={20} fill="rgba(76,175,135,0.3)" />
                <circle cx={newHouse.x} cy={newHouse.y} r={12} fill="#4CAF87" stroke="#2D3142" strokeWidth={2} strokeDasharray="4 3" />
                <text
                  x={newHouse.x} y={newHouse.y - 18}
                  textAnchor="middle" fill="white" fontSize="10" fontWeight="700"
                  fontFamily="'Segoe UI', sans-serif"
                >
                  Neues Haus
                </text>
              </g>
            )}
          </svg>
        </div>
      </Card>

      {/* Neues-Haus Formular */}
      {newHouse && (
        <Card className="border-quartier-green/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-anthrazit">Neues Haus hinzufuegen</h3>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setNewHouse(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Hausnummer</label>
                <Input
                  value={newHouse.num}
                  onChange={e => setNewHouse({ ...newHouse, num: e.target.value })}
                  placeholder="z.B. 15"
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Strasse</label>
                <select
                  value={newHouse.s}
                  onChange={e => setNewHouse({ ...newHouse, s: e.target.value as StreetCode })}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="PS">Purkersdorfer Str.</option>
                  <option value="SN">Sanarystraße</option>
                  <option value="OR">Oberer Rebberg</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Standardfarbe</label>
              <div className="flex gap-2 mt-1">
                {(["green", "red", "yellow"] as LampColor[]).map(c => (
                  <button
                    key={c}
                    onClick={() => setNewHouse({ ...newHouse, defaultColor: c })}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      newHouse.defaultColor === c ? "ring-2 ring-offset-1" : "opacity-60"
                    }`}
                    style={{
                      background: COLOR_CFG[c].glow,
                      color: COLOR_CFG[c].fill,
                      outlineColor: COLOR_CFG[c].fill,
                    }}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ background: COLOR_CFG[c].fill }} />
                    {COLOR_CFG[c].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Position: x={newHouse.x}, y={newHouse.y}
            </div>
            <Button size="sm" onClick={addHouse} className="w-full">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Haus hinzufuegen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ausgewaehltes Haus — Edit Panel */}
      {selectedHouse && (
        <Card className="border-blue-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-anthrazit">
                {STREET_LABELS[selectedHouse.s]} {selectedHouse.num}
              </h3>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px]">{selectedHouse.id}</Badge>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSelectedId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Hausnummer</label>
                <Input
                  value={selectedHouse.num}
                  onChange={e => updateHouse(selectedHouse.id, { num: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Strasse</label>
                <select
                  value={selectedHouse.s}
                  onChange={e => updateHouse(selectedHouse.id, { s: e.target.value as StreetCode })}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="PS">Purkersdorfer Str.</option>
                  <option value="SN">Sanarystraße</option>
                  <option value="OR">Oberer Rebberg</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Standardfarbe</label>
              <div className="flex gap-2 mt-1">
                {(["green", "red", "yellow"] as LampColor[]).map(c => (
                  <button
                    key={c}
                    onClick={() => updateHouse(selectedHouse.id, { defaultColor: c })}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedHouse.defaultColor === c ? "ring-2 ring-offset-1" : "opacity-60"
                    }`}
                    style={{
                      background: COLOR_CFG[c].glow,
                      color: COLOR_CFG[c].fill,
                      outlineColor: COLOR_CFG[c].fill,
                    }}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ background: COLOR_CFG[c].fill }} />
                    {COLOR_CFG[c].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Position: x={selectedHouse.x}, y={selectedHouse.y}</span>
              <span className="flex items-center gap-1">
                <GripVertical className="h-3 w-3" /> Auf Karte ziehen
              </span>
            </div>

            {/* Bewohner-Sektion */}
            {showUsers && (
              <>
                <Separator />
                <HouseholdPanel
                  house={selectedHouse}
                  household={selectedHousehold}
                  allUsers={allUsers}
                  loading={loadingUsers}
                  onRefresh={loadHouseholds}
                />
              </>
            )}

            <Separator />
            <Button
              size="sm"
              variant="destructive"
              className="w-full text-xs"
              onClick={() => deleteHouse(selectedHouse.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Haus entfernen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Fusszeile */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{houses.length} Haeuser</span>
        <span>PS: {streetCounts.PS} · SN: {streetCounts.SN} · OR: {streetCounts.OR}</span>
      </div>
    </div>
  );
}

// ============================================================
// BEWOHNER-PANEL
// ============================================================
function HouseholdPanel({
  house,
  household,
  allUsers,
  loading,
  onRefresh,
}: {
  house: MapHouseData;
  household: HouseholdWithMembers | null;
  allUsers: User[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground py-2">
        <Users className="h-3.5 w-3.5 inline mr-1 animate-pulse" />
        Bewohnerdaten werden geladen...
      </div>
    );
  }

  if (!household) {
    return (
      <div className="rounded-lg bg-muted/50 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Home className="h-3.5 w-3.5" />
          <span>Kein Haushalt fuer {STREET_LABELS[house.s]} {house.num} registriert.</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Erstellen Sie einen Haushalt im Tab &quot;Codes&quot;, um Bewohner zuzuordnen.
        </p>
      </div>
    );
  }

  const memberIds = new Set(household.members.map(m => m.user_id));
  const availableUsers = allUsers.filter(u => !memberIds.has(u.id));

  async function addMember() {
    if (!selectedUserId || !household) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("household_members").insert({
        household_id: household.id,
        user_id: selectedUserId,
        role: "member",
      });
      if (error) throw error;
      toast.success("Bewohner hinzugefuegt");
      setSelectedUserId("");
      setAddingMember(false);
      onRefresh();
    } catch {
      toast.error("Fehler beim Hinzufuegen");
    }
  }

  async function removeMember(memberId: string) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("household_members").delete().eq("id", memberId);
      if (error) throw error;
      toast.success("Bewohner entfernt");
      onRefresh();
    } catch {
      toast.error("Fehler beim Entfernen");
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-xs font-medium text-anthrazit"
      >
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Bewohner ({household.members.length})
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="space-y-2 pl-1">
          {household.members.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">Keine Bewohner registriert.</p>
          ) : (
            household.members.map(m => (
              <div key={m.id} className="flex items-center justify-between text-xs rounded-lg bg-muted/50 px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-quartier-green/20 flex items-center justify-center text-[10px] font-semibold text-quartier-green">
                    {(m.user?.display_name ?? "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium">{m.user?.display_name ?? "Unbekannt"}</span>
                    <Badge variant="outline" className="ml-1.5 text-[9px] py-0">{m.role}</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                  onClick={() => removeMember(m.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}

          {addingMember ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">Nutzer waehlen...</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.display_name}</option>
                ))}
              </select>
              <Button size="sm" className="h-7 text-xs px-2" onClick={addMember} disabled={!selectedUserId}>
                <Plus className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-1" onClick={() => setAddingMember(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-7"
              onClick={() => setAddingMember(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Bewohner hinzufuegen
            </Button>
          )}

          {/* Haushalt-Info */}
          <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1">
            <div className="flex justify-between">
              <span>Einladungscode:</span>
              <span className="font-mono">{household.invite_code}</span>
            </div>
            <div className="flex justify-between">
              <span>Verifiziert:</span>
              <span>{household.verified ? "Ja" : "Nein"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
