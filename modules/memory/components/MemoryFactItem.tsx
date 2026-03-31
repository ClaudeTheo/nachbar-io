"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MemoryFact } from "../types";

const SOURCE_LABELS: Record<string, string> = {
  self: "Selbst",
  caregiver: "Angehöriger",
  ai_learned: "KI gelernt",
  care_team: "Pflege-Team",
};

const SOURCE_COLORS: Record<string, string> = {
  self: "bg-blue-100 text-blue-800",
  caregiver: "bg-purple-100 text-purple-800",
  ai_learned: "bg-quartier-green/10 text-quartier-green",
  care_team: "bg-amber-100 text-amber-800",
};

interface MemoryFactItemProps {
  fact: MemoryFact;
  onDelete: (id: string) => void;
  onUpdate: (id: string, value: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Heute";
  if (days === 1) return "Gestern";
  return `Vor ${days} Tagen`;
}

export function MemoryFactItem({ fact, onDelete, onUpdate }: MemoryFactItemProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(fact.value);

  function handleSave() {
    if (editValue.trim() && editValue !== fact.value) {
      onUpdate(fact.id, editValue.trim());
    }
    setEditing(false);
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-3 shadow-soft">
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <Button size="sm" onClick={handleSave} className="bg-quartier-green hover:bg-quartier-green-dark">
              OK
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-left text-sm font-medium text-anthrazit hover:text-quartier-green transition-colors"
          >
            {fact.value}
          </button>
        )}
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="secondary" className={`text-[10px] ${SOURCE_COLORS[fact.source] || ""}`}>
            {SOURCE_LABELS[fact.source] || fact.source}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {timeAgo(fact.updated_at)}
          </span>
          {!fact.confirmed && fact.source === "ai_learned" && (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
              Unbestätigt
            </Badge>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDelete(fact.id)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
        aria-label="Eintrag löschen"
      >
        ×
      </button>
    </div>
  );
}
