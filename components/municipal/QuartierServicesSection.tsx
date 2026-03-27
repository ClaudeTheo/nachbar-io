"use client";

import Link from "next/link";
import { Wrench, Trash2, Landmark } from "lucide-react";

interface QuartierServicesProps {
  /** Anzahl offener Mängelmelder-Meldungen */
  openReportsCount?: number;
  /** Nächste Müllabholung (z.B. "Mo: Biotonne") */
  nextWasteInfo?: string;
  /** Anzahl Service-Links */
  serviceLinksCount?: number;
}

export function QuartierServicesSection({
  openReportsCount = 0,
  nextWasteInfo,
  serviceLinksCount = 0,
}: QuartierServicesProps) {
  return (
    <section>
      <h2 className="mb-2 font-semibold text-anthrazit">Quartier-Services</h2>
      <div className="grid grid-cols-3 gap-2">
        {/* Mängelmelder */}
        <Link
          href="/reports"
          className="card-interactive flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 shadow-soft text-center"
          data-testid="service-tile-reports"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-alert-amber/10">
            <Wrench className="h-5 w-5 text-alert-amber" />
          </div>
          <span className="text-xs font-medium text-anthrazit">Mangel melden</span>
          {openReportsCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {openReportsCount} offen
            </span>
          )}
        </Link>

        {/* Müllkalender */}
        <Link
          href="/waste-calendar"
          className="card-interactive flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 shadow-soft text-center"
          data-testid="service-tile-waste"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-quartier-green/10">
            <Trash2 className="h-5 w-5 text-quartier-green" />
          </div>
          <span className="text-xs font-medium text-anthrazit">Quartier-Kalender</span>
          {nextWasteInfo && (
            <span className="text-[10px] text-muted-foreground truncate max-w-full">
              {nextWasteInfo}
            </span>
          )}
        </Link>

        {/* Rathaus & Infos */}
        <Link
          href="/city-services"
          className="card-interactive flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 shadow-soft text-center"
          data-testid="service-tile-city"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <Landmark className="h-5 w-5 text-blue-600" />
          </div>
          <span className="text-xs font-medium text-anthrazit">Rathaus & Infos</span>
          {serviceLinksCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {serviceLinksCount} Services
            </span>
          )}
        </Link>
      </div>
    </section>
  );
}
