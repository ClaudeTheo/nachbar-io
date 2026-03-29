"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus, UserPlus } from "lucide-react";
import { AlertCard } from "@/components/AlertCard";
import { haptic } from "@/lib/haptics";
import type { Alert } from "@/lib/supabase/types";

// Aktive Hilfeanfragen (collapsible) + Schnell-Hilfe + Nachbar-einladen
export function AlertBanners({
  alerts,
  onInviteClick,
}: {
  alerts: Alert[];
  onInviteClick: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Aktive Hilfeanfragen — eingeklappt, per Tap aufklappbar */}
      {alerts.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => { setIsOpen(!isOpen); haptic("light"); }}
            className="mb-2 flex w-full items-center justify-between px-4"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2D3142]/40">
                Aktuelle Hilfeanfragen
              </h2>
              <span className="text-xs font-medium text-alert-amber bg-alert-amber/10 px-1.5 py-0.5 rounded-full">
                {alerts.length}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
            <div className="overflow-hidden">
              <div className="rounded-xl bg-white shadow-soft overflow-hidden animate-stagger">
                {alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} compact />
                ))}
              </div>
            </div>
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
