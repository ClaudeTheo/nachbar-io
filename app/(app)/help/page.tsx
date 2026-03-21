"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, HandHelping, Search, ChevronRight, Filter, Repeat, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import { HELP_CATEGORIES, HELP_SUBCATEGORIES } from "@/lib/constants";
import type { HelpRequest } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

export default function HelpPage() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const { currentQuarter } = useQuarter();

  useEffect(() => {
    if (!currentQuarter) return;
    async function load() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("help_requests")
          .select("*, user:users(display_name, avatar_url)")
          .eq("quarter_id", currentQuarter!.id)
          .eq("status", "active")
          .gte("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false });
        if (error) {
          toast.error("Hilfe-Börse konnte nicht geladen werden.");
          return;
        }
        if (data) setRequests(data as unknown as HelpRequest[]);
      } catch {
        toast.error("Netzwerkfehler beim Laden der Hilfe-Börse.");
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuarter?.id]);

  const filteredRequests = filterCategory
    ? requests.filter((r) => r.category === filterCategory)
    : requests;
  const needs = filteredRequests.filter((r) => r.type === "need");
  const offers = filteredRequests.filter((r) => r.type === "offer");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-anthrazit">Hilfe-Börse</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`rounded-lg p-2 transition-colors ${
              filterCategory ? "bg-quartier-green/10 text-quartier-green" : "hover:bg-muted"
            }`}
            aria-label="Filter"
            data-testid="help-filter-button"
          >
            <Filter className="h-4 w-4" />
          </button>
          <Link
            href="/help/new"
            className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-semibold text-white hover:bg-quartier-green-dark"
            data-testid="create-help-button"
          >
            <Plus className="h-4 w-4" />
            Neuer Eintrag
          </Link>
        </div>
      </div>

      {/* Kategorie-Filter */}
      {showFilter && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !filterCategory
                ? "bg-quartier-green text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Alle
          </button>
          {HELP_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterCategory === cat.id
                  ? "bg-quartier-green text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="needs">
          <TabsList className="w-full">
            <TabsTrigger value="needs" className="flex-1">
              <Search className="mr-1 h-4 w-4" />
              Sucht Hilfe ({needs.length})
            </TabsTrigger>
            <TabsTrigger value="offers" className="flex-1">
              <HandHelping className="mr-1 h-4 w-4" />
              Bietet Hilfe ({offers.length})
            </TabsTrigger>
            <TabsTrigger value="lending" className="flex-1">
              <Repeat className="mr-1 h-4 w-4" />
              Leihen
            </TabsTrigger>
            <TabsTrigger value="mitessen" className="flex-1" data-testid="tab-mitessen">
              <UtensilsCrossed className="mr-1 h-4 w-4" />
              Mitessen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="needs" className="mt-4 space-y-3">
            {needs.length === 0 ? (
              <EmptyState
                text={filterCategory ? "Keine Gesuche in dieser Kategorie." : "Keine aktuellen Hilfegesuche."}
                subtext="Brauchen Sie Hilfe? Erstellen Sie ein neues Gesuch!"
              />
            ) : (
              needs.map((req) => <HelpCard key={req.id} request={req} />)
            )}
          </TabsContent>

          <TabsContent value="offers" className="mt-4 space-y-3">
            {offers.length === 0 ? (
              <EmptyState
                text={filterCategory ? "Keine Angebote in dieser Kategorie." : "Keine aktuellen Hilfsangebote."}
                subtext="Können Sie helfen? Bieten Sie Ihre Hilfe an!"
              />
            ) : (
              offers.map((req) => <HelpCard key={req.id} request={req} />)
            )}
          </TabsContent>

          <TabsContent value="lending" className="mt-4">
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-3">Dinge leihen und verleihen im Quartier</p>
              <Link
                href="/leihboerse"
                className="inline-flex items-center gap-2 rounded-lg bg-quartier-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-quartier-green-dark"
              >
                <Repeat className="h-4 w-4" />
                Zur Leihbörse
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="mitessen" className="mt-4">
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-3">Portionen teilen oder zum Essen einladen</p>
              <Link
                href="/mitessen"
                className="inline-flex items-center gap-2 rounded-lg bg-quartier-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-quartier-green-dark"
                data-testid="mitessen-link"
              >
                <UtensilsCrossed className="h-4 w-4" />
                Zu den Mitess-Plätzen
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function HelpCard({ request }: { request: HelpRequest }) {
  const router = useRouter();
  const cat = HELP_CATEGORIES.find((c) => c.id === request.category);
  const subLabel = request.subcategory
    ? HELP_SUBCATEGORIES[request.category]?.find((s) => s.id === request.subcategory)?.label
    : null;
  const timeAgo = formatDistanceToNow(new Date(request.created_at), {
    addSuffix: true,
    locale: de,
  });

  return (
    <button
      onClick={() => router.push(`/help/${request.id}`)}
      className="card-interactive w-full rounded-lg border border-border bg-white p-4 shadow-soft text-left"
      data-testid="help-card"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{cat?.icon ?? "❓"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-anthrazit truncate">{request.title}</h3>
            <Badge variant={request.type === "need" ? "default" : "secondary"} className="shrink-0">
              {request.type === "need" ? "Gesucht" : "Angebot"}
            </Badge>
          </div>
          {subLabel && (
            <span className="mt-1 inline-block rounded-full bg-quartier-green/10 px-2 py-0.5 text-xs font-medium text-quartier-green">
              {subLabel}
            </span>
          )}
          {request.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {request.description}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {request.user?.display_name ?? "Nachbar"} · {timeAgo}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
      </div>
    </button>
  );
}

function EmptyState({ text, subtext }: { text: string; subtext?: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">{text}</p>
      {subtext && (
        <p className="mt-1 text-sm text-muted-foreground/70">{subtext}</p>
      )}
    </div>
  );
}
