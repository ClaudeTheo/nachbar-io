"use client";

import { useState, useEffect } from "react";
import { Plus, Globe, MapPin, Users, Home, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Quarter {
  id: string;
  name: string;
  slug: string;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  bounds_sw_lat: number;
  bounds_sw_lng: number;
  bounds_ne_lat: number;
  bounds_ne_lng: number;
  created_at: string;
}

interface QuarterStats {
  houseCount: number;
  householdCount: number;
  residentCount: number;
}

export function QuarterManagement() {
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [stats, setStats] = useState<Record<string, QuarterStats>>({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCenterLat, setNewCenterLat] = useState("");
  const [newCenterLng, setNewCenterLng] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();

      // Quartiere laden
      const { data: qData } = await supabase
        .from("quarters")
        .select("*")
        .order("created_at");

      if (qData) {
        setQuarters(qData);

        // Stats pro Quartier laden
        const statsMap: Record<string, QuarterStats> = {};
        for (const q of qData) {
          const { count: houseCount } = await supabase
            .from("map_houses")
            .select("*", { count: "exact", head: true })
            .eq("quarter_id", q.id);

          const { count: householdCount } = await supabase
            .from("households")
            .select("*", { count: "exact", head: true })
            .eq("quarter_id", q.id);

          const { count: residentCount } = await supabase
            .from("household_members")
            .select("*, households!inner(quarter_id)", { count: "exact", head: true })
            .eq("households.quarter_id", q.id)
            .not("verified_at", "is", null);

          statsMap[q.id] = {
            houseCount: houseCount ?? 0,
            householdCount: householdCount ?? 0,
            residentCount: residentCount ?? 0,
          };
        }
        setStats(statsMap);
      }
    } catch {
      toast.error("Fehler beim Laden der Quartiere");
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate() {
    if (!newName.trim() || !newCenterLat || !newCenterLng) return;
    setSaving(true);

    try {
      const lat = parseFloat(newCenterLat);
      const lng = parseFloat(newCenterLng);
      const slug = newName.trim().toLowerCase()
        .replace(/[^a-z0-9äöüß\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[äöüß]/g, (c) => ({ "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss" }[c] ?? c));

      // Bounding Box: ~500m um Zentrum
      const offset = 0.003;
      const supabase = createClient();
      const { error } = await supabase.from("quarters").insert({
        name: newName.trim(),
        slug,
        center_lat: lat,
        center_lng: lng,
        zoom_level: 17,
        bounds_sw_lat: lat - offset,
        bounds_sw_lng: lng - offset,
        bounds_ne_lat: lat + offset,
        bounds_ne_lng: lng + offset,
      });

      if (error) {
        toast.error("Fehler: " + error.message);
      } else {
        toast.success("Quartier erstellt!");
        setShowNew(false);
        setNewName("");
        setNewCenterLat("");
        setNewCenterLng("");
        loadData();
      }
    } catch {
      toast.error("Netzwerkfehler");
    }
    setSaving(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Quartier "${name}" wirklich loeschen?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("quarters").delete().eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
    } else {
      toast.success("Quartier geloescht");
      loadData();
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Lade Quartiere...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-anthrazit">Quartiere ({quarters.length})</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-1 h-4 w-4" />Aktualisieren
          </Button>
          <Button size="sm" onClick={() => setShowNew(!showNew)} className="bg-quartier-green hover:bg-quartier-green-dark">
            <Plus className="mr-1 h-4 w-4" />Neues Quartier
          </Button>
        </div>
      </div>

      {/* Neues Quartier Form */}
      {showNew && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="font-semibold text-anthrazit">Neues Quartier anlegen</h3>
            <Input
              placeholder="Name (z.B. 'Bad Saeckingen — Altstadt')"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Latitude (z.B. 47.5535)"
                value={newCenterLat}
                onChange={(e) => setNewCenterLat(e.target.value)}
                type="number"
                step="0.0001"
              />
              <Input
                placeholder="Longitude (z.B. 7.9640)"
                value={newCenterLng}
                onChange={(e) => setNewCenterLng(e.target.value)}
                type="number"
                step="0.0001"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tipp: Koordinaten aus Google Maps oder OpenStreetMap kopieren. Bounding Box wird automatisch berechnet (~500m).
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowNew(false)}>Abbrechen</Button>
              <Button
                onClick={handleCreate}
                disabled={saving || !newName.trim() || !newCenterLat || !newCenterLng}
                className="bg-quartier-green hover:bg-quartier-green-dark"
              >
                {saving ? "Wird erstellt..." : "Quartier erstellen"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quartier-Liste */}
      {quarters.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          Noch keine Quartiere angelegt.
        </div>
      ) : (
        <div className="space-y-3">
          {quarters.map((q) => {
            const s = stats[q.id];
            return (
              <Card key={q.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-quartier-green" />
                        <h3 className="font-semibold text-anthrazit">{q.name}</h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Slug: {q.slug} · Zoom: {q.zoom_level}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Zentrum: {q.center_lat.toFixed(4)}, {q.center_lng.toFixed(4)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(q.id, q.name)}
                      className="text-muted-foreground hover:text-emergency-red"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {s && (
                    <div className="mt-3 flex gap-4">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Home className="h-3.5 w-3.5" />
                        <span>{s.houseCount} Haeuser</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{s.householdCount} Haushalte</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{s.residentCount} Bewohner</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {q.bounds_sw_lat.toFixed(3)}–{q.bounds_ne_lat.toFixed(3)} N
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {q.bounds_sw_lng.toFixed(3)}–{q.bounds_ne_lng.toFixed(3)} E
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
