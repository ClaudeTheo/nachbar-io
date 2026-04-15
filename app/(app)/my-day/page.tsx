"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  Pill,
  Calendar,
  Phone,
  AlertTriangle,
  HandHeart,
  Trash2,
  Clock,
  CheckCircle2,
  Smile,
  Meh,
  Frown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { IllustrationRenderer } from "@/components/illustrations/IllustrationRenderer";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { haptic } from "@/lib/haptics";

type CheckInStatus = "good" | "okay" | "bad" | null;

function getCheckinStorageKey(userId: string): string {
  const today = new Date().toISOString().split("T")[0];
  return `my-day-checkin:${userId}:${today}`;
}

// Tageszeitabhängige Begrüßung
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 10) return "Guten Morgen";
  if (hour < 14) return "Guten Mittag";
  if (hour < 18) return "Guten Nachmittag";
  return "Guten Abend";
}

// Datum formatieren (z.B. "Donnerstag, 27. März")
function formatDate(): string {
  return new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function MyDayPage() {
  const { user } = useAuth();
  const [checkinStatus, setCheckinStatus] = useState<CheckInStatus>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [todayEvents, setTodayEvents] = useState<Array<{ time: string; title: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    const supabase = createClient();

    async function loadDayData() {
      try {
        // Heartbeat laden
        const { data: heartbeat } = await supabase
          .from("heartbeats")
          .select("created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (heartbeat?.[0]) {
          const date = new Date(heartbeat[0].created_at);
          const diff = Date.now() - date.getTime();
          const minutes = Math.floor(diff / 60000);
          if (minutes < 1) setLastHeartbeat("Gerade eben");
          else if (minutes < 60) setLastHeartbeat(`Vor ${minutes} Min.`);
          else {
            const hours = Math.floor(minutes / 60);
            setLastHeartbeat(`Vor ${hours} Std.`);
          }
        }

        // Heutigen Check-in laden
        const today = new Date().toISOString().split("T")[0];
        const storedCheckin =
          typeof window !== "undefined"
            ? window.localStorage.getItem(getCheckinStorageKey(userId))
            : null;
        if (storedCheckin === "good" || storedCheckin === "okay" || storedCheckin === "bad") {
          setCheckinStatus(storedCheckin);
        }

        // Heutige Mülltermine laden
        const { data: waste } = await supabase
          .from("waste_collection_dates")
          .select("waste_type, collection_date")
          .eq("collection_date", today)
          .limit(5);

        const events: Array<{ time: string; title: string; type: string }> = [];
        if (waste) {
          waste.forEach((w: { waste_type: string }) => {
            events.push({
              time: "Früh",
              title: `${w.waste_type} Abholung`,
              type: "waste",
            });
          });
        }

        setTodayEvents(events);
      } catch (err) {
        console.error("[MyDay] Fehler beim Laden:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDayData();
  }, [user]);

  // Check-in absenden
  async function handleCheckin(status: CheckInStatus) {
    if (!user?.id || !status) return;
    haptic("medium");
    setCheckinStatus(status);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(getCheckinStorageKey(user.id), status);
    }
  }

  const checkinOptions = [
    { status: "good" as const, icon: Smile, label: "Gut", color: "text-quartier-green", bg: "bg-quartier-green/10", activeBg: "bg-quartier-green text-white" },
    { status: "okay" as const, icon: Meh, label: "Geht so", color: "text-alert-amber", bg: "bg-alert-amber/10", activeBg: "bg-alert-amber text-white" },
    { status: "bad" as const, icon: Frown, label: "Nicht gut", color: "text-emergency-red", bg: "bg-emergency-red/10", activeBg: "bg-emergency-red text-white" },
  ];

  const quickActions = [
    { href: "/hilfe", icon: HandHeart, label: "Hilfe anfragen", color: "bg-violet-500" },
    { href: "/messages", icon: Phone, label: "Nachbar anrufen", color: "bg-info-blue" },
    { href: "/alerts/new", icon: AlertTriangle, label: "Notfall", color: "bg-alert-amber" },
  ];

  if (loading) {
    return (
      <div className="space-y-4" data-testid="my-day-loading">
        <div className="h-32 rounded-2xl bg-muted animate-shimmer" />
        <div className="h-24 rounded-2xl bg-muted animate-shimmer" />
        <div className="h-24 rounded-2xl bg-muted animate-shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4" data-testid="my-day-page">
      {/* Hero mit Illustration */}
      <div className="relative rounded-2xl bg-gradient-to-br from-rose-50 via-rose-50/50 to-transparent shadow-hero">
        <div className="absolute right-2 top-2 w-[120px] h-[60px] opacity-[0.12] pointer-events-none overflow-hidden">
          <IllustrationRenderer name="ill-07-herz-haende" width="120" height="60" />
        </div>
        <div className="relative p-5">
          <p className="text-sm text-muted-foreground">{formatDate()}</p>
          <h1 className="text-2xl font-bold text-anthrazit mt-1">
            {getGreeting()}
          </h1>
          {lastHeartbeat && (
            <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4 text-quartier-green" />
              <span>Letzte Aktivität: {lastHeartbeat}</span>
            </div>
          )}
        </div>
      </div>

      {/* Check-in */}
      <Card data-testid="checkin-card">
        <CardContent className="p-4">
          <h2 className="text-base font-semibold text-anthrazit mb-3">
            Wie geht es Ihnen heute?
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {checkinOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = checkinStatus === opt.status;
              return (
                <button
                  key={opt.status}
                  onClick={() => handleCheckin(opt.status)}
                  data-testid={`checkin-${opt.status}`}
                  className={`flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200 active:scale-95 ${
                    isActive ? opt.activeBg : opt.bg
                  }`}
                  style={{ minHeight: "80px", touchAction: "manipulation" }}
                >
                  <Icon className={`h-8 w-8 ${isActive ? "text-white" : opt.color}`} />
                  <span className={`text-sm font-medium ${isActive ? "text-white" : "text-anthrazit"}`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          {checkinStatus && (
            <div className="flex items-center gap-1.5 mt-3 text-sm text-quartier-green">
              <CheckCircle2 className="h-4 w-4" />
              <span>Check-in gespeichert</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tageskalender */}
      <Card data-testid="day-calendar">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-alert-amber" />
            <h2 className="text-base font-semibold text-anthrazit">Heute</h2>
          </div>
          {todayEvents.length > 0 ? (
            <div className="space-y-2">
              {todayEvents.map((event, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                >
                  {event.type === "waste" ? (
                    <Trash2 className="h-5 w-5 text-quartier-green flex-shrink-0" />
                  ) : (
                    <Clock className="h-5 w-5 text-info-blue flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-anthrazit truncate">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Keine Termine für heute.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Medikamenten-Erinnerung */}
      <Card data-testid="medication-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="h-5 w-5 text-violet-500" />
            <h2 className="text-base font-semibold text-anthrazit">Medikamente</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Keine Medikamente hinterlegt. Sprechen Sie mit Ihrem Arzt, um einen
            Medikamentenplan anzulegen.
          </p>
        </CardContent>
      </Card>

      {/* Schnellaktionen */}
      <div data-testid="quick-actions-myday">
        <h2 className="text-base font-semibold text-anthrazit mb-3">
          Schnellaktionen
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => haptic("light")}
                className={`${action.color} flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-white shadow-soft transition-all duration-200 active:scale-95`}
                style={{ minHeight: "80px", touchAction: "manipulation" }}
              >
                <Icon className="h-7 w-7" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-center leading-tight">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
