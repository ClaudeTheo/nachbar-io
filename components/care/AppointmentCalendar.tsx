'use client';

// Monatskalender für Termine mit Farbpunkten nach Termintyp

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CareAppointment, CareAppointmentType } from '@/lib/care/types';

interface AppointmentCalendarProps {
  appointments: CareAppointment[];
}

// Farbzuordnung pro Termintyp
const TYPE_COLORS: Record<CareAppointmentType, string> = {
  doctor: 'bg-red-500',
  care_service: 'bg-blue-500',
  therapy: 'bg-purple-500',
  waste_collection: 'bg-amber-500',
  quarter_meeting: 'bg-[#4CAF87]',
  shopping: 'bg-cyan-500',
  birthday: 'bg-pink-500',
  personal: 'bg-gray-400',
  other: 'bg-gray-400',
};

// Deutsche Monatsnamen
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

// Wochentag-Header (Montag zuerst)
const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Datum als YYYY-MM-DD Schlüssel (Ortszeit)
function toDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Uhrzeit formatieren: "14:30"
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function AppointmentCalendar({ appointments }: AppointmentCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Termine nach Datum gruppieren
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, CareAppointment[]>();
    for (const appt of appointments) {
      const key = toDateKey(appt.scheduled_at);
      const existing = map.get(key);
      if (existing) {
        existing.push(appt);
      } else {
        map.set(key, [appt]);
      }
    }
    return map;
  }, [appointments]);

  // Kalender-Tage für den aktuellen Monat berechnen
  const calendarDays = useMemo(() => {
    // Erster Tag des Monats
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Wochentag des ersten Tages (0=So, 1=Mo, ..., 6=Sa) → Montag-basiert: 0=Mo
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6; // Sonntag → 6

    // Letzter Tag des Monats
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Leere Zellen vor dem ersten Tag
    const days: (number | null)[] = Array(startWeekday).fill(null);

    // Tage des Monats
    for (let d = 1; d <= lastDay; d++) {
      days.push(d);
    }

    // Auffüllen auf volle Wochen
    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [viewYear, viewMonth]);

  // Heutiges Datum als Schlüssel
  const todayKey = toDateKey(today.toISOString());
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  // Termine für heute
  const todaysAppointments = useMemo(() => {
    return appointmentsByDate.get(todayKey) ?? [];
  }, [appointmentsByDate, todayKey]);

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      {/* Monats-Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="h-5 w-5 text-anthrazit" />
        </button>
        <h3 className="text-lg font-semibold text-anthrazit">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h3>
        <button
          onClick={goToNextMonth}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          aria-label="Nächster Monat"
        >
          <ChevronRight className="h-5 w-5 text-anthrazit" />
        </button>
      </div>

      {/* Wochentag-Header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_HEADERS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Kalender-Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="min-h-[48px]" />;
          }

          const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayAppointments = appointmentsByDate.get(dateKey) ?? [];
          const isToday = viewYear === todayYear && viewMonth === todayMonth && day === todayDate;

          // Eindeutige Typen für Farbpunkte (max. 3)
          const uniqueTypes = [...new Set(dayAppointments.map((a) => a.type))].slice(0, 3);

          return (
            <div
              key={dateKey}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-lg transition-colors ${
                isToday ? 'ring-2 ring-[#4CAF87] bg-green-50' : ''
              } ${dayAppointments.length > 0 ? 'bg-gray-50' : ''}`}
            >
              <span
                className={`text-sm ${
                  isToday ? 'font-bold text-[#4CAF87]' : 'text-anthrazit'
                }`}
              >
                {day}
              </span>
              {uniqueTypes.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {uniqueTypes.map((type) => (
                    <span
                      key={type}
                      className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[type]}`}
                      title={type}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Heutige Termine */}
      {todaysAppointments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-anthrazit mb-2">
            Heute
          </h4>
          <div className="space-y-2">
            {todaysAppointments.map((appt) => (
              <div key={appt.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${TYPE_COLORS[appt.type]}`}
                />
                <span className="text-anthrazit font-medium truncate">
                  {appt.title}
                </span>
                <span className="text-muted-foreground ml-auto flex-shrink-0">
                  {formatTime(appt.scheduled_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
