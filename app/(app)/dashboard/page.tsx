"use client";

import Link from "next/link";
import {
  Bell,
  TriangleAlert,
  CheckCircle2,
  MessageCircle,
  Newspaper,
  Bot,
} from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { GREETING_ICON_MAP } from "@/lib/category-icons";
import { isUxRedesignEnabled } from "@/lib/ux-flags";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ReputationBadge } from "@/components/ReputationBadge";
// Moved to Quartier/Gesundheit hub
// import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import { FloatingHelpButton } from "@/components/FloatingHelpButton";
import { InfoBar } from "@/modules/info-hub/components/InfoBar";
import { NinaAlert } from "@/modules/info-hub/components/NinaAlert";
import { HeroCard } from "@/components/HeroCard";
// Moved to Quartier hub
// import { InviteNeighborModal } from "@/components/InviteNeighborModal";
import { DailyCheckinBubble } from "@/modules/care/components/checkin/DailyCheckinBubble";
import { Skeleton } from "@/components/ui/skeleton";

import { useDashboardData, getGreeting } from "./hooks/useDashboardData";
// Moved to Quartier/Gesundheit hub
// import { AlertBanners } from "./components/AlertBanners";
// import { DashboardServices } from "./components/DashboardServices";
// import { EmptyState } from "./components/EmptyState";

export default function DashboardPage() {
  const {
    // Moved to Quartier/Gesundheit hub — kept in hook for compatibility
    // alerts,
    // news,
    // helpRequests,
    // marketplaceItems,
    userName,
    reputationLevel,
    loading,
    profileData,
    weatherData,
    caregivers,
    unreadCount,
    currentQuarter,
    quarterLoading,
    // showInviteModal,
    // setShowInviteModal,
    loadDashboard,
  } = useDashboardData();

  // Loading-Skeleton
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

  // Kein Quartier zugeordnet — hilfreiche Meldung statt endlosem Skeleton
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
  const greetingIcon = GREETING_ICON_MAP[greeting.timeKey];

  return (
    <>
      <PullToRefresh onRefresh={loadDashboard}>
        <div className="space-y-6 animate-fade-in-up">
          {/* NINA-Warnungen (vor Hero, nach Notfall-Banner) */}
          <NinaAlert />

          {/* Hero-Bereich: Begruessung + Wetter */}
          {isUxRedesignEnabled("UX_REDESIGN_DASHBOARD") ? (
            <DashboardHero
              userName={userName}
              avatarUrl={profileData?.avatarUrl ?? null}
              reputationLevel={reputationLevel}
              greeting={greeting}
              greetingIcon={greetingIcon}
              quarterName={currentQuarter?.name}
              weatherIcon={weatherData?.icon}
              weatherTemp={weatherData?.temp}
              weatherDescription={weatherData?.description}
            />
          ) : (
            <HeroCard>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {profileData?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileData.avatarUrl}
                      alt="Profilbild"
                      className="h-16 w-16 rounded-full object-cover border-2 border-quartier-green/20 flex-shrink-0"
                      data-testid="dashboard-avatar"
                    />
                  ) : (
                    <div
                      className="h-16 w-16 rounded-full bg-anthrazit text-white font-bold text-xl flex items-center justify-center flex-shrink-0"
                      data-testid="dashboard-avatar"
                    >
                      {userName ? userName.charAt(0).toUpperCase() : "?"}
                    </div>
                  )}
                  <div>
                    <h1
                      className="flex items-center gap-2 text-2xl font-extrabold text-anthrazit"
                      data-testid="dashboard-greeting"
                    >
                      {userName ? (
                        <>
                          <CategoryIcon
                            icon={greetingIcon.icon}
                            bgColor={greetingIcon.bgColor}
                            iconColor={greetingIcon.iconColor}
                            size="lg"
                          />
                          {greeting.text}, {userName}
                        </>
                      ) : (
                        "QuartierApp"
                      )}
                      {reputationLevel >= 2 && (
                        <span className="ml-1.5 align-middle">
                          <ReputationBadge level={reputationLevel} size="sm" />
                        </span>
                      )}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentQuarter?.name ?? "Ihr Quartier"} auf einen Blick
                    </p>
                  </div>
                </div>
                <Link
                  href="/notifications"
                  className="relative rounded-full p-2 transition-colors hover:bg-white/50"
                  aria-label="Benachrichtigungen"
                  data-testid="notification-bell"
                >
                  <Bell className="h-6 w-6 text-anthrazit" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span
                      className="animate-badge-pop absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emergency-red text-xs font-bold text-white"
                      data-testid="unread-badge"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              </div>
              {/* Quartier-Info-Bar (Wetter, Pollen, Muellabfuhr) — kompakt in der HeroCard */}
              <div className="mt-3 -mx-1">
                <InfoBar />
              </div>
            </HeroCard>
          )}

          {/* Angehoerige-Schnellzugriff */}
          {caregivers.length > 0 && (
            <div
              data-testid="dashboard-caregivers"
              className="flex items-center gap-3 px-1 mb-4"
            >
              <span className="text-xs text-muted-foreground">Angehörige:</span>
              <div className="flex -space-x-2">
                {caregivers.map((cg) => (
                  <Link
                    key={cg.caregiver_id}
                    href={`/messages/${cg.caregiver_id}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-quartier-green/10 border-2 border-white text-xs font-semibold text-quartier-green hover:ring-2 hover:ring-quartier-green/30 transition-all"
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

          {/* SOS-Kachel — volle Breite, rote Umrandung, Platzhalter für Task 13-15 */}
          <Link
            href="/alerts/new"
            className="flex items-center gap-3 rounded-xl border-2 border-emergency-red bg-red-50 p-4 min-h-[80px] hover:bg-red-100 transition-colors active:scale-[0.98]"
            data-testid="dashboard-sos-tile"
          >
            <TriangleAlert className="h-8 w-8 text-emergency-red flex-shrink-0" />
            <div>
              <p className="font-bold text-emergency-red text-lg">SOS-Notruf</p>
              <p className="text-sm text-anthrazit/70">
                Im Notfall: 112 anrufen. Hier Hilfe im Quartier anfordern.
              </p>
            </div>
          </Link>

          {/* 4 Schnellzugriff-Kacheln */}
          <div className="grid grid-cols-2 gap-3">
            {/* 1. Check-in */}
            <Link
              href="/care/checkin"
              className="bg-white rounded-xl border shadow-sm p-4 min-h-[80px] flex flex-col justify-center hover:bg-gray-50 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-quartier-green" />
                <span className="font-semibold text-anthrazit">Check-in</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Wie geht es Ihnen?
              </p>
            </Link>

            {/* 2. Nachrichten */}
            <Link
              href="/notifications"
              className="bg-white rounded-xl border shadow-sm p-4 min-h-[80px] flex flex-col justify-center hover:bg-gray-50 transition-colors active:scale-[0.98] relative"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                <span className="font-semibold text-anthrazit">
                  Nachrichten
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Benachrichtigungen
              </p>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emergency-red text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* 3. Neuigkeiten */}
            <Link
              href="/news"
              className="bg-white rounded-xl border shadow-sm p-4 min-h-[80px] flex flex-col justify-center hover:bg-gray-50 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-violet-500" />
                <span className="font-semibold text-anthrazit">
                  Neuigkeiten
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Quartiers-News
              </p>
            </Link>

            {/* 4. KI-Assistent */}
            <Link
              href="/companion"
              className="bg-white rounded-xl border shadow-sm p-4 min-h-[80px] flex flex-col justify-center hover:bg-gray-50 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-anthrazit">
                  KI-Assistent
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Fragen & Hilfe
              </p>
            </Link>
          </div>

          {/* Moved to Quartier/Gesundheit hub:
              - DashboardServices (Kommunal, Hilfe-Boerse, Marktplatz, News, Caregiver)
              - RedeemCodeBanner
              - ProfileCompletionBanner
              - AlertBanners
              - EmptyState
          */}
        </div>
      </PullToRefresh>

      {/* FAB Schnell-Hilfe */}
      <FloatingHelpButton />

      {/* Moved to Quartier hub:
          - InviteNeighborModal
      */}

      {/* Check-in Sprechblase — erscheint nach 5 Sek, Nutzer muss antworten */}
      <DailyCheckinBubble />
    </>
  );
}
