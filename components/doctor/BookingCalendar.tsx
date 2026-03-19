// components/doctor/BookingCalendar.tsx
// Nachbar.io — Terminbuchung Self-Service fuer Bewohner
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, CheckCircle, ArrowLeft, Video, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type TimeSlot = {
  time: string;      // HH:MM
  available: boolean;
};

type BookingCalendarProps = {
  doctorId: string;
  doctorName: string;
  videoEnabled: boolean;
};

// Naechste 14 Tage generieren (Mo-Fr)
function getWeekdays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  let d = new Date(today);
  d.setDate(d.getDate() + 1); // ab morgen
  while (days.length < count) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      days.push(new Date(d));
    }
    d = new Date(d);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// Standard-Zeitslots
function getDefaultSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let h = 8; h <= 17; h++) {
    if (h === 12) continue; // Mittagspause
    slots.push({ time: `${String(h).padStart(2, '0')}:00`, available: true });
    if (h < 17) {
      slots.push({ time: `${String(h).padStart(2, '0')}:30`, available: true });
    }
  }
  return slots;
}

function formatDate(d: Date): string {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return `${days[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`;
}

function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function BookingCalendar({ doctorId, doctorName, videoEnabled }: BookingCalendarProps) {
  const [step, setStep] = useState<'date' | 'time' | 'type' | 'confirm' | 'done'>('date');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<'in_person' | 'video'>('in_person');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  const weekdays = getWeekdays(10);

  // Verfuegbare Slots fuer gewaehlten Tag laden
  const loadSlots = useCallback(async (date: Date) => {
    setLoading(true);
    const supabase = createClient();
    const dateStr = formatDateISO(date);

    // Bestehende Termine an diesem Tag laden
    const { data: existing } = await supabase
      .from('appointments')
      .select('scheduled_at')
      .eq('doctor_id', doctorId)
      .gte('scheduled_at', `${dateStr}T00:00:00`)
      .lt('scheduled_at', `${dateStr}T23:59:59`)
      .in('status', ['scheduled', 'confirmed']);

    const bookedTimes = new Set(
      (existing ?? []).map((a: { scheduled_at: string }) => {
        const t = new Date(a.scheduled_at);
        return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
      })
    );

    const allSlots = getDefaultSlots().map(s => ({
      ...s,
      available: !bookedTimes.has(s.time),
    }));

    setSlots(allSlots);
    setLoading(false);
  }, [doctorId]);

  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate);
    }
  }, [selectedDate, loadSlots]);

  // Termin buchen
  const handleBook = async () => {
    if (!selectedDate || !selectedTime) return;
    setBooking(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Bitte melden Sie sich an, um einen Termin zu buchen.');
      setBooking(false);
      return;
    }

    const scheduledAt = `${formatDateISO(selectedDate)}T${selectedTime}:00`;

    const { error } = await supabase
      .from('appointments')
      .insert({
        doctor_id: doctorId,
        patient_id: user.id,
        scheduled_at: scheduledAt,
        type: appointmentType,
        status: 'scheduled',
      });

    if (error) {
      toast.error('Termin konnte nicht gebucht werden. Bitte versuchen Sie es erneut.');
      setBooking(false);
      return;
    }

    toast.success('Termin erfolgreich gebucht!');
    setStep('done');
    setBooking(false);
  };

  return (
    <Card data-testid="booking-calendar">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#4CAF87]" />
          Termin bei {doctorName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Schritt 1: Datum waehlen */}
        {step === 'date' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Waehlen Sie einen Tag:</p>
            <div className="grid grid-cols-2 gap-2">
              {weekdays.map((day) => (
                <Button
                  key={formatDateISO(day)}
                  variant="outline"
                  className="justify-start text-sm"
                  onClick={() => {
                    setSelectedDate(day);
                    setStep('time');
                  }}
                >
                  <Calendar className="mr-2 h-3.5 w-3.5 text-gray-400" />
                  {formatDate(day)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Schritt 2: Uhrzeit waehlen */}
        {step === 'time' && selectedDate && (
          <div className="space-y-3">
            <button
              onClick={() => { setStep('date'); setSelectedTime(null); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-3 w-3" />
              Zurueck
            </button>
            <p className="text-sm text-gray-500">
              Verfuegbare Zeiten am <strong>{formatDate(selectedDate)}</strong>:
            </p>
            {loading ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={slot.available ? 'outline' : 'ghost'}
                    disabled={!slot.available}
                    className={`text-sm ${!slot.available ? 'opacity-30 line-through' : ''}`}
                    onClick={() => {
                      setSelectedTime(slot.time);
                      setStep(videoEnabled ? 'type' : 'confirm');
                      if (!videoEnabled) setAppointmentType('in_person');
                    }}
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    {slot.time}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Schritt 3: Terminart (nur bei Video-Sprechstunde) */}
        {step === 'type' && (
          <div className="space-y-3">
            <button
              onClick={() => setStep('time')}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-3 w-3" />
              Zurueck
            </button>
            <p className="text-sm text-gray-500">Wie moechten Sie den Termin wahrnehmen?</p>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => { setAppointmentType('in_person'); setStep('confirm'); }}
              >
                <MapPin className="mr-3 h-5 w-5 text-[#4CAF87]" />
                <div className="text-left">
                  <p className="font-medium">Vor Ort</p>
                  <p className="text-xs text-gray-400">Persoenlicher Besuch in der Praxis</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => { setAppointmentType('video'); setStep('confirm'); }}
              >
                <Video className="mr-3 h-5 w-5 text-blue-500" />
                <div className="text-left">
                  <p className="font-medium">Video-Sprechstunde</p>
                  <p className="text-xs text-gray-400">Online-Termin (5 EUR Gebuehr)</p>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Schritt 4: Bestaetigung */}
        {step === 'confirm' && selectedDate && selectedTime && (
          <div className="space-y-4">
            <button
              onClick={() => setStep(videoEnabled ? 'type' : 'time')}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-3 w-3" />
              Zurueck
            </button>
            <div className="rounded-lg border border-[#4CAF87]/20 bg-[#4CAF87]/5 p-4">
              <h3 className="font-semibold text-[#2D3142]">Terminuebersicht</h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="text-gray-500">Arzt:</dt>
                  <dd className="font-medium">{doctorName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500">Datum:</dt>
                  <dd className="font-medium">{formatDate(selectedDate)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500">Uhrzeit:</dt>
                  <dd className="font-medium">{selectedTime} Uhr</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-500">Art:</dt>
                  <dd className="font-medium">
                    {appointmentType === 'video' ? 'Video-Sprechstunde' : 'Vor Ort'}
                  </dd>
                </div>
              </dl>
            </div>
            <Button
              className="w-full bg-[#4CAF87] hover:bg-[#3d9a73]"
              disabled={booking}
              onClick={handleBook}
            >
              {booking ? 'Wird gebucht...' : 'Termin verbindlich buchen'}
            </Button>
          </div>
        )}

        {/* Schritt 5: Erfolg */}
        {step === 'done' && (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="mx-auto h-12 w-12 text-[#4CAF87]" />
            <h3 className="text-lg font-semibold text-[#2D3142]">Termin gebucht!</h3>
            <p className="text-sm text-gray-500">
              Sie erhalten eine Bestaetigung. Der Arzt wird ueber Ihren Termin informiert.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
