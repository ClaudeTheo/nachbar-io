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
  User,
  ClipboardList,
  Building2,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";

// --- Typen ---

export type NavRole = "senior" | "helper" | "caregiver" | "org_admin";

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
    activeColor: "text-[#4CAF87]",
  },
  {
    href: "/quartier",
    label: "Quartier",
    icon: Building2,
    activeColor: "text-blue-500",
  },
  {
    href: "/care",
    label: "Gesundheit",
    icon: Heart,
    activeColor: "text-red-500",
  },
  {
    href: "/profile",
    label: "Ich",
    icon: User,
    activeColor: "text-violet-500",
  },
];

const helperNav: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Übersicht",
    icon: Home,
    activeColor: "text-[#4CAF87]",
  },
  {
    href: "/hilfe/tasks",
    label: "Einsätze",
    icon: ClipboardList,
    activeColor: "text-blue-500",
  },
  {
    href: "/hilfe/requests",
    label: "Anfragen",
    icon: HandHeart,
    activeColor: "text-violet-500",
  },
  {
    href: "/profile",
    label: "Profil",
    icon: User,
    activeColor: "text-[#4CAF87]",
  },
];

const caregiverNav: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Übersicht",
    icon: Home,
    activeColor: "text-[#4CAF87]",
  },
  {
    href: "/care/status",
    label: "Status",
    icon: Heart,
    activeColor: "text-[#4CAF87]",
  },
  {
    href: "/care",
    label: "Gesundheit",
    icon: HeartPulse,
    activeColor: "text-red-500",
  },
  {
    href: "/profile",
    label: "Ich",
    icon: User,
    activeColor: "text-violet-500",
  },
];

const orgAdminNav: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Übersicht",
    icon: Home,
    activeColor: "text-[#4CAF87]",
  },
  {
    href: "/quartier",
    label: "Quartier",
    icon: Building2,
    activeColor: "text-blue-500",
  },
  {
    href: "/org",
    label: "Verwaltung",
    icon: Shield,
    activeColor: "text-violet-500",
  },
  {
    href: "/profile",
    label: "Ich",
    icon: User,
    activeColor: "text-[#4CAF87]",
  },
];

/** Gibt die Nav-Konfiguration für eine Rolle zurück. */
export function getNavItems(role: NavRole): NavItemConfig[] {
  switch (role) {
    case "helper":
      return helperNav;
    case "caregiver":
      return caregiverNav;
    case "org_admin":
      return orgAdminNav;
    case "senior":
    default:
      return seniorNav;
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
async function detectNavRole(userId: string): Promise<NavRole> {
  const supabase = createClient();

  // Parallele Abfragen
  const [orgResult, caregiverResult, helperResult] = await Promise.all([
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

  if (orgResult.data && orgResult.data.length > 0) return "org_admin";
  if (caregiverResult.data && caregiverResult.data.length > 0)
    return "caregiver";
  if (helperResult.data && helperResult.data.length > 0) return "helper";

  return "senior";
}

// --- React Hook ---

/**
 * Hook: Gibt die aktuelle Nav-Rolle des eingeloggten Users zurück.
 * Lädt async, Default: "senior".
 */
export function useNavRole(): { role: NavRole; loading: boolean } {
  const { user } = useAuth();
  const [role, setRole] = useState<NavRole>("senior");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    detectNavRole(user.id)
      .then((detected) => {
        if (!cancelled) {
          setRole(detected);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { role, loading };
}
