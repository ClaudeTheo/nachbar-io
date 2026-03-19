// app/(app)/org/announcements/page.tsx
// Nachbar.io — Verwaltung kommunaler Bekanntmachungen (Org-Admin)
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ANNOUNCEMENT_CATEGORIES,
} from "@/lib/municipal";
import type { MunicipalAnnouncement, AnnouncementCategory } from "@/lib/municipal";
import { Pin, PinOff, Pencil, Trash2, Plus, X, ExternalLink } from "lucide-react";

// Formular-Zustand fuer Erstellen/Bearbeiten
interface AnnouncementForm {
  title: string;
  body: string;
  category: AnnouncementCategory;
  source_url: string;
  pinned: boolean;
  published_at: string;
  expires_at: string;
}

const EMPTY_FORM: AnnouncementForm = {
  title: "",
  body: "",
  category: "sonstiges",
  source_url: "",
  pinned: false,
  published_at: new Date().toISOString().slice(0, 16),
  expires_at: "",
};

// Deutsches Datumsformat
function formatDateDE(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrgAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<MunicipalAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<AnnouncementCategory | "all">("all");

  // Formular-State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Nutzer- und Quartier-Daten
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [assignedQuarters, setAssignedQuarters] = useState<string[]>([]);

  // Initiale Daten laden: Nutzer, Org-Zuordnung
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;
      setUserId(user.id);

      supabase
        .from("org_members")
        .select("org_id, assigned_quarters")
        .eq("user_id", user.id)
        .limit(1)
        .single()
        .then(({ data: membership }) => {
          if (cancelled || !membership) return;
          setOrgId(membership.org_id);
          setAssignedQuarters(membership.assigned_quarters ?? []);
        });
    });

    return () => { cancelled = true; };
  }, []);

  // Bekanntmachungen fuer zugewiesene Quartiere laden
  useEffect(() => {
    if (assignedQuarters.length === 0) return;
    let cancelled = false;

    const supabase = createClient();
    supabase
      .from("municipal_announcements")
      .select("*")
      .in("quarter_id", assignedQuarters)
      .order("published_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("Bekanntmachungen konnten nicht geladen werden.");
        } else {
          setAnnouncements(data ?? []);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [assignedQuarters]);

  // Bekanntmachungen nach Aenderungen neu laden
  const refreshAnnouncements = useCallback(async () => {
    if (assignedQuarters.length === 0) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("municipal_announcements")
      .select("*")
      .in("quarter_id", assignedQuarters)
      .order("published_at", { ascending: false });

    if (error) {
      toast.error("Aktualisierung fehlgeschlagen.");
    } else {
      setAnnouncements(data ?? []);
    }
  }, [assignedQuarters]);

  // Audit-Log schreiben
  async function writeAuditLog(action: string, announcementId: string, title: string) {
    if (!orgId || !userId) return;
    const supabase = createClient();
    await supabase.from("org_audit_log").insert({
      org_id: orgId,
      user_id: userId,
      action,
      details: { announcement_id: announcementId, title },
    });
  }

  // Formular oeffnen (Erstellen)
  function handleCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      published_at: new Date().toISOString().slice(0, 16),
    });
    setShowForm(true);
  }

  // Formular oeffnen (Bearbeiten)
  function handleEdit(a: MunicipalAnnouncement) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      body: a.body ?? "",
      category: a.category,
      source_url: a.source_url ?? "",
      pinned: a.pinned,
      published_at: a.published_at ? a.published_at.slice(0, 16) : "",
      expires_at: a.expires_at ? a.expires_at.slice(0, 16) : "",
    });
    setShowForm(true);
  }

  // Speichern (Erstellen oder Aktualisieren)
  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Bitte geben Sie einen Titel ein.");
      return;
    }
    if (!form.body.trim()) {
      toast.error("Bitte geben Sie einen Text ein.");
      return;
    }
    if (assignedQuarters.length === 0) {
      toast.error("Kein Quartier zugewiesen.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      source_url: form.source_url.trim() || null,
      pinned: form.pinned,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : new Date().toISOString(),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };

    if (editingId) {
      // Aktualisieren
      const { error } = await supabase
        .from("municipal_announcements")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast.error("Fehler beim Speichern.");
      } else {
        toast.success("Bekanntmachung aktualisiert.");
        await writeAuditLog("announcement_updated", editingId, payload.title);
      }
    } else {
      // Erstellen
      const { data, error } = await supabase
        .from("municipal_announcements")
        .insert({
          ...payload,
          quarter_id: assignedQuarters[0],
          author_id: userId!,
        })
        .select("id")
        .single();

      if (error) {
        toast.error("Fehler beim Erstellen.");
      } else if (data) {
        toast.success("Bekanntmachung erstellt.");
        await writeAuditLog("announcement_created", data.id, payload.title);
      }
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    await refreshAnnouncements();
  }

  // Loeschen mit Bestaetigung
  async function handleDelete(a: MunicipalAnnouncement) {
    if (!window.confirm(`Bekanntmachung "${a.title}" wirklich löschen?`)) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("municipal_announcements")
      .delete()
      .eq("id", a.id);

    if (error) {
      toast.error("Fehler beim Löschen.");
    } else {
      toast.success("Bekanntmachung gelöscht.");
      await writeAuditLog("announcement_deleted", a.id, a.title);
      await refreshAnnouncements();
    }
  }

  // Pin umschalten
  async function handleTogglePin(a: MunicipalAnnouncement) {
    const supabase = createClient();
    const { error } = await supabase
      .from("municipal_announcements")
      .update({ pinned: !a.pinned })
      .eq("id", a.id);

    if (error) {
      toast.error("Fehler beim Aktualisieren.");
    } else {
      toast.success(a.pinned ? "Nicht mehr angepinnt." : "Angepinnt.");
      await refreshAnnouncements();
    }
  }

  // Kategorie-Badge Hilfsfunktion
  function getCategoryConfig(catId: AnnouncementCategory) {
    return ANNOUNCEMENT_CATEGORIES.find((c) => c.id === catId) ?? ANNOUNCEMENT_CATEGORIES[5];
  }

  // Gefilterte Bekanntmachungen
  const filtered =
    filterCategory === "all"
      ? announcements
      : announcements.filter((a) => a.category === filterCategory);

  // Ladezustand
  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#4CAF87] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Kopfzeile */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#2D3142]">Bekanntmachungen</h1>
        <button
          onClick={handleCreate}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#4CAF87] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3d9a73]"
        >
          <Plus className="h-4 w-4" />
          Neue Bekanntmachung
        </button>
      </div>

      {/* Kategorie-Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            filterCategory === "all"
              ? "bg-[#2D3142] text-white"
              : "bg-gray-100 text-[#2D3142] hover:bg-gray-200"
          }`}
        >
          Alle
        </button>
        {ANNOUNCEMENT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filterCategory === cat.id
                ? "bg-[#2D3142] text-white"
                : "bg-gray-100 text-[#2D3142] hover:bg-gray-200"
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Inline-Formular */}
      {showForm && (
        <div className="rounded-xl bg-white p-4 shadow-soft border animate-fade-in-up">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#2D3142]">
              {editingId ? "Bekanntmachung bearbeiten" : "Neue Bekanntmachung"}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="rounded-full p-1 hover:bg-gray-100"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Titel */}
            <div>
              <label htmlFor="ann-title" className="mb-1 block text-xs font-medium text-[#2D3142]">
                Titel *
              </label>
              <input
                id="ann-title"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="z.B. Straßensperrung Hauptstraße"
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#2D3142] placeholder:text-gray-400 focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
                maxLength={200}
              />
            </div>

            {/* Text mit Zeichenzaehler */}
            <div>
              <label htmlFor="ann-body" className="mb-1 block text-xs font-medium text-[#2D3142]">
                Text * <span className="text-gray-400">({form.body.length}/500)</span>
              </label>
              <textarea
                id="ann-body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value.slice(0, 500) })}
                placeholder="Beschreibung der Bekanntmachung..."
                rows={4}
                maxLength={500}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#2D3142] placeholder:text-gray-400 focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
              />
            </div>

            {/* Kategorie */}
            <div>
              <label htmlFor="ann-category" className="mb-1 block text-xs font-medium text-[#2D3142]">
                Kategorie
              </label>
              <select
                id="ann-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as AnnouncementCategory })}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#2D3142] focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
              >
                {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quell-URL */}
            <div>
              <label htmlFor="ann-url" className="mb-1 block text-xs font-medium text-[#2D3142]">
                Quell-URL (optional)
              </label>
              <input
                id="ann-url"
                type="url"
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#2D3142] placeholder:text-gray-400 focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
              />
            </div>

            {/* Datum-Zeile */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ann-published" className="mb-1 block text-xs font-medium text-[#2D3142]">
                  Veröffentlicht am
                </label>
                <input
                  id="ann-published"
                  type="datetime-local"
                  value={form.published_at}
                  onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#2D3142] focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
                />
              </div>
              <div>
                <label htmlFor="ann-expires" className="mb-1 block text-xs font-medium text-[#2D3142]">
                  Ablaufdatum (optional)
                </label>
                <input
                  id="ann-expires"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#2D3142] focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
                />
              </div>
            </div>

            {/* Angepinnt */}
            <label className="flex min-h-[44px] items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#4CAF87] focus:ring-[#4CAF87]"
              />
              <span className="text-sm text-[#2D3142]">Angepinnt (wird oben angezeigt)</span>
            </label>

            {/* Aktionen */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#4CAF87] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3d9a73] disabled:opacity-50"
              >
                {saving ? "Speichert..." : "Speichern"}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="inline-flex min-h-[44px] items-center rounded-lg border px-4 py-2 text-sm font-medium text-[#2D3142] transition-colors hover:bg-gray-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-soft">
          <p className="text-sm text-gray-500">
            {filterCategory === "all"
              ? "Noch keine Bekanntmachungen vorhanden."
              : "Keine Bekanntmachungen in dieser Kategorie."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const cat = getCategoryConfig(a.category);
            const isExpired = a.expires_at && new Date(a.expires_at) < new Date();

            return (
              <div
                key={a.id}
                className={`rounded-xl bg-white p-4 shadow-soft animate-fade-in-up ${
                  isExpired ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      {a.pinned && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          <Pin className="h-3 w-3" /> Angepinnt
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-[#2D3142]">
                        {cat.icon} {cat.label}
                      </span>
                      {isExpired && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                          Abgelaufen
                        </span>
                      )}
                    </div>

                    {/* Titel */}
                    <h3 className="text-sm font-semibold text-[#2D3142]">{a.title}</h3>

                    {/* Text (2 Zeilen Vorschau) */}
                    {a.body && (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-600">{a.body}</p>
                    )}

                    {/* Metadaten */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
                      <span>{formatDateDE(a.published_at)}</span>
                      {a.expires_at && (
                        <span>Ablauf: {formatDateDE(a.expires_at)}</span>
                      )}
                      {a.source_url && (
                        <a
                          href={a.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[#4CAF87] hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Quelle
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Aktionsleiste */}
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() => handleTogglePin(a)}
                      className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#2D3142]"
                      title={a.pinned ? "Nicht mehr anpinnen" : "Anpinnen"}
                      aria-label={a.pinned ? "Nicht mehr anpinnen" : "Anpinnen"}
                    >
                      {a.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(a)}
                      className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#2D3142]"
                      title="Bearbeiten"
                      aria-label="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
                      className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Löschen"
                      aria-label="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
