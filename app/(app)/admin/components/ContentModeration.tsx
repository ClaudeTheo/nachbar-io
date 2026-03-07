"use client";

import { useState, useEffect } from "react";
import { Trash2, Eye, Filter, AlertTriangle, HandHelping, ShoppingBag, Search as SearchIcon, MapPin, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  extra?: string; // Zusatz-Info (z.B. Preis, Typ)
}

const CONTENT_TYPES: { id: ContentType; label: string; icon: React.ReactNode }[] = [
  { id: "alerts", label: "Meldungen", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "help_requests", label: "Hilfe-Boerse", icon: <HandHelping className="h-4 w-4" /> },
  { id: "marketplace_items", label: "Marktplatz", icon: <ShoppingBag className="h-4 w-4" /> },
  { id: "lost_found_items", label: "Fundbuero", icon: <MapPin className="h-4 w-4" /> },
];

export function ContentModeration() {
  const [activeType, setActiveType] = useState<ContentType>("alerts");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadContent(activeType);
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

    // Einheitliches Format
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

  // Inhalt loeschen / Status aendern
  async function deleteContent(id: string, type: ContentType) {
    setDeleting(id);
    const supabase = createClient();

    // Statt echtem Loeschen: Status auf "deleted" / "resolved" / "done" setzen
    const statusMap: Record<ContentType, string> = {
      alerts: "resolved",
      help_requests: "closed",
      marketplace_items: "deleted",
      lost_found_items: "resolved",
    };

    const { error } = await supabase
      .from(type)
      .update({ status: statusMap[type] })
      .eq("id", id);

    if (error) {
      toast.error("Fehler beim Entfernen");
    } else {
      toast.success("Inhalt entfernt");
      // Aus lokaler Liste entfernen
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
    setDeleting(null);
  }

  // Status-Badge Farbe
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

  // Status Label auf Deutsch
  function statusLabel(status: string) {
    const labels: Record<string, string> = {
      open: "Offen",
      active: "Aktiv",
      help_coming: "Hilfe kommt",
      matched: "Vermittelt",
      reserved: "Reserviert",
      resolved: "Erledigt",
      closed: "Geschlossen",
      done: "Abgeschlossen",
      deleted: "Geloescht",
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
          {/* Aktive Inhalte */}
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
                  onDelete={() => deleteContent(item.id, item.type)}
                  isDeleting={deleting === item.id}
                />
              ))}
            </div>
          )}

          {/* Archivierte Inhalte */}
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

// Einzelne Inhalts-Karte
function ContentCard({
  item,
  statusColor,
  statusLabel,
  onDelete,
  isDeleting,
  archived,
}: {
  item: ContentItem;
  statusColor: (s: string) => string;
  statusLabel: (s: string) => string;
  onDelete?: () => void;
  isDeleting?: boolean;
  archived?: boolean;
}) {
  return (
    <Card className={`p-3 ${archived ? "opacity-60" : ""} ${isDeleting ? "opacity-40" : ""}`}>
      <div className="flex items-start justify-between gap-2">
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
          {item.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={`text-[10px] h-5 ${statusColor(item.status)}`}>
            {statusLabel(item.status)}
          </Badge>
          {!archived && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
              onClick={onDelete}
              disabled={isDeleting}
              title="Inhalt entfernen"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
