"use client";

import { useState, useEffect } from "react";
import { CircleCheck, CircleX, Search, ChevronDown, ChevronUp, UserMinus, MapPin, Pencil, Save, X, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Household } from "@/lib/supabase/types";
import { useQuarter } from "@/lib/quarters";
import { toast } from "sonner";

interface HouseholdWithMembers extends Household {
  memberCount: number;
}

interface HouseholdManagementProps {
  households: HouseholdWithMembers[];
  onRefresh: () => void;
}

interface MemberDetail {
  id: string;
  user_id: string;
  role: string;
  user: { display_name: string } | null;
  created_at: string;
}

interface QuarterInfo {
  id: string;
  name: string;
}

export function HouseholdManagement({ households, onRefresh }: HouseholdManagementProps) {
  const { currentQuarter, allQuarters } = useQuarter();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberDetail[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [filter, setFilter] = useState<"all" | "occupied" | "free">("all");

  // Quartier-Filter: Default auf aktuelles Quartier
  const [selectedQuarterId, setSelectedQuarterId] = useState<string>("all");
  const [quarters, setQuarters] = useState<QuarterInfo[]>([]);

  // Edit-Modus
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStreet, setEditStreet] = useState("");
  const [editHouseNumber, setEditHouseNumber] = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [saving, setSaving] = useState(false);

  // Quartiere laden
  useEffect(() => {
    async function loadQuarters() {
      const supabase = createClient();
      const { data } = await supabase
        .from("quarters")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (data) setQuarters(data);
    }
    loadQuarters();
  }, []);

  // Standard-Quartier setzen wenn verfuegbar
  useEffect(() => {
    if (currentQuarter && selectedQuarterId === "all") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedQuarterId(currentQuarter.id);
    }
  }, [currentQuarter, selectedQuarterId]);

  // Quartier-Map fuer schnellen Zugriff
  const quarterMap = new Map<string, string>();
  quarters.forEach(q => quarterMap.set(q.id, q.name));
  // Auch allQuarters einbeziehen (fuer super_admin)
  allQuarters.forEach(q => quarterMap.set(q.id, q.name));

  // Filter nach Quartier, Strasse und Belegung
  const filtered = households.filter((h) => {
    // Quartier-Filter
    const matchesQuarter =
      selectedQuarterId === "all" ? true :
      h.quarter_id === selectedQuarterId;

    const matchesSearch =
      h.street_name.toLowerCase().includes(search.toLowerCase()) ||
      h.house_number.includes(search) ||
      h.invite_code.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ? true :
      filter === "occupied" ? h.memberCount > 0 :
      h.memberCount === 0;

    return matchesQuarter && matchesSearch && matchesFilter;
  });

  // Statistiken (basierend auf gefiltertem Quartier)
  const quarterHouseholds = selectedQuarterId === "all"
    ? households
    : households.filter(h => h.quarter_id === selectedQuarterId);
  const totalOccupied = quarterHouseholds.filter(h => h.memberCount > 0).length;
  const totalFree = quarterHouseholds.filter(h => h.memberCount === 0).length;

  // Mitglieder eines Haushalts laden
  async function loadMembers(householdId: string) {
    if (expandedId === householdId) {
      setExpandedId(null);
      setEditingId(null);
      return;
    }

    setLoadingMembers(true);
    setExpandedId(householdId);
    setEditingId(null);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("household_members")
      .select("id, user_id, role, created_at, user:users(display_name)")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Fehler beim Laden der Mitglieder");
    } else {
      setMembers((data ?? []) as unknown as MemberDetail[]);
    }
    setLoadingMembers(false);
  }

  // Verifizierungsstatus umschalten
  async function toggleVerified(householdId: string, currentVerified: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from("households")
      .update({ verified: !currentVerified })
      .eq("id", householdId);

    if (error) {
      toast.error("Fehler beim Aendern des Status");
    } else {
      toast.success(currentVerified ? "Verifizierung zurueckgenommen" : "Haushalt verifiziert");
      onRefresh();
    }
  }

  // Mitglied aus Haushalt entfernen
  async function removeMember(membershipId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("household_members")
      .delete()
      .eq("id", membershipId);

    if (error) {
      toast.error("Fehler beim Entfernen");
    } else {
      toast.success("Mitglied entfernt");
      setMembers((prev) => prev.filter(m => m.id !== membershipId));
      onRefresh();
    }
  }

  // Edit-Modus starten
  function startEdit(h: HouseholdWithMembers) {
    setEditingId(h.id);
    setEditStreet(h.street_name);
    setEditHouseNumber(h.house_number);
    setEditLat(h.lat.toString());
    setEditLng(h.lng.toString());
  }

  // Aenderungen speichern
  async function saveEdit(householdId: string) {
    if (!editStreet || !editHouseNumber) {
      toast.error("Strasse und Hausnummer sind erforderlich");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("households")
      .update({
        street_name: editStreet,
        house_number: editHouseNumber,
        lat: parseFloat(editLat) || 0,
        lng: parseFloat(editLng) || 0,
      })
      .eq("id", householdId);

    if (error) {
      toast.error("Fehler beim Speichern: " + error.message);
    } else {
      toast.success("Haushalt aktualisiert");
      setEditingId(null);
      onRefresh();
    }
    setSaving(false);
  }

  // Strassen gruppieren (dynamisch aus den gefilterten Daten)
  const streets = [...new Set(filtered.map(h => h.street_name))].sort();

  return (
    <div className="space-y-3">
      {/* Quartier-Filter */}
      {quarters.length > 1 && (
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedQuarterId} onValueChange={(val) => { if (val) setSelectedQuarterId(val); }}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Quartier waehlen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Quartiere</SelectItem>
              {quarters.map((q) => (
                <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Suchfeld */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Strasse, Nr. oder Code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filter-Buttons */}
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          className="text-xs h-7"
          onClick={() => setFilter("all")}
        >
          Alle ({quarterHouseholds.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "occupied" ? "default" : "outline"}
          className="text-xs h-7"
          onClick={() => setFilter("occupied")}
        >
          Belegt ({totalOccupied})
        </Button>
        <Button
          size="sm"
          variant={filter === "free" ? "default" : "outline"}
          className="text-xs h-7"
          onClick={() => setFilter("free")}
        >
          Frei ({totalFree})
        </Button>
      </div>

      {/* Strassen-Gruppen */}
      {streets.map((street) => {
        const streetHouseholds = filtered.filter(h => h.street_name === street);
        if (streetHouseholds.length === 0) return null;

        return (
          <div key={street}>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {street} ({streetHouseholds.length})
            </p>

            <div className="space-y-1.5">
              {streetHouseholds.map((h) => {
                const isExpanded = expandedId === h.id;
                const isEditing = editingId === h.id;
                const quarterName = h.quarter_id ? quarterMap.get(h.quarter_id) : null;

                return (
                  <Card key={h.id} className="overflow-hidden">
                    <button
                      className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/30"
                      onClick={() => loadMembers(h.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${h.memberCount > 0 ? "bg-quartier-green" : "bg-gray-300"}`} />
                        <div>
                          <p className="font-semibold text-anthrazit text-sm">
                            Nr. {h.house_number}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                            <span className="font-mono">{h.invite_code}</span>
                            {h.verified && (
                              <span className="inline-flex items-center gap-0.5 text-green-600">
                                <CircleCheck className="h-3 w-3" /> Verifiziert
                              </span>
                            )}
                            {/* Quartier-Badge */}
                            {quarterName && selectedQuarterId === "all" && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1">
                                <Globe className="h-2.5 w-2.5 mr-0.5" />
                                {quarterName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={h.memberCount > 0 ? "default" : "secondary"} className="text-[10px]">
                          {h.memberCount > 0 ? `${h.memberCount} Bew.` : "Frei"}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Erweiterte Details */}
                    {isExpanded && (
                      <CardContent className="border-t bg-muted/10 p-3 space-y-2">
                        {/* Edit-Modus */}
                        {isEditing ? (
                          <div className="space-y-2 p-2 rounded-lg bg-white border">
                            <p className="text-xs font-semibold text-anthrazit">Haushalt bearbeiten</p>
                            <Input
                              placeholder="Strassenname"
                              value={editStreet}
                              onChange={(e) => setEditStreet(e.target.value)}
                              className="h-8 text-sm"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                placeholder="Hausnr."
                                value={editHouseNumber}
                                onChange={(e) => setEditHouseNumber(e.target.value)}
                                className="h-8 text-sm"
                              />
                              <Input
                                placeholder="Lat"
                                value={editLat}
                                onChange={(e) => setEditLat(e.target.value)}
                                type="number"
                                step="0.0001"
                                className="h-8 text-sm"
                              />
                              <Input
                                placeholder="Lng"
                                value={editLng}
                                onChange={(e) => setEditLng(e.target.value)}
                                type="number"
                                step="0.0001"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 h-7 text-xs bg-quartier-green hover:bg-quartier-green-dark"
                                onClick={() => saveEdit(h.id)}
                                disabled={saving}
                              >
                                <Save className="h-3 w-3 mr-1" />
                                {saving ? "Speichern..." : "Speichern"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Abbrechen
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Aktions-Leiste */}
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={(e) => { e.stopPropagation(); startEdit(h); }}
                              >
                                <Pencil className="h-3 w-3 mr-1" /> Bearbeiten
                              </Button>
                              <Button
                                size="sm"
                                variant={h.verified ? "default" : "outline"}
                                className={`text-xs h-7 ${h.verified ? "bg-green-600 hover:bg-green-700" : ""}`}
                                onClick={() => toggleVerified(h.id, h.verified)}
                              >
                                {h.verified ? (
                                  <><CircleCheck className="h-3 w-3 mr-1" /> Verifiziert</>
                                ) : (
                                  <><CircleX className="h-3 w-3 mr-1" /> Verifizieren</>
                                )}
                              </Button>
                            </div>

                            {/* Quartier + Koordinaten */}
                            <div className="space-y-1">
                              {quarterName && (
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Quartier</span>
                                  <span className="font-medium text-anthrazit">{quarterName}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Koordinaten</span>
                                <span className="font-mono text-[10px]">{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</span>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Mitglieder */}
                        <div className="pt-1 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Bewohner</p>
                          {loadingMembers ? (
                            <p className="text-xs text-muted-foreground">Laden...</p>
                          ) : members.length > 0 ? (
                            <div className="space-y-1">
                              {members.map((m) => (
                                <div key={m.id} className="flex items-center justify-between bg-white rounded p-1.5">
                                  <div>
                                    <p className="text-sm font-medium">{m.user?.display_name ?? "Unbekannt"}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {m.role === "owner" ? "Eigentuemer" : "Mitglied"} · seit {new Date(m.created_at).toLocaleDateString("de-DE")}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => removeMember(m.id)}
                                    title="Mitglied entfernen"
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Keine Bewohner registriert</p>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">Keine Haushalte gefunden.</p>
      )}
    </div>
  );
}
