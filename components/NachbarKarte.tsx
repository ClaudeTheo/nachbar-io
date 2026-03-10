"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MAP_W, MAP_H, STREET_LABELS, STREET_CODE_TO_NAME, COLOR_CFG, DEFAULT_HOUSES,
  type MapHouseData, type LampColor, type StreetCode,
} from "@/lib/map-houses";
import { HouseInfoPanel } from "@/components/HouseInfoPanel";
import { HelpTip } from "@/components/HelpTip";

export function NachbarKarte() {
  const [houses, setHouses] = useState<MapHouseData[]>(DEFAULT_HOUSES);
  const [statuses, setStatuses] = useState<Record<string, LampColor>>(() => {
    const s: Record<string, LampColor> = {};
    DEFAULT_HOUSES.forEach((h) => { s[h.id] = h.defaultColor; });
    return s;
  });
  const [hover, setHover] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [selectedHouse, setSelectedHouse] = useState<MapHouseData | null>(null);
  // Bewohnerzahl pro Haus-Key (street_code:house_number)
  const [residentCounts, setResidentCounts] = useState<Record<string, number>>({});

  // Haeuser dynamisch von Supabase laden (mit Fallback)
  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();

        // Haeuser laden
        const { data, error } = await supabase
          .from("map_houses")
          .select("id, house_number, street_code, x, y, default_color")
          .order("street_code");

        let loadedHouses = DEFAULT_HOUSES;
        if (!error && data && data.length > 0) {
          loadedHouses = data.map(h => ({
            id: h.id,
            num: h.house_number,
            s: h.street_code as MapHouseData["s"],
            x: h.x,
            y: h.y,
            defaultColor: h.default_color as LampColor,
          }));
          setHouses(loadedHouses);
          setStatuses(prev => {
            const s: Record<string, LampColor> = {};
            loadedHouses.forEach((h) => { s[h.id] = prev[h.id] ?? h.defaultColor; });
            return s;
          });
        }

        // Aktive Urlaube laden — Haeuser blau faerben
        const today = new Date().toISOString().split("T")[0];
        const { data: vacations } = await supabase
          .from("vacation_modes")
          .select("user_id")
          .lte("start_date", today)
          .gte("end_date", today);

        if (vacations && vacations.length > 0) {
          // User-IDs mit aktivem Urlaub
          const vacUserIds = vacations.map(v => v.user_id);

          // Deren Haushalte finden
          const { data: members } = await supabase
            .from("household_members")
            .select("household_id, user_id, households(street_name, house_number)")
            .in("user_id", vacUserIds)
            .not("verified_at", "is", null);

          if (members) {
            const vacHouseKeys: Record<string, boolean> = {};
            for (const m of members) {
              const hh = m.households as unknown as { street_name: string; house_number: string } | null;
              if (hh) {
                // Finde den street_code fuer diesen Strassennamen
                const code = (Object.entries(STREET_CODE_TO_NAME) as [StreetCode, string][])
                  .find(([, name]) => name === hh.street_name)?.[0];
                if (code) {
                  vacHouseKeys[`${code}:${hh.house_number}`] = true;
                }
              }
            }

            // Statuses aktualisieren
            setStatuses(prev => {
              const updated = { ...prev };
              for (const h of loadedHouses) {
                if (vacHouseKeys[`${h.s}:${h.num}`]) {
                  updated[h.id] = "blue";
                }
              }
              return updated;
            });
          }
        }

        // Aktive Paketannahmen laden — Haeuser orange faerben
        const { data: packages } = await supabase
          .from("paketannahme")
          .select("user_id")
          .eq("available_date", today);

        if (packages && packages.length > 0) {
          const pkgUserIds = packages.map(p => p.user_id);
          const { data: pkgMembers } = await supabase
            .from("household_members")
            .select("household_id, user_id, households(street_name, house_number)")
            .in("user_id", pkgUserIds)
            .not("verified_at", "is", null);

          if (pkgMembers) {
            const pkgHouseKeys: Record<string, boolean> = {};
            for (const m of pkgMembers) {
              const hh = m.households as unknown as { street_name: string; house_number: string } | null;
              if (hh) {
                const code = (Object.entries(STREET_CODE_TO_NAME) as [StreetCode, string][])
                  .find(([, name]) => name === hh.street_name)?.[0];
                if (code) {
                  pkgHouseKeys[`${code}:${hh.house_number}`] = true;
                }
              }
            }

            setStatuses(prev => {
              const updated = { ...prev };
              for (const h of loadedHouses) {
                // Paketannahme nur setzen wenn nicht schon blau (Urlaub hat Vorrang)
                if (pkgHouseKeys[`${h.s}:${h.num}`] && updated[h.id] !== "blue") {
                  updated[h.id] = "orange";
                }
              }
              return updated;
            });
          }
        }

        // Bewohnerzahlen laden (aggregiert)
        const { data: countData } = await supabase
          .from("household_members")
          .select("household_id, households(street_name, house_number)")
          .not("verified_at", "is", null);

        if (countData) {
          const counts: Record<string, number> = {};
          for (const m of countData) {
            const hh = m.households as unknown as { street_name: string; house_number: string } | null;
            if (hh) {
              const code = (Object.entries(STREET_CODE_TO_NAME) as [StreetCode, string][])
                .find(([, name]) => name === hh.street_name)?.[0];
              if (code) {
                const key = `${code}:${hh.house_number}`;
                counts[key] = (counts[key] ?? 0) + 1;
              }
            }
          }
          setResidentCounts(counts);
        }
      } catch {
        // Fallback — nichts zu tun
      }
    }
    loadData();
  }, []);

  // Klick oeffnet Haus-Info Panel
  const click = useCallback((h: MapHouseData) => {
    setSelectedHouse(h);
  }, []);

  const counts = {
    green: Object.values(statuses).filter((s) => s === "green").length,
    red: Object.values(statuses).filter((s) => s === "red").length,
    yellow: Object.values(statuses).filter((s) => s === "yellow").length,
    blue: Object.values(statuses).filter((s) => s === "blue").length,
    orange: Object.values(statuses).filter((s) => s === "orange").length,
  };

  const filterItems: { key: string; label: string; color: string; bg: string }[] = [
    { key: "green", label: "Grün", color: "#22c55e", bg: "#052e16" },
    { key: "red", label: "Rot", color: "#ef4444", bg: "#2d0505" },
    { key: "yellow", label: "Gelb", color: "#eab308", bg: "#2d2305" },
    { key: "blue", label: "Urlaub", color: "#3b82f6", bg: "#0c1e3d" },
    { key: "orange", label: "Paket", color: "#f97316", bg: "#2d1505" },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Steuerleiste */}
      <div className="flex w-full max-w-[1083px] flex-wrap items-center justify-between gap-2 rounded-lg bg-[#111827] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <div>
            <div className="text-sm font-bold text-[#f8fafc]">Nachbar.io — Bad Säckingen</div>
            <div className="text-xs text-[#64748b]">
              Klick auf ein Haus für Details · Hover für Adresse
            </div>
          </div>
          <HelpTip
            title="Farben auf der Karte"
            content="Grün = Alles in Ordnung. Rot = Dringend. Gelb = Hinweis. Blau = Bewohner im Urlaub (Nachbarn aufpassen!)."
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {filterItems.map(({ key, label, color, bg }) => {
            const count = counts[key as keyof typeof counts] ?? 0;
            if (count === 0 && (key === "blue" || key === "orange")) return null;
            return (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? "all" : key)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors"
                style={{
                  background: filter === key ? bg : "#1e293b",
                  border: `1.5px solid ${filter === key ? color : "#334155"}`,
                  color: filter === key ? color : "#94a3b8",
                }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: color }}
                />
                {count} {label}
              </button>
            );
          })}
          <button
            onClick={() => {
              const s: Record<string, LampColor> = {};
              houses.forEach((h) => { s[h.id] = h.defaultColor; });
              setStatuses(s);
              setFilter("all");
            }}
            className="cursor-pointer rounded-lg border border-[#334155] bg-[#1e293b] px-2.5 py-1 text-xs text-[#64748b] transition-colors hover:text-[#94a3b8]"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Karte */}
      <div className="w-full max-w-[1083px] overflow-hidden rounded-xl shadow-lg"
        style={{ boxShadow: "0 0 0 1px #1e293b, 0 4px 24px rgba(0,0,0,0.6)" }}>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" className="block">
          <image href="/map-quartier.jpg" x={0} y={0} width={MAP_W} height={MAP_H} preserveAspectRatio="xMidYMid slice" />

          {/* Dimmer bei aktivem Filter */}
          {filter !== "all" && (
            <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="rgba(0,0,0,0.35)" style={{ pointerEvents: "none" }} />
          )}

          {/* Lampen-Marker */}
          {houses.map((h) => {
            // Nur Haeuser mit registrierten Bewohnern anzeigen
            const houseKey = `${h.s}:${h.num}`;
            if (!residentCounts[houseKey]) return null;

            const color = statuses[h.id];
            if (!color) return null;
            const cfg = COLOR_CFG[color];
            const isVisible = filter === "all" || color === filter;
            const isHov = hover === h.id;
            const isSelected = selectedHouse?.id === h.id;
            if (!isVisible) return null;

            return (
              <g
                key={h.id}
                onClick={() => click(h)}
                onMouseEnter={() => setHover(h.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Glow-Effekt */}
                <circle cx={h.x} cy={h.y} r={isHov || isSelected ? 22 : 18} fill={cfg.glow} style={{ pointerEvents: "none" }} />

                {/* Hover/Selected-Ring */}
                {(isHov || isSelected) && (
                  <circle cx={h.x} cy={h.y} r={16} fill="none" stroke={isSelected ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)"} strokeWidth={isSelected ? 2.5 : 2} />
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
                  textAnchor="middle"
                  fill="white"
                  fontSize={h.num.length > 2 ? "8" : "10"}
                  fontWeight="700"
                  fontFamily="'Segoe UI', sans-serif"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {h.num}
                </text>
              </g>
            );
          })}

          {/* Tooltip */}
          {hover && (() => {
            const h = houses.find((x) => x.id === hover);
            if (!h) return null;
            const color = statuses[h.id];
            if (!color) return null;
            const cfg = COLOR_CFG[color];
            const streetName = STREET_LABELS[h.s] || h.s;
            const rc = residentCounts[`${h.s}:${h.num}`];
            const text = `${streetName} ${h.num}`;
            const subText = rc
              ? `${cfg.label} · ${rc} Bewohner`
              : `${cfg.label} · Klick für Details`;
            const tw = Math.max(140, Math.max(text.length, subText.length) * 6.5 + 30);
            const th = 40;
            const tx = Math.min(Math.max(h.x - tw / 2, 4), MAP_W - tw - 4);
            const ty = h.y < 80 ? h.y + 14 : h.y - th - 12;
            return (
              <g style={{ pointerEvents: "none" }}>
                <rect x={tx} y={ty} width={tw} height={th} rx={6} fill="#0f172a" stroke="#334155" strokeWidth={1} opacity={0.96} />
                <circle cx={tx + 12} cy={ty + 13} r={4.5} fill={cfg.fill} />
                <text x={tx + 22} y={ty + 16} fill="#f1f5f9" fontSize="10.5" fontWeight="700" fontFamily="'Segoe UI', sans-serif">
                  {text}
                </text>
                <text x={tx + 22} y={ty + 31} fill={cfg.fill} fontSize="9" fontFamily="'Segoe UI', sans-serif">
                  {subText}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Fusszeile */}
      <div className="text-xs text-muted-foreground">
        {Object.values(residentCounts).filter(c => c > 0).length} Nachbarn im Quartier
        {counts.blue > 0 && ` · ${counts.blue} Urlaub`}
        {counts.orange > 0 && ` · ${counts.orange} Paket`}
      </div>

      {/* Haus-Info Panel */}
      {selectedHouse && (
        <HouseInfoPanel
          open={!!selectedHouse}
          onOpenChange={(open) => { if (!open) setSelectedHouse(null); }}
          streetCode={selectedHouse.s}
          houseNumber={selectedHouse.num}
        />
      )}
    </div>
  );
}
