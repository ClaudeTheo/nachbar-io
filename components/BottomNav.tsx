"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Map,
  TriangleAlert,
  Heart,
  Bell,
  User,
  Bot,
  HandHeart,
} from "lucide-react";
import { useUnreadCount } from "@/lib/useUnreadCount";
import { haptic } from "@/lib/haptics";
import { isUxRedesignEnabled } from "@/lib/ux-flags";
import { useNavRole, getNavItems } from "@/components/nav/NavConfig";
import { NavItem } from "@/components/nav/NavItem";

// --- Alte Navigation (8 Items, Fallback) ---

const legacyNavItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/map", label: "Karte", icon: Map },
  { href: "/alerts/new", label: "Notfall", icon: TriangleAlert },
  { href: "/care", label: "Pflege", icon: Heart },
  { href: "/hilfe", label: "Hilfe", icon: HandHeart },
  { href: "/companion", label: "KI-Assistent", icon: Bot },
  { href: "/notifications", label: "Inbox", icon: Bell },
  { href: "/profile", label: "Profil", icon: User },
];

function LegacyBottomNav() {
  const pathname = usePathname();
  const { count: unreadCount } = useUnreadCount();

  return (
    <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
      {legacyNavItems.map((item) => {
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + "/");
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => haptic("light")}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-all duration-200 ${
              isActive
                ? "text-[#2F7A62]"
                : "text-anthrazit/80 hover:text-anthrazit"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <div className="relative">
              <Icon
                className={`h-5 w-5 ${
                  item.href === "/alerts/new" && !isActive
                    ? "text-alert-amber"
                    : ""
                }`}
              />
              {item.href === "/notifications" && unreadCount > 0 && (
                <span className="animate-badge-pop absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emergency-red text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span>{item.label}</span>
            {isActive && (
              <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-quartier-green transition-all duration-200" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

// --- Neue Navigation (4 Items, rollenadaptiv) ---

function RedesignBottomNav() {
  const pathname = usePathname();
  const { count: unreadCount } = useUnreadCount();
  const { role } = useNavRole();
  const items = getNavItems(role);

  return (
    <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + "/");

        return (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            activeColor={item.activeColor}
            isActive={isActive}
            badge={item.href === "/profile" ? unreadCount : undefined}
          />
        );
      })}
    </div>
  );
}

// --- Haupt-Export ---

export function BottomNav() {
  const useRedesign = isUxRedesignEnabled("UX_REDESIGN_NAV");

  return (
    <nav
      className="glass-nav fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      role="navigation"
      aria-label="Hauptnavigation"
    >
      {useRedesign ? <RedesignBottomNav /> : <LegacyBottomNav />}
    </nav>
  );
}
