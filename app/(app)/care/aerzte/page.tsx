// app/(app)/care/aerzte/page.tsx
// Nachbar.io — Aerzte-Liste mit Fachgebiet-Filter und Entfernung
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Stethoscope, MapPin, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

// Typ fuer die API-Antwort von /api/doctors
interface Doctor {
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
}

// Filter-Optionen: Label (angezeigt) → Value (API-Parameter)
const FILTER_OPTIONS = [
  { label: "Alle", value: "" },
  { label: "Hausarzt", value: "Allgemeinmedizin" },
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
      {/* Header */}
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
          {doctors.map((doc) => (
            <Link
              key={doc.user_id}
              href={`/care/aerzte/${doc.user_id}`}
              className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                {/* Name */}
                <h3 className="text-base font-semibold text-[#2D3142] truncate">
                  {doc.users?.display_name ?? "Arzt"}
                </h3>

                {/* Fachgebiete */}
                {doc.specialization && doc.specialization.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {doc.specialization.join(" \u00B7 ")}
                  </p>
                )}

                {/* Entfernung */}
                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{doc.distance_km.toFixed(1)} km</span>
                </div>

                {/* Neue Patienten */}
                {doc.accepts_new_patients && (
                  <p className="text-sm font-medium text-[#4CAF87] mt-1">
                    Nimmt neue Patienten an
                  </p>
                )}
              </div>

              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Leerer Zustand */}
      {!loading && doctors.length === 0 && (
        <div className="rounded-xl bg-gray-50 p-8 text-center">
          <Stethoscope className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-lg font-medium text-[#2D3142]">
            Keine Aerzte gefunden
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            In Ihrer Naehe sind aktuell keine Aerzte mit diesem Fachgebiet
            verfuegbar.
          </p>
        </div>
      )}
    </div>
  );
}
