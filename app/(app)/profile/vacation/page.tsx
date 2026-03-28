"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Button,
  Input,
  Textarea,
  Separator,
  Badge,
  PageHeader,
} from "@/components/ui";
import { Plane, Trash2, Plus, Calendar } from "lucide-react";
import type { VacationMode } from "@/lib/supabase/types";
import { toast } from "sonner";

export default function VacationPage() {
  const _router = useRouter();
  const { user } = useAuth();
  const [vacations, setVacations] = useState<VacationMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Formular-State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [notifyNeighbors, setNotifyNeighbors] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadVacations = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("vacation_modes")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false });

    setVacations((data as VacationMode[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadVacations(user.id);
  }, [user, loadVacations]);

  async function handleSave() {
    if (!user || !startDate || !endDate) return;
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("Enddatum muss nach dem Startdatum liegen.");
      return;
    }
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("vacation_modes").insert({
      user_id: user.id,
      start_date: startDate,
      end_date: endDate,
      note: note.trim() || null,
      notify_neighbors: notifyNeighbors,
    });

    if (error) {
      toast.error("Fehler beim Speichern.");
    } else {
      toast.success("Urlaub eingetragen!");
      setShowForm(false);
      setStartDate("");
      setEndDate("");
      setNote("");
      await loadVacations(user.id);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!user) return;
    const supabase = createClient();
    await supabase.from("vacation_modes").delete().eq("id", id);
    toast("Urlaub gelöscht");
    await loadVacations(user.id);
  }

  const today = new Date().toISOString().split("T")[0];

  // Aktive/vergangene trennen
  const active = vacations.filter((v) => v.end_date >= today);
  const past = vacations.filter((v) => v.end_date < today);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up">
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <PageHeader
        title="Urlaub-Modus"
        subtitle="Informieren Sie Ihre Nachbarn, wenn Sie verreisen"
        backHref="/profile"
        className="mb-4"
      />

      {/* Info-Box */}
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-start gap-2">
          <Plane className="mt-0.5 h-4 w-4 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Wie funktioniert der Urlaub-Modus?</p>
            <p className="mt-1 text-blue-700">
              Ihr Haus wird auf der Quartierskarte blau markiert. So wissen Ihre
              Nachbarn, dass sie ein Auge auf Ihr Zuhause werfen sollten und
              verdächtige Dinge eher auffallen.
            </p>
          </div>
        </div>
      </div>

      {/* Neuen Urlaub hinzufügen */}
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="mb-4 w-full gap-2 bg-quartier-green hover:bg-quartier-green/90"
        >
          <Plus className="h-4 w-4" />
          Urlaub eintragen
        </Button>
      ) : (
        <div className="mb-4 rounded-lg border border-border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-anthrazit">
            Neuer Urlaub
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Von
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={today}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Bis
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || today}
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Hinweis für Nachbarn (optional)
            </label>
            <Textarea
              placeholder="z.B. Bitte Briefkasten leeren, Pakete annehmen..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              className="min-h-[60px] text-sm"
            />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notifyNeighbors}
              onChange={(e) => setNotifyNeighbors(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-muted-foreground">
              Nachbarn auf der Karte informieren
            </span>
          </label>

          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Abbrechen
            </Button>
            <Button
              size="sm"
              disabled={saving || !startDate || !endDate}
              onClick={handleSave}
              className="bg-quartier-green hover:bg-quartier-green/90"
            >
              {saving ? "Speichern..." : "Eintragen"}
            </Button>
          </div>
        </div>
      )}

      {/* Aktive Urlaube */}
      {active.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-anthrazit">
            Aktive Urlaube
          </h2>
          <div className="space-y-2">
            {active.map((v) => (
              <VacationCard
                key={v.id}
                vacation={v}
                isActive={v.start_date <= today}
                onDelete={() => handleDelete(v.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Vergangene Urlaube */}
      {past.length > 0 && (
        <div>
          <Separator className="mb-3" />
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            Vergangene Urlaube
          </h2>
          <div className="space-y-2">
            {past.slice(0, 5).map((v) => (
              <VacationCard
                key={v.id}
                vacation={v}
                isActive={false}
                onDelete={() => handleDelete(v.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Leerer Zustand */}
      {vacations.length === 0 && !showForm && (
        <div className="py-8 text-center">
          <Plane className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            Noch keine Urlaube eingetragen
          </p>
        </div>
      )}
    </div>
  );
}

function VacationCard({
  vacation,
  isActive,
  onDelete,
  formatDate,
}: {
  vacation: VacationMode;
  isActive: boolean;
  onDelete: () => void;
  formatDate: (d: string) => string;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${isActive ? "border-blue-200 bg-blue-50/50" : "border-border bg-white"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar
            className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-muted-foreground"}`}
          />
          <div>
            <p className="text-sm font-medium text-anthrazit">
              {formatDate(vacation.start_date)} —{" "}
              {formatDate(vacation.end_date)}
            </p>
            {vacation.note && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {vacation.note}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Badge className="bg-blue-100 text-blue-700 text-xs">Aktiv</Badge>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
