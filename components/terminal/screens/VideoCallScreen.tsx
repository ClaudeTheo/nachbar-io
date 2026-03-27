"use client";

import { useState, useEffect, useCallback } from "react";
import { Video, ArrowLeft, Calendar, Phone, PhoneOff } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";
import { useConsultations } from "@/lib/care/hooks/useConsultations";
import { ConsultationConsent } from "@/components/care/ConsultationConsent";
import { TechCheck } from "@/components/care/TechCheck";
import { SeniorSosButton } from "@/components/care/senior/SeniorSosButton";
import type { ConsultationSlot } from "@/lib/care/types";

type Phase = 'idle' | 'consent' | 'techcheck' | 'video';

export default function VideoCallScreen() {
  const { setActiveScreen } = useTerminal();
  const { slots, loading } = useConsultations(undefined, true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeSlot, setActiveSlot] = useState<ConsultationSlot | null>(null);

  // Nächsten relevanten Termin finden
  const nextSlot = slots.find(
    s => s.status === 'scheduled' || s.status === 'waiting' || s.status === 'active'
  );

  // Wenn Termin aktiv wird, automatisch Consent-Flow starten
  useEffect(() => {
    if (nextSlot && (nextSlot.status === 'waiting' || nextSlot.status === 'active')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync external slot state
      setActiveSlot(nextSlot);
      if (phase === 'idle') setPhase('consent');
    }
  }, [nextSlot, phase]);

  const handleConsented = useCallback(() => {
    setPhase('techcheck');
  }, []);

  const handleTechReady = useCallback(() => {
    setPhase('video');
  }, []);

  const handleTechFailed = useCallback((reason: string) => {
    console.warn('[VideoCall] Technik-Check fehlgeschlagen:', reason);
    setPhase('idle');
  }, []);

  function handleHangUp() {
    setPhase('idle');
    setActiveSlot(null);
  }

  function startCall() {
    if (nextSlot) {
      setActiveSlot(nextSlot);
      setPhase('consent');
    }
  }

  // Video-Phase: iFrame im Vollbild
  if (phase === 'video' && activeSlot?.join_url) {
    return (
      <div className="relative h-full w-full">
        <iframe
          src={activeSlot.join_url}
          allow="camera; microphone; display-capture"
          className="h-full w-full border-0"
          title="Videosprechstunde"
        />
        {/* SOS-Button oben rechts */}
        <div className="absolute top-4 right-4 z-50">
          <SeniorSosButton />
        </div>
        {/* Auflegen-Button unten mittig */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={handleHangUp}
            aria-label="Sprechstunde beenden"
            className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-red-500 text-white shadow-xl active:scale-95"
            style={{ touchAction: 'manipulation' }}
          >
            <PhoneOff className="h-14 w-14" />
          </button>
        </div>
      </div>
    );
  }

  // Consent-Phase
  if (phase === 'consent' && activeSlot) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => { setPhase('idle'); setActiveSlot(null); }}
            aria-label="Zurück"
            className="flex h-[80px] w-[80px] items-center justify-center rounded-2xl bg-anthrazit/10 text-anthrazit active:scale-95"
          >
            <ArrowLeft className="h-12 w-12" />
          </button>
          <h1 className="text-4xl font-bold text-anthrazit">Datenschutz</h1>
        </div>
        <ConsultationConsent
          providerType={activeSlot.provider_type}
          onConsented={handleConsented}
        />
      </div>
    );
  }

  // TechCheck-Phase
  if (phase === 'techcheck') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setPhase('consent')}
            aria-label="Zurück"
            className="flex h-[80px] w-[80px] items-center justify-center rounded-2xl bg-anthrazit/10 text-anthrazit active:scale-95"
          >
            <ArrowLeft className="h-12 w-12" />
          </button>
          <h1 className="text-4xl font-bold text-anthrazit">Technik-Check</h1>
        </div>
        <TechCheck onReady={handleTechReady} onFailed={handleTechFailed} />
      </div>
    );
  }

  // Idle-Phase: Termin-Info
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setActiveScreen("home")}
          aria-label="Zurück zur Startseite"
          className="flex h-[80px] w-[80px] items-center justify-center rounded-2xl bg-anthrazit/10 text-anthrazit active:scale-95"
        >
          <ArrowLeft className="h-12 w-12" />
        </button>
        <h1 className="text-4xl font-bold text-anthrazit">Sprechstunde</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        {loading && (
          <p className="text-2xl text-anthrazit/50">Termine werden geladen...</p>
        )}

        {!loading && nextSlot && (
          <>
            {/* Nächster Termin */}
            <div className="flex items-center gap-4 rounded-2xl bg-info-blue/10 px-8 py-5">
              <Calendar className="h-12 w-12 text-info-blue" />
              <div>
                <p className="text-[28px] font-bold text-anthrazit">
                  {nextSlot.title}
                </p>
                <p className="text-xl text-anthrazit/60">
                  {nextSlot.host_name} — {new Date(nextSlot.scheduled_at).toLocaleDateString('de-DE', {
                    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Wartezimmer betreten */}
            {(nextSlot.status === 'waiting' || nextSlot.status === 'active') && (
              <button
                onClick={startCall}
                aria-label="Sprechstunde starten"
                className="flex h-[100px] w-full max-w-md items-center justify-center gap-4 rounded-2xl bg-quartier-green text-white text-3xl font-bold shadow-lg active:scale-95 animate-pulse"
                style={{ touchAction: 'manipulation' }}
              >
                <Video className="h-12 w-12" />
                Jetzt teilnehmen
              </button>
            )}

            {nextSlot.status === 'scheduled' && (
              <div className="rounded-2xl bg-quartier-green/10 px-8 py-5 text-center">
                <p className="text-2xl text-anthrazit">
                  Ihr Termin beginnt bald
                </p>
                <p className="text-xl text-anthrazit/60">
                  Bitte warten Sie hier — die Sprechstunde startet automatisch
                </p>
              </div>
            )}
          </>
        )}

        {!loading && !nextSlot && (
          <>
            {/* Kein Termin */}
            <div className="flex h-[320px] w-[480px] flex-col items-center justify-center gap-4 rounded-3xl bg-anthrazit/5 border-2 border-dashed border-anthrazit/20">
              <Video className="h-24 w-24 text-anthrazit/30" />
              <p className="text-[28px] text-anthrazit/50 font-medium">
                Kein Termin geplant
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-quartier-green/10 px-8 py-5">
              <Phone className="h-12 w-12 text-quartier-green" />
              <div>
                <p className="text-[28px] font-bold text-anthrazit">
                  Praxis kontaktieren
                </p>
                <p className="text-xl text-anthrazit/60">
                  Rufen Sie Ihre Arztpraxis an für einen Termin
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
