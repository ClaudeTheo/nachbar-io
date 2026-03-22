'use client';

import { useState, useEffect, useCallback } from 'react';
import { Stethoscope } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DoctorCard } from '@/components/consultation/DoctorCard';
import { RequestAppointmentModal } from '@/components/consultation/RequestAppointmentModal';

interface DoctorProfile {
  id: string;
  user_id: string;
  specialization: string[];
  bio: string | null;
  avatar_url: string | null;
  video_consultation: boolean;
  accepts_new_patients: boolean;
  quarter_ids: string[];
}

export default function SprechstundeDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const loadDoctors = useCallback(async () => {
    try {
      const res = await fetch('/api/doctors');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch {
      // Stille Fehlerbehandlung — leere Liste zeigen
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  function handleSuccess() {
    setSelectedDoctorId(null);
    setSuccessMessage('Ihr Terminwunsch wurde gesendet. Sie erhalten eine Benachrichtigung, sobald der Arzt antwortet.');
    setTimeout(() => setSuccessMessage(''), 5000);
  }

  // Quartier-ID aus dem ersten Arzt ableiten (oder leer)
  const quarterId = doctors[0]?.quarter_ids?.[0] ?? '';

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Ärzte im Quartier"
        subtitle="Finden Sie Ärzte in Ihrer Nähe und senden Sie einen Terminwunsch für eine Videosprechstunde."
        backHref="/care"
      />

      {/* Erfolgsmeldung */}
      {successMessage && (
        <div className="rounded-2xl bg-quartier-green/10 p-4 text-sm font-medium text-quartier-green">
          {successMessage}
        </div>
      )}

      {loading && <p className="text-anthrazit/50">Laden...</p>}

      {/* Arzt-Karten */}
      {doctors.length > 0 && (
        <div className="space-y-4">
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onRequestAppointment={(doctorUserId) => setSelectedDoctorId(doctorUserId)}
            />
          ))}
        </div>
      )}

      {/* Keine Ärzte */}
      {!loading && doctors.length === 0 && (
        <div className="rounded-2xl bg-anthrazit/5 p-8 text-center">
          <Stethoscope className="mx-auto h-12 w-12 text-anthrazit/30" />
          <p className="mt-3 text-xl text-anthrazit/60">Noch keine Ärzte verfügbar</p>
          <p className="text-anthrazit/40 mt-2">
            Sobald Ärzte Ihr Quartier betreuen, erscheinen sie hier.
          </p>
        </div>
      )}

      {/* Modal */}
      {selectedDoctorId && quarterId && (
        <RequestAppointmentModal
          doctorUserId={selectedDoctorId}
          quarterId={quarterId}
          onClose={() => setSelectedDoctorId(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
