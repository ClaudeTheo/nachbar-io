"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/hilfe", label: "Gesuche" },
  { href: "/hilfe/profil", label: "Mein Profil" },
  { href: "/hilfe/budget", label: "Budget" },
  { href: "/hilfe/helfer-werden", label: "Helfer werden" },
];

export function HilfeNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border bg-background px-4 py-2 scrollbar-none"
      role="navigation"
      aria-label="Hilfe-Navigation"
    >
      {navItems.map((item) => {
        const isActive =
          item.href === "/hilfe"
            ? pathname === "/hilfe"
            : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-quartier-green text-white"
                : "text-muted-foreground hover:bg-muted hover:text-anthrazit"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
