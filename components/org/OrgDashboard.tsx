// components/org/OrgDashboard.tsx
// Nachbar.io — Organisations-Dashboard Übersicht (Pro Community)
"use client";

import type { Organization } from "@/app/(app)/org/page";
import { QuarterStats } from "./QuarterStats";

// Org-Typ Anzeigenamen (Deutsch)
const ORG_TYPE_LABELS: Record<Organization["type"], string> = {
  municipality: "Gemeinde",
  care_service: "Pflegedienst",
  housing: "Wohnungsbau",
  social_service: "Sozialdienst",
};

// Verifikationsstatus-Konfiguration
const VERIFICATION_CONFIG: Record<
  Organization["verification_status"],
  { label: string; className: string }
> = {
  verified: {
    label: "Verifiziert",
    className: "bg-[#4CAF87]/10 text-[#4CAF87]",
  },
  pending: {
    label: "Ausstehend",
    className: "bg-[#F59E0B]/10 text-[#F59E0B]",
  },
  rejected: {
    label: "Abgelehnt",
    className: "bg-[#EF4444]/10 text-[#EF4444]",
  },
};

interface OrgDashboardProps {
  org: Organization;
}

export function OrgDashboard({ org }: OrgDashboardProps) {
  const typeLabel = ORG_TYPE_LABELS[org.type] ?? org.type;
  const verificationConfig = VERIFICATION_CONFIG[org.verification_status];

  // Zugewiesene Quartiere aus allen Mitgliedern sammeln (dedupliziert)
  const allQuarters = Array.from(
    new Set(org.org_members.flatMap((m) => m.assigned_quarters ?? []))
  );

  return (
    <div className="space-y-6">
      {/* Header: Org-Name, Typ-Badge, Verifikationsstatus */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#2D3142]">{org.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {/* Typ-Badge */}
              <span className="inline-flex items-center rounded-full bg-[#2D3142]/10 px-3 py-1 text-sm font-medium text-[#2D3142]">
                {typeLabel}
              </span>
              {/* Verifikations-Badge */}
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${verificationConfig.className}`}
              >
                {verificationConfig.label}
              </span>
            </div>
          </div>
          {/* HR/VR-Nummer */}
          {org.hr_vr_number && (
            <span className="text-xs text-gray-400">
              HR/VR: {org.hr_vr_number}
            </span>
          )}
        </div>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Bewohner im Quartier */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Bewohner im Quartier</p>
          <p className="mt-1 text-2xl font-bold text-[#2D3142]">--</p>
          <p className="mt-1 text-xs text-gray-400">Daten werden geladen</p>
        </div>

        {/* Aktive Alerts */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Aktive Alerts</p>
          <p className="mt-1 text-2xl font-bold text-[#F59E0B]">--</p>
          <p className="mt-1 text-xs text-gray-400">Daten werden geladen</p>
        </div>

        {/* Check-in-Quote */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Check-in-Quote</p>
          <p className="mt-1 text-2xl font-bold text-[#4CAF87]">-- %</p>
          <p className="mt-1 text-xs text-gray-400">Daten werden geladen</p>
        </div>
      </div>

      {/* Quartier-Statistiken (anonymisiert, aus analytics_snapshots) */}
      {allQuarters.length > 0 && <QuarterStats quarterIds={allQuarters} />}

      {/* Zugewiesene Quartiere */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-[#2D3142]">
          Zugewiesene Quartiere
        </h2>
        {allQuarters.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allQuarters.map((quarter) => (
              <span
                key={quarter}
                className="inline-flex items-center rounded-full border border-[#4CAF87]/30 bg-[#4CAF87]/5 px-3 py-1 text-sm text-[#2D3142]"
              >
                {quarter}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            Noch keine Quartiere zugewiesen.
          </p>
        )}
      </div>

      {/* Kontaktinformationen */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-[#2D3142]">
          Kontakt
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-500">E-Mail:</dt>
            <dd className="text-[#2D3142]">{org.contact_email}</dd>
          </div>
          {org.contact_phone && (
            <div className="flex gap-2">
              <dt className="text-gray-500">Telefon:</dt>
              <dd className="text-[#2D3142]">{org.contact_phone}</dd>
            </div>
          )}
          {org.address && (
            <div className="flex gap-2">
              <dt className="text-gray-500">Adresse:</dt>
              <dd className="text-[#2D3142]">{org.address}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
