"use client";

// MapEditor Container — orchestriert Subkomponenten, keine eigene Logik

import { MapPin, Plus, Save, Users, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapSvgCanvas, HouseEditDialog, HouseSelector } from "./map";
import { useMapEditorState } from "./map/useMapEditorState";

export function MapEditor() {
  const s = useMapEditorState();

  if (s.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <MapPin className="h-6 w-6 animate-pulse text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Karte wird geladen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Quartier-Auswahl */}
      {s.allQuarters.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Quartier:</label>
          <select
            value={s.activeQuarter?.id ?? ""}
            onChange={e => { s.setSelectedQuarterId(e.target.value); s.setSelectedId(null); s.setNewHouse(null); }}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {s.allQuarters.map(q => (<option key={q.id} value={q.id}>{q.name}</option>))}
          </select>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-anthrazit" />
          <h2 className="font-semibold text-anthrazit">
            Karten-Editor{s.activeQuarter ? ` — ${s.activeQuarter.name}` : ""}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <input ref={s.bgInputRef} type="file" accept="image/*" onChange={s.handleBgUpload} className="hidden" />
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => s.bgInputRef.current?.click()} disabled={s.uploadingBg || !s.activeQuarter} title="Hintergrundbild für dieses Quartier hochladen">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="h-3.5 w-3.5 mr-1" />
            {s.uploadingBg ? "..." : "Hintergrund"}
          </Button>
          <Button size="sm" variant={s.showUsers ? "default" : "outline"} className="text-xs h-8" onClick={() => { s.setShowUsers(!s.showUsers); if (!s.showUsers && s.allUsers.length === 0) s.loadHouseholds(); }}>
            <Users className="h-3.5 w-3.5 mr-1" />
            Bewohner
          </Button>
          <Button size="sm" variant={s.isAddMode ? "default" : "outline"} className="text-xs h-8" onClick={() => { s.setIsAddMode(!s.isAddMode); s.setNewHouse(null); }}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Haus
          </Button>
          <Button size="sm" className="text-xs h-8" disabled={!s.hasChanges || s.saving} onClick={s.saveHouses}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {s.saving ? "..." : s.hasChanges ? `Speichern (${s.changeCount})` : "Gespeichert"}
          </Button>
        </div>
      </div>

      {s.isAddMode && (
        <div className="rounded-lg border border-quartier-green/30 bg-quartier-green/5 p-3 text-sm text-quartier-green">
          Klicken Sie auf die Karte, um ein neues Haus zu platzieren.
          <Button size="sm" variant="ghost" className="ml-2 text-xs h-6" onClick={() => s.setIsAddMode(false)}>Abbrechen</Button>
        </div>
      )}

      {/* SVG Karte */}
      <MapSvgCanvas
        viewBoxStr={s.viewBoxStr} backgroundImage={s.backgroundImage} mapW={s.mapW} mapH={s.mapH}
        houses={s.houses} selectedId={s.selectedId} isAddMode={s.isAddMode} dragState={s.dragState} newHouse={s.newHouse}
        onPointerDown={s.handlePointerDown} onPointerMove={s.handlePointerMove} onPointerUp={s.handlePointerUp}
        onSvgClick={s.handleSvgClick} svgRefCallback={s.svgRefCallback}
      />

      {/* Neues-Haus Formular */}
      {s.newHouse && (
        <HouseSelector newHouse={s.newHouse} onUpdate={s.setNewHouse} onAdd={s.addHouse} onCancel={() => s.setNewHouse(null)} />
      )}

      {/* Ausgewaehltes Haus — Edit Panel */}
      {s.selectedHouse && (
        <HouseEditDialog
          house={s.selectedHouse} household={s.selectedHousehold} allUsers={s.allUsers}
          showUsers={s.showUsers} loadingUsers={s.loadingUsers}
          onUpdate={s.updateHouse} onDelete={s.deleteHouse} onDeselect={() => s.setSelectedId(null)}
          onRefreshHouseholds={s.loadHouseholds}
        />
      )}

      {/* Fusszeile */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{s.houses.length} Häuser</span>
        <span>PS: {s.streetCounts.PS} · SN: {s.streetCounts.SN} · OR: {s.streetCounts.OR}</span>
      </div>
    </div>
  );
}
