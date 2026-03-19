"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { REPORT_CATEGORIES, REPORT_STATUS_CONFIG, DISCLAIMERS } from "@/lib/municipal";

export default function ReportsPage() {
  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="rounded-full p-1 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-anthrazit" />
          </Link>
          <h1 className="text-xl font-bold text-anthrazit">Mängelmelder</h1>
        </div>
        <Link
          href="/reports/new"
          className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-medium text-white transition-all hover:bg-quartier-green/90 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Melden
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-alert-amber/30 bg-alert-amber/5 p-3 text-xs text-muted-foreground">
        {DISCLAIMERS.reportCreate}
      </div>

      {/* Filter (Platzhalter) */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button className="flex items-center gap-1 rounded-full bg-anthrazit px-3 py-1.5 text-xs font-medium text-white">
          Alle
        </button>
        {REPORT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className="flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-medium text-anthrazit shadow-soft"
          >
            <span aria-hidden="true">{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* Leerzustand */}
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-3 text-5xl" aria-hidden="true">🔧</div>
        <h2 className="text-lg font-semibold text-anthrazit">Noch keine Meldungen</h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Melden Sie Mängel in Ihrem Quartier — Schlaglöcher, defekte Laternen, illegaler Müll und mehr.
        </p>
        <Link
          href="/reports/new"
          className="mt-4 rounded-lg bg-quartier-green px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-quartier-green/90 active:scale-[0.97]"
        >
          Ersten Mangel melden
        </Link>
      </div>

      {/* Status-Legende */}
      <div className="flex flex-wrap gap-2">
        {REPORT_STATUS_CONFIG.map((s) => (
          <span key={s.id} className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${s.color} ${s.bgColor}`}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
