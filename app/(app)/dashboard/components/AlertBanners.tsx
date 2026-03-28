"use client";

import Link from "next/link";
import { ChevronRight, Plus, UserPlus } from "lucide-react";
import { AlertCard } from "@/components/AlertCard";
import type { Alert } from "@/lib/supabase/types";

// Section-Header Hilfskomponente (intern)
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

// Aktive Hilfeanfragen + Schnell-Hilfe + Nachbar-einladen
export function AlertBanners({
  alerts,
  onInviteClick,
}: {
  alerts: Alert[];
  onInviteClick: () => void;
}) {
  return (
    <>
      {/* Aktive Hilfeanfragen */}
      {alerts.length > 0 && (
        <section>
          <SectionHeader
            title="Aktuelle Hilfeanfragen"
            href="/alerts"
            count={alerts.length}
          />
          <div className="rounded-xl bg-white shadow-soft overflow-hidden animate-stagger">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} compact />
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
        onClick={onInviteClick}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-quartier-green/40 bg-quartier-green/5 p-3 text-sm font-medium text-quartier-green transition-all hover:border-quartier-green hover:bg-quartier-green/10 active:scale-[0.98]"
      >
        <UserPlus className="h-4 w-4" />
        Nachbar einladen — 50 Punkte erhalten
      </button>
    </>
  );
}
