"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, AlertTriangle, Heart, Bell, User } from "lucide-react";
import { useUnreadCount } from "@/lib/useUnreadCount";
import { haptic } from "@/lib/haptics";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/map", label: "Karte", icon: Map },
  { href: "/alerts/new", label: "Hilfe", icon: AlertTriangle },
  { href: "/care", label: "Pflege", icon: Heart },
  { href: "/notifications", label: "Inbox", icon: Bell },
  { href: "/profile", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { count: unreadCount } = useUnreadCount();

  return (
    <nav
      className="glass-nav fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      role="navigation"
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navItems.map((item) => {
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
                  ? "text-quartier-green"
                  : "text-muted-foreground hover:text-anthrazit"
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
              {/* Active-Dot */}
              {isActive && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-quartier-green transition-all duration-200" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
