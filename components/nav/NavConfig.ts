// components/nav/NavConfig.ts
// Nachbar.io — Rollenadaptive Navigation (4-Tab-Layout)
// 4 Nav-Items pro Rolle + useNavRole() Hook.
"use client";

import { useState, useEffect } from "react";
import {
  Home,
  Heart,
  HeartPulse,
  HandHeart,
  Map,
  Repeat2,
  User,
  ClipboardList,
  Building2,
  Shield,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { isUserUiMode, type UserUiMode } from "@/lib/user-modes";

// --- Typen ---

export type NavRole = "senior" | "helper" | "caregiver" | "org_admin" | "youth";

interface NavResolution {
  role: NavRole;
  uiMode: UserUiMode | null;
}

interface NavItemsOptions {
  uiMode?: UserUiMode | null;
}

export interface NavItemConfig {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Farb-Klasse für aktives Icon (Tailwind text-*) */
  activeColor: string;
}

// --- Nav-Konfigurationen pro Rolle (4 Tabs) ---

const seniorNav: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Start",
    icon: Home,
    activeColor: "text-[#2F7A62]",
  },
  {
    // Task B-5: Drift-Aufloesung — /quartier-info ist der Gewinner.
    // /quartier redirectet serverseitig, aber wir verlinken hier direkt,
    // um den Redirect-Flash im Tab-Wechsel zu vermeiden.
    href: "/quartier-info",
    label: "Mein Quartier",
    icon: Building2,
    activeColor: "text-blue-700",
  },
  {
    href: "/my-day",
    label: "Mein Tag",
    icon: Heart,
    activeColor: "text-red-700",
  },
  {
    href: "/profile",
    label: "Ich",
    icon: User,
    activeColor: "text-violet-700",
  },
];

const helperNav: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Übersicht",
    icon: Home,
    activeColor: "text-[#2F7A62]",
  },
  {
    href: "/hilfe/tasks",
    label: "Einsätze",
    icon: ClipboardList,
    activeColor: "text-blue-700",
  },
  {
    href: "/hilfe/requests",
    label: "Anfragen",
    icon: HandHeart,
    activeColor: "text-violet-700",
  },
  {
    href: "/profile",
    label: "Profil",
    icon: User,
    activeColor: "text-[#2F7A62]",
  },
];

const caregiverNav: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Übersicht",
    icon: Home,
    activeColor: "text-[#2F7A62]",
  },
  {
    href: "/care/status",
    label: "Status",
    icon: Heart,
    activeColor: "text-[#2F7A62]",
  },
  {
    href: "/my-day",
    label: "Mein Tag",
    icon: HeartPulse,
    activeColor: "text-red-700",
  },
  {
    href: "/profile",
    label: "Ich",
    icon: User,
    activeColor: "text-violet-700",
  },
];

const orgAdminNav: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Übersicht",
    icon: Home,
    activeColor: "text-[#2F7A62]",
  },
  {
    // Task B-5: Drift-Aufloesung — /quartier-info ist der Gewinner (analog seniorNav).
    href: "/quartier-info",
    label: "Mein Quartier",
    icon: Building2,
    activeColor: "text-blue-700",
  },
  {
    href: "/org",
    label: "Verwaltung",
    icon: Shield,
    activeColor: "text-violet-700",
  },
  {
    href: "/profile",
    label: "Ich",
    icon: User,
    activeColor: "text-[#2F7A62]",
  },
];

const activeResidentNav: NavItemConfig[] = seniorNav.map((item, index) =>
  index === 1 ? { ...item, label: "Quartier" } : item,
);

const youthNav: NavItemConfig[] = [
  {
    href: "/jugend",
    label: "Start",
    icon: Home,
    activeColor: "text-lime-600",
  },
  {
    href: "/map",
    label: "Karte",
    icon: Map,
    activeColor: "text-cyan-600",
  },
  {
    href: "/jugend/tauschen",
    label: "Tauschen",
    icon: Repeat2,
    activeColor: "text-amber-600",
  },
  {
    href: "/jugend/gruppen",
    label: "Gruppen",
    icon: UsersRound,
    activeColor: "text-rose-600",
  },
];

/** Gibt die Nav-Konfiguration für eine Rolle zurück. */
export function getNavItems(
  role: NavRole,
  options: NavItemsOptions = {},
): NavItemConfig[] {
  switch (role) {
    case "youth":
      return youthNav;
    case "helper":
      return helperNav;
    case "caregiver":
      return caregiverNav;
    case "org_admin":
      return orgAdminNav;
    case "senior":
    default:
      return options.uiMode === "active" ? activeResidentNav : seniorNav;
  }
}

// --- Rollen-Erkennung ---

/**
 * Ermittelt die Nav-Rolle eines Users anhand von:
 * 1. org_members → org_admin
 * 2. caregiver_links (aktiv, nicht widerrufen) → caregiver
 * 3. hilfe_helper_profiles (aktiv) → helper
 * 4. Sonst → senior (Default)
 *
 * Priorität: org_admin > caregiver > helper > senior
 */
async function detectNavRole(userId: string): Promise<NavResolution> {
  const supabase = createClient();

  // Parallele Abfragen
  const [profileResult, orgResult, caregiverResult, helperResult] = await Promise.all([
    supabase.from("users").select("ui_mode").eq("id", userId).maybeSingle(),
    supabase.from("org_members").select("id").eq("user_id", userId).limit(1),
    supabase
      .from("caregiver_links")
      .select("id")
      .eq("caregiver_id", userId)
      .is("revoked_at", null)
      .limit(1),
    supabase
      .from("hilfe_helper_profiles")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1),
  ]);

  const rawUiMode = profileResult.data?.ui_mode;
  const uiMode = isUserUiMode(rawUiMode) ? rawUiMode : null;

  if (uiMode === "youth") return { role: "youth", uiMode };
  if (orgResult.data && orgResult.data.length > 0)
    return { role: "org_admin", uiMode };
  if (caregiverResult.data && caregiverResult.data.length > 0)
    return { role: "caregiver", uiMode };
  if (helperResult.data && helperResult.data.length > 0)
    return { role: "helper", uiMode };

  return { role: "senior", uiMode };
}

// --- React Hook ---

/**
 * Hook: Gibt die aktuelle Nav-Rolle des eingeloggten Users zurück.
 * Lädt async, Default: "senior".
 */
export function useNavRole(): {
  role: NavRole;
  uiMode: UserUiMode | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const [resolvedNav, setResolvedNav] = useState<NavResolution>({
    role: "senior",
    uiMode: null,
  });
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let cancelled = false;
    detectNavRole(currentUserId)
      .then((detected) => {
        if (!cancelled) {
          setResolvedNav(detected);
          setResolvedUserId(currentUserId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedNav({ role: "senior", uiMode: null });
          setResolvedUserId(currentUserId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  return {
    role: currentUserId ? resolvedNav.role : "senior",
    uiMode: currentUserId ? resolvedNav.uiMode : null,
    loading: Boolean(currentUserId) && resolvedUserId !== currentUserId,
  };
}
