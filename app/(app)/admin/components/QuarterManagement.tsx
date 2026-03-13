"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe, MapPin, Users, Home, Settings, Shield, Plus,
  Edit, Archive, RefreshCw, Search, X, AlertTriangle,
  Activity, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { QuarterWithStats, QuarterSettings, QuarterAdmin } from "@/lib/quarters/types";

// -------------------------------------------------------------------
// Typen
// -------------------------------------------------------------------

interface QuarterFormData {
  name: string;
  city: string;
  state: string;
  description: string;
  center_lat: string;
  center_lng: string;
  invite_prefix: string;
  max_households: string;
  contact_email: string;
}

const emptyForm: QuarterFormData = {
  name: "",
  city: "",
  state: "",
  description: "",
  center_lat: "",
  center_lng: "",
  invite_prefix: "",
  max_households: "50",
  contact_email: "",
};

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800 border-yellow-300",
  active: "bg-green-100 text-green-800 border-green-300",
  archived: "bg-gray-100 text-gray-500 border-gray-300",
};

const statusLabels: Record<string, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  archived: "Archiviert",
};

// -------------------------------------------------------------------
// Hauptkomponente
// -------------------------------------------------------------------

export function QuarterManagement() {
  const [quarters, setQuarters] = useState<QuarterWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<QuarterFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Edit-Dialog
  const [editQuarter, setEditQuarter] = useState<QuarterWithStats | null>(null);
  const [editForm, setEditForm] = useState<QuarterFormData>(emptyForm);
  const [editSettings, setEditSettings] = useState<QuarterSettings>({});

  // Status-Transition-Dialog
  const [statusTransition, setStatusTransition] = useState<{
    quarter: QuarterWithStats;
    targetStatus: string;
  } | null>(null);

  // Admin-Zuweisung
  const [adminQuarter, setAdminQuarter] = useState<QuarterWithStats | null>(null);
  const [quarterAdmins, setQuarterAdmins] = useState<QuarterAdmin[]>([]);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminSearchResults, setAdminSearchResults] = useState<Array<{ id: string; display_name: string }>>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Erweiterte Ansicht
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Quartiere laden
  const loadQuarters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/quarters");
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();
      setQuarters(data);
    } catch {
      toast.error("Fehler beim Laden der Quartiere");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadQuarters(); }, [loadQuarters]);

  // -------------------------------------------------------------------
  // Quartier erstellen
  // -------------------------------------------------------------------

  async function handleCreate() {
    if (!createForm.name.trim() || !createForm.center_lat || !createForm.center_lng) {
      toast.error("Name und Koordinaten sind Pflichtfelder");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/quarters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error("Fehler: " + (err.error ?? "Unbekannt"));
      } else {
        toast.success("Quartier erstellt!");
        setShowCreateForm(false);
        setCreateForm(emptyForm);
        loadQuarters();
      }
    } catch {
      toast.error("Netzwerkfehler");
    }
    setSaving(false);
  }

  // -------------------------------------------------------------------
  // Quartier bearbeiten
  // -------------------------------------------------------------------

  function openEditDialog(q: QuarterWithStats) {
    setEditQuarter(q);
    setEditForm({
      name: q.name,
      city: q.city ?? "",
      state: q.state ?? "",
      description: q.description ?? "",
      center_lat: String(q.center_lat),
      center_lng: String(q.center_lng),
      invite_prefix: q.invite_prefix ?? "",
      max_households: String(q.max_households),
      contact_email: q.contact_email ?? "",
    });
    setEditSettings(q.settings ?? {});
  }

  async function handleUpdate() {
    if (!editQuarter) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/quarters/${editQuarter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          city: editForm.city.trim() || null,
          state: editForm.state.trim() || null,
          description: editForm.description.trim() || null,
          center_lat: parseFloat(editForm.center_lat),
          center_lng: parseFloat(editForm.center_lng),
          invite_prefix: editForm.invite_prefix.trim() || null,
          max_households: parseInt(editForm.max_households) || 50,
          contact_email: editForm.contact_email.trim() || null,
          settings: editSettings,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error("Fehler: " + (err.error ?? "Unbekannt"));
      } else {
        toast.success("Quartier aktualisiert!");
        setEditQuarter(null);
        loadQuarters();
      }
    } catch {
      toast.error("Netzwerkfehler");
    }
    setSaving(false);
  }

  // -------------------------------------------------------------------
  // Status-Transition
  // -------------------------------------------------------------------

  async function handleStatusTransition() {
    if (!statusTransition) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/quarters/${statusTransition.quarter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusTransition.targetStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error("Fehler: " + (err.error ?? "Unbekannt"));
      } else {
        toast.success(
          statusTransition.targetStatus === "active"
            ? "Quartier aktiviert!"
            : "Quartier archiviert!"
        );
        setStatusTransition(null);
        loadQuarters();
      }
    } catch {
      toast.error("Netzwerkfehler");
    }
    setSaving(false);
  }

  // -------------------------------------------------------------------
  // Admin-Verwaltung
  // -------------------------------------------------------------------

  async function openAdminDialog(q: QuarterWithStats) {
    setAdminQuarter(q);
    setLoadingAdmins(true);
    try {
      const res = await fetch(`/api/admin/quarters/${q.id}/admins`);
      if (res.ok) {
        setQuarterAdmins(await res.json());
      }
    } catch {
      toast.error("Fehler beim Laden der Admins");
    }
    setLoadingAdmins(false);
  }

  async function searchUsers(query: string) {
    setAdminSearch(query);
    if (query.length < 2) {
      setAdminSearchResults([]);
      return;
    }
    try {
      // Benutzer-Suche ueber DB-Overview-API (existierender Endpoint)
      const res = await fetch(`/api/admin/db-overview`);
      if (res.ok) {
        const data = await res.json();
        // Filter Benutzer nach Suchbegriff
        const users = (data.users ?? []).filter(
          (u: { display_name: string; id: string }) =>
            u.display_name?.toLowerCase().includes(query.toLowerCase())
        );
        setAdminSearchResults(users.slice(0, 5));
      }
    } catch {
      // Stille Fehlerbehandlung
    }
  }

  async function assignAdmin(userId: string) {
    if (!adminQuarter) return;
    try {
      const res = await fetch(`/api/admin/quarters/${adminQuarter.id}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Fehler bei Zuweisung");
      } else {
        toast.success("Admin zugewiesen!");
        setAdminSearch("");
        setAdminSearchResults([]);
        // Admins neu laden
        openAdminDialog(adminQuarter);
      }
    } catch {
      toast.error("Netzwerkfehler");
    }
  }

  async function removeAdmin(userId: string) {
    if (!adminQuarter) return;
    try {
      const res = await fetch(`/api/admin/quarters/${adminQuarter.id}/admins`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Fehler beim Entfernen");
      } else {
        toast.success("Admin entfernt");
        openAdminDialog(adminQuarter);
      }
    } catch {
      toast.error("Netzwerkfehler");
    }
  }

  // -------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Lade Quartiere...</div>;
  }

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
          <Button variant="outline" size="sm" onClick={loadQuarters}>
            <RefreshCw className="mr-1 h-4 w-4" />Aktualisieren
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
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
        <Card>
          <CardContent className="space-y-3 pt-4">
            <h3 className="font-semibold text-anthrazit">Neues Quartier anlegen</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="Name (z.B. 'Bad Saeckingen — Altstadt')"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
              <Input
                placeholder="Stadt (z.B. 'Bad Saeckingen')"
                value={createForm.city}
                onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
              />
              <Input
                placeholder="Bundesland (z.B. 'Baden-Wuerttemberg')"
                value={createForm.state}
                onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
              />
              <Input
                placeholder="Invite-Praefix (z.B. 'BS')"
                value={createForm.invite_prefix}
                onChange={(e) => setCreateForm({ ...createForm, invite_prefix: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Input
                placeholder="Latitude (z.B. 47.5535)"
                value={createForm.center_lat}
                onChange={(e) => setCreateForm({ ...createForm, center_lat: e.target.value })}
                type="number"
                step="0.0001"
              />
              <Input
                placeholder="Longitude (z.B. 7.9640)"
                value={createForm.center_lng}
                onChange={(e) => setCreateForm({ ...createForm, center_lng: e.target.value })}
                type="number"
                step="0.0001"
              />
              <Input
                placeholder="Max. Haushalte"
                value={createForm.max_households}
                onChange={(e) => setCreateForm({ ...createForm, max_households: e.target.value })}
                type="number"
              />
              <Input
                placeholder="Kontakt-E-Mail"
                value={createForm.contact_email}
                onChange={(e) => setCreateForm({ ...createForm, contact_email: e.target.value })}
                type="email"
              />
            </div>
            <Textarea
              placeholder="Beschreibung (optional)"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Koordinaten aus Google Maps oder OpenStreetMap kopieren. Bounding Box wird automatisch berechnet (~500m). Status startet als &quot;Entwurf&quot;.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowCreateForm(false); setCreateForm(emptyForm); }}>
                Abbrechen
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving || !createForm.name.trim() || !createForm.center_lat || !createForm.center_lng}
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
          {quarters.map((q) => (
            <QuarterCard
              key={q.id}
              quarter={q}
              expanded={expandedId === q.id}
              onToggleExpand={() => setExpandedId(expandedId === q.id ? null : q.id)}
              onEdit={() => openEditDialog(q)}
              onManageAdmins={() => openAdminDialog(q)}
              onStatusTransition={(target) => setStatusTransition({ quarter: q, targetStatus: target })}
            />
          ))}
        </div>
      )}

      {/* Edit-Dialog */}
      <Dialog open={!!editQuarter} onOpenChange={(open) => !open && setEditQuarter(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Quartier bearbeiten</DialogTitle>
            <DialogDescription>
              Aendern Sie die Einstellungen fuer &quot;{editQuarter?.name}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basisdaten */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-anthrazit">Basisdaten</h4>
              <Input
                placeholder="Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Stadt"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
                <Input
                  placeholder="Bundesland"
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="Beschreibung"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Kontakt-E-Mail"
                  value={editForm.contact_email}
                  onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                  type="email"
                />
                <Input
                  placeholder="Invite-Praefix"
                  value={editForm.invite_prefix}
                  onChange={(e) => setEditForm({ ...editForm, invite_prefix: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Latitude"
                  value={editForm.center_lat}
                  onChange={(e) => setEditForm({ ...editForm, center_lat: e.target.value })}
                  type="number"
                  step="0.0001"
                />
                <Input
                  placeholder="Longitude"
                  value={editForm.center_lng}
                  onChange={(e) => setEditForm({ ...editForm, center_lng: e.target.value })}
                  type="number"
                  step="0.0001"
                />
                <Input
                  placeholder="Max. Haushalte"
                  value={editForm.max_households}
                  onChange={(e) => setEditForm({ ...editForm, max_households: e.target.value })}
                  type="number"
                />
              </div>
            </div>

            <Separator />

            {/* Modul-Einstellungen */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-anthrazit">Module</h4>
              <SettingsToggle
                label="Care-Modul"
                description="Senioren-Betreuung, SOS-Alerts, Medikamente"
                checked={editSettings.enableCareModule ?? false}
                onCheckedChange={(v) => setEditSettings({ ...editSettings, enableCareModule: v })}
              />
              <SettingsToggle
                label="Marktplatz"
                description="Nachbarschaftliche Angebote und Gesuche"
                checked={editSettings.enableMarketplace ?? true}
                onCheckedChange={(v) => setEditSettings({ ...editSettings, enableMarketplace: v })}
              />
              <SettingsToggle
                label="Veranstaltungen"
                description="Quartiers-Events und Termine"
                checked={editSettings.enableEvents ?? true}
                onCheckedChange={(v) => setEditSettings({ ...editSettings, enableEvents: v })}
              />
              <SettingsToggle
                label="Umfragen"
                description="Quartiers-Abstimmungen"
                checked={editSettings.enablePolls ?? true}
                onCheckedChange={(v) => setEditSettings({ ...editSettings, enablePolls: v })}
              />
              <SettingsToggle
                label="Notfall-Banner"
                description="112/110 Banner bei Notfallkategorien"
                checked={editSettings.emergencyBannerEnabled ?? true}
                onCheckedChange={(v) => setEditSettings({ ...editSettings, emergencyBannerEnabled: v })}
              />
            </div>

            <Separator />

            {/* Registrierungseinstellungen */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-anthrazit">Registrierung</h4>
              <SettingsToggle
                label="Selbstregistrierung"
                description="Nutzer koennen sich ohne Einladung registrieren"
                checked={editSettings.allowSelfRegistration ?? false}
                onCheckedChange={(v) => setEditSettings({ ...editSettings, allowSelfRegistration: v })}
              />
              <SettingsToggle
                label="Verifizierung erforderlich"
                description="Nutzer muessen durch Admin verifiziert werden"
                checked={editSettings.requireVerification ?? true}
                onCheckedChange={(v) => setEditSettings({ ...editSettings, requireVerification: v })}
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Max. Mitglieder pro Haushalt</p>
                </div>
                <Select
                  value={String(editSettings.maxMembersPerHousehold ?? 8)}
                  onValueChange={(v) => v && setEditSettings({ ...editSettings, maxMembersPerHousehold: parseInt(v) })}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 6, 8, 10, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditQuarter(null)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={saving}
              className="bg-quartier-green hover:bg-quartier-green-dark"
            >
              {saving ? "Wird gespeichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status-Transition-Dialog */}
      <Dialog open={!!statusTransition} onOpenChange={(open) => !open && setStatusTransition(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusTransition?.targetStatus === "active"
                ? "Quartier aktivieren"
                : "Quartier archivieren"}
            </DialogTitle>
            <DialogDescription>
              {statusTransition?.targetStatus === "active"
                ? `Moechten Sie "${statusTransition?.quarter.name}" wirklich aktivieren? Das Quartier wird fuer Bewohner sichtbar.`
                : `Moechten Sie "${statusTransition?.quarter.name}" wirklich archivieren? Bewohner haben keinen Zugang mehr.`}
            </DialogDescription>
          </DialogHeader>
          {statusTransition?.targetStatus === "archived" && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-800">
                Archivierte Quartiere koennen nicht wieder aktiviert werden. Alle Daten bleiben erhalten.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTransition(null)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleStatusTransition}
              disabled={saving}
              variant={statusTransition?.targetStatus === "archived" ? "destructive" : "default"}
              className={statusTransition?.targetStatus === "active" ? "bg-quartier-green hover:bg-quartier-green-dark" : ""}
            >
              {saving
                ? "Wird geaendert..."
                : statusTransition?.targetStatus === "active"
                  ? "Aktivieren"
                  : "Archivieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin-Dialog */}
      <Dialog open={!!adminQuarter} onOpenChange={(open) => !open && setAdminQuarter(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quartier-Admins: {adminQuarter?.name}</DialogTitle>
            <DialogDescription>
              Verwalten Sie die Administratoren fuer dieses Quartier
            </DialogDescription>
          </DialogHeader>

          {/* Aktuelle Admins */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-anthrazit">Aktuelle Admins</h4>
            {loadingAdmins ? (
              <p className="text-sm text-muted-foreground">Lade...</p>
            ) : quarterAdmins.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Admins zugewiesen</p>
            ) : (
              quarterAdmins.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-quartier-green" />
                    <span className="text-sm">{a.user?.display_name ?? "Unbekannt"}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAdmin(a.user_id)}
                    className="h-7 text-muted-foreground hover:text-emergency-red"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <Separator />

          {/* Admin hinzufuegen */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-anthrazit">Admin hinzufuegen</h4>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Benutzer suchen..."
                value={adminSearch}
                onChange={(e) => searchUsers(e.target.value)}
                className="pl-8"
              />
              {adminSearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => { setAdminSearch(""); setAdminSearchResults([]); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {adminSearchResults.length > 0 && (
              <div className="space-y-1 rounded-md border p-2">
                {adminSearchResults.map((u) => {
                  const alreadyAdmin = quarterAdmins.some((a) => a.user_id === u.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between rounded p-1.5 hover:bg-muted">
                      <span className="text-sm">{u.display_name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={alreadyAdmin}
                        onClick={() => assignAdmin(u.id)}
                        className="h-7 text-xs"
                      >
                        {alreadyAdmin ? "Bereits Admin" : "Zuweisen"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -------------------------------------------------------------------
// Unterkomponenten
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

function SettingsToggle({ label, description, checked, onCheckedChange }: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function QuarterCard({
  quarter: q,
  expanded,
  onToggleExpand,
  onEdit,
  onManageAdmins,
  onStatusTransition,
}: {
  quarter: QuarterWithStats;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onManageAdmins: () => void;
  onStatusTransition: (target: string) => void;
}) {
  const isArchived = q.status === "archived";

  return (
    <Card className={isArchived ? "opacity-60" : ""}>
      <CardContent className="pt-4">
        {/* Kopfzeile */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-quartier-green" />
              <h3 className="font-semibold text-anthrazit">{q.name}</h3>
              <Badge
                variant="outline"
                className={`text-[10px] ${statusColors[q.status] ?? ""}`}
              >
                {statusLabels[q.status] ?? q.status}
              </Badge>
            </div>
            {q.city && (
              <p className="ml-6 mt-0.5 text-xs text-muted-foreground">
                <MapPin className="mr-0.5 inline h-3 w-3" />
                {q.city}{q.state ? `, ${q.state}` : ""}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit} disabled={isArchived}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onManageAdmins} disabled={isArchived}>
              <Shield className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleExpand}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Stats-Zeile */}
        <div className="mt-3 flex flex-wrap gap-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Home className="h-3.5 w-3.5" />
            <span>{q.stats?.householdCount ?? 0} Haushalte</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{q.stats?.residentCount ?? 0} Bewohner</span>
          </div>
          {(q.stats?.activeAlerts ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{q.stats.activeAlerts} Alerts (24h)</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            <span>{q.stats?.activePosts ?? 0} Beitraege (7d)</span>
          </div>
        </div>

        {/* Erweiterte Details */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>Slug: <strong className="text-anthrazit">{q.slug}</strong></span>
              <span>Zentrum: {q.center_lat.toFixed(4)}, {q.center_lng.toFixed(4)}</span>
              <span>Invite-Praefix: <strong className="text-anthrazit">{q.invite_prefix ?? "—"}</strong></span>
              <span>Max. Haushalte: <strong className="text-anthrazit">{q.max_households}</strong></span>
              <span>Kontakt: {q.contact_email ?? "—"}</span>
              <span>Erstellt: {new Date(q.created_at).toLocaleDateString("de-DE")}</span>
            </div>

            {q.description && (
              <p className="text-xs text-muted-foreground">{q.description}</p>
            )}

            {/* Aktive Module */}
            <div className="flex flex-wrap gap-1">
              {q.settings?.enableCareModule && (
                <Badge variant="secondary" className="text-[10px]">Care</Badge>
              )}
              {q.settings?.enableMarketplace && (
                <Badge variant="secondary" className="text-[10px]">Marktplatz</Badge>
              )}
              {q.settings?.enableEvents && (
                <Badge variant="secondary" className="text-[10px]">Events</Badge>
              )}
              {q.settings?.enablePolls && (
                <Badge variant="secondary" className="text-[10px]">Umfragen</Badge>
              )}
            </div>

            {/* Status-Aktionen */}
            {!isArchived && (
              <div className="flex gap-2 pt-1">
                {q.status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusTransition("active")}
                    className="text-xs text-green-700 border-green-300 hover:bg-green-50"
                  >
                    <Activity className="mr-1 h-3.5 w-3.5" />
                    Aktivieren
                  </Button>
                )}
                {q.status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusTransition("archived")}
                    className="text-xs text-muted-foreground"
                  >
                    <Archive className="mr-1 h-3.5 w-3.5" />
                    Archivieren
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={onEdit} className="text-xs">
                  <Settings className="mr-1 h-3.5 w-3.5" />
                  Einstellungen
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
