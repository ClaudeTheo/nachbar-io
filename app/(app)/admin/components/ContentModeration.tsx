"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, HandHelping, ShoppingBag, MapPin, X, ChevronDown, ChevronUp, Save, Edit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type ContentType = "alerts" | "help_requests" | "marketplace_items" | "lost_found_items";

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  type: ContentType;
  user?: { display_name: string } | null;
  category?: string;
  extra?: string;
}

const CONTENT_TYPES: { id: ContentType; label: string; icon: React.ReactNode }[] = [
  { id: "alerts", label: "Meldungen", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "help_requests", label: "Hilfe-Boerse", icon: <HandHelping className="h-4 w-4" /> },
  { id: "marketplace_items", label: "Marktplatz", icon: <ShoppingBag className="h-4 w-4" /> },
  { id: "lost_found_items", label: "Fundbuero", icon: <MapPin className="h-4 w-4" /> },
];

// Verfuegbare Status-Optionen pro Content-Typ
const STATUS_OPTIONS: Record<ContentType, { value: string; label: string }[]> = {
  alerts: [
    { value: "open", label: "Offen" },
    { value: "help_coming", label: "Hilfe kommt" },
    { value: "resolved", label: "Erledigt" },
  ],
  help_requests: [
    { value: "active", label: "Aktiv" },
    { value: "matched", label: "Vermittelt" },
    { value: "closed", label: "Geschlossen" },
  ],
  marketplace_items: [
    { value: "active", label: "Aktiv" },
    { value: "reserved", label: "Reserviert" },
    { value: "done", label: "Abgeschlossen" },
    { value: "deleted", label: "Geloescht" },
  ],
  lost_found_items: [
    { value: "open", label: "Offen" },
    { value: "resolved", label: "Erledigt" },
  ],
};

export function ContentModeration() {
  const [activeType, setActiveType] = useState<ContentType>("alerts");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContent(activeType);
    setExpandedId(null);
    setEditingId(null);
  }, [activeType]);

  async function loadContent(type: ContentType) {
    setLoading(true);
    const supabase = createClient();

    let query;
    switch (type) {
      case "alerts":
        query = supabase
          .from("alerts")
          .select("id, title, description, status, category, created_at, user:users(display_name)")
          .order("created_at", { ascending: false })
          .limit(100);
        break;
      case "help_requests":
        query = supabase
          .from("help_requests")
          .select("id, title, description, status, category, type, created_at, user:users(display_name)")
          .order("created_at", { ascending: false })
          .limit(100);
        break;
      case "marketplace_items":
        query = supabase
          .from("marketplace_items")
          .select("id, title, description, status, category, type, price, created_at, user:users(display_name)")
          .order("created_at", { ascending: false })
          .limit(100);
        break;
      case "lost_found_items":
        query = supabase
          .from("lost_found_items")
          .select("id, title, description, status, category, type, location_hint, created_at, user:users(display_name)")
          .order("created_at", { ascending: false })
          .limit(100);
        break;
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Fehler beim Laden der Inhalte");
      setLoading(false);
      return;
    }

    const normalized: ContentItem[] = (data ?? []).map((item: Record<string, unknown>) => ({
      id: item.id as string,
      title: item.title as string,
      description: item.description as string | null,
      status: item.status as string,
      created_at: item.created_at as string,
      type,
      user: item.user as { display_name: string } | null,
      category: item.category as string | undefined,
      extra: type === "marketplace_items" && item.price
        ? `${item.price} EUR`
        : type === "help_requests"
        ? (item.type === "need" ? "Suche Hilfe" : "Biete Hilfe")
        : type === "lost_found_items"
        ? (item.type === "lost" ? "Verloren" : "Gefunden")
        : undefined,
    }));

    setItems(normalized);
    setLoading(false);
  }

  // Status aendern
  async function changeStatus(id: string, type: ContentType, newStatus: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from(type)
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Status-Aenderung fehlgeschlagen");
    } else {
      toast.success("Status geaendert");
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: newStatus } : i));
    }
  }

  // Inhalt bearbeiten starten
  function startEdit(item: ContentItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description ?? "");
    setExpandedId(item.id);
  }

  // Bearbeitung speichern
  async function saveEdit(id: string, type: ContentType) {
    if (!editTitle.trim()) {
      toast.error("Titel darf nicht leer sein");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from(type)
      .update({ title: editTitle.trim(), description: editDescription.trim() || null })
      .eq("id", id);

    if (error) {
      toast.error("Speichern fehlgeschlagen");
    } else {
      toast.success("Inhalt aktualisiert");
      setItems((prev) => prev.map((i) =>
        i.id === id ? { ...i, title: editTitle.trim(), description: editDescription.trim() || null } : i
      ));
      setEditingId(null);
    }
    setSaving(false);
  }

  function statusColor(status: string) {
    switch (status) {
      case "open":
      case "active":
        return "bg-alert-amber/10 text-alert-amber border-alert-amber/30";
      case "help_coming":
      case "matched":
      case "reserved":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "resolved":
      case "closed":
      case "done":
        return "bg-green-50 text-green-700 border-green-200";
      case "deleted":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "";
    }
  }

  function statusLabel(status: string) {
    const labels: Record<string, string> = {
      open: "Offen", active: "Aktiv", help_coming: "Hilfe kommt",
      matched: "Vermittelt", reserved: "Reserviert", resolved: "Erledigt",
      closed: "Geschlossen", done: "Abgeschlossen", deleted: "Geloescht",
    };
    return labels[status] ?? status;
  }

  const activeItems = items.filter((i) => !["resolved", "closed", "done", "deleted"].includes(i.status));
  const archivedItems = items.filter((i) => ["resolved", "closed", "done", "deleted"].includes(i.status));

  return (
    <div className="space-y-4">
      {/* Typ-Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CONTENT_TYPES.map((ct) => (
          <Button
            key={ct.id}
            size="sm"
            variant={activeType === ct.id ? "default" : "outline"}
            className="text-xs h-8 shrink-0"
            onClick={() => setActiveType(ct.id)}
          >
            {ct.icon}
            <span className="ml-1">{ct.label}</span>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Laden...</div>
      ) : (
        <>
          {activeItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Aktiv ({activeItems.length})
              </p>
              {activeItems.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  statusColor={statusColor}
                  statusLabel={statusLabel}
                  expanded={expandedId === item.id}
                  editing={editingId === item.id}
                  editTitle={editTitle}
                  editDescription={editDescription}
                  onToggleExpand={() => {
                    setExpandedId(expandedId === item.id ? null : item.id);
                    if (editingId === item.id) setEditingId(null);
                  }}
                  onStartEdit={() => startEdit(item)}
                  onCancelEdit={() => setEditingId(null)}
                  onEditTitle={setEditTitle}
                  onEditDescription={setEditDescription}
                  onSaveEdit={() => saveEdit(item.id, item.type)}
                  saving={saving}
                  onChangeStatus={(s) => changeStatus(item.id, item.type, s)}
                  statusOptions={STATUS_OPTIONS[item.type]}
                />
              ))}
            </div>
          )}

          {archivedItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground mt-4">
                Archiv ({archivedItems.length})
              </p>
              {archivedItems.slice(0, 10).map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  statusColor={statusColor}
                  statusLabel={statusLabel}
                  expanded={expandedId === item.id}
                  onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onChangeStatus={(s) => changeStatus(item.id, item.type, s)}
                  statusOptions={STATUS_OPTIONS[item.type]}
                  archived
                />
              ))}
              {archivedItems.length > 10 && (
                <p className="text-xs text-center text-muted-foreground">
                  ... und {archivedItems.length - 10} weitere
                </p>
              )}
            </div>
          )}

          {items.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Keine Inhalte in dieser Kategorie.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// Einzelne Inhalts-Karte mit Detail-View und Edit
function ContentCard({
  item,
  statusColor,
  statusLabel,
  expanded,
  editing,
  editTitle,
  editDescription,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onEditTitle,
  onEditDescription,
  onSaveEdit,
  saving,
  onChangeStatus,
  statusOptions,
  archived,
}: {
  item: ContentItem;
  statusColor: (s: string) => string;
  statusLabel: (s: string) => string;
  expanded?: boolean;
  editing?: boolean;
  editTitle?: string;
  editDescription?: string;
  onToggleExpand?: () => void;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onEditTitle?: (v: string) => void;
  onEditDescription?: (v: string) => void;
  onSaveEdit?: () => void;
  saving?: boolean;
  onChangeStatus?: (status: string) => void;
  statusOptions?: { value: string; label: string }[];
  archived?: boolean;
}) {
  return (
    <Card className={`${archived ? "opacity-60" : ""}`}>
      {/* Header — klickbar zum Aufklappen */}
      <button
        onClick={onToggleExpand}
        className="flex w-full items-start justify-between gap-2 p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-anthrazit text-sm truncate">{item.title}</p>
            {item.extra && (
              <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                {item.extra}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.user?.display_name ?? "Unbekannt"} · {new Date(item.created_at).toLocaleDateString("de-DE")}
            {item.category && ` · ${item.category}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={`text-[10px] h-5 ${statusColor(item.status)}`}>
            {statusLabel(item.status)}
          </Badge>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Detail-View */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-3">
          {editing ? (
            // Edit-Modus
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Titel</label>
                <Input
                  value={editTitle}
                  onChange={(e) => onEditTitle?.(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Beschreibung</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => onEditDescription?.(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={onSaveEdit} disabled={saving} className="bg-quartier-green hover:bg-quartier-green-dark">
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saving ? "Speichern..." : "Speichern"}
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit}>
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            // Ansichts-Modus
            <>
              {item.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{item.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Keine Beschreibung</p>
              )}

              <div className="flex flex-wrap gap-2">
                {/* Edit-Button */}
                {!archived && onStartEdit && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={onStartEdit}>
                    <Edit className="h-3 w-3 mr-1" />
                    Bearbeiten
                  </Button>
                )}

                {/* Status-Aenderung */}
                {statusOptions && onChangeStatus && (
                  <div className="flex gap-1">
                    {statusOptions
                      .filter((s) => s.value !== item.status)
                      .map((s) => (
                        <Button
                          key={s.value}
                          size="sm"
                          variant="outline"
                          className={`text-xs h-7 ${s.value === "deleted" ? "text-red-500 hover:bg-red-50" : ""}`}
                          onClick={(e) => { e.stopPropagation(); onChangeStatus(s.value); }}
                        >
                          {s.label}
                        </Button>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
