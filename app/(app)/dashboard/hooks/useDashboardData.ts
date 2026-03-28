"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

// Profildaten-Typ
export interface ProfileData {
  userId: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  hasSkills: boolean;
  settings: Record<string, unknown> | null;
}

// Wetterdaten-Typ
export interface WeatherData {
  icon: string;
  temp: number | null;
  description: string;
}

// Angehoerigen-Typ
export interface CaregiverInfo {
  caregiver_id: string;
  display_name?: string;
  avatar_url?: string;
}

// Rueckgabetyp des Hooks
export interface DashboardData {
  alerts: Alert[];
  news: NewsItem[];
  helpRequests: HelpRequest[];
  marketplaceItems: MarketplaceItem[];
  userName: string;
  reputationLevel: number;
  loading: boolean;
  profileData: ProfileData | null;
  weatherData: WeatherData | null;
  caregivers: CaregiverInfo[];
  unreadCount: number;
  currentQuarter: ReturnType<typeof useQuarter>["currentQuarter"];
  quarterLoading: boolean;
  showInviteModal: boolean;
  setShowInviteModal: (v: boolean) => void;
  loadDashboard: () => Promise<void>;
}

// Tageszeit-abhaengige Begruessung
export function getGreeting(): { text: string; timeKey: string } {
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

// Haupt-Hook: Laedt alle Dashboard-Daten und verwaltet State
export function useDashboardData(): DashboardData {
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
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Wetterdaten fuer Hero-Hintergrund
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  // Angehoerige (caregiver_links)
  const [caregivers, setCaregivers] = useState<CaregiverInfo[]>([]);

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

        // Angehoerige laden (caregiver_links ohne Join)
        const { data: caregiverLinks } = await supabase
          .from("caregiver_links")
          .select("caregiver_id")
          .eq("resident_id", user.id)
          .is("revoked_at", null)
          .limit(5);

        if (caregiverLinks && caregiverLinks.length > 0) {
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

      // Parallele Datenabfragen
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
            .order("type", { ascending: true })
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

  return {
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
  };
}
