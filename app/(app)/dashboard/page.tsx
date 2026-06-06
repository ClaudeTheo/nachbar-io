"use client";

import Link from "next/link";
import {
  Bell,
  CalendarDays,
  HeartHandshake,
  MapPin,
  Megaphone,
  Newspaper,
  User,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ReputationBadge } from "@/components/ReputationBadge";
import { FloatingHelpButton } from "@/components/FloatingHelpButton";
import { DailyCheckinBubble } from "@/modules/care/components/checkin/DailyCheckinBubble";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserModeConfig } from "@/lib/user-modes";

import { getGreeting, useDashboardData } from "./hooks/useDashboardData";

function formatEyebrowDate(d: Date): string {
  const weekday = d
    .toLocaleDateString("de-DE", { weekday: "long" })
    .toUpperCase();
  const day = d.getDate();
  const month = d
    .toLocaleDateString("de-DE", { month: "long" })
    .toUpperCase();
  return `${weekday} - ${day}. ${month}`;
}

type StartAction = {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  tone: string;
};

export default function DashboardPage() {
  const {
    alerts,
    caregivers,
    currentQuarter,
    dashboardDensity,
    helpRequests,
    loadDashboard,
    loading,
    news,
    quarterLoading,
    reputationLevel,
    uiMode,
    unreadCount,
    userName,
    weatherData,
  } = useDashboardData();

  if (loading && (quarterLoading || currentQuarter)) {
    return (
      <div className="animate-fade-in-up space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-1 h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!quarterLoading && !currentQuarter) {
    return (
      <div className="animate-fade-in-up flex flex-col items-center justify-center py-16 text-center">
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-quartier-green/10 text-2xl font-bold text-quartier-green"
          aria-hidden="true"
        >
          Q
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
  const isComfortDashboard = dashboardDensity === "calm";
  const quarterLabel =
    currentQuarter?.city ?? currentQuarter?.name ?? "Ihr Quartier";
  const quarterName = quarterLabel.toUpperCase();
  const modeLabel = uiMode === "comfort" ? getUserModeConfig(uiMode).label : null;
  const primaryAction: StartAction =
    uiMode === "comfort"
      ? {
          href: "/my-day",
          icon: CalendarDays,
          label: "Mein Tag",
          description: "Termine, Hinweise und Alltag in Ruhe.",
          tone: "bg-[#2d6a4f]",
        }
      : {
          href: "/gruppen",
          icon: UsersRound,
          label: "Gemeinschaft",
          description: "Gruppen, Nachbarn und Austausch.",
          tone: "bg-quartier-green",
        };

  const PrimaryIcon = primaryAction.icon;
  const summaryItems = [
    {
      href: "/quartier",
      icon: MapPin,
      label: "Mein Quartier",
      value: "Rathaus, Karte, Veranstaltungen",
    },
    {
      href: "/my-day",
      icon: CalendarDays,
      label: "Mein Tag",
      value: "Heute planen und nichts Wichtiges verpassen",
    },
    {
      href: "/profile",
      icon: User,
      label: "Ich",
      value: "Profil, Haushalt und Einstellungen",
    },
  ];

  const signalItems = [
    {
      href: "/news",
      icon: Newspaper,
      label: "Neue Infos",
      value: news.length > 0 ? `${news.length} Meldungen` : "Keine neuen Meldungen",
    },
    {
      href: "/hilfe",
      icon: HeartHandshake,
      label: "Hilfe im Quartier",
      value:
        helpRequests.length > 0
          ? `${helpRequests.length} offene Anfragen`
          : "Keine offenen Anfragen",
    },
    {
      href: "/alerts",
      icon: Megaphone,
      label: "Warnungen",
      value: alerts.length > 0 ? `${alerts.length} aktiv` : "Keine aktiven Warnungen",
    },
  ];

  return (
    <>
      <PullToRefresh onRefresh={loadDashboard}>
        <div
          className={`animate-fade-in-up pb-10 pt-10 ${
            isComfortDashboard ? "space-y-8" : "space-y-7"
          }`}
          data-dashboard-density={dashboardDensity}
        >
          <section className="flex items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-anthrazit-light">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-quartier-green"
                  aria-hidden
                />
                {formatEyebrowDate(new Date())} - {quarterName}
                {modeLabel && (
                  <span
                    className="rounded-full border border-quartier-green/25 bg-quartier-green/10 px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-[#2d6a4f]"
                    data-testid="dashboard-ui-mode-label"
                  >
                    {modeLabel}
                  </span>
                )}
              </p>
              <h1
                className={`mt-3 font-semibold leading-[1.15] text-anthrazit ${
                  isComfortDashboard ? "text-[34px]" : "text-[36px]"
                }`}
                data-testid="dashboard-greeting"
              >
                {userName ? `${greeting.text}, ${userName}.` : "QuartierApp"}
                {reputationLevel >= 2 && (
                  <span className="ml-2 align-middle">
                    <ReputationBadge level={reputationLevel} size="sm" />
                  </span>
                )}
              </h1>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-3">
              <Link
                href="/notifications"
                className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-anthrazit-tint"
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
                  <div className="text-[30px] font-semibold leading-none tabular-nums text-anthrazit">
                    {Math.round(weatherData.temp)}
                    <span aria-hidden="true">&deg;</span>
                  </div>
                  {weatherData.description && (
                    <div className="mt-1 max-w-24 text-sm text-anthrazit-light">
                      {weatherData.description}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section
            className="rounded-2xl border border-anthrazit-tint bg-lifted-cream p-4 shadow-soft"
            aria-label="Naechster Schritt"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Start
            </p>
            <h2 className="mt-2 text-xl font-semibold text-anthrazit">
              Was jetzt am naechsten liegt.
            </h2>
            <Link
              href={primaryAction.href}
              className={`${primaryAction.tone} mt-4 flex min-h-[72px] items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-sm transition-transform active:scale-[0.98]`}
              data-testid="dashboard-primary-action"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/18">
                <PrimaryIcon className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold">
                  {primaryAction.label}
                </span>
                <span className="mt-1 block text-sm text-white/82">
                  {primaryAction.description}
                </span>
              </span>
            </Link>
          </section>

          {caregivers.length > 0 && (
            <section
              data-testid="dashboard-caregivers"
              className="rounded-2xl border border-anthrazit-tint bg-white p-4"
            >
              <p className="text-sm font-semibold text-anthrazit">
                Verbundene Angehoerige
              </p>
              <div className="mt-3 flex -space-x-2">
                {caregivers.map((cg) => (
                  <Link
                    key={cg.caregiver_id}
                    href={`/messages/${cg.caregiver_id}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-quartier-green/10 text-xs font-semibold text-quartier-green transition-all hover:ring-2 hover:ring-quartier-green/30"
                    title={cg.display_name || "Angehoeriger"}
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
            </section>
          )}

          <section className="grid gap-3" aria-label="Hauptbereiche">
            {summaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-anthrazit-tint bg-white p-4 shadow-sm transition-colors hover:bg-lifted-cream"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-quartier-green/10 text-quartier-green">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-anthrazit">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {item.value}
                    </span>
                  </span>
                </Link>
              );
            })}
          </section>

          <section className="space-y-3" aria-label="Kurzer Status">
            <h2 className="text-base font-semibold text-anthrazit">
              Kurzer Status
            </h2>
            <div className="grid gap-3">
              {signalItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-[58px] items-center justify-between gap-3 rounded-2xl border border-anthrazit-tint bg-lifted-cream px-4 py-3"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium text-anthrazit">
                        {item.label}
                      </span>
                    </span>
                    <span className="text-right text-sm text-muted-foreground">
                      {item.value}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </PullToRefresh>

      <FloatingHelpButton />
      <DailyCheckinBubble enabled={uiMode === "senior"} />
    </>
  );
}
