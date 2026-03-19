// app/(app)/arzt/[doctorId]/page.tsx
// Nachbar.io — Arzt-Profilseite fuer Bewohner
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DoctorProfile, type DoctorProfileData } from '@/components/doctor/DoctorProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DoctorProfilePage() {
  const params = useParams();
  const doctorId = params.doctorId as string;
  const [doctor, setDoctor] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Arzt-Profil laden
      const { data: profile } = await supabase
        .from('doctor_profiles')
        .select('id, user_id, specialization, bio, visible, accepts_new_patients, video_consultation, quarter_ids')
        .eq('id', doctorId)
        .eq('visible', true)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Name aus profiles
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', profile.user_id)
        .single();

      // Bewertungen
      const { data: reviews } = await supabase
        .from('doctor_reviews')
        .select('rating')
        .eq('doctor_id', doctorId);

      const reviewCount = reviews?.length ?? 0;
      const avgRating = reviewCount > 0
        ? reviews!.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviewCount
        : 0;

      setDoctor({
        id: profile.id,
        user_id: profile.user_id,
        name: userProfile?.display_name ?? 'Arzt',
        specialization: profile.specialization ?? [],
        bio: profile.bio ?? '',
        visible: profile.visible,
        accepts_new_patients: profile.accepts_new_patients ?? false,
        video_consultation: profile.video_consultation ?? false,
        avg_rating: avgRating,
        review_count: reviewCount,
        quarter_names: [], // Quartier-Namen separat laden falls noetig
      });
      setLoading(false);
    }
    load();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-500">Arzt-Profil nicht gefunden.</p>
        <Link href="/dashboard" className="mt-2 inline-flex items-center text-sm text-[#4CAF87] hover:underline">
          <ArrowLeft className="mr-1 h-3 w-3" />
          Zurueck zum Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600">
        <ArrowLeft className="mr-1 h-3 w-3" />
        Zurueck
      </Link>
      <DoctorProfile doctor={doctor} showBookButton={true} />
    </div>
  );
}
