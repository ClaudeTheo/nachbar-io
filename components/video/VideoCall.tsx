// components/video/VideoCall.tsx
// Nachbar Plus — Vollbild Video-Anruf Komponente (WebRTC P2P)
// Senior-Modus: 80px Touch-Targets, hoher Kontrast

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, Mic, MicOff, Video, VideoOff, Wifi, WifiOff } from 'lucide-react';
import { WebRTCSignaling, PeerConnectionManager } from '@/lib/webrtc';
import type { CallState, ConnectionQuality } from '@/lib/webrtc';

interface VideoCallProps {
  /** Eindeutige Anruf-ID fuer den Signaling-Channel */
  callId: string;
  /** Supabase User-ID des Gegenueber */
  remoteUserId: string;
  /** Callback wenn der Anruf beendet wird */
  onHangup: () => void;
  /** Ob dieser Nutzer der Anrufer ist (true) oder angerufen wird (false) */
  isInitiator?: boolean;
  /** Eingehendes SDP Offer (nur wenn isInitiator=false) */
  incomingOffer?: RTCSessionDescriptionInit;
}

/** Status-Texte fuer die Anzeige (Deutsch, Siezen) */
const STATUS_TEXT: Record<CallState, string> = {
  idle: 'Bereit',
  calling: 'Verbindung wird hergestellt\u2026',
  ringing: 'Klingelt\u2026',
  active: 'Verbunden',
  ended: 'Anruf beendet',
};

/**
 * VideoCall — Vollbild Video-Anruf mit WebRTC
 *
 * Layout:
 * - Remote-Video: Vollbild, object-cover
 * - Lokales Video: PiP (w-32 h-24, unten rechts)
 * - Steuerleiste: Mikrofon, Kamera, Auflegen (80px Senior-Targets)
 */
export function VideoCall({
  callId,
  remoteUserId,
  onHangup,
  isInitiator = true,
  incomingOffer,
}: VideoCallProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const managerRef = useRef<PeerConnectionManager | null>(null);

  const [callState, setCallState] = useState<CallState>('idle');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good');

  // Verbindung aufbauen
  useEffect(() => {
    const signaling = new WebRTCSignaling(callId);
    signaling.subscribe();

    // senderId ist hier der remoteUserId-Kontext — wir nutzen
    // die eigene userId implizit aus dem Supabase-Auth
    const manager = new PeerConnectionManager(signaling, remoteUserId);
    managerRef.current = manager;

    // Callbacks registrieren
    manager.onConnectionStateChange((state: CallState) => {
      setCallState(state);
    });

    manager.onRemoteStream(() => {
      // Remote-Stream wird direkt im PeerConnectionManager ans Video-Element gebunden
    });

    // Anruf starten oder annehmen
    const initCall = async () => {
      if (!remoteVideoRef.current) return;

      try {
        if (isInitiator) {
          await manager.startCall(remoteVideoRef.current);
        } else if (incomingOffer) {
          await manager.answerCall(remoteVideoRef.current, incomingOffer);
        }

        // Lokales Video-Preview setzen
        const localStream = manager.getLocalStream();
        if (localStream && localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      } catch (err) {
        console.error('[VideoCall] Fehler beim Verbindungsaufbau:', err);
        setCallState('ended');
      }
    };

    initCall();

    // Qualitaets-Polling alle 3 Sekunden
    const qualityInterval = setInterval(() => {
      if (managerRef.current) {
        const quality = managerRef.current.getConnectionQuality();
        setConnectionQuality(quality);
      }
    }, 3000);

    // Cleanup bei Unmount
    return () => {
      clearInterval(qualityInterval);
      if (managerRef.current?.getCallState() !== 'ended') {
        managerRef.current?.hangup();
      }
    };
  }, [callId, remoteUserId, isInitiator, incomingOffer]);

  // Mikrofon an/aus
  const toggleMic = useCallback(() => {
    const stream = managerRef.current?.getLocalStream();
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    for (const track of audioTracks) {
      track.enabled = !track.enabled;
    }
    setIsMicMuted((prev) => !prev);
  }, []);

  // Kamera an/aus
  const toggleCam = useCallback(() => {
    const stream = managerRef.current?.getLocalStream();
    if (!stream) return;

    const videoTracks = stream.getVideoTracks();
    for (const track of videoTracks) {
      track.enabled = !track.enabled;
    }
    setIsCamOff((prev) => !prev);
  }, []);

  // Auflegen
  const handleHangup = useCallback(() => {
    managerRef.current?.hangup();
    setCallState('ended');
    onHangup();
  }, [onHangup]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-label="Video-Anruf"
    >
      {/* Remote-Video (Vollbild) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        aria-label="Video des Gegenueber"
      />

      {/* Lokales Video (PiP, unten rechts) */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-28 right-4 z-10 h-24 w-32 rounded-lg border-2 border-white/30 object-cover shadow-lg"
        aria-label="Ihr Video"
      />

      {/* Verbindungsstatus oben */}
      <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-6">
        <div className="flex items-center justify-center gap-3">
          <p
            className="text-lg font-medium text-white"
            aria-live="polite"
            data-testid="connection-status"
          >
            {STATUS_TEXT[callState]}
          </p>
          {/* Verbindungsqualitaets-Indikator */}
          {callState === 'active' && (
            <div
              className="flex items-center gap-1"
              aria-label={`Verbindungsqualitaet: ${connectionQuality === 'good' ? 'Gut' : connectionQuality === 'degraded' ? 'Eingeschraenkt' : 'Unterbrochen'}`}
              data-testid="quality-indicator"
            >
              {connectionQuality === 'failed' ? (
                <WifiOff className="h-5 w-5 text-red-400" />
              ) : (
                <Wifi className={`h-5 w-5 ${connectionQuality === 'good' ? 'text-quartier-green' : 'text-amber-400'}`} />
              )}
              {connectionQuality === 'degraded' && (
                <span className="text-xs text-amber-400">Eingeschraenkt</span>
              )}
              {connectionQuality === 'failed' && (
                <span className="text-xs text-red-400">Unterbrochen</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Steuerleiste unten */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent p-6">
        {/* Mikrofon Toggle */}
        <button
          onClick={toggleMic}
          className={`flex h-16 w-16 items-center justify-center rounded-full transition-colors ${
            isMicMuted
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          aria-label={isMicMuted ? 'Mikrofon einschalten' : 'Mikrofon ausschalten'}
          data-testid="mic-toggle"
        >
          {isMicMuted ? (
            <MicOff className="h-7 w-7 text-white" />
          ) : (
            <Mic className="h-7 w-7 text-white" />
          )}
        </button>

        {/* Kamera Toggle */}
        <button
          onClick={toggleCam}
          className={`flex h-16 w-16 items-center justify-center rounded-full transition-colors ${
            isCamOff
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          aria-label={isCamOff ? 'Kamera einschalten' : 'Kamera ausschalten'}
          data-testid="cam-toggle"
        >
          {isCamOff ? (
            <VideoOff className="h-7 w-7 text-white" />
          ) : (
            <Video className="h-7 w-7 text-white" />
          )}
        </button>

        {/* Auflegen Button (80px = w-20 h-20, Senior-Modus konform) */}
        <button
          onClick={handleHangup}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 transition-colors hover:bg-red-700"
          aria-label="Auflegen"
          data-testid="hangup-button"
        >
          <Phone className="h-8 w-8 rotate-[135deg] text-white" />
        </button>
      </div>
    </div>
  );
}
