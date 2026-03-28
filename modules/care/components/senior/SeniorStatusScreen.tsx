'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SeniorStatusScreenProps {
  type: 'checkin_ok' | 'checkin_not_well' | 'sos_sent';
  autoCloseSeconds?: number;
}

const STATUS_CONFIG = {
  checkin_ok: { icon: '✅', title: 'Danke!', subtitle: 'Ihr Check-in wurde gespeichert.', color: 'text-green-600' },
  checkin_not_well: { icon: '💛', title: 'Wir kuemmern uns!', subtitle: 'Ihre Angehörigen wurden informiert.', color: 'text-yellow-600' },
  sos_sent: { icon: '🆘', title: 'Hilfe wird gerufen!', subtitle: 'Ihre Nachbarn wurden benachrichtigt.', color: 'text-red-600' },
};

export function SeniorStatusScreen({ type, autoCloseSeconds = 10 }: SeniorStatusScreenProps) {
  const router = useRouter();
  const config = STATUS_CONFIG[type];

  useEffect(() => {
    // Zurück zur Senior-Startseite (nicht zur Landing-Page)
    const timer = setTimeout(() => router.push('/senior/home'), autoCloseSeconds * 1000);
    return () => clearTimeout(timer);
  }, [autoCloseSeconds, router]);

  return (
    <div className="text-center space-y-6 py-8">
      <div className="text-8xl">{config.icon}</div>
      <h1 className={`text-4xl font-bold ${config.color}`}>{config.title}</h1>
      <p className="text-xl text-gray-600">{config.subtitle}</p>
      <p className="text-base text-gray-400 mt-8">Zurück zum Startbildschirm in {autoCloseSeconds} Sekunden...</p>
    </div>
  );
}
