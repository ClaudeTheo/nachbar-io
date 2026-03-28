"use client";

// Bearbeitungspanel fuer ausgewaehltes Haus (Hausnummer, Strasse, Farbe, Loeschen)

import { GripVertical, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { COLOR_CFG, STREET_LABELS } from "@/lib/map-houses";
import type { MapHouseData, LampColor, StreetCode, HouseholdWithMembers, User } from "./types";
import { HouseholdPanel } from "./HouseDetailsSidebar";

interface HouseEditDialogProps {
  /** Ausgewaehltes Haus */
  house: MapHouseData;
  /** Zugehoeriger Haushalt (oder null) */
  household: HouseholdWithMembers | null;
  /** Alle Nutzer (fuer Bewohner-Zuweisung) */
  allUsers: User[];
  /** Ob Bewohner-Panel sichtbar */
  showUsers: boolean;
  /** Ob Nutzerdaten laden */
  loadingUsers: boolean;
  /** Callback: Haus aktualisieren */
  onUpdate: (id: string, updates: Partial<MapHouseData>) => void;
  /** Callback: Haus loeschen */
  onDelete: (id: string) => void;
  /** Callback: Auswahl aufheben */
  onDeselect: () => void;
  /** Callback: Bewohnerdaten neu laden */
  onRefreshHouseholds: () => void;
}

export function HouseEditDialog({
  house,
  household,
  allUsers,
  showUsers,
  loadingUsers,
  onUpdate,
  onDelete,
  onDeselect,
  onRefreshHouseholds,
}: HouseEditDialogProps) {
  return (
    <Card className="border-blue-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-anthrazit">
            {STREET_LABELS[house.s]} {house.num}
          </h3>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px]">{house.id}</Badge>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onDeselect}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Hausnummer</label>
            <Input
              value={house.num}
              onChange={e => onUpdate(house.id, { num: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Straße</label>
            <select
              value={house.s}
              onChange={e => onUpdate(house.id, { s: e.target.value as StreetCode })}
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
                onClick={() => onUpdate(house.id, { defaultColor: c })}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  house.defaultColor === c ? "ring-2 ring-offset-1" : "opacity-60"
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
          <span>Position: x={house.x}, y={house.y}</span>
          <span className="flex items-center gap-1">
            <GripVertical className="h-3 w-3" /> Auf Karte ziehen
          </span>
        </div>

        {/* Bewohner-Sektion */}
        {showUsers && (
          <>
            <Separator />
            <HouseholdPanel
              house={house}
              household={household}
              allUsers={allUsers}
              loading={loadingUsers}
              onRefresh={onRefreshHouseholds}
            />
          </>
        )}

        <Separator />
        <Button
          size="sm"
          variant="destructive"
          className="w-full text-xs"
          onClick={() => onDelete(house.id)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Haus entfernen
        </Button>
      </CardContent>
    </Card>
  );
}
