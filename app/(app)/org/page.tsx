// app/(app)/org/page.tsx
// Nachbar.io — Organisations-Dashboard (Pro Community)
"use client";

import { useEffect, useState } from "react";
import { OrgDashboard } from "@/components/org/OrgDashboard";

// Typdefinition fuer Organisation (aus API-Antwort)
export interface Organization {
  id: string;
  name: string;
  type: "municipality" | "care_service" | "housing" | "social_service";
  verification_status: "pending" | "verified" | "rejected";
  hr_vr_number: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  created_at: string;
  org_members: OrgMember[];
}

export interface OrgMember {
  id: string;
  user_id: string;
  role: "admin" | "viewer";
  assigned_quarters: string[];
}

export default function OrgPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch("/api/organizations");
        if (!res.ok) {
          setError("Organisationsdaten konnten nicht geladen werden.");
          setLoading(false);
          return;
        }

        const data: Organization[] = await res.json();
        // Erste Organisation verwenden (Nutzer gehoert meist zu einer Org)
        setOrg(data.length > 0 ? data[0] : null);
      } catch {
        setError("Verbindungsfehler. Bitte versuchen Sie es spaeter erneut.");
      } finally {
        setLoading(false);
      }
    }

    loadOrg();
  }, []);

  // Ladezustand
  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#4CAF87] border-t-transparent" />
      </div>
    );
  }

  // Fehler
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  // Keine Organisation
  if (!org) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-[#2D3142]">
          Keine Organisation
        </h2>
        <p className="text-sm text-gray-500">
          Sie sind derzeit keiner Organisation zugeordnet. Kontaktieren Sie Ihren
          Administrator, um einer Organisation beitreten zu koennen.
        </p>
      </div>
    );
  }

  return <OrgDashboard org={org} />;
}
