// components/doctor/DoctorProfile.tsx
// Nachbar.io — Arzt-Profilkarte für Bewohner-Ansicht
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Video, MapPin, Calendar } from "lucide-react";
import Link from "next/link";

export type DoctorProfileData = {
  id: string;
  user_id: string;
  name: string;
  specialization: string[];
  bio: string;
  visible: boolean;
  accepts_new_patients: boolean;
  video_consultation: boolean;
  avg_rating: number;
  review_count: number;
  quarter_names: string[];
};

type DoctorProfileProps = {
  doctor: DoctorProfileData;
  showBookButton?: boolean;
};

export function DoctorProfile({
  doctor,
  showBookButton = true,
}: DoctorProfileProps) {
  return (
    <Card data-testid="doctor-profile">
      <CardContent className="p-5">
        {/* Name + Fachgebiete */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#2D3142]">{doctor.name}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {doctor.specialization.map((spec) => (
                <Badge key={spec} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
          {/* Bewertung */}
          {doctor.review_count > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
              <span className="font-semibold">
                {doctor.avg_rating.toFixed(1)}
              </span>
              <span className="text-gray-400">({doctor.review_count})</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {doctor.bio && (
          <p className="mt-3 text-sm text-gray-600 line-clamp-3">
            {doctor.bio}
          </p>
        )}

        {/* Status-Badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          {doctor.accepts_new_patients && (
            <span className="inline-flex items-center rounded-full bg-[#4CAF87]/10 px-2.5 py-0.5 text-xs font-medium text-[#4CAF87]">
              Nimmt neue Patienten auf
            </span>
          )}
          {doctor.video_consultation && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
              <Video className="h-3 w-3" />
              Video-Sprechstunde
            </span>
          )}
        </div>

        {/* Quartiere */}
        {doctor.quarter_names.length > 0 && (
          <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="h-3 w-3" />
            {doctor.quarter_names.join(", ")}
          </div>
        )}

        {/* Termin buchen */}
        {showBookButton && (
          <Link href={`/arzt/${doctor.id}/buchen`}>
            <Button className="mt-4 w-full bg-[#4CAF87] hover:bg-[#3d9a73]">
              <Calendar className="mr-2 h-4 w-4" />
              Termin buchen
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
