"use client";

// Custom Hook: Gesamter State + Logik fuer den MapEditor Container

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  MAP_W, MAP_H, STREET_LABELS, DEFAULT_HOUSES,
  loadQuarterHouses, parseViewBox,
} from "@/lib/map-houses";
import { useQuarter } from "@/lib/quarters";
import type { User, Household, HouseholdMember, MapHouseData } from "./types";
import type { HouseholdWithMembers, DragState, NewHouseForm } from "./types";

/** Setzt Default-Haeuser als Fallback */
function setDefaults(
  setH: (h: MapHouseData[]) => void,
  setO: (h: MapHouseData[]) => void,
) {
  setH([...DEFAULT_HOUSES]);
  setO(JSON.parse(JSON.stringify(DEFAULT_HOUSES)));
}

export function useMapEditorState() {
  const { currentQuarter, allQuarters } = useQuarter();
  const [selectedQuarterId, setSelectedQuarterId] = useState<string | null>(null);

  const activeQuarter = useMemo(() => {
    if (selectedQuarterId) return allQuarters.find(q => q.id === selectedQuarterId) ?? currentQuarter;
    return currentQuarter;
  }, [selectedQuarterId, allQuarters, currentQuarter]);

  const mapConfig = activeQuarter?.map_config;
  const viewBoxStr = mapConfig?.viewBox ?? `0 0 ${MAP_W} ${MAP_H}`;
  const backgroundImage = mapConfig?.backgroundImage ?? "/map-quartier.jpg";
  const { w: mapW, h: mapH } = useMemo(() => parseViewBox(mapConfig?.viewBox), [mapConfig?.viewBox]);

  // State
  const [houses, setHouses] = useState<MapHouseData[]>([]);
  const [originalHouses, setOriginalHouses] = useState<MapHouseData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [showUsers, setShowUsers] = useState(false);
  const [householdMap, setHouseholdMap] = useState<Record<string, HouseholdWithMembers>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const svgRefCallback = useCallback((el: SVGSVGElement | null) => { svgRef.current = el; }, []);
  const [newHouse, setNewHouse] = useState<NewHouseForm | null>(null);

  // Daten laden
  const loadHouses = useCallback(async () => {
    setLoading(true);
    try {
      const qId = activeQuarter?.id;
      if (qId) {
        const qh = await loadQuarterHouses(qId);
        if (qh.length > 0) { setHouses(qh); setOriginalHouses(JSON.parse(JSON.stringify(qh))); }
        else setDefaults(setHouses, setOriginalHouses);
      } else setDefaults(setHouses, setOriginalHouses);
    } catch { setDefaults(setHouses, setOriginalHouses); }
    setLoading(false);
  }, [activeQuarter?.id]);

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
      const map: Record<string, HouseholdWithMembers> = {};
      households.forEach(h => {
        const code = Object.entries(STREET_LABELS).find(
          ([, name]) => h.street_name === name || h.street_name.includes(name.replace(" Str.", "").replace("straße", "str"))
        )?.[0] ?? "";
        map[`${code}:${h.house_number}`] = { ...h, members: members.filter(m => m.household_id === h.id) };
      });
      setHouseholdMap(map);
      setAllUsers(users);
    } catch { toast.error("Nutzerdaten konnten nicht geladen werden"); }
    setLoadingUsers(false);
  }, []);

  useEffect(() => { loadHouses(); }, [loadHouses]);

  // Aenderungserkennung
  const hasChanges = JSON.stringify(houses) !== JSON.stringify(originalHouses);
  const changeCount = useMemo(() => {
    let count = 0;
    const origById: Record<string, MapHouseData> = {};
    originalHouses.forEach(h => { origById[h.id] = h; });
    houses.forEach(h => {
      const o = origById[h.id];
      if (!o || o.x !== h.x || o.y !== h.y || o.num !== h.num || o.s !== h.s || o.defaultColor !== h.defaultColor) count++;
    });
    const ids: Record<string, boolean> = {};
    houses.forEach(h => { ids[h.id] = true; });
    originalHouses.forEach(h => { if (!ids[h.id]) count++; });
    return count;
  }, [houses, originalHouses]);

  // SVG-Koordinaten
  function screenToSvg(clientX: number, clientY: number) {
    if (!svgRef.current) return { x: 0, y: 0 };
    const r = svgRef.current.getBoundingClientRect();
    return {
      x: Math.round(Math.max(0, Math.min(mapW, ((clientX - r.left) / r.width) * mapW))),
      y: Math.round(Math.max(0, Math.min(mapH, ((clientY - r.top) / r.height) * mapH))),
    };
  }

  // Drag Handler
  function handlePointerDown(e: React.PointerEvent, houseId: string) {
    e.preventDefault(); e.stopPropagation();
    const h = houses.find(h => h.id === houseId);
    if (!h) return;
    setDragState({ houseId, startX: e.clientX, startY: e.clientY, origX: h.x, origY: h.y });
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState) return;
    if (Math.abs(e.clientX - dragState.startX) < 4 && Math.abs(e.clientY - dragState.startY) < 4) return;
    const { x, y } = screenToSvg(e.clientX, e.clientY);
    setHouses(prev => prev.map(h => h.id === dragState.houseId ? { ...h, x, y } : h));
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragState) return;
    if (Math.abs(e.clientX - dragState.startX) < 4 && Math.abs(e.clientY - dragState.startY) < 4) {
      setSelectedId(dragState.houseId); setNewHouse(null);
    }
    setDragState(null);
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!isAddMode) { setSelectedId(null); return; }
    const { x, y } = screenToSvg(e.clientX, e.clientY);
    setNewHouse({ num: "", s: "PS", defaultColor: "green", x, y });
    setSelectedId(null); setIsAddMode(false);
  }

  // Haus-Aktionen
  function addHouse() {
    if (!newHouse || !newHouse.num.trim()) { toast.error("Hausnummer eingeben"); return; }
    const id = `${newHouse.s.toLowerCase()}${newHouse.num.replace(/\s/g, "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    if (houses.some(h => h.id === id)) { toast.error(`ID "${id}" existiert bereits`); return; }
    const house: MapHouseData = { id, num: newHouse.num.trim(), s: newHouse.s, x: newHouse.x, y: newHouse.y, defaultColor: newHouse.defaultColor };
    setHouses(prev => [...prev, house]); setSelectedId(id); setNewHouse(null);
    toast.success(`Haus ${STREET_LABELS[house.s]} ${house.num} hinzugefügt`);
  }

  function deleteHouse(id: string) {
    const h = houses.find(h => h.id === id);
    if (!h) return;
    setHouses(prev => prev.filter(h => h.id !== id)); setSelectedId(null);
    toast.success(`Haus ${STREET_LABELS[h.s]} ${h.num} entfernt`);
  }

  function updateHouse(id: string, updates: Partial<MapHouseData>) {
    setHouses(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  }

  // Speichern
  async function saveHouses() {
    setSaving(true);
    try {
      const supabase = createClient();
      const currentIds = new Set(houses.map(h => h.id));
      const deletedIds = originalHouses.filter(h => !currentIds.has(h.id)).map(h => h.id);
      if (deletedIds.length > 0) {
        const { error } = await supabase.from("map_houses").delete().in("id", deletedIds);
        if (error) { toast.error("Fehler beim Löschen"); setSaving(false); return; }
      }
      const { error } = await supabase.from("map_houses").upsert(
        houses.map(h => ({ id: h.id, house_number: h.num, street_code: h.s, x: h.x, y: h.y, default_color: h.defaultColor, quarter_id: activeQuarter?.id ?? null }))
      );
      if (error) toast.error("Fehler beim Speichern");
      else { toast.success(`${houses.length} Häuser gespeichert`); setOriginalHouses(JSON.parse(JSON.stringify(houses))); }
    } catch { toast.error("Speichern fehlgeschlagen"); }
    setSaving(false);
  }

  // Hintergrundbild-Upload
  async function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeQuarter) return;
    setUploadingBg(true);
    try {
      const supabase = createClient();
      const path = `quarters/${activeQuarter.id}/map-bg.${file.name.split(".").pop() ?? "jpg"}`;
      const { error: ue } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
      if (ue) { toast.error("Bild-Upload fehlgeschlagen"); setUploadingBg(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("public-assets").getPublicUrl(path);
      const cfg = { ...(activeQuarter.map_config ?? {}), backgroundImage: publicUrl };
      const { error } = await supabase.from("quarters").update({ map_config: cfg }).eq("id", activeQuarter.id);
      if (error) toast.error("Quartier-Update fehlgeschlagen");
      else { toast.success("Hintergrundbild aktualisiert"); window.location.reload(); }
    } catch { toast.error("Upload fehlgeschlagen"); }
    setUploadingBg(false);
  }

  // Abgeleitete Werte
  const selectedHouse = houses.find(h => h.id === selectedId);
  const streetCounts = { PS: houses.filter(h => h.s === "PS").length, SN: houses.filter(h => h.s === "SN").length, OR: houses.filter(h => h.s === "OR").length };
  const selectedHousehold = selectedHouse ? householdMap[`${selectedHouse.s}:${selectedHouse.num}`] ?? null : null;

  return {
    // Quartier
    activeQuarter, allQuarters, setSelectedQuarterId,
    // Karten-Config
    viewBoxStr, backgroundImage, mapW, mapH,
    // State
    houses, selectedId, setSelectedId, isAddMode, setIsAddMode,
    loading, saving, uploadingBg, bgInputRef,
    showUsers, setShowUsers, allUsers, loadingUsers,
    dragState, svgRefCallback, newHouse, setNewHouse,
    // Abgeleitet
    hasChanges, changeCount, selectedHouse, streetCounts, selectedHousehold,
    // Aktionen
    loadHouseholds, handlePointerDown, handlePointerMove, handlePointerUp,
    handleSvgClick, addHouse, deleteHouse, updateHouse, saveHouses, handleBgUpload,
  };
}
