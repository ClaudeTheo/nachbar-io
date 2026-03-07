"use client";

import { useState } from "react";
import { Home, Users, QrCode, CheckCircle, XCircle, Search, ChevronDown, ChevronUp, UserMinus, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Household, User } from "@/lib/supabase/types";
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

export function HouseholdManagement({ households, onRefresh }: HouseholdManagementProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberDetail[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [filter, setFilter] = useState<"all" | "occupied" | "free">("all");

  // Filter nach Strasse und Belegung
  const filtered = households.filter((h) => {
    const matchesSearch =
      h.street_name.toLowerCase().includes(search.toLowerCase()) ||
      h.house_number.includes(search) ||
      h.invite_code.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ? true :
      filter === "occupied" ? h.memberCount > 0 :
      h.memberCount === 0;

    return matchesSearch && matchesFilter;
  });

  // Statistiken
  const totalOccupied = households.filter(h => h.memberCount > 0).length;
  const totalFree = households.filter(h => h.memberCount === 0).length;
  const totalVerified = households.filter(h => h.verified).length;

  // Mitglieder eines Haushalts laden
  async function loadMembers(householdId: string) {
    if (expandedId === householdId) {
      setExpandedId(null);
      return;
    }

    setLoadingMembers(true);
    setExpandedId(householdId);
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

  // Strassen gruppieren
  const streets = [...new Set(households.map(h => h.street_name))];

  return (
    <div className="space-y-3">
      {/* Suchfeld + Filter */}
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
          Alle ({households.length})
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
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="font-mono">{h.invite_code}</span>
                            <a
                              href={`/api/qr?code=${h.invite_code}&size=400`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-quartier-green hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <QrCode className="h-3 w-3" /> QR
                            </a>
                            {h.verified && (
                              <span className="inline-flex items-center gap-0.5 text-green-600">
                                <CheckCircle className="h-3 w-3" /> Verifiziert
                              </span>
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
                        {/* Verifizierung */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Verifizierungsstatus</span>
                          <Button
                            size="sm"
                            variant={h.verified ? "default" : "outline"}
                            className={`text-xs h-7 ${h.verified ? "bg-green-600 hover:bg-green-700" : ""}`}
                            onClick={() => toggleVerified(h.id, h.verified)}
                          >
                            {h.verified ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> Verifiziert</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" /> Nicht verifiziert</>
                            )}
                          </Button>
                        </div>

                        {/* Koordinaten */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Koordinaten</span>
                          <span className="font-mono text-[10px]">{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</span>
                        </div>

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
