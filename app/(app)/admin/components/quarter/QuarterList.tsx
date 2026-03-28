"use client";

// Quartier-Liste: Statistik-Karten, Erstell-Formular und Karten-Grid

import {
  Globe, Users, Home, Plus, RefreshCw, Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuarterWithStats } from "@/lib/quarters/types";
import type { QuarterFormData } from "./types";
import { QuarterCard } from "./QuarterActions";

// -------------------------------------------------------------------
// Props
// -------------------------------------------------------------------

interface QuarterListProps {
  quarters: QuarterWithStats[];
  showCreateForm: boolean;
  createForm: QuarterFormData;
  saving: boolean;
  expandedId: string | null;
  onToggleCreateForm: () => void;
  onCreateFormChange: (form: QuarterFormData) => void;
  onCancelCreate: () => void;
  onCreate: () => void;
  onRefresh: () => void;
  onToggleExpand: (id: string) => void;
  onEdit: (q: QuarterWithStats) => void;
  onManageAdmins: (q: QuarterWithStats) => void;
  onStatusTransition: (q: QuarterWithStats, target: string) => void;
}

// -------------------------------------------------------------------
// StatCard — Einzelne Statistik-Karte
// -------------------------------------------------------------------

function StatCard({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <Icon className="h-5 w-5 text-quartier-green" />
        <div>
          <p className="text-lg font-bold text-anthrazit">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------------
// CreateForm — Formular zum Erstellen eines neuen Quartiers
// -------------------------------------------------------------------

function CreateForm({ form, saving, onChange, onCancel, onCreate }: {
  form: QuarterFormData;
  saving: boolean;
  onChange: (form: QuarterFormData) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <h3 className="font-semibold text-anthrazit">Neues Quartier anlegen</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Name (z.B. 'Bad Saeckingen — Altstadt')"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
          />
          <Input
            placeholder="Stadt (z.B. 'Bad Saeckingen')"
            value={form.city}
            onChange={(e) => onChange({ ...form, city: e.target.value })}
          />
          <Input
            placeholder="Bundesland (z.B. 'Baden-Wuerttemberg')"
            value={form.state}
            onChange={(e) => onChange({ ...form, state: e.target.value })}
          />
          <Input
            placeholder="Invite-Praefix (z.B. 'BS')"
            value={form.invite_prefix}
            onChange={(e) => onChange({ ...form, invite_prefix: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input
            placeholder="Latitude (z.B. 47.5535)"
            value={form.center_lat}
            onChange={(e) => onChange({ ...form, center_lat: e.target.value })}
            type="number"
            step="0.0001"
          />
          <Input
            placeholder="Longitude (z.B. 7.9640)"
            value={form.center_lng}
            onChange={(e) => onChange({ ...form, center_lng: e.target.value })}
            type="number"
            step="0.0001"
          />
          <Input
            placeholder="Max. Haushalte"
            value={form.max_households}
            onChange={(e) => onChange({ ...form, max_households: e.target.value })}
            type="number"
          />
          <Input
            placeholder="Kontakt-E-Mail"
            value={form.contact_email}
            onChange={(e) => onChange({ ...form, contact_email: e.target.value })}
            type="email"
          />
        </div>
        <Textarea
          placeholder="Beschreibung (optional)"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Koordinaten aus Google Maps oder OpenStreetMap kopieren. Bounding Box wird automatisch berechnet (~500m). Status startet als &quot;Entwurf&quot;.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button
            onClick={onCreate}
            disabled={saving || !form.name.trim() || !form.center_lat || !form.center_lng}
            className="bg-quartier-green hover:bg-quartier-green-dark"
          >
            {saving ? "Wird erstellt..." : "Quartier erstellen"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------------
// QuarterList — Hauptkomponente
// -------------------------------------------------------------------

export function QuarterList({
  quarters,
  showCreateForm,
  createForm,
  saving,
  expandedId,
  onToggleCreateForm,
  onCreateFormChange,
  onCancelCreate,
  onCreate,
  onRefresh,
  onToggleExpand,
  onEdit,
  onManageAdmins,
  onStatusTransition,
}: QuarterListProps) {
  // Statistik-Zusammenfassung
  const totalHouseholds = quarters.reduce((s, q) => s + (q.stats?.householdCount ?? 0), 0);
  const totalResidents = quarters.reduce((s, q) => s + (q.stats?.residentCount ?? 0), 0);
  const activeQuarters = quarters.filter((q) => q.status === "active").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-anthrazit">
          Quartiere ({quarters.length})
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-1 h-4 w-4" />Aktualisieren
          </Button>
          <Button
            size="sm"
            onClick={onToggleCreateForm}
            className="bg-quartier-green hover:bg-quartier-green-dark"
          >
            <Plus className="mr-1 h-4 w-4" />Neues Quartier
          </Button>
        </div>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Globe} label="Quartiere" value={quarters.length} />
        <StatCard icon={Activity} label="Aktiv" value={activeQuarters} />
        <StatCard icon={Home} label="Haushalte" value={totalHouseholds} />
        <StatCard icon={Users} label="Bewohner" value={totalResidents} />
      </div>

      {/* Erstell-Formular */}
      {showCreateForm && (
        <CreateForm
          form={createForm}
          saving={saving}
          onChange={onCreateFormChange}
          onCancel={onCancelCreate}
          onCreate={onCreate}
        />
      )}

      {/* Quartier-Liste */}
      {quarters.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          Noch keine Quartiere angelegt.
        </div>
      ) : (
        <div className="space-y-3">
          {quarters.map((q) => (
            <QuarterCard
              key={q.id}
              quarter={q}
              expanded={expandedId === q.id}
              onToggleExpand={() => onToggleExpand(q.id)}
              onEdit={() => onEdit(q)}
              onManageAdmins={() => onManageAdmins(q)}
              onStatusTransition={(target) => onStatusTransition(q, target)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
