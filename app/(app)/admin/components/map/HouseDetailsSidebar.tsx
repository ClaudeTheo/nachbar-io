"use client";

// Bewohner-Panel: Anzeige und Verwaltung der Haushaltsmitglieder eines Hauses

import { useState } from "react";
import { Users, Home, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { STREET_LABELS } from "@/lib/map-houses";
import type { MapHouseData, HouseholdWithMembers, User } from "./types";

interface HouseholdPanelProps {
  /** Haus-Daten (fuer Strassen-Anzeige) */
  house: MapHouseData;
  /** Haushalt mit Mitgliedern (oder null) */
  household: HouseholdWithMembers | null;
  /** Alle Nutzer (fuer Zuweisung) */
  allUsers: User[];
  /** Ob Daten laden */
  loading: boolean;
  /** Callback: Daten neu laden */
  onRefresh: () => void;
}

export function HouseholdPanel({
  house,
  household,
  allUsers,
  loading,
  onRefresh,
}: HouseholdPanelProps) {
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
          <span>Kein Haushalt für {STREET_LABELS[house.s]} {house.num} registriert.</span>
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
      toast.success("Bewohner hinzugefügt");
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
                <option value="">Nutzer wählen...</option>
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
