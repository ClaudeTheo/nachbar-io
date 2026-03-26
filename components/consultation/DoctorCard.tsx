"use client";

import { Star, Video, Calendar } from "lucide-react";

interface DoctorProfile {
  id: string;
  user_id: string;
  specialization: string[];
  bio: string | null;
  avatar_url: string | null;
  video_consultation: boolean;
  accepts_new_patients: boolean;
}

interface DoctorCardProps {
  doctor: DoctorProfile;
  onRequestAppointment: (doctorId: string) => void;
}

export function DoctorCard({ doctor, onRequestAppointment }: DoctorCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-anthrazit/10 text-xl font-bold text-anthrazit">
          {doctor.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doctor.avatar_url}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <span aria-hidden="true">DR</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Fachrichtungen */}
          <div className="flex flex-wrap gap-1.5">
            {doctor.specialization.map((spec) => (
              <span
                key={spec}
                className="inline-block rounded-full bg-quartier-green/10 px-2.5 py-0.5 text-xs font-medium text-quartier-green"
              >
                {spec}
              </span>
            ))}
          </div>

          {/* Bio */}
          {doctor.bio && (
            <p className="mt-2 text-sm text-anthrazit/70 line-clamp-2">
              {doctor.bio}
            </p>
          )}

          {/* Badges */}
          <div className="mt-2 flex items-center gap-3 text-xs text-anthrazit/50">
            {doctor.video_consultation && (
              <span className="flex items-center gap-1">
                <Video className="h-3.5 w-3.5" />
                Videosprechstunde
              </span>
            )}
            {doctor.accepts_new_patients && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                Nimmt neue Patienten
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Terminwunsch-Button (80px Seniorenmodus) */}
      <button
        onClick={() => onRequestAppointment(doctor.user_id)}
        className="mt-4 flex min-h-[80px] w-full items-center justify-center gap-2 rounded-2xl bg-quartier-green text-lg font-semibold text-white transition-colors hover:bg-quartier-green/90 active:bg-quartier-green/80"
      >
        <Calendar className="h-5 w-5" />
        Termin anfragen
      </button>
    </div>
  );
}
