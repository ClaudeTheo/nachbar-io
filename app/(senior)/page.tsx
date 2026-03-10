// app/(senior)/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function SeniorDeviceHomePage() {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

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

  return (
    <div className="space-y-6 text-center">
      {/* Uhrzeit und Datum */}
      <div>
        <p className="text-lg text-gray-500">{currentDate}</p>
        <p className="text-4xl font-bold">{currentTime}</p>
      </div>

      {/* SOS-Button — Platzhalter, wird in Phase 2 implementiert */}
      <button
        className="w-full rounded-2xl bg-red-600 px-8 py-10 text-3xl font-bold text-white shadow-lg active:bg-red-700"
        style={{ minHeight: '100px', touchAction: 'manipulation' }}
        aria-label="SOS — Ich brauche Hilfe"
      >
        🆘 Ich brauche Hilfe
      </button>

      {/* Check-in Button — Platzhalter */}
      <button
        className="w-full rounded-2xl bg-green-600 px-8 py-8 text-2xl font-bold text-white shadow-lg active:bg-green-700"
        style={{ minHeight: '80px', touchAction: 'manipulation' }}
        aria-label="Mir geht es gut"
      >
        ✅ Mir geht es gut
      </button>

      {/* Info-Text */}
      <p className="text-base text-gray-400 mt-8">
        Geraet wird eingerichtet...
      </p>
    </div>
  );
}
