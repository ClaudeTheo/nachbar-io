// app/(app)/arzt/[doctorId]/buchen/page.tsx
// Nachbar.io — Terminbuchungsseite fuer Bewohner
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BookingCalendar } from '@/components/doctor/BookingCalendar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BookingPage() {
  const params = useParams();
  const doctorId = params.doctorId as string;
  const [doctorName, setDoctorName] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: profile } = await supabase
        .from('doctor_profiles')
        .select('user_id, video_consultation, visible')
        .eq('id', doctorId)
        .eq('visible', true)
        .single();

      if (!profile) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setVideoEnabled(profile.video_consultation ?? false);

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', profile.user_id)
        .single();

      setDoctorName(userProfile?.display_name ?? 'Arzt');
      setLoading(false);
    }
    load();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-500">Arzt nicht gefunden oder nicht verfuegbar.</p>
        <Link href="/dashboard" className="mt-2 inline-flex items-center text-sm text-[#4CAF87] hover:underline">
          <ArrowLeft className="mr-1 h-3 w-3" />
          Zurueck
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <Link
        href={`/arzt/${doctorId}`}
        className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600"
      >
        <ArrowLeft className="mr-1 h-3 w-3" />
        Zurueck zum Profil
      </Link>
      <BookingCalendar
        doctorId={doctorId}
        doctorName={doctorName}
        videoEnabled={videoEnabled}
      />
    </div>
  );
}
