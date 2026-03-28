"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { QuarterSettings } from "@/lib/quarters/types";
import {
  QuarterList,
  QuarterEditDialog,
  StatusTransitionDialog,
  AdminManagementDialog,
  emptyForm,
} from "./quarter";
import type { QuarterFormData, QuarterWithStats, QuarterAdmin } from "./quarter";

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

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Lade Quartiere...</div>;
  }

  return (
    <>
      <QuarterList
        quarters={quarters}
        showCreateForm={showCreateForm}
        createForm={createForm}
        saving={saving}
        expandedId={expandedId}
        onToggleCreateForm={() => setShowCreateForm(!showCreateForm)}
        onCreateFormChange={setCreateForm}
        onCancelCreate={() => { setShowCreateForm(false); setCreateForm(emptyForm); }}
        onCreate={handleCreate}
        onRefresh={loadQuarters}
        onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
        onEdit={openEditDialog}
        onManageAdmins={openAdminDialog}
        onStatusTransition={(q, target) => setStatusTransition({ quarter: q, targetStatus: target })}
      />

      <QuarterEditDialog
        editQuarter={editQuarter}
        editForm={editForm}
        editSettings={editSettings}
        saving={saving}
        onClose={() => setEditQuarter(null)}
        onFormChange={setEditForm}
        onSettingsChange={setEditSettings}
        onSave={handleUpdate}
      />

      <StatusTransitionDialog
        transition={statusTransition}
        saving={saving}
        onClose={() => setStatusTransition(null)}
        onConfirm={handleStatusTransition}
      />

      <AdminManagementDialog
        adminQuarter={adminQuarter}
        quarterAdmins={quarterAdmins}
        loadingAdmins={loadingAdmins}
        adminSearch={adminSearch}
        adminSearchResults={adminSearchResults}
        onClose={() => setAdminQuarter(null)}
        onSearchChange={searchUsers}
        onClearSearch={() => { setAdminSearch(""); setAdminSearchResults([]); }}
        onAssignAdmin={assignAdmin}
        onRemoveAdmin={removeAdmin}
      />
    </>
  );
}
