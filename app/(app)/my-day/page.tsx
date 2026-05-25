"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Frown,
  HandHeart,
  Meh,
  Phone,
  Pill,
  Smile,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { haptic } from "@/lib/haptics";

type CheckInStatus = "good" | "okay" | "bad" | null;

function getCheckinStorageKey(userId: string): string {
  const today = new Date().toISOString().split("T")[0];
  return `my-day-checkin:${userId}:${today}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 10) return "Guten Morgen";
  if (hour < 14) return "Guten Mittag";
  if (hour < 18) return "Guten Nachmittag";
  return "Guten Abend";
}

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
  const [todayEvents, setTodayEvents] = useState<
    Array<{ time: string; title: string; type: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    const supabase = createClient();

    async function loadDayData() {
      try {
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
          else setLastHeartbeat(`Vor ${Math.floor(minutes / 60)} Std.`);
        }

        const today = new Date().toISOString().split("T")[0];
        const storedCheckin =
          typeof window !== "undefined"
            ? window.localStorage.getItem(getCheckinStorageKey(userId))
            : null;
        if (
          storedCheckin === "good" ||
          storedCheckin === "okay" ||
          storedCheckin === "bad"
        ) {
          setCheckinStatus(storedCheckin);
        }

        const { data: waste } = await supabase
          .from("waste_collection_dates")
          .select("waste_type, collection_date")
          .eq("collection_date", today)
          .limit(5);

        const events: Array<{ time: string; title: string; type: string }> = [];
        if (waste) {
          waste.forEach((w: { waste_type: string }) => {
            events.push({
              time: "Frueh",
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

  async function handleCheckin(status: CheckInStatus) {
    if (!user?.id || !status) return;
    haptic("medium");
    setCheckinStatus(status);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(getCheckinStorageKey(user.id), status);
    }
  }

  const checkinOptions = [
    {
      status: "good" as const,
      icon: Smile,
      label: "Gut",
      color: "text-quartier-green",
      bg: "bg-quartier-green/10",
      activeBg: "bg-quartier-green text-white",
    },
    {
      status: "okay" as const,
      icon: Meh,
      label: "Geht so",
      color: "text-alert-amber",
      bg: "bg-alert-amber/10",
      activeBg: "bg-alert-amber text-white",
    },
    {
      status: "bad" as const,
      icon: Frown,
      label: "Nicht gut",
      color: "text-emergency-red",
      bg: "bg-emergency-red/10",
      activeBg: "bg-emergency-red text-white",
    },
  ];

  const dayLinks = [
    {
      href: "/care/appointments",
      icon: Calendar,
      label: "Termine",
      description: "Arzt, Hilfe und Verabredungen",
    },
    {
      href: "/events",
      icon: Clock,
      label: "Veranstaltungen",
      description: "Was heute und bald im Quartier passiert",
    },
    {
      href: "/waste-calendar",
      icon: Trash2,
      label: "Muellkalender",
      description: "Abholung heute oder morgen pruefen",
    },
  ];

  const quickActions = [
    {
      href: "/hilfe",
      icon: HandHeart,
      label: "Hilfe",
      color: "bg-quartier-green",
    },
    {
      href: "/messages",
      icon: Phone,
      label: "Nachrichten",
      color: "bg-info-blue",
    },
    {
      href: "/alerts",
      icon: AlertTriangle,
      label: "Warnungen",
      color: "bg-alert-amber",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4" data-testid="my-day-loading">
        <div className="h-32 animate-shimmer rounded-2xl bg-muted" />
        <div className="h-24 animate-shimmer rounded-2xl bg-muted" />
        <div className="h-24 animate-shimmer rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4" data-testid="my-day-page">
      <section className="rounded-2xl border border-anthrazit-tint bg-lifted-cream p-5 shadow-soft">
        <p className="text-sm text-muted-foreground">{formatDate()}</p>
        <h1 className="mt-1 text-2xl font-bold text-anthrazit">
          {getGreeting()}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Termine, Veranstaltungen, Muell und wichtige Hinweise an einem Ort.
        </p>
        {lastHeartbeat && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-quartier-green" />
            <span>Letzte Aktivitaet: {lastHeartbeat}</span>
          </div>
        )}
      </section>

      <Card data-testid="day-calendar">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-alert-amber" />
            <h2 className="text-base font-semibold text-anthrazit">
              Heute wichtig
            </h2>
          </div>
          {todayEvents.length > 0 ? (
            <div className="space-y-2">
              {todayEvents.map((event, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                >
                  {event.type === "waste" ? (
                    <Trash2 className="h-5 w-5 flex-shrink-0 text-quartier-green" />
                  ) : (
                    <Clock className="h-5 w-5 flex-shrink-0 text-info-blue" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-anthrazit">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              Fuer heute ist nichts Dringendes hinterlegt.
            </p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-3" aria-label="Tagesbereiche">
        {dayLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-anthrazit-tint bg-white p-4 shadow-sm"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-quartier-green/10 text-quartier-green">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-anthrazit">
                  {item.label}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </section>

      <Card data-testid="checkin-card">
        <CardContent className="p-4">
          <h2 className="mb-3 text-base font-semibold text-anthrazit">
            Kurzer Check-in
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
                  <Icon
                    className={`h-8 w-8 ${isActive ? "text-white" : opt.color}`}
                  />
                  <span
                    className={`text-center text-sm font-medium ${
                      isActive ? "text-white" : "text-anthrazit"
                    }`}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          {checkinStatus && (
            <div className="mt-3 flex items-center gap-1.5 text-sm text-quartier-green">
              <CheckCircle2 className="h-4 w-4" />
              <span>Check-in gespeichert</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="medication-card">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Pill className="h-5 w-5 text-violet-500" />
            <h2 className="text-base font-semibold text-anthrazit">
              Gesundheit optional
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Medizinische oder Pflege-Funktionen bleiben freiwillig und brauchen
            eigene Einwilligungen.
          </p>
        </CardContent>
      </Card>

      <div data-testid="quick-actions-myday">
        <h2 className="mb-3 text-base font-semibold text-anthrazit">
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
                <span className="text-center text-xs font-semibold leading-tight">
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
