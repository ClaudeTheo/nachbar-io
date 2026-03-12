'use client';

// Vollbild-Alarm-Overlay: Klingelt zur Check-in-Zeit.
// "Aus"-Taste stoppt den Wecker UND sendet automatisch einen Check-in ("ok").
// "Schlummern"-Taste verschiebt den Alarm um 10 Minuten.

import { useState } from 'react';
import { AlarmClock, BellOff, Clock } from 'lucide-react';

interface AlarmScreenProps {
  onDismiss: () => Promise<boolean>;  // Wecker aus + Check-in
  onSnooze: (minutes?: number) => void; // Schlummern
}

export function AlarmScreen({ onDismiss, onSnooze }: AlarmScreenProps) {
  const [dismissing, setDismissing] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    const ok = await onDismiss();
    if (ok) {
      setSuccess(true);
      // Erfolg fuer 2 Sekunden anzeigen, dann verschwindet das Overlay
      setTimeout(() => setSuccess(false), 2000);
    }
    setDismissing(false);
  }

  // Erfolgs-Anzeige
  if (success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-quartier-green animate-fade-in">
        <div className="text-center text-white px-8">
          <div className="text-7xl mb-6">✅</div>
          <h2 className="text-3xl font-bold mb-2">Guten Morgen!</h2>
          <p className="text-xl opacity-90">Check-in erledigt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-anthrazit animate-fade-in">
      {/* Pulsierende Uhr */}
      <div className="relative mb-10">
        <div className="absolute inset-0 rounded-full bg-quartier-green/20 animate-ping" style={{ width: '160px', height: '160px', margin: '-20px' }} />
        <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-quartier-green/30 border-4 border-quartier-green">
          <AlarmClock className="h-16 w-16 text-white animate-bounce" />
        </div>
      </div>

      {/* Uhrzeit */}
      <p className="text-5xl font-bold text-white mb-2">
        {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="text-xl text-white/70 mb-12">Check-in Zeit</p>

      {/* Hauptaktion: AUS (= Check-in OK) */}
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        className="w-64 flex items-center justify-center gap-3 rounded-2xl bg-quartier-green px-8 py-6 text-white font-bold text-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
        style={{ minHeight: '80px', touchAction: 'manipulation' }}
      >
        {dismissing ? (
          <Clock className="h-8 w-8 animate-spin" />
        ) : (
          <>
            <BellOff className="h-8 w-8" />
            Aus
          </>
        )}
      </button>

      {/* Sekundaeraktion: Schlummern */}
      <button
        onClick={() => onSnooze(10)}
        className="mt-6 w-64 flex items-center justify-center gap-2 rounded-2xl border-2 border-white/30 px-8 py-4 text-white/80 font-medium text-lg transition-all active:scale-95 hover:border-white/50"
        style={{ minHeight: '60px', touchAction: 'manipulation' }}
      >
        <Clock className="h-6 w-6" />
        Schlummern (10 Min.)
      </button>

      {/* Hinweis */}
      <p className="mt-8 text-sm text-white/40 text-center px-8">
        &quot;Aus&quot; bestaetigt automatisch Ihren Check-in
      </p>
    </div>
  );
}
