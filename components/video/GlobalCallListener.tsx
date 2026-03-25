// GlobalCallListener — Lauscht auf eingehende Video-Anrufe via Supabase Realtime
// Zeigt ein Fullscreen-Overlay bei eingehendem Anruf.
// Eingebunden im App-Layout — aktiv fuer alle authentifizierten Nutzer.
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, PhoneOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface IncomingCall {
  id: string;
  callerId: string;
  callerName: string;
  callId: string;
}

const RING_TIMEOUT_MS = 30_000; // 30s, danach missed

/**
 * GlobalCallListener — Globaler Listener fuer eingehende Anrufe.
 *
 * Supabase Realtime Subscription auf `video_calls` INSERT
 * WHERE callee_id = aktueller Nutzer AND status = 'ringing'.
 *
 * Overlay: Anrufername + Annehmen (gruen, 80px) + Ablehnen (rot, 80px)
 */
export function GlobalCallListener() {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Klingelton starten (Web Audio API — kein externer Sound noetig)
  const startRingtone = useCallback(() => {
    try {
      const ctx = new AudioContext();
      audioRef.current = ctx;

      // Einfacher Klingelton: 440Hz + 554Hz (Dur-Terz), pulsierend
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 440;
      osc2.frequency.value = 554;
      osc1.type = 'sine';
      osc2.type = 'sine';

      // Pulsieren: 0.5s an, 0.5s aus (via Gain LFO)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 1; // 1 Hz = 1x pro Sekunde
      lfo.connect(lfoGain);
      lfoGain.gain.value = 0.15;
      lfoGain.connect(gain.gain);

      gain.gain.value = 0.15;
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      lfo.start();

      oscillatorRef.current = osc1;
    } catch {
      // Audio nicht verfuegbar — stilles Klingeln
    }
  }, []);

  // Klingelton stoppen
  const stopRingtone = useCallback(() => {
    try {
      oscillatorRef.current?.stop();
      audioRef.current?.close();
    } catch {
      // ignorieren
    }
    oscillatorRef.current = null;
    audioRef.current = null;
  }, []);

  // Anruf annehmen
  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    stopRingtone();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Status auf 'active' setzen
    const supabase = createClient();
    supabase
      .from('video_calls')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', incomingCall.id)
      .then(() => {
        // Zur Call-Seite navigieren
        router.push(
          `/call/${incomingCall.callerId}?callId=${incomingCall.callId}&answer=true`,
        );
        setIncomingCall(null);
      });
  }, [incomingCall, router, stopRingtone]);

  // Anruf ablehnen
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    stopRingtone();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const supabase = createClient();
    supabase
      .from('video_calls')
      .update({ status: 'rejected' })
      .eq('id', incomingCall.id)
      .then(() => {
        setIncomingCall(null);
      });
  }, [incomingCall, stopRingtone]);

  // Realtime Subscription auf video_calls
  useEffect(() => {
    const supabase = createClient();
    let userId: string | null = null;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      // Auf neue Anrufe lauschen (INSERT mit status='ringing')
      const channel = supabase
        .channel('incoming-calls')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'video_calls',
            filter: `callee_id=eq.${userId}`,
          },
          async (payload) => {
            const call = payload.new as {
              id: string;
              caller_id: string;
              status: string;
            };

            if (call.status !== 'ringing') return;

            // Anrufer-Name laden
            const { data: caller } = await supabase
              .from('users')
              .select('display_name')
              .eq('id', call.caller_id)
              .single();

            const callRecord: IncomingCall = {
              id: call.id,
              callerId: call.caller_id,
              callerName: caller?.display_name ?? 'Unbekannt',
              callId: call.id, // video_calls.id als Call-Channel-ID
            };

            setIncomingCall(callRecord);
            startRingtone();

            // Auto-Dismiss nach 30s → missed
            timeoutRef.current = setTimeout(() => {
              supabase
                .from('video_calls')
                .update({ status: 'missed' })
                .eq('id', call.id)
                .eq('status', 'ringing') // Nur wenn noch klingelt
                .then(() => {
                  setIncomingCall(null);
                  stopRingtone();
                });
            }, RING_TIMEOUT_MS);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    const cleanup = init();

    return () => {
      cleanup.then((unsub) => unsub?.());
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopRingtone();
    };
  }, [startRingtone, stopRingtone]);

  // Kein eingehender Anruf → nichts rendern
  if (!incomingCall) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90"
      role="alertdialog"
      aria-label="Eingehender Anruf"
    >
      {/* Anrufer-Info */}
      <div className="mb-12 text-center">
        {/* Avatar-Platzhalter */}
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-700">
          <Phone className="h-10 w-10 text-white animate-pulse" />
        </div>
        <h2 className="text-2xl font-semibold text-white">
          {incomingCall.callerName}
        </h2>
        <p className="mt-2 text-lg text-gray-300">
          Eingehender Videoanruf...
        </p>
      </div>

      {/* Buttons: Ablehnen + Annehmen (80px Senior-Mode) */}
      <div className="flex items-center gap-8">
        {/* Ablehnen */}
        <button
          onClick={rejectCall}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 shadow-lg transition-colors hover:bg-red-700"
          aria-label="Anruf ablehnen"
          data-testid="reject-call"
        >
          <PhoneOff className="h-8 w-8 text-white" />
        </button>

        {/* Annehmen */}
        <button
          onClick={acceptCall}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-[#4CAF87] shadow-lg transition-colors hover:bg-[#3d9b73]"
          aria-label="Anruf annehmen"
          data-testid="accept-call"
        >
          <Phone className="h-8 w-8 text-white" />
        </button>
      </div>
    </div>
  );
}
