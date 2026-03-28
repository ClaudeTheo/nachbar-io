"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { GREETING_ICON_MAP } from "@/lib/category-icons";
import { isUxRedesignEnabled } from "@/lib/ux-flags";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ReputationBadge } from "@/components/ReputationBadge";
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import { FloatingHelpButton } from "@/components/FloatingHelpButton";
import { LargeTitle } from "@/components/ui/LargeTitle";
import { InfoBar } from "@/components/info/InfoBar";
import { NinaAlert } from "@/components/info/NinaAlert";
import { HeroCard } from "@/components/HeroCard";
import { InviteNeighborModal } from "@/components/InviteNeighborModal";
import { DailyCheckinButton } from "@/components/care/DailyCheckinButton";
import { RedeemCodeBanner } from "@/components/care/RedeemCodeBanner";
import { Skeleton } from "@/components/ui/skeleton";

import { useDashboardData, getGreeting } from "./hooks/useDashboardData";
import { AlertBanners } from "./components/AlertBanners";
import { DashboardServices } from "./components/DashboardServices";
import { EmptyState } from "./components/EmptyState";

export default function DashboardPage() {
  const {
    alerts,
    news,
    helpRequests,
    marketplaceItems,
    userName,
    reputationLevel,
    loading,
    profileData,
    weatherData,
    caregivers,
    unreadCount,
    currentQuarter,
    quarterLoading,
    showInviteModal,
    setShowInviteModal,
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
        <div className="space-y-8 animate-fade-in-up">
          <LargeTitle title="Zuhause" />

          {/* NINA-Warnungen (vor Hero, nach Notfall-Banner) */}
          <NinaAlert />

          {/* Hero-Bereich: Begruessung + Check-in */}
          {isUxRedesignEnabled("UX_REDESIGN_DASHBOARD") ? (
            <DashboardHero
              userName={userName}
              avatarUrl={profileData?.avatarUrl ?? null}
              reputationLevel={reputationLevel}
              greeting={greeting}
              greetingIcon={greetingIcon}
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
                      Ihr Quartier auf einen Blick
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
              <div className="mt-4">
                <DailyCheckinButton />
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

          {/* Quartier-Info-Bar (Wetter, Pollen, Muellabfuhr) */}
          <InfoBar />

          {/* Einladungs-Code Banner (Caregiver/Plus) */}
          <RedeemCodeBanner />

          {/* Profilvervollstaendigung */}
          {profileData && (
            <ProfileCompletionBanner
              userId={profileData.userId}
              avatarUrl={profileData.avatarUrl}
              bio={profileData.bio}
              phone={profileData.phone}
              hasSkills={profileData.hasSkills}
              settings={profileData.settings}
            />
          )}

          {/* Alerts + Hilfe-Button + Einladen */}
          <AlertBanners
            alerts={alerts}
            onInviteClick={() => setShowInviteModal(true)}
          />

          {/* Services: Kommunal, Hilfe-Boerse, Marktplatz, News, Caregiver */}
          <DashboardServices
            helpRequests={helpRequests}
            marketplaceItems={marketplaceItems}
            news={news}
          />

          {/* Leer-Zustand mit Demo-Vorschau (nur ohne UX-Redesign) */}
          <EmptyState
            alerts={alerts}
            news={news}
            helpRequests={helpRequests}
            marketplaceItems={marketplaceItems}
            quarterName={currentQuarter?.name}
          />
        </div>
      </PullToRefresh>

      {/* FAB Schnell-Hilfe */}
      <FloatingHelpButton />

      {/* Nachbar-Einladungs-Modal */}
      <InviteNeighborModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </>
  );
}
