"use client";

import Link from "next/link";
import { haptic } from "@/lib/haptics";
import type { LucideIcon } from "lucide-react";

export interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind-Farbklasse fuer aktiven Zustand */
  activeColor: string;
  isActive: boolean;
  /** Badge-Zahl (z.B. ungelesene Nachrichten) */
  badge?: number;
  /** Notfall-Item: erhoehte Darstellung mit Amber-Ring */
  isEmergency?: boolean;
  /** Senior-Modus: Label immer sichtbar (bereits Standard, hier fuer Klarheit) */
  seniorMode?: boolean;
}

export function NavItem({
  href,
  label,
  icon: Icon,
  activeColor,
  isActive,
  badge,
  isEmergency,
}: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={() => haptic("light")}
      className={`relative flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-all duration-200 ${
        isActive ? activeColor : "text-anthrazit/60 hover:text-anthrazit"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <div
        className={`relative flex items-center justify-center ${
          isEmergency ? "rounded-full ring-2 ring-alert-amber/30 p-0.5" : ""
        } ${isEmergency && !isActive ? "-mt-1" : ""}`}
      >
        <Icon
          className={`h-5 w-5 ${
            isEmergency && !isActive ? "text-alert-amber" : ""
          }`}
        />
        {badge != null && badge > 0 && (
          <span className="animate-badge-pop absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emergency-red text-[10px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span className="leading-tight">{label}</span>
      {/* Active-Dot */}
      {isActive && (
        <span
          className={`absolute -bottom-0.5 h-1 w-1 rounded-full transition-all duration-200 ${activeColor.replace("text-", "bg-")}`}
        />
      )}
    </Link>
  );
}
