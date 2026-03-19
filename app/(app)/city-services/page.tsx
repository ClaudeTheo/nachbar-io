"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { SERVICE_LINK_CATEGORIES, WIKI_CATEGORIES, DISCLAIMERS } from "@/lib/municipal";

type TabId = "services" | "wiki" | "announcements";

export default function CityServicesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("services");
  const [searchQuery, setSearchQuery] = useState("");

  const tabs: { id: TabId; label: string }[] = [
    { id: "services", label: "Services" },
    { id: "wiki", label: "Hilfe / Wiki" },
    { id: "announcements", label: "Bekanntmachungen" },
  ];

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="rounded-full p-1 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-anthrazit" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Rathaus & Infos</h1>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-anthrazit shadow-soft"
                : "text-muted-foreground hover:text-anthrazit"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Services */}
      {activeTab === "services" && (
        <div className="space-y-4">
          {/* Rathaus-Info-Karte */}
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-transparent p-4">
            <h2 className="font-semibold text-anthrazit">Rathaus Bad Säckingen</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tel. 07761 51-0</p>
            <p className="text-sm text-muted-foreground">info@bad-saeckingen.de</p>
            <div className="mt-2 text-xs text-muted-foreground">
              <p>Mo: 8–12, 14–16 Uhr</p>
              <p>Di–Mi, Fr: 8–12 Uhr</p>
              <p>Do: 8–12, 14–18 Uhr</p>
            </div>
          </div>

          {/* Quicklinks — Platzhalter */}
          <div className="space-y-3">
            {SERVICE_LINK_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat.label}
                </h3>
                <div className="flex flex-col items-center rounded-lg bg-white py-4 shadow-soft">
                  <p className="text-xs text-muted-foreground">Links werden nach DB-Einrichtung geladen.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Wiki / FAQ */}
      {activeTab === "wiki" && (
        <div className="space-y-3">
          {/* Suchfeld */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche: z.B. Schlagloch, Müll, Parkausweis..."
              className="w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm text-anthrazit placeholder:text-muted-foreground focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
            />
          </div>

          {/* Wiki-Kategorien — Platzhalter */}
          {WIKI_CATEGORIES.map((cat) => (
            <div key={cat.id} className="rounded-lg bg-white p-3 shadow-soft">
              <h3 className="text-sm font-semibold text-anthrazit">{cat.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Einträge werden nach DB-Einrichtung geladen.
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Bekanntmachungen */}
      {activeTab === "announcements" && (
        <div className="space-y-3">
          {/* Leerzustand */}
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-3 text-4xl" aria-hidden="true">📢</div>
            <h2 className="text-lg font-semibold text-anthrazit">Keine Bekanntmachungen</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Aktuelle Bekanntmachungen für Ihr Quartier erscheinen hier.
            </p>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-[10px] text-muted-foreground">
            {DISCLAIMERS.announcements}
          </p>
        </div>
      )}
    </div>
  );
}
