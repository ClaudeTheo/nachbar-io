// app/(app)/care/aerzte/page.tsx
// Nachbar.io — Aerzte-Liste mit Fachgebiet-Filter und Entfernung.
//
// Welle Doctor-Discovery (Plan 2026-05-11): kombiniert registrierte Aerzte
// (doctor_profiles) mit Verzeichnis-Eintraegen (external_doctors, gecrawlt
// via OSM Overpass beim Quartier-Onboarding).
// - Registrierte Aerzte: Karte verlinkt auf Profil, Termin-Buchung moeglich.
// - Externe Aerzte: "Verzeichnis"-Badge oben rechts, statt Termin-Buchung
//   Telefon- + Website-Buttons (Founder-Entscheidung 2b+c, 4b).
//
// Visual-Polish v7 Welle A1 (2026-05-12): Magazin-Hero statt PageHeader,
// Brand-Tokens statt hartcodierter Hex, Lifted-Cream-Karten + Footer-Logo.
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, ChevronRight, Phone, Globe } from "lucide-react";
import { MagazineHeader } from "@/components/brand/MagazineHeader";
import { QuartierAppLogo } from "@/components/brand/QuartierAppLogo";
import { ExternalLink as SafeExternalLink } from "@/components/ExternalLink";
import { useQuarter } from "@/lib/quarters";

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
  const { currentQuarter } = useQuarter();
  const quartierName = (currentQuarter?.name ?? "Ihr Quartier").toUpperCase();

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
    <div className="space-y-10 py-10 pb-24 md:py-14">
      <MagazineHeader
        eyebrow={`AERZTE · ${quartierName}`}
        title="Ärzte in der Nähe"
        subtitle="Im Umkreis von 20 km"
        backHref="/care"
        backLabel="Zurück zur Pflege"
      />

      {/* Filter-Leiste: horizontal scrollbar, Brand-Tokens. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setActiveFilter(opt.value)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeFilter === opt.value
                ? "bg-quartier-green text-white"
                : "bg-lifted-cream text-anthrazit hover:bg-anthrazit-tint"
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
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-lifted-cream"
            />
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

      {/* Leerer Zustand: ehrliche Pilot-Botschaft (Lifted-Cream + Hairline). */}
      {!loading && doctors.length === 0 && (
        <div className="rounded-xl border border-anthrazit-tint bg-lifted-cream p-8 text-center">
          <p className="text-lg font-semibold text-anthrazit">
            Ärzte werden noch eingebunden
          </p>
          <p className="mt-2 text-sm text-anthrazit-light">
            Ärzte für Ihr Quartier sind in der Pilot-Phase noch nicht
            automatisch eingebunden. Wir arbeiten an einer automatischen
            Ärzte-Suche für neue Quartiere
            {activeFilter
              ? ""
              : " (Allgemeinmedizin, Augenheilkunde, Orthopädie u.a.)"}
            .
          </p>
        </div>
      )}

      {/* Footer-Signatur — Visual-Polish v7 Konsistenz mit Dashboard. */}
      <footer className="flex justify-center pt-8 pb-2 opacity-70">
        <QuartierAppLogo variant="symbol" size={40} />
      </footer>
    </div>
  );
}

function RegisteredDoctorCard({ doc }: { doc: RegisteredDoctor }) {
  return (
    <Link
      href={`/care/aerzte/${doc.user_id}`}
      className="flex items-center gap-3 rounded-xl border border-anthrazit-tint bg-lifted-cream p-4 transition-colors hover:bg-warmwhite"
      data-testid="doctor-card-registered"
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-anthrazit">
          {doc.users?.display_name ?? "Arzt"}
        </h3>
        {doc.specialization && doc.specialization.length > 0 && (
          <p className="mt-0.5 truncate text-sm text-anthrazit-light">
            {doc.specialization.join(" · ")}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1 text-sm text-anthrazit-light">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{doc.distance_km.toFixed(1)} km</span>
        </div>
        {doc.accepts_new_patients && (
          <p className="mt-1 text-sm font-medium text-quartier-green">
            Nimmt neue Patienten an
          </p>
        )}
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-anthrazit-light"
        aria-hidden="true"
      />
    </Link>
  );
}

function ExternalDoctorCard({ doc }: { doc: ExternalDoctor }) {
  const hasContact = Boolean(doc.phone || doc.website);
  return (
    <div
      className="rounded-xl border border-anthrazit-tint bg-lifted-cream p-4"
      data-testid="doctor-card-external"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-anthrazit">
            {doc.name}
          </h3>
          {doc.specialization.length > 0 && (
            <p className="mt-0.5 text-sm text-anthrazit-light">
              {doc.specialization.join(" · ")}
            </p>
          )}
          <div className="mt-1 flex items-center gap-1 text-sm text-anthrazit-light">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
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
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-quartier-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-quartier-green-dark"
              data-testid="external-doctor-call"
            >
              <Phone className="h-4 w-4" aria-hidden="true" /> Anrufen
            </a>
          )}
          {doc.website && (
            <SafeExternalLink
              href={doc.website}
              title={`Website von ${doc.name}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-anthrazit-tint bg-warmwhite px-4 py-2 text-sm font-medium text-anthrazit transition-colors hover:bg-lifted-cream"
              data-testid="external-doctor-website"
            >
              <Globe className="h-4 w-4" aria-hidden="true" /> Website
            </SafeExternalLink>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-anthrazit-light">
        Verzeichnis-Eintrag aus OpenStreetMap. Keine direkte App-Anbindung —
        Termine bitte über Praxis-Telefon oder Website.
      </p>
    </div>
  );
}
