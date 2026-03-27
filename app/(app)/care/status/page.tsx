"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  Video,
  MessageCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Phone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { IllustrationRenderer } from "@/components/illustrations/IllustrationRenderer";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { haptic } from "@/lib/haptics";

interface ConnectedResident {
  id: string;
  display_name: string;
  avatar_url: string | null;
  lastHeartbeat: Date | null;
  checkinStatus: "good" | "okay" | "bad" | null;
  checkinTime: Date | null;
}

type EscalationLevel = "normal" | "reminder" | "alert" | "lotse" | "emergency";

function getEscalationLevel(lastHeartbeat: Date | null): { level: EscalationLevel; label: string; color: string; bg: string } {
  if (!lastHeartbeat) {
    return { level: "alert", label: "Kein Signal", color: "text-alert-amber", bg: "bg-alert-amber/10" };
  }

  const hoursAgo = (Date.now() - lastHeartbeat.getTime()) / (1000 * 60 * 60);

  if (hoursAgo < 4) return { level: "normal", label: "Aktiv", color: "text-quartier-green", bg: "bg-quartier-green/10" };
  if (hoursAgo < 8) return { level: "reminder", label: "Erinnerung gesendet", color: "text-info-blue", bg: "bg-info-blue/10" };
  if (hoursAgo < 12) return { level: "alert", label: "Aufmerksamkeit", color: "text-alert-amber", bg: "bg-alert-amber/10" };
  if (hoursAgo < 24) return { level: "lotse", label: "Lotse informiert", color: "text-orange-500", bg: "bg-orange-500/10" };
  return { level: "emergency", label: "Notfall", color: "text-emergency-red", bg: "bg-emergency-red/10" };
}

function formatLastSeen(date: Date | null): string {
  if (!date) return "Kein Signal";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Gerade eben";
  if (minutes < 60) return `Vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `Vor ${days} Tag${days > 1 ? "en" : ""}`;
}

const CHECKIN_LABELS: Record<string, { label: string; color: string }> = {
  good: { label: "Gut", color: "text-quartier-green" },
  okay: { label: "Geht so", color: "text-alert-amber" },
  bad: { label: "Nicht gut", color: "text-emergency-red" },
};

export default function CareStatusPage() {
  const { user } = useAuth();
  const [residents, setResidents] = useState<ConnectedResident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    async function loadResidents() {
      try {
        const supabase = createClient();

        // Verbundene Bewohner laden (nur aktive, nicht widerrufene Links)
        const { data: links } = await supabase
          .from("caregiver_links")
          .select("resident_id")
          .eq("caregiver_id", user!.id)
          .is("revoked_at", null);

        if (!links || links.length === 0) {
          setLoading(false);
          return;
        }

        const residentIds = links.map((l: { resident_id: string }) => l.resident_id);

        // Profile laden
        const { data: profiles } = await supabase
          .from("users")
          .select("id, display_name, avatar_url")
          .in("id", residentIds);

        // Heartbeats laden (letzter pro Bewohner)
        const residents: ConnectedResident[] = [];

        for (const profile of (profiles || [])) {
          const { data: heartbeat } = await supabase
            .from("heartbeats")
            .select("created_at")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(1);

          // Heutigen Check-in laden
          const today = new Date().toISOString().split("T")[0];
          const { data: checkin } = await supabase
            .from("checkins")
            .select("status, created_at")
            .eq("user_id", profile.id)
            .gte("created_at", `${today}T00:00:00`)
            .order("created_at", { ascending: false })
            .limit(1);

          residents.push({
            id: profile.id,
            display_name: profile.display_name || "Bewohner",
            avatar_url: profile.avatar_url,
            lastHeartbeat: heartbeat?.[0] ? new Date(heartbeat[0].created_at) : null,
            checkinStatus: checkin?.[0]?.status || null,
            checkinTime: checkin?.[0] ? new Date(checkin[0].created_at) : null,
          });
        }

        setResidents(residents);
      } catch (err) {
        console.error("[CareStatus] Fehler:", err);
      } finally {
        setLoading(false);
      }
    }

    loadResidents();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4" data-testid="care-status-loading">
        <PageHeader title="Status" subtitle="Heartbeat Ihrer Angehoerigen" backHref="/dashboard" />
        <div className="h-32 rounded-2xl bg-muted animate-shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4" data-testid="care-status-page">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-quartier-green/10 via-quartier-green/5 to-transparent shadow-hero">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
          <IllustrationRenderer name="ill-07-herz-haende" width="100%" height="100%" />
        </div>
        <div className="relative p-5">
          <h1 className="text-2xl font-bold text-anthrazit">Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Heartbeat und Check-in Ihrer Angehoerigen
          </p>
        </div>
      </div>

      {/* Datenschutz-Hinweis */}
      <div className="flex items-start gap-2 rounded-lg bg-info-blue/5 p-3" data-testid="privacy-notice">
        <ShieldCheck className="h-4 w-4 text-info-blue mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Sie sehen nur den Status und Zeitpunkt der letzten Aktivitaet — keine Inhalte, Standorte oder Nachrichten.
        </p>
      </div>

      {residents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <Heart className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground text-center">
              Keine verbundenen Angehoerigen. Ein Bewohner kann Sie als Angehoerigen einladen.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {residents.map((resident) => {
            const escalation = getEscalationLevel(resident.lastHeartbeat);
            const checkinInfo = resident.checkinStatus ? CHECKIN_LABELS[resident.checkinStatus] : null;

            return (
              <Card key={resident.id} data-testid={`resident-${resident.id}`}>
                <CardContent className="p-4 space-y-3">
                  {/* Header: Name + Eskalations-Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {resident.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resident.avatar_url}
                          alt=""
                          className="h-12 w-12 rounded-full object-cover border-2 border-quartier-green/20"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-anthrazit text-white font-bold text-lg flex items-center justify-center">
                          {resident.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-base font-semibold text-anthrazit">
                          {resident.display_name}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Activity className={`h-3 w-3 ${escalation.color}`} />
                          <span className={`text-xs font-medium ${escalation.color}`}>
                            {escalation.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${escalation.bg} ${escalation.color}`}>
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatLastSeen(resident.lastHeartbeat)}
                    </span>
                  </div>

                  {/* Check-in Status (nur Status, kein Inhalt!) */}
                  {checkinInfo && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3" data-testid={`checkin-status-${resident.id}`}>
                      <Heart className="h-4 w-4 text-quartier-green" />
                      <span className="text-sm text-anthrazit">
                        Heutiger Check-in:{" "}
                        <span className={`font-medium ${checkinInfo.color}`}>
                          {checkinInfo.label}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Eskalations-Timeline (bei erhoehtem Level) */}
                  {escalation.level !== "normal" && (
                    <div className="flex items-start gap-2 rounded-lg bg-alert-amber/5 p-3" data-testid={`escalation-${resident.id}`}>
                      <AlertTriangle className="h-4 w-4 text-alert-amber mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-muted-foreground">
                        {escalation.level === "reminder" && "Der Bewohner wurde an eine Interaktion erinnert."}
                        {escalation.level === "alert" && "Sie werden benachrichtigt, weil der Bewohner laengere Zeit nicht aktiv war."}
                        {escalation.level === "lotse" && "Der Quartier-Lotse wurde informiert."}
                        {escalation.level === "emergency" && "Bitte ueberpruefen Sie den Status. Bei Bedarf rufen Sie 112 an."}
                      </div>
                    </div>
                  )}

                  {/* Aktionen */}
                  <div className="flex gap-2">
                    <Link
                      href={`/video-call/${resident.id}`}
                      onClick={() => haptic("medium")}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-quartier-green text-white font-medium text-sm transition-all active:scale-95"
                      style={{ minHeight: "44px", touchAction: "manipulation" }}
                      data-testid={`video-call-${resident.id}`}
                    >
                      <Video className="h-4 w-4" />
                      Video-Anruf
                    </Link>
                    <Link
                      href={`/messages/${resident.id}`}
                      onClick={() => haptic("light")}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-anthrazit font-medium text-sm transition-all active:scale-95"
                      style={{ minHeight: "44px", touchAction: "manipulation" }}
                      data-testid={`chat-${resident.id}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Nachricht
                    </Link>
                    <Link
                      href={`tel:`}
                      className="flex items-center justify-center rounded-xl border border-gray-200 text-anthrazit transition-all active:scale-95 px-3"
                      style={{ minHeight: "44px", touchAction: "manipulation" }}
                    >
                      <Phone className="h-4 w-4" />
                    </Link>
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
