"use client";

// MapEditor Container — orchestriert Subkomponenten, keine eigene Logik

import { MapPin, Plus, Save, Users, Image } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { MapSvgCanvas, HouseEditDialog, HouseSelector } from "./map";
import { useMapEditorState } from "./map/useMapEditorState";

export function MapEditor() {
  const editor = useMapEditorState();
  const bgInputRef = useRef<HTMLInputElement>(null);

  if (editor.loading) {
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
      {editor.allQuarters.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Quartier:</label>
          <select
            value={editor.activeQuarter?.id ?? ""}
            onChange={e => { editor.setSelectedQuarterId(e.target.value); editor.setSelectedId(null); editor.setNewHouse(null); }}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {editor.allQuarters.map(q => (<option key={q.id} value={q.id}>{q.name}</option>))}
          </select>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-anthrazit" />
          <h2 className="font-semibold text-anthrazit">
            Karten-Editor{editor.activeQuarter ? ` — ${editor.activeQuarter.name}` : ""}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <input ref={bgInputRef} type="file" accept="image/*" onChange={editor.handleBgUpload} className="hidden" />
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => bgInputRef.current?.click()} disabled={editor.uploadingBg || !editor.activeQuarter} title="Hintergrundbild für dieses Quartier hochladen">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="h-3.5 w-3.5 mr-1" />
            {editor.uploadingBg ? "..." : "Hintergrund"}
          </Button>
          <Button size="sm" variant={editor.showUsers ? "default" : "outline"} className="text-xs h-8" onClick={() => { editor.setShowUsers(!editor.showUsers); if (!editor.showUsers && editor.allUsers.length === 0) editor.loadHouseholds(); }}>
            <Users className="h-3.5 w-3.5 mr-1" />
            Bewohner
          </Button>
          <Button size="sm" variant={editor.isAddMode ? "default" : "outline"} className="text-xs h-8" onClick={() => { editor.setIsAddMode(!editor.isAddMode); editor.setNewHouse(null); }}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Haus
          </Button>
          <Button size="sm" className="text-xs h-8" disabled={!editor.hasChanges || editor.saving} onClick={editor.saveHouses}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {editor.saving ? "..." : editor.hasChanges ? `Speichern (${editor.changeCount})` : "Gespeichert"}
          </Button>
        </div>
      </div>

      {editor.isAddMode && (
        <div className="rounded-lg border border-quartier-green/30 bg-quartier-green/5 p-3 text-sm text-quartier-green">
          Klicken Sie auf die Karte, um ein neues Haus zu platzieren.
          <Button size="sm" variant="ghost" className="ml-2 text-xs h-6" onClick={() => editor.setIsAddMode(false)}>Abbrechen</Button>
        </div>
      )}

      {/* SVG Karte */}
      <MapSvgCanvas
        viewBoxStr={editor.viewBoxStr} backgroundImage={editor.backgroundImage} mapW={editor.mapW} mapH={editor.mapH}
        houses={editor.houses} selectedId={editor.selectedId} isAddMode={editor.isAddMode} dragState={editor.dragState} newHouse={editor.newHouse}
        onPointerDown={editor.handlePointerDown} onPointerMove={editor.handlePointerMove} onPointerUp={editor.handlePointerUp}
        onSvgClick={editor.handleSvgClick} svgRefCallback={editor.svgRefCallback}
      />

      {/* Neues-Haus Formular */}
      {editor.newHouse && (
        <HouseSelector newHouse={editor.newHouse} onUpdate={editor.setNewHouse} onAdd={editor.addHouse} onCancel={() => editor.setNewHouse(null)} />
      )}

      {/* Ausgewaehltes Haus — Edit Panel */}
      {editor.selectedHouse && (
        <HouseEditDialog
          house={editor.selectedHouse} household={editor.selectedHousehold} allUsers={editor.allUsers}
          showUsers={editor.showUsers} loadingUsers={editor.loadingUsers}
          onUpdate={editor.updateHouse} onDelete={editor.deleteHouse} onDeselect={() => editor.setSelectedId(null)}
          onRefreshHouseholds={editor.loadHouseholds}
        />
      )}

      {/* Fusszeile */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{editor.houses.length} Häuser</span>
        <span>PS: {editor.streetCounts.PS} · SN: {editor.streetCounts.SN} · OR: {editor.streetCounts.OR}</span>
      </div>
    </div>
  );
}
