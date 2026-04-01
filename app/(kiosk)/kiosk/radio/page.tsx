'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';

const STATIONS = [
  { name: 'SWR3', url: 'https://liveradio.swr.de/sw282p3/swr3/play.mp3', region: 'Baden-Württemberg' },
  { name: 'WDR 2', url: 'https://wdr-wdr2-rheinland.icecastssl.wdr.de/wdr/wdr2/rheinland/mp3/128/stream.mp3', region: 'Nordrhein-Westfalen' },
  { name: 'NDR 2', url: 'https://icecast.ndr.de/ndr/ndr2/niedersachsen/mp3/128/stream.mp3', region: 'Niedersachsen' },
  { name: 'Bayern 1', url: 'https://stream.antenne.de/bayern1/stream.mp3', region: 'Bayern' },
  { name: 'hr3', url: 'https://hr-hr3-live.cast.addradio.de/hr/hr3/live/mp3/128/stream.mp3', region: 'Hessen' },
  { name: 'Deutschlandfunk', url: 'https://st01.dlf.de/dlf/01/128/mp3/stream.mp3', region: 'Bundesweit' },
] as const;

export default function KioskRadioPage() {
  const [activeStation, setActiveStation] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleStation = useCallback((index: number) => {
    // Gleicher Sender -> stoppen
    if (activeStation === index) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      setActiveStation(null);
      return;
    }

    // Anderen Sender stoppen
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // Neuen Sender starten
    const audio = new Audio(STATIONS[index].url);
    audio.play().catch(() => {
      // Autoplay blockiert — ignorieren
    });
    audioRef.current = audio;
    setActiveStation(index);
  }, [activeStation]);

  return (
    <div style={{ padding: '20px 28px', paddingBottom: '100px' }}>
      <Link href="/kiosk" className="kiosk-back" style={{ marginBottom: '20px' }}>
        ← Zurück
      </Link>

      <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '20px 0 24px' }}>
        📻 Radio
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {STATIONS.map((station, i) => (
          <div
            key={station.name}
            className={`kiosk-card kiosk-station ${activeStation === i ? 'playing' : ''}`}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '22px', fontWeight: 600 }}>
                {station.name}
              </div>
              <div style={{ fontSize: '16px', color: '#6b7280', marginTop: '2px' }}>
                {station.region}
              </div>
            </div>
            <button
              onClick={() => toggleStation(i)}
              style={{
                minWidth: '80px',
                minHeight: '80px',
                borderRadius: '50%',
                border: activeStation === i
                  ? '2px solid #22d3ee'
                  : '2px solid #e8ede3',
                background: activeStation === i
                  ? 'rgba(34, 211, 238, 0.2)'
                  : 'white',
                color: activeStation === i ? '#22d3ee' : '#4b5563',
                fontSize: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              aria-label={activeStation === i ? `${station.name} stoppen` : `${station.name} abspielen`}
            >
              {activeStation === i ? '⏹' : '▶'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
