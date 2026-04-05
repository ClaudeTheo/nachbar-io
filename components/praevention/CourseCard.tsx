"use client";

import { Heart, Calendar, Users, User } from "lucide-react";

interface CourseCardProps {
  id: string;
  title: string;
  description?: string | null;
  instructor?: { display_name: string } | null;
  startsAt: string;
  endsAt: string;
  maxParticipants: number;
  enrollmentCount: number;
  status: string;
  isEnrolled: boolean;
  onEnroll?: (courseId: string) => void;
}

export function CourseCard({
  id,
  title,
  description,
  instructor,
  startsAt,
  endsAt,
  maxParticipants,
  enrollmentCount,
  status,
  isEnrolled,
  onEnroll,
}: CourseCardProps) {
  const startDate = new Date(startsAt).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const endDate = new Date(endsAt).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const isFull = enrollmentCount >= maxParticipants;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
          <Heart className="h-6 w-6 text-emerald-700" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {status === "active" && (
            <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Aktiv
            </span>
          )}
          {status === "planned" && (
            <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Geplant
            </span>
          )}
        </div>
      </div>

      {/* Beschreibung */}
      {description && (
        <p className="mb-4 text-sm text-gray-600">{description}</p>
      )}

      {/* Info-Reihe */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          <span>
            {startDate} — {endDate}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          <span>
            {enrollmentCount}/{maxParticipants} Teilnehmer
          </span>
        </div>
        {instructor && (
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span>{instructor.display_name}</span>
          </div>
        )}
      </div>

      {/* CTA */}
      {isEnrolled ? (
        <a
          href={`/praevention/${id}`}
          className="block w-full rounded-xl bg-emerald-600 px-4 py-3 text-center text-base font-medium text-white transition-colors hover:bg-emerald-700"
          style={{ minHeight: "48px" }}
        >
          Zum Kurs
        </a>
      ) : (
        <button
          onClick={() => onEnroll?.(id)}
          disabled={isFull}
          className="block w-full rounded-xl bg-emerald-600 px-4 py-3 text-center text-base font-medium text-white transition-colors hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500"
          style={{ minHeight: "48px" }}
        >
          {isFull ? "Kurs voll" : "Jetzt anmelden"}
        </button>
      )}
    </div>
  );
}
