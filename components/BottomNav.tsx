"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, AlertTriangle, MessageCircle, User } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/map", label: "Karte", icon: Map },
  { href: "/alerts/new", label: "Hilfe", icon: AlertTriangle },
  { href: "/help", label: "Börse", icon: MessageCircle },
  { href: "/profile", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 backdrop-blur-sm safe-bottom"
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
              className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors ${
                isActive
                  ? "text-quartier-green"
                  : "text-muted-foreground hover:text-anthrazit"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={`h-5 w-5 ${
                  item.href === "/alerts/new" && !isActive
                    ? "text-alert-amber"
                    : ""
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
