"use client";

import { useState, useEffect } from "react";
import {
  HandHeart,
  MapPin,
  Clock,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

type Urgency = "normal" | "urgent" | "emergency";

interface HilfeRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  requester_name: string;
  urgency: Urgency;
  created_at: string;
  distance_km: number | null;
}

const URGENCY_CONFIG: Record<Urgency, { label: string; color: string; bg: string }> = {
  normal: { label: "Normal", color: "text-info-blue", bg: "bg-info-blue/10" },
  urgent: { label: "Dringend", color: "text-alert-amber", bg: "bg-alert-amber/10" },
  emergency: { label: "Sehr dringend", color: "text-emergency-red", bg: "bg-emergency-red/10" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Gerade eben";
  if (minutes < 60) return `Vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `Vor ${days} Tag${days > 1 ? "en" : ""}`;
}

export default function HelferRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<HilfeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    async function loadRequests() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("help_requests")
          .select("id, title, description, category, created_at, requester:users!user_id(display_name)")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(30);

        if (data) {
          setRequests(
            data.map((d: Record<string, unknown>) => ({
              id: d.id as string,
              title: (d.title as string) || (d.category as string) || "Hilfe-Anfrage",
              description: (d.description as string) || "",
              category: (d.category as string) || "",
              requester_name: ((d.requester as Record<string, unknown>)?.display_name as string) || "Nachbar",
              urgency: "normal" as Urgency,
              created_at: d.created_at as string,
              distance_km: null,
            }))
          );
        }
      } catch (err) {
        console.error("[HelferRequests] Fehler:", err);
      } finally {
        setLoading(false);
      }
    }

    loadRequests();
  }, [user]);

  async function handleAccept(requestId: string) {
    if (!user?.id) return;
    setActionLoading(requestId);
    haptic("medium");

    try {
      const supabase = createClient();
      await supabase
        .from("help_requests")
        .update({ status: "in_progress" })
        .eq("id", requestId);

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success("Anfrage angenommen!");
    } catch (err) {
      console.error("[HelferRequests] Annehmen Fehler:", err);
      toast.error("Fehler beim Annehmen.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline(requestId: string) {
    haptic("light");
    // Lokal ausblenden (kein DB-Update, Anfrage bleibt für andere verfügbar)
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  if (loading) {
    return (
      <div className="space-y-4" data-testid="requests-loading">
        <PageHeader title="Hilfe-Anfragen" subtitle="Eingehende Anfragen" backHref="/hilfe" />
        <div className="h-24 rounded-2xl bg-muted animate-shimmer" />
        <div className="h-24 rounded-2xl bg-muted animate-shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="requests-page">
      <PageHeader
        title="Hilfe-Anfragen"
        subtitle={`${requests.length} offene Anfragen im Quartier`}
        backHref="/hilfe"
      />

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <HandHeart className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground text-center">
              Keine offenen Anfragen im Quartier. Schauen Sie später nochmal vorbei.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 animate-stagger">
          {requests.map((req) => {
            const urgencyConfig = URGENCY_CONFIG[req.urgency];
            const isLoading = actionLoading === req.id;
            return (
              <Card key={req.id} data-testid={`request-${req.id}`}>
                <CardContent className="p-4 space-y-3">
                  {/* Header: Titel + Dringlichkeit */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-anthrazit">
                        {req.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {req.requester_name}
                      </p>
                    </div>
                    {req.urgency !== "normal" && (
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${urgencyConfig.bg} ${urgencyConfig.color}`}>
                        <AlertTriangle className="h-3 w-3" />
                        {urgencyConfig.label}
                      </span>
                    )}
                  </div>

                  {/* Beschreibung */}
                  {req.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {req.description}
                    </p>
                  )}

                  {/* Meta: Zeit + Entfernung */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(req.created_at)}
                    </span>
                    {req.distance_km != null && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {req.distance_km.toFixed(1)} km
                      </span>
                    )}
                  </div>

                  {/* Aktionen */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={isLoading}
                      data-testid={`accept-${req.id}`}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-quartier-green text-white font-medium text-sm transition-all active:scale-95 disabled:opacity-50"
                      style={{ minHeight: "44px", touchAction: "manipulation" }}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Annehmen
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      disabled={isLoading}
                      data-testid={`decline-${req.id}`}
                      className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-muted-foreground font-medium text-sm transition-all active:scale-95 px-4"
                      style={{ minHeight: "44px", touchAction: "manipulation" }}
                    >
                      <X className="h-4 w-4" />
                    </button>
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
