// app/(app)/care/aerzte/page.tsx
// Nachbar.io — Aerzte-Liste mit Fachgebiet-Filter und Entfernung.
//
// Welle Doctor-Discovery (Plan 2026-05-11): kombiniert registrierte Aerzte
// (doctor_profiles) mit Verzeichnis-Eintraegen (external_doctors, gecrawlt
// via OSM Overpass beim Quartier-Onboarding).
// - Registrierte Aerzte: Karte verlinkt auf Profil, Termin-Buchung moeglich.
// - Externe Aerzte: "Verzeichnis"-Badge oben rechts, statt Termin-Buchung
//   Telefon- + Website-Buttons (Founder-Entscheidung 2b+c, 4b).
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Stethoscope,
  MapPin,
  ChevronRight,
  Phone,
  Globe,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ExternalLink as SafeExternalLink } from "@/components/ExternalLink";

interface RegisteredDoctor {
  user_id: string;
  specialization: string[] | null;
  bio: string | null;
  visible: boolean;
  accepts_new_patients: boolean;
  video_consultation: boolean;
  quarter_ids: string[] | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  phone: string | null;
  distance_km: number;
  users: {
    display_name: string;
    avatar_url: string | null;
  } | null;
  is_external: false;
}

interface ExternalDoctor {
  id: string;
  source: "osm" | "kbv" | "manual";
  source_ref: string;
  name: string;
  specialization: string[];
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
  is_external: true;
}

type Doctor = RegisteredDoctor | ExternalDoctor;

// Filter-Optionen: Label (angezeigt) → Value (API-Parameter)
// Werte spiegeln die KBV-Whitelist aus lib/doctors/osm-doctors-client.ts.
const FILTER_OPTIONS = [
  { label: "Alle", value: "" },
  { label: "Hausarzt", value: "Allgemein" },
  { label: "Zahnarzt", value: "Zahnarzt" },
  { label: "Augenarzt", value: "Augenheilkunde" },
  { label: "Orthopaedie", value: "Orthopaedie" },
] as const;

export default function AerzteListePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const url = activeFilter
          ? `/api/doctors?specialization=${encodeURIComponent(activeFilter)}`
          : "/api/doctors";
        const res = await fetch(url);
        if (res.ok) {
          const data: Doctor[] = await res.json();
          setDoctors(data);
        }
      } catch {
        // Stille Fehlerbehandlung — leere Liste zeigen
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeFilter]);

  return (
    <div className="px-4 py-6 space-y-5 pb-24">
      <PageHeader
        title={
          <>
            <Stethoscope className="h-6 w-6 text-quartier-green" /> Aerzte in
            der Naehe
          </>
        }
        subtitle="Im Umkreis von 20 km"
        backHref="/care"
        backLabel="Zurueck zur Pflege"
      />

      {/* Filter-Leiste: horizontal scrollbar */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setActiveFilter(opt.value)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeFilter === opt.value
                ? "bg-[#4CAF87] text-white"
                : "bg-gray-100 text-[#2D3142] hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Lade-Zustand */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Aerzte-Karten */}
      {!loading && doctors.length > 0 && (
        <div className="space-y-3">
          {doctors.map((doc) => {
            if (doc.is_external) {
              return <ExternalDoctorCard key={`ext-${doc.id}`} doc={doc} />;
            }
            return <RegisteredDoctorCard key={doc.user_id} doc={doc} />;
          })}
        </div>
      )}

      {/* Leerer Zustand: ehrliche Pilot-Botschaft */}
      {!loading && doctors.length === 0 && (
        <div className="rounded-xl bg-gray-50 p-8 text-center">
          <Stethoscope className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-lg font-medium text-[#2D3142]">
            Aerzte werden noch eingebunden
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Aerzte fuer Ihr Quartier sind in der Pilot-Phase noch nicht
            automatisch eingebunden. Wir arbeiten an einer automatischen
            Aerzte-Suche fuer neue Quartiere
            {activeFilter
              ? ""
              : " (Allgemeinmedizin, Augenheilkunde, Orthopaedie u.a.)"}
            .
          </p>
        </div>
      )}
    </div>
  );
}

function RegisteredDoctorCard({ doc }: { doc: RegisteredDoctor }) {
  return (
    <Link
      href={`/care/aerzte/${doc.user_id}`}
      className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:bg-gray-50 transition-colors"
      data-testid="doctor-card-registered"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-[#2D3142] truncate">
          {doc.users?.display_name ?? "Arzt"}
        </h3>
        {doc.specialization && doc.specialization.length > 0 && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {doc.specialization.join(" · ")}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>{doc.distance_km.toFixed(1)} km</span>
        </div>
        {doc.accepts_new_patients && (
          <p className="text-sm font-medium text-[#4CAF87] mt-1">
            Nimmt neue Patienten an
          </p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </Link>
  );
}

function ExternalDoctorCard({ doc }: { doc: ExternalDoctor }) {
  const hasContact = Boolean(doc.phone || doc.website);
  return (
    <div
      className="rounded-xl border bg-white p-4"
      data-testid="doctor-card-external"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[#2D3142]">
            {doc.name}
          </h3>
          {doc.specialization.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {doc.specialization.join(" · ")}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{doc.distance_km.toFixed(1)} km</span>
            {doc.address ? (
              <span className="ml-1 truncate"> · {doc.address}</span>
            ) : null}
          </div>
        </div>
        {/* Founder 4b: Badge "Verzeichnis" oben rechts */}
        <span
          className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700"
          data-testid="external-doctor-badge"
        >
          Verzeichnis
        </span>
      </div>

      {/* Founder 2b+c: Anrufen + Website statt Termin-Buchung */}
      {hasContact && (
        <div className="mt-3 flex flex-wrap gap-2">
          {doc.phone && (
            <a
              href={`tel:${doc.phone.replace(/\s/g, "")}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#4CAF87] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3F9572]"
              data-testid="external-doctor-call"
            >
              <Phone className="h-4 w-4" /> Anrufen
            </a>
          )}
          {doc.website && (
            <SafeExternalLink
              href={doc.website}
              title={`Website von ${doc.name}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#2D3142] transition-colors hover:bg-gray-50"
              data-testid="external-doctor-website"
            >
              <Globe className="h-4 w-4" /> Website
            </SafeExternalLink>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Verzeichnis-Eintrag aus OpenStreetMap. Keine direkte App-Anbindung —
        Termine bitte ueber Praxis-Telefon oder Website.
      </p>
    </div>
  );
}
