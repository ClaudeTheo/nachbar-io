"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronRight, Plus, UserPlus } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { GREETING_ICON_MAP } from "@/lib/category-icons";
import { AlertCard } from "@/components/AlertCard";
import { NewsCard } from "@/components/NewsCard";
import { isUxRedesignEnabled } from "@/lib/ux-flags";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DiscoverGrid } from "@/components/dashboard/DiscoverGrid";
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
import { CaregiverDashboard } from "@/components/care/CaregiverDashboard";
import { QuartierServicesSection } from "@/components/municipal/QuartierServicesSection";
import { HelpRequestsSection } from "@/components/dashboard/help-requests-section";
import { FeatureGate } from "@/components/FeatureGate";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuarter } from "@/lib/quarters";
import { getCachedReputation } from "@/lib/reputation";
import { useUnreadCount } from "@/lib/useUnreadCount";
import { toast } from "sonner";
import type {
  Alert,
  NewsItem,
  HelpRequest,
  MarketplaceItem,
} from "@/lib/supabase/types";

// Tageszeit-abhaengige Begruessung
function getGreeting(): { text: string; timeKey: string } {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11)
    return { text: "Guten Morgen", timeKey: "morning" };
  if (hour >= 11 && hour < 14) return { text: "Mahlzeit", timeKey: "lunch" };
  if (hour >= 14 && hour < 18)
    return { text: "Guten Tag", timeKey: "afternoon" };
  if (hour >= 18 && hour < 22)
    return { text: "Guten Abend", timeKey: "evening" };
  return { text: "Gute Nacht", timeKey: "night" };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>(
    [],
  );
  const [userName, setUserName] = useState("");
  const [reputationLevel, setReputationLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { count: unreadCount } = useUnreadCount();
  const { currentQuarter, loading: quarterLoading } = useQuarter();

  // Profilvervollstaendigung
  const [profileData, setProfileData] = useState<{
    userId: string;
    avatarUrl: string | null;
    bio: string | null;
    phone: string | null;
    hasSkills: boolean;
    settings: Record<string, unknown> | null;
  } | null>(null);

  // Wetterdaten fuer Hero-Hintergrund
  const [weatherData, setWeatherData] = useState<{
    icon: string;
    temp: number | null;
    description: string;
  } | null>(null);

  // Angehörige (caregiver_links)
  const [caregivers, setCaregivers] = useState<
    Array<{
      caregiver_id: string;
      display_name?: string;
      avatar_url?: string;
    }>
  >([]);

  const loadDashboard = useCallback(async () => {
    if (!currentQuarter || !user) return;
    const supabase = createClient();

    try {
      const { data: profile } = await supabase
        .from("users")
        .select(
          "id, display_name, avatar_url, bio, phone, settings, created_at",
        )
        .eq("id", user.id)
        .single();
      if (profile) {
        setUserName(profile.display_name);

        const cached = getCachedReputation(
          profile.settings as Record<string, unknown> | null,
        );
        if (cached && cached.level >= 2) setReputationLevel(cached.level);

        // Onboarding: Nutzer ohne abgeschlossenes Onboarding zur Tour weiterleiten
        // Kein Zeitlimit — Onboarding bleibt offen bis abgeschlossen oder uebersprungen
        // E2E-Tests: Onboarding-Redirect deaktivieren (gleiche Konvention wie e2e_disable_alarm)
        const settings = profile.settings as Record<string, unknown> | null;
        const e2eSkip =
          typeof window !== "undefined" &&
          localStorage.getItem("e2e_skip_onboarding") === "true";
        if (!settings?.onboarding_completed && !e2eSkip) {
          router.push("/welcome");
          return;
        }

        // Profilvervollstaendigung pruefen
        const { count: skillCount } = await supabase
          .from("skills")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id);

        setProfileData({
          userId: profile.id,
          avatarUrl: profile.avatar_url,
          bio: profile.bio,
          phone: profile.phone,
          hasSkills: (skillCount ?? 0) > 0,
          settings,
        });

        // Angehörige laden (caregiver_links ohne Join, da Profile-Tabelle "users" heisst)
        const { data: caregiverLinks } = await supabase
          .from("caregiver_links")
          .select("caregiver_id")
          .eq("resident_id", user.id)
          .is("revoked_at", null)
          .limit(5);

        if (caregiverLinks && caregiverLinks.length > 0) {
          // Angehörigen-Profile nachladen
          const caregiverIds = caregiverLinks.map(
            (l: { caregiver_id: string }) => l.caregiver_id,
          );
          const { data: caregiverProfiles } = await supabase
            .from("users")
            .select("id, display_name, avatar_url")
            .in("id", caregiverIds);

          if (caregiverProfiles) {
            setCaregivers(
              caregiverProfiles.map(
                (p: {
                  id: string;
                  display_name: string;
                  avatar_url: string | null;
                }) => ({
                  caregiver_id: p.id,
                  display_name: p.display_name,
                  avatar_url: p.avatar_url ?? undefined,
                }),
              ),
            );
          }
        }
      }

      // Wetterdaten fuer Hero-Hintergrund laden (nicht-blockierend)
      fetch(`/api/quartier-info?quarter_id=${currentQuarter.id}`)
        .then((res) => res.json())
        .then((d) => {
          if (d?.weather) {
            setWeatherData({
              icon: d.weather.icon,
              temp: d.weather.temp,
              description: d.weather.description,
            });
          }
        })
        .catch(() => {});

      // Parallele Datenabfragen (statt sequentiell)
      const [alertResult, newsResult, helpResult, marketResult] =
        await Promise.all([
          supabase
            .from("alerts")
            .select(
              "*, user:users(display_name, avatar_url), household:households(street_name, house_number, lat, lng)",
            )
            .eq("quarter_id", currentQuarter.id)
            .in("status", ["open", "help_coming"])
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("news_items")
            .select("*")
            .or(`quarter_id.eq.${currentQuarter.id},quarter_id.is.null`)
            .gte("relevance_score", 5)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("help_requests")
            .select("*, user:users(display_name, avatar_url)")
            .eq("quarter_id", currentQuarter.id)
            .eq("status", "active")
            .gte("expires_at", new Date().toISOString())
            .order("type", { ascending: true }) // 'need' vor 'offer' (Prioritaet)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("marketplace_items")
            .select("*, user:users(display_name, avatar_url)")
            .eq("quarter_id", currentQuarter.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

      if (alertResult.data) setAlerts(alertResult.data as unknown as Alert[]);
      if (newsResult.data) setNews(newsResult.data);
      if (helpResult.data)
        setHelpRequests(helpResult.data as unknown as HelpRequest[]);
      if (marketResult.data)
        setMarketplaceItems(marketResult.data as unknown as MarketplaceItem[]);
    } catch {
      toast.error("Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [router, currentQuarter, user]);

  useEffect(() => {
    loadDashboard();

    // Realtime-Subscription fuer neue Alerts
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => {
          loadDashboard();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

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
        <h1 className="text-xl font-bold text-anthrazit">
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
                      className="flex items-center gap-2 text-2xl font-bold text-anthrazit"
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

          {/* Angehörige-Schnellzugriff */}
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

          {/* Aktive Hilfeanfragen */}
          {alerts.length > 0 && (
            <section>
              <SectionHeader
                title="Aktuelle Hilfeanfragen"
                href="/alerts"
                count={alerts.length}
              />
              <div className="divide-y divide-[#ebe5dd] animate-stagger">
                {alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </section>
          )}

          {/* Schnell-Hilfe Button — Gradient Amber */}
          <Link
            href="/alerts/new"
            className="animate-btn-bounce flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-alert-amber to-amber-400 p-4 font-semibold text-anthrazit transition-all duration-200 active:scale-[0.97]"
            data-testid="create-help-button"
          >
            <Plus className="h-5 w-5" />
            Hilfe anfragen
          </Link>

          {/* Nachbar einladen */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-quartier-green/40 bg-quartier-green/5 p-3 text-sm font-medium text-quartier-green transition-all hover:border-quartier-green hover:bg-quartier-green/10 active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            Nachbar einladen — 50 Punkte erhalten
          </button>

          {/* Quartier-Services (Kommunal-Modul) — hinter Feature-Flag */}
          <FeatureGate feature="KOMMUNAL_MODULE">
            <QuartierServicesSection />
          </FeatureGate>

          {/* Hilfe-Boerse — nur letzte 24h, wegwischbar */}
          {helpRequests.length > 0 && (
            <HelpRequestsSection requests={helpRequests} />
          )}

          {/* Marktplatz */}
          {marketplaceItems.length > 0 && (
            <section>
              <SectionHeader title="Marktplatz" href="/marketplace" />
              <div className="divide-y divide-[#ebe5dd]">
                {marketplaceItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/marketplace/${item.id}`}
                    className="flex items-center justify-between px-4 py-4 transition-colors active:bg-[#f5f0eb]"
                  >
                    <div>
                      <p className="font-medium text-anthrazit">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.user?.display_name} ·{" "}
                        {item.price ? `${item.price} €` : "Geschenkt"}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {item.type === "give"
                        ? "Geschenkt"
                        : item.type === "lend"
                          ? "Leihen"
                          : "Kaufen"}
                    </Badge>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Quartiersnews */}
          {news.length > 0 && (
            <section>
              <SectionHeader title="Quartiersnews" href="/news" />
              <div className="divide-y divide-[#ebe5dd]">
                {news.map((item) => (
                  <NewsCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Angehoerigen-Dashboard (Caregiver/Plus) */}
          <CaregiverDashboard />

          {/* UX-Redesign: QuickActions + DiscoverGrid */}
          {isUxRedesignEnabled("UX_REDESIGN_DASHBOARD") && (
            <>
              <QuickActions />
              <DiscoverGrid />
            </>
          )}

          {/* Leer-Zustand mit Demo-Vorschau (nur ohne UX-Redesign) */}
          {!isUxRedesignEnabled("UX_REDESIGN_DASHBOARD") &&
            alerts.length === 0 &&
            news.length === 0 &&
            helpRequests.length === 0 &&
            marketplaceItems.length === 0 && (
              <div className="space-y-4">
                <div className="py-6 text-center">
                  <div className="mb-3 text-5xl" aria-hidden="true">
                    🏘️
                  </div>
                  <h2 className="text-lg font-semibold text-anthrazit">
                    Willkommen in Ihrem Quartier
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {currentQuarter?.name ?? "Ihr Quartier"}
                  </p>
                </div>

                {/* Demo-News als Vorschau */}
                <section>
                  <SectionHeader title="Quartiersnews" href="/news" />
                  <div className="space-y-2">
                    <div className="rounded-lg bg-white p-3 shadow-soft">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span aria-hidden="true">🏗️</span>
                        <span>Infrastruktur</span>
                        <span>·</span>
                        <span>Heute</span>
                      </div>
                      <p className="mt-1 font-medium text-anthrazit">
                        Kanalarbeiten in Ihrem Quartier ab Montag
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Halbseitige Sperrung für ca. 3 Tage.
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-3 shadow-soft">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span aria-hidden="true">♻️</span>
                        <span>Abfallwirtschaft</span>
                        <span>·</span>
                        <span>Gestern</span>
                      </div>
                      <p className="mt-1 font-medium text-anthrazit">
                        Gelber Sack: Nächste Abholung Donnerstag
                      </p>
                    </div>
                  </div>
                </section>

                {/* Schnelleinstieg */}
                <section>
                  <h2 className="mb-2 font-semibold text-anthrazit">
                    Entdecken
                  </h2>
                  <div className="grid grid-cols-4 gap-2">
                    <Link
                      href="/board"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        📌
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Brett
                      </span>
                    </Link>
                    <Link
                      href="/whohas"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        🔍
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Wer hat?
                      </span>
                    </Link>
                    <Link
                      href="/noise"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        🔨
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Lärm
                      </span>
                    </Link>
                    <Link
                      href="/map"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        🗺️
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Karte
                      </span>
                    </Link>
                    <Link
                      href="/help"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        🤝
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Hilfe
                      </span>
                    </Link>
                    <Link
                      href="/marketplace"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        🛒
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Marktplatz
                      </span>
                    </Link>
                    <Link
                      href="/events"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        📅
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Events
                      </span>
                    </Link>
                    <Link
                      href="/messages"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        💬
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Chat
                      </span>
                    </Link>
                    <Link
                      href="/reports"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        🔧
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Mängel
                      </span>
                    </Link>
                    <Link
                      href="/waste-calendar"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        🗑️
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Kalender
                      </span>
                    </Link>
                    <Link
                      href="/city-services"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        🏛️
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Rathaus
                      </span>
                    </Link>
                    <Link
                      href="/lost-found"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        📎
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Fundbüro
                      </span>
                    </Link>
                    <Link
                      href="/experts"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        ⭐
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Experten
                      </span>
                    </Link>
                    <Link
                      href="/tips"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        💡
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Tipps
                      </span>
                    </Link>
                    <Link
                      href="/handwerker"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        🔧
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Handwerker
                      </span>
                    </Link>
                    <Link
                      href="/care/shopping"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        🛒
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Einkaufshilfe
                      </span>
                    </Link>
                    <Link
                      href="/care/tasks"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        📋
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Aufgabentafel
                      </span>
                    </Link>
                    <Link
                      href="/sprechstunde"
                      className="flex flex-col items-center gap-1 card-interactive rounded-lg bg-white p-3 shadow-soft"
                    >
                      <span className="text-2xl" aria-hidden="true">
                        🩺
                      </span>
                      <span className="text-xs font-medium text-anthrazit">
                        Sprechstunde
                      </span>
                    </Link>
                  </div>
                </section>
              </div>
            )}
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

// Section-Header Komponente
function SectionHeader({
  title,
  href,
  count,
}: {
  title: string;
  href: string;
  count?: number;
}) {
  return (
    <div className="mb-2 flex items-center justify-between px-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2D3142]/40">
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-2 normal-case tracking-normal text-alert-amber">
            ({count})
          </span>
        )}
      </h2>
      <Link
        href={href}
        className="flex items-center text-xs font-semibold text-quartier-green hover:underline"
      >
        Alle <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
