// app/(senior)/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { SeniorSosButton } from '@/components/care/senior/SeniorSosButton';

export default function SeniorDeviceHomePage() {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [nextCheckin, setNextCheckin] = useState<string | null>(null);

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }));
    }
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

  // Naechsten Check-in laden
  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch('/api/care/checkin/status');
        if (res.ok) {
          const data = await res.json();
          setNextCheckin(data.nextDue);
        }
      } catch { /* Stille Fehlerbehandlung fuer Geraet */ }
    }
    loadStatus();
    const interval = setInterval(loadStatus, 5 * 60 * 1000); // Alle 5 Min aktualisieren
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 text-center">
      {/* Uhrzeit und Datum */}
      <div>
        <p className="text-lg text-gray-500">{currentDate}</p>
        <p className="text-4xl font-bold">{currentTime}</p>
      </div>

      {/* SOS-Button */}
      <SeniorSosButton />

      {/* Check-in Button */}
      <a
        href="/checkin"
        className="block w-full rounded-2xl bg-green-600 px-8 py-8 text-2xl font-bold text-white shadow-lg active:bg-green-700 text-center"
        style={{ minHeight: '80px', touchAction: 'manipulation' }}
      >
        ✅ Mir geht es gut
      </a>

      {/* Naechster Check-in */}
      {nextCheckin && (
        <p className="text-base text-gray-400">
          Naechster Check-in: {nextCheckin} Uhr
        </p>
      )}
    </div>
  );
}
