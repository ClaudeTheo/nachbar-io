// app/(app)/care/aerzte/[id]/page.tsx
// Nachbar.io — Arzt-Profil mit Bewertungen und Termin-Button
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Stethoscope,
  MapPin,
  Phone,
  Star,
  Video,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

// Typ fuer die API-Antwort von /api/doctors/[id]
interface DoctorProfile {
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
  distance_km: number | null;
  users: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

// Typ fuer die API-Antwort von /api/doctors/[id]/reviews
interface Review {
  id: string;
  rating: number;
  text: string | null;
  created_at: string;
  users: {
    display_name: string;
  } | null;
}

export default function ArztProfilPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const doctorId = params.id;

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!doctorId) return;

    async function load() {
      try {
        const [docRes, revRes] = await Promise.all([
          fetch(`/api/doctors/${doctorId}`),
          fetch(`/api/doctors/${doctorId}/reviews`),
        ]);

        if (docRes.ok) {
          const docData: DoctorProfile = await docRes.json();
          setDoctor(docData);
        } else {
          setError(true);
        }

        if (revRes.ok) {
          const revData: Review[] = await revRes.json();
          setReviews(revData);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [doctorId]);

  // Durchschnittliche Bewertung berechnen
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="h-8 bg-muted rounded w-2/3 animate-pulse" />
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
        <div className="h-20 bg-muted rounded-xl animate-pulse" />
        <div className="h-14 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="px-4 py-6 space-y-4">
        <PageHeader
          title="Arzt nicht gefunden"
          backHref="/care/aerzte"
          backLabel="Zurueck zur Aerzte-Liste"
        />
        <div className="rounded-xl bg-gray-50 p-8 text-center">
          <Stethoscope className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-lg font-medium text-[#2D3142]">
            Dieses Arzt-Profil ist nicht verfuegbar.
          </p>
          <button
            onClick={() => router.push("/care/aerzte")}
            className="mt-4 text-sm font-medium text-[#4CAF87] hover:underline"
          >
            Zur Aerzte-Liste
          </button>
        </div>
      </div>
    );
  }

  const displayName = doctor.users?.display_name ?? "Arzt";
  const shownReviews = reviews.slice(0, 5);

  return (
    <div className="px-4 py-6 space-y-6 pb-32">
      {/* Header */}
      <PageHeader
        title={displayName}
        backHref="/care/aerzte"
        backLabel="Zurueck zur Aerzte-Liste"
      />

      {/* Profil-Karte */}
      <div className="rounded-xl border bg-white p-5 space-y-3">
        {/* Fachgebiete */}
        {doctor.specialization && doctor.specialization.length > 0 && (
          <p className="text-base text-muted-foreground">
            {doctor.specialization.join(" \u00B7 ")}
          </p>
        )}

        {/* Adresse */}
        {doctor.address && (
          <div className="flex items-start gap-2 text-sm text-[#2D3142]">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <span>{doctor.address}</span>
          </div>
        )}

        {/* Telefon */}
        {doctor.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a
              href={`tel:${doctor.phone}`}
              className="text-[#4CAF87] font-medium hover:underline"
            >
              {doctor.phone}
            </a>
          </div>
        )}

        {/* Entfernung */}
        {doctor.distance_km != null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{doctor.distance_km.toFixed(1)} km entfernt</span>
          </div>
        )}

        {/* Neue Patienten */}
        {doctor.accepts_new_patients && (
          <p className="text-sm font-medium text-[#4CAF87]">
            Nimmt neue Patienten an
          </p>
        )}
      </div>

      {/* Bio */}
      {doctor.bio && (
        <div className="rounded-xl border bg-white p-5">
          <h2 className="text-base font-semibold text-[#2D3142] mb-2">
            Ueber den Arzt
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {doctor.bio}
          </p>
        </div>
      )}

      {/* Bewertungen */}
      <div className="rounded-xl border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#2D3142]">
            Bewertungen
          </h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1">
              <StarRating rating={Math.round(avgRating)} />
              <span className="text-sm text-muted-foreground ml-1">
                ({reviews.length})
              </span>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Bewertungen vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {shownReviews.map((review) => (
              <div
                key={review.id}
                className="border-t pt-3 first:border-t-0 first:pt-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#2D3142]">
                    {review.users?.display_name ?? "Patient"}
                  </span>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                {review.text && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {review.text}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {new Date(review.created_at).toLocaleDateString("de-DE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}

            {reviews.length > 5 && (
              <p className="text-sm font-medium text-[#4CAF87] pt-2">
                Alle {reviews.length} Bewertungen anzeigen
              </p>
            )}
          </div>
        )}
      </div>

      {/* Aktions-Buttons (fixiert am unteren Rand) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3 z-10">
        <Link
          href={`/care/termine/buchen/${doctorId}`}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#4CAF87] text-white font-semibold text-lg"
          style={{ minHeight: "80px" }}
        >
          Termin buchen
          <ChevronRight className="h-5 w-5" />
        </Link>

        {doctor.video_consultation && (
          <Link
            href={`/care/termine/buchen/${doctorId}`}
            className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-[#4CAF87] text-[#4CAF87] font-semibold text-base py-3"
          >
            <Video className="h-5 w-5" />
            Video-Sprechstunde
          </Link>
        )}
      </div>
    </div>
  );
}

// Stern-Bewertungs-Anzeige
function StarRating({
  rating,
  size = "md",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${starSize} ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-none text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}
