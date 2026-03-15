// app/(senior)/sprechstunde/page.tsx
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useConsultations } from '@/lib/care/hooks/useConsultations';
import { ConsultationConsent } from '@/components/care/ConsultationConsent';
import { TechCheck } from '@/components/care/TechCheck';
import { SeniorSosButton } from '@/components/care/senior/SeniorSosButton';

type Phase = 'list' | 'consent' | 'techcheck' | 'video';

export default function SeniorSprechstundePage() {
  const { slots, loading, bookSlot } = useConsultations(undefined, false);
  const [phase, setPhase] = useState<Phase>('list');
  const [activeJoinUrl, setActiveJoinUrl] = useState<string | null>(null);
  const [activeProviderType, setActiveProviderType] = useState<'community' | 'medical'>('community');
  const [error, setError] = useState<string | null>(null);

  const available = slots.filter(s => s.status === 'scheduled' && !s.booked_by);
  const mySlots = slots.filter(
    s => s.booked_by && (s.status === 'waiting' || s.status === 'active' || s.status === 'scheduled')
  );

  async function handleBook(slotId: string) {
    setError(null);
    try {
      await bookSlot(slotId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Buchung fehlgeschlagen');
    }
  }

  function handleJoin(joinUrl: string, providerType: 'community' | 'medical') {
    setActiveJoinUrl(joinUrl);
    setActiveProviderType(providerType);
    setPhase('consent');
  }

  const handleConsented = useCallback(() => {
    setPhase('techcheck');
  }, []);

  const handleTechReady = useCallback(() => {
    setPhase('video');
  }, []);

  const handleTechFailed = useCallback((reason: string) => {
    console.warn('[Senior/Sprechstunde] Technik-Check fehlgeschlagen:', reason);
    setError(`Technik-Problem: ${reason}`);
    setPhase('list');
  }, []);

  function handleHangUp() {
    setPhase('list');
    setActiveJoinUrl(null);
  }

  // Video-Phase: iFrame
  if (phase === 'video' && activeJoinUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <iframe
          src={activeJoinUrl}
          allow="camera; microphone; display-capture"
          className="h-full w-full border-0"
          title="Videosprechstunde"
        />
        {/* SOS oben rechts */}
        <div className="absolute top-4 right-4 z-50">
          <SeniorSosButton />
        </div>
        {/* Auflegen unten mittig */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={handleHangUp}
            aria-label="Sprechstunde beenden"
            className="h-[100px] w-[100px] rounded-full bg-red-500 text-white text-3xl font-bold shadow-xl active:scale-95"
            style={{ touchAction: 'manipulation' }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Consent-Phase
  if (phase === 'consent') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setPhase('list')}
          className="rounded-2xl bg-gray-200 px-6 py-4 text-xl font-bold text-anthrazit"
          style={{ minHeight: '60px', touchAction: 'manipulation' }}
        >
          ← Zurueck
        </button>
        <ConsultationConsent
          providerType={activeProviderType}
          onConsented={handleConsented}
        />
      </div>
    );
  }

  // TechCheck-Phase
  if (phase === 'techcheck') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setPhase('consent')}
          className="rounded-2xl bg-gray-200 px-6 py-4 text-xl font-bold text-anthrazit"
          style={{ minHeight: '60px', touchAction: 'manipulation' }}
        >
          ← Zurueck
        </button>
        <TechCheck onReady={handleTechReady} onFailed={handleTechFailed} />
      </div>
    );
  }

  // Termin-Liste
  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-block rounded-2xl bg-gray-200 px-6 py-4 text-xl font-bold text-anthrazit"
        style={{ minHeight: '60px', touchAction: 'manipulation' }}
      >
        ← Zurueck
      </Link>

      <h1 className="text-3xl font-bold text-center">Sprechstunde</h1>

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-xl text-red-700 text-center">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-xl text-gray-500 text-center">Termine werden geladen...</p>
      )}

      {/* Meine Termine — Teilnehmen */}
      {mySlots.map(slot => (
        <div key={slot.id} className="rounded-2xl border-2 border-quartier-green bg-quartier-green/5 p-6 space-y-3">
          <p className="text-2xl font-bold">{slot.title}</p>
          <p className="text-xl text-gray-600">{slot.host_name}</p>
          <p className="text-lg text-gray-500">
            {new Date(slot.scheduled_at).toLocaleDateString('de-DE', {
              weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
            })}
          </p>
          {(slot.status === 'waiting' || slot.status === 'active') && slot.join_url && (
            <button
              onClick={() => handleJoin(slot.join_url!, slot.provider_type)}
              className="w-full rounded-2xl bg-quartier-green px-8 py-8 text-2xl font-bold text-white shadow-lg active:scale-95 animate-pulse"
              style={{ minHeight: '80px', touchAction: 'manipulation' }}
            >
              📹 Jetzt teilnehmen
            </button>
          )}
          {slot.status === 'scheduled' && (
            <p className="text-xl text-gray-500 text-center">Wartet auf Start...</p>
          )}
        </div>
      ))}

      {/* Verfuegbare Termine — Buchen */}
      {available.length > 0 && (
        <>
          <h2 className="text-2xl font-bold">Verfuegbare Termine</h2>
          {available.map(slot => (
            <div key={slot.id} className="rounded-2xl border border-gray-200 p-6 space-y-3">
              <p className="text-2xl font-bold">{slot.title}</p>
              <p className="text-xl text-gray-600">{slot.host_name}</p>
              <p className="text-lg text-gray-500">
                {new Date(slot.scheduled_at).toLocaleDateString('de-DE', {
                  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                })}
              </p>
              <button
                onClick={() => handleBook(slot.id)}
                className="w-full rounded-2xl bg-quartier-green px-8 py-8 text-2xl font-bold text-white shadow-lg active:scale-95"
                style={{ minHeight: '80px', touchAction: 'manipulation' }}
              >
                Termin buchen
              </button>
            </div>
          ))}
        </>
      )}

      {/* Kein Termin */}
      {!loading && mySlots.length === 0 && available.length === 0 && (
        <div className="rounded-2xl bg-gray-100 p-8 text-center">
          <p className="text-2xl text-gray-500">Keine Sprechstunden geplant</p>
          <p className="text-lg text-gray-400 mt-2">
            Ihr Quartierslotse oder Arzt wird Termine einrichten
          </p>
        </div>
      )}
    </div>
  );
}
