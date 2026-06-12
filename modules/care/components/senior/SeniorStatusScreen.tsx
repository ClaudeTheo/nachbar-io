'use client';

import Link from 'next/link';

interface SeniorStatusScreenProps {
  type: 'checkin_ok' | 'checkin_not_well' | 'sos_sent';
}

const STATUS_CONFIG = {
  checkin_ok: { icon: '✅', title: 'Danke!', subtitle: 'Ihr Check-in wurde gespeichert.', color: 'text-green-600' },
  // Gelb auf Weiss waere nur ~2.9:1 — Titel dunkel, Farbe traegt das Icon (Befund B1:2)
  checkin_not_well: { icon: '💛', title: 'Wir kuemmern uns!', subtitle: 'Ihre Angehörigen wurden informiert.', color: 'text-anthrazit' },
  sos_sent: { icon: '🆘', title: 'Hilfe wird gerufen!', subtitle: 'Ihre Nachbarn wurden benachrichtigt.', color: 'text-red-600' },
};

export function SeniorStatusScreen({ type }: SeniorStatusScreenProps) {
  const config = STATUS_CONFIG[type];

  return (
    // role=status: Statuswechsel wird auch fuer Screenreader angesagt (Befund B3:2)
    <div className="text-center space-y-6 py-8" role="status" aria-live="polite">
      <div className="text-8xl" aria-hidden="true">{config.icon}</div>
      <h1 className={`text-4xl font-bold ${config.color}`}>{config.title}</h1>
      <p className="text-xl text-gray-600">{config.subtitle}</p>

      {/*
        Welle S1 / Befund B3:2 (WCAG 2.2.1 "Timing Adjustable"): KEIN Auto-Redirect
        mehr. Frueher navigierte ein Timer nach 10-30s ungefragt auf /senior/home
        zurueck — gerade nach einem SOS will der Senior den Status aber behalten,
        nicht weggeleitet werden. Stattdessen entscheidet er selbst per grossem
        Button (80px Touch-Target) und landet in der kanonischen Shell.
      */}
      <Link
        href="/kreis-start"
        className="mx-auto mt-8 flex max-w-sm items-center justify-center rounded-2xl border-2 border-anthrazit bg-white px-6 text-xl font-bold text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
        style={{ minHeight: '80px', touchAction: 'manipulation' }}
      >
        Zurück zur Startseite
      </Link>
    </div>
  );
}
