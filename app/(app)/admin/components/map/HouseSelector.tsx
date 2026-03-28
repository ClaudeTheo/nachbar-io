"use client";

// Neues-Haus Formular (nach Klick auf Karte im Add-Modus)

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { COLOR_CFG } from "@/lib/map-houses";
import type { LampColor, StreetCode, NewHouseForm } from "./types";

interface HouseSelectorProps {
  /** Neues-Haus Formular-Daten */
  newHouse: NewHouseForm;
  /** Callback: Formular aktualisieren */
  onUpdate: (data: NewHouseForm) => void;
  /** Callback: Haus bestaetigen/hinzufuegen */
  onAdd: () => void;
  /** Callback: Formular schliessen */
  onCancel: () => void;
}

export function HouseSelector({
  newHouse,
  onUpdate,
  onAdd,
  onCancel,
}: HouseSelectorProps) {
  return (
    <Card className="border-quartier-green/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-anthrazit">Neues Haus hinzufügen</h3>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Hausnummer</label>
            <Input
              value={newHouse.num}
              onChange={e => onUpdate({ ...newHouse, num: e.target.value })}
              placeholder="z.B. 15"
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Straße</label>
            <select
              value={newHouse.s}
              onChange={e => onUpdate({ ...newHouse, s: e.target.value as StreetCode })}
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
                onClick={() => onUpdate({ ...newHouse, defaultColor: c })}
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
        <Button size="sm" onClick={onAdd} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Haus hinzufügen
        </Button>
      </CardContent>
    </Card>
  );
}
