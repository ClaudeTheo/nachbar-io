"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  MessageCircle,
  Newspaper,
  Megaphone,
} from "lucide-react";
import { DiscoverGrid } from "@/components/dashboard/DiscoverGrid";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ReputationBadge } from "@/components/ReputationBadge";
import { FloatingHelpButton } from "@/components/FloatingHelpButton";
import { DailyCheckinBubble } from "@/modules/care/components/checkin/DailyCheckinBubble";
import { BrandFooter } from "@/components/brand/BrandFooter";
import { MapThumbnail } from "@/components/map/MapThumbnail";
import { useMapStatuses } from "@/lib/hooks/useMapStatuses";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { loadCaregiverPendingCheckinHouseholds } from "@/lib/care/caregiver-pending-checkins";
import { Skeleton } from "@/components/ui/skeleton";

import { useDashboardData, getGreeting } from "./hooks/useDashboardData";

// Eyebrow-Datum fuer Hero ("SAMSTAG · 11. MAI") — Visual-Polish v7.
function formatEyebrowDate(d: Date): string {
  const wochentag = d
    .toLocaleDateString("de-DE", { weekday: "long" })
    .toUpperCase();
  const tag = d.getDate();
  const monat = d
    .toLocaleDateString("de-DE", { month: "long" })
    .toUpperCase();
  return `${wochentag} · ${tag}. ${monat}`;
}

export default function DashboardPage() {
  const {
    userName,
    reputationLevel,
    loading,
    weatherData,
    caregivers,
    unreadCount,
    currentQuarter,
    quarterLoading,
    loadDashboard,
  } = useDashboardData();

  // Founder-Wunsch 2026-05-12: Karte auf der App-Startseite zwischen Hero
  // und "Heute"-Section mit Status-Pins. Punkt-Farbe je Haushalt:
  // - green = okay (Default)
  // - red = SOS / kritischer Alert (Founder-A)
  // - yellow = aktive Hilfe-Anfrage oder gelber Alert (Founder-B)
  // - orange = Paket-Annahme heute aktiv
  // - blue = Urlaubsmodus
  // Quellen via useMapStatuses (alerts + help_requests + paketannahme +
  // vacation_modes — alle bereits im Hook angebunden). Care-Check-in-Status
  // (Founder-C) folgt in einer Folgewelle (eigener DB-Query noetig).
  const { geoHouses, residentCounts, statuses } = useMapStatuses(
    currentQuarter?.id,
    currentQuarter?.map_config,
    currentQuarter?.center_lat,
    currentQuarter?.center_lng,
  );

  // Founder-C 2026-05-12 (Variante X — DSGVO-konform):
  // Caregiver-only Care-Checkin-Status. Sieht NUR der angemeldete Nutzer
  // fuer SEINE per caregiver_links zugewiesenen Senioren — andere
  // Nachbarn bekommen via RLS ein leeres Result.
  const { user } = useAuth();
  const [caregiverPendingHouseholds, setCaregiverPendingHouseholds] =
    useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const supabase = createClient();
    void loadCaregiverPendingCheckinHouseholds(supabase, user.id).then(
      (households) => {
        if (!cancelled) setCaregiverPendingHouseholds(households);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const previewPoints = useMemo(
    () =>
      geoHouses
        .filter((house) => residentCounts[house.id] > 0)
        .map((house) => {
          const baseStatus = statuses[house.id] ?? "green";
          // Caregiver-Pending nur sichtbar wenn baseStatus noch "green" ist
          // (rote/gelbe Eskalationen aus Hook haben Priori­taet — mergeMapStatus-
          // Logik). Damit "ueberlagert" der Caregiver-Pin sanft, ohne SOS-Pins
          // zu uebermalen.
          const color =
            baseStatus === "green" && caregiverPendingHouseholds.has(house.id)
              ? ("yellow" as const)
              : baseStatus;
          return { lat: house.lat, lng: house.lng, color };
        }),
    [geoHouses, residentCounts, statuses, caregiverPendingHouseholds],
  );

  // Loading-Skeleton (unveraendert ggue. C-0).
  if (loading && (quarterLoading || currentQuarter)) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-1 h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="h-14 w-full rounded-xl" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // Kein Quartier zugeordnet — hilfreiche Meldung (unveraendert).
  if (!quarterLoading && !currentQuarter) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
        <div className="mb-4 text-5xl" aria-hidden="true">
          🏘️
        </div>
        <h1 className="text-xl font-extrabold text-anthrazit">
          Willkommen bei QuartierApp
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Ihr Konto ist noch keinem Quartier zugeordnet. Bitte wenden Sie sich
          an die Quartiersadministration, damit Ihr Haushalt verifiziert wird.
        </p>
        <a
          href="mailto:thomasth@gmx.de"
          className="mt-4 rounded-lg bg-quartier-green px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-quartier-green/90 active:scale-[0.97]"
        >
          Kontakt aufnehmen
        </a>
      </div>
    );
  }

  const greeting = getGreeting();
  const eyebrowDate = formatEyebrowDate(new Date());
  // Founder 2026-05-12: Eyebrow zeigt die Stadt (z.B. "BAD SÄCKINGEN"), nicht
  // den Quartier-Namen ("Purkersdorfer/Sanary/Rebberg") — sonst wird der
  // Eyebrow zu lang und der Kontrast zu Headline leidet.
  const quartierName = (
    currentQuarter?.city ??
    currentQuarter?.name ??
    "Ihr Quartier"
  ).toUpperCase();

  return (
    <>
      <PullToRefresh onRefresh={loadDashboard}>
        <div className="space-y-12 animate-fade-in-up py-12 md:py-16">
          {/* ============================================================
              HERO — Visual-Polish v7 (kein Card, kein Avatar, typo-getrieben).
              SOS-Pill bewusst entfernt (Founder-Entscheidung 2026-05-11):
              SOS gehoert nur in Senior-Layout (app/senior/*), nicht ins
              Standard-Dashboard. Notruf-112-Erstplatzierung bleibt durch
              Senior-Notruf-Leiste in app/senior/layout.tsx erhalten.
              ============================================================ */}
          <section className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              {/* Eyebrow (accent dot + Datum + Quartier) */}
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-anthrazit-light">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-quartier-green"
                  aria-hidden
                />
                {eyebrowDate} · {quartierName}
              </p>

              {/* Hero-Greeting H1 (36 px / 1.15 / 600 / -0.02em) */}
              <h1
                className="mt-3 text-[36px] font-semibold leading-[1.15] tracking-[-0.02em] text-anthrazit"
                data-testid="dashboard-greeting"
              >
                {userName
                  ? `${greeting.text}, ${userName}.`
                  : "QuartierApp"}
                {reputationLevel >= 2 && (
                  <span className="ml-2 align-middle">
                    <ReputationBadge level={reputationLevel} size="sm" />
                  </span>
                )}
              </h1>
            </div>

            {/* Notification-Bell + Wetter rechts */}
            <div className="flex shrink-0 flex-col items-end gap-3">
              <Link
                href="/notifications"
                className="relative rounded-full p-2 transition-colors hover:bg-anthrazit-tint"
                aria-label="Benachrichtigungen"
                data-testid="notification-bell"
              >
                <Bell className="h-5 w-5 text-anthrazit" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emergency-red text-xs font-bold text-white"
                    data-testid="unread-badge"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {weatherData?.temp != null && (
                <div className="text-right">
                  <div className="text-[32px] font-semibold leading-none tabular-nums text-anthrazit">
                    {Math.round(weatherData.temp)}°
                  </div>
                  {weatherData.description && (
                    <div className="mt-1 text-sm text-anthrazit-light">
                      {weatherData.description}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Angehoerige-Schnellzugriff (unveraendert ggue. C-0) */}
          {caregivers.length > 0 && (
            <div
              data-testid="dashboard-caregivers"
              className="flex items-center gap-3 px-1"
            >
              <span className="text-xs text-muted-foreground">Angehörige:</span>
              <div className="flex -space-x-2">
                {caregivers.map((cg) => (
                  <Link
                    key={cg.caregiver_id}
                    href={`/messages/${cg.caregiver_id}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-quartier-green/10 text-xs font-semibold text-quartier-green transition-all hover:ring-2 hover:ring-quartier-green/30"
                    title={cg.display_name || "Angehöriger"}
                  >
                    {cg.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cg.avatar_url}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      (cg.display_name || "?").charAt(0).toUpperCase()
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================
              Nachbar-Karte (Founder 2026-05-12) — Karte des Quartiers mit
              registrierten Haushalten als Punkte. Klick fuehrt zur Vollkarte.
              Status-Pins ("Hilfe braucht") folgen in einer Folge-Welle nach
              Definition der Status-Quelle (SOS / offene Hilfe / Care).
              ============================================================ */}
          {currentQuarter?.center_lat != null &&
            currentQuarter?.center_lng != null && (
              <section data-testid="dashboard-map" className="space-y-2">
                <MapThumbnail
                  lat={currentQuarter.center_lat}
                  lng={currentQuarter.center_lng}
                  zoom={currentQuarter.zoom_level ?? 16}
                  label={`${currentQuarter.city ?? currentQuarter.name ?? "Quartier"} — Karte`}
                  points={previewPoints}
                />
                {/* Mini-Legende fuer Status-Pins (Founder 2026-05-12). */}
                <ul
                  aria-label="Bedeutung der Karten-Punkte"
                  className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-anthrazit-light"
                >
                  <li className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-quartier-green"
                      aria-hidden="true"
                    />
                    Okay
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-alert-amber"
                      aria-hidden="true"
                    />
                    Hilfe gesucht
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-emergency-red"
                      aria-hidden="true"
                    />
                    Notfall
                  </li>
                </ul>
              </section>
            )}

          {/* ============================================================
              "Heute in Ihrem Quartier." — Anker statt SOS-Pill.
              Visual-Polish v7 Re-Flow: H2 + Eyebrow als Magazin-Section-Trenner.
              Schnellzugriffe bleiben in C-1 in alter Bauart — Glas-Tile-Umstellung
              kommt in C-2.
              ============================================================ */}
          <section className="space-y-6">
            <header className="space-y-1">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-anthrazit-light">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-quartier-green"
                  aria-hidden
                />
                Heute · {quartierName}
              </p>
              <h2 className="text-[22px] font-semibold leading-[1.3] tracking-[-0.01em] text-anthrazit">
                Heute in Ihrem Quartier.
              </h2>
            </header>

            {/* Schnellzugriffe als .glass-tile (Visual-Polish v7 C-2):
                cream-Glas Alpha 0.40 + blur 12 px desktop / 6 px mobile
                via @supports backdrop-filter, Solid-Fallback fuer aeltere Browser.
                Hover: green-line Border + leicht erhoehte Opacity.
                Active: green-tint Background (keine Transform-Animation). */}
            <div className="grid grid-cols-2 gap-3">
              {/* 1. Check-in */}
              <Link
                href="/care/checkin"
                className="glass-tile flex min-h-[80px] flex-col justify-center p-4"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-quartier-green" />
                  <span className="font-semibold text-anthrazit">Check-in</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Wie geht es Ihnen?
                </p>
              </Link>

              {/* 2. Nachrichten */}
              <Link
                href="/notifications"
                className="glass-tile flex min-h-[80px] flex-col justify-center p-4"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold text-anthrazit">
                    Nachrichten
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Benachrichtigungen
                </p>
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emergency-red text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* 3. Neuigkeiten */}
              <Link
                href="/news"
                className="glass-tile flex min-h-[80px] flex-col justify-center p-4"
              >
                <div className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-violet-500" />
                  <span className="font-semibold text-anthrazit">
                    Neuigkeiten
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Quartiers-News
                </p>
              </Link>

              {/* 4. Bekanntmachungen */}
              <Link
                href="/city-services"
                className="glass-tile flex min-h-[80px] flex-col justify-center p-4"
              >
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-anthrazit">
                    Bekanntmachungen
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aus dem Rathaus
                </p>
              </Link>
            </div>
          </section>

          {/* Entdecken — DiscoverGrid bleibt in C-1 unveraendert
              (Mastercard-Umbau auf 4 Kategorien + Ghost-Watermarks kommt in C-3). */}
          <DiscoverGrid />
        </div>

        {/* Brand-Footer-Dark (Visual-Polish v7 Welle 3) — Magazin-Abschluss
            mit Eyebrow + Magazin-Sig + voller Logo-Lockup + Meta-Zeile.
            Ausserhalb des Page-Padding-Containers, damit der dunkle
            BG die volle Breite einnimmt (negative-margin Trick im
            BrandFooter selbst). */}
        <BrandFooter />
      </PullToRefresh>

      {/* FAB Schnell-Hilfe */}
      <FloatingHelpButton />

      {/* Check-in Sprechblase — erscheint nach 5 Sek, Nutzer muss antworten */}
      <DailyCheckinBubble />
    </>
  );
}
