// components/nav/NavConfig.ts
// Nachbar.io — Rollenadaptive Navigation (UX-Redesign Phase 1)
// Definiert 5 Nav-Items pro Rolle + useNavRole() Hook.
"use client";

import { useState, useEffect } from "react";
import {
  Home,
  TriangleAlert,
  Heart,
  HandHeart,
  User,
  ClipboardList,
  MessageCircle,
  Phone,
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
  /** Farb-Klasse fuer aktives Icon (Tailwind text-*) */
  activeColor: string;
  /** Ist das Notfall-Item (erhoehte Darstellung) */
  isEmergency?: boolean;
}

// --- Nav-Konfigurationen pro Rolle ---

const seniorNav: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Zuhause",
    icon: Home,
    activeColor: "text-quartier-green",
  },
  {
    href: "/alerts/new",
    label: "Notfall",
    icon: TriangleAlert,
    activeColor: "text-alert-amber",
    isEmergency: true,
  },
  {
    href: "/my-day",
    label: "Mein Tag",
    icon: Heart,
    activeColor: "text-emergency-red",
  },
  {
    href: "/hilfe",
    label: "Hilfe",
    icon: HandHeart,
    activeColor: "text-blue-500",
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
    label: "Uebersicht",
    icon: Home,
    activeColor: "text-quartier-green",
  },
  {
    href: "/alerts/new",
    label: "Notfall",
    icon: TriangleAlert,
    activeColor: "text-alert-amber",
    isEmergency: true,
  },
  {
    href: "/hilfe/tasks",
    label: "Einsaetze",
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
    activeColor: "text-quartier-green",
  },
];

const caregiverNav: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Uebersicht",
    icon: Home,
    activeColor: "text-quartier-green",
  },
  {
    href: "/alerts/new",
    label: "Notfall",
    icon: TriangleAlert,
    activeColor: "text-alert-amber",
    isEmergency: true,
  },
  {
    href: "/care/status",
    label: "Status",
    icon: Heart,
    activeColor: "text-quartier-green",
  },
  {
    href: "/care/contact",
    label: "Kontakt",
    icon: Phone,
    activeColor: "text-blue-500",
  },
  {
    href: "/profile",
    label: "Profil",
    icon: User,
    activeColor: "text-violet-500",
  },
];

const orgAdminNav: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Uebersicht",
    icon: Home,
    activeColor: "text-quartier-green",
  },
  {
    href: "/alerts/new",
    label: "Notfall",
    icon: TriangleAlert,
    activeColor: "text-alert-amber",
    isEmergency: true,
  },
  {
    href: "/hilfe",
    label: "Hilfe",
    icon: HandHeart,
    activeColor: "text-blue-500",
  },
  {
    href: "/notifications",
    label: "Nachrichten",
    icon: MessageCircle,
    activeColor: "text-violet-500",
  },
  {
    href: "/profile",
    label: "Profil",
    icon: User,
    activeColor: "text-quartier-green",
  },
];

/** Gibt die Nav-Konfiguration fuer eine Rolle zurueck. */
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
 * Prioritaet: org_admin > caregiver > helper > senior
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
 * Hook: Gibt die aktuelle Nav-Rolle des eingeloggten Users zurueck.
 * Laedt async, Default: "senior".
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
