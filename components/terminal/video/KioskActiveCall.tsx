'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { PhoneOff, Mic, MicOff, VideoOff } from 'lucide-react';
import { WebRTCSignaling, PeerConnectionManager } from '@/lib/webrtc';

interface KioskActiveCallProps {
  callId: string;
  remoteUserId: string;
  callerName: string;
  isInitiator: boolean;
  incomingOffer?: RTCSessionDescriptionInit;
  onHangup: () => void;
  onAudioOnly: () => void;
}

export default function KioskActiveCall({
  callId,
  remoteUserId,
  callerName,
  isInitiator,
  incomingOffer,
  onHangup,
  onAudioOnly,
}: KioskActiveCallProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const managerRef = useRef<PeerConnectionManager | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<string>('Wird aufgebaut...');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // WebRTC-Verbindung aufbauen
  useEffect(() => {
    const signaling = new WebRTCSignaling(callId);
    const manager = new PeerConnectionManager(signaling, remoteUserId);
    managerRef.current = manager;

    manager.onConnectionStateChange((state) => {
      switch (state) {
        case 'active':
          setConnectionStatus('Verbunden');
          durationIntervalRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
          break;
        case 'calling':
        case 'ringing':
          setConnectionStatus('Wird aufgebaut...');
          break;
        case 'ended':
          setConnectionStatus('Beendet');
          onHangup();
          break;
        default:
          setConnectionStatus('Schlechte Verbindung');
      }
    });

    if (remoteVideoRef.current) {
      if (isInitiator) {
        manager.startCall(remoteVideoRef.current);
      } else if (incomingOffer) {
        manager.answerCall(remoteVideoRef.current, incomingOffer);
      }
    }

    // Lokales Video in PiP
    const checkLocalStream = setInterval(() => {
      const stream = manager.getLocalStream();
      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        clearInterval(checkLocalStream);
      }
    }, 200);

    return () => {
      clearInterval(checkLocalStream);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      manager.hangup();
    };
  }, [callId, remoteUserId, isInitiator, incomingOffer, onHangup]);

  const toggleMic = useCallback(() => {
    const stream = managerRef.current?.getLocalStream();
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicMuted(prev => !prev);
    }
  }, []);

  const handleHangup = useCallback(() => {
    managerRef.current?.hangup();
    onHangup();
  }, [onHangup]);

  // Call-Dauer formatieren (MM:SS)
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      role="dialog"
      aria-label={`Videoanruf mit ${callerName}`}
      className="fixed inset-0 z-50 bg-black"
    >
      {/* Remote-Video (Fullscreen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />

      {/* Lokales Video (PiP) */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-28 right-4 h-[120px] w-[160px] rounded-xl border-2 border-white object-cover"
      />

      {/* Statusleiste oben */}
      <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-white">{callerName}</p>
            <p className="text-sm text-white/80">{connectionStatus}</p>
          </div>
          <p className="font-mono text-lg text-white">{formatDuration(callDuration)}</p>
        </div>
      </div>

      {/* Steuerung unten */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-6 bg-gradient-to-t from-black/60 to-transparent p-6">
        {/* Mikrofon */}
        <button
          onClick={toggleMic}
          aria-label={isMicMuted ? 'Mikrofon einschalten' : 'Mikrofon stumm schalten'}
          className="flex min-h-[80px] min-w-[80px] items-center justify-center rounded-full bg-white/20 text-white"
        >
          {isMicMuted ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </button>

        {/* Auflegen (zentral, größer) */}
        <button
          onClick={handleHangup}
          aria-label="Auflegen"
          className="flex min-h-[100px] min-w-[100px] items-center justify-center rounded-full bg-red-500 text-white"
        >
          <PhoneOff className="h-10 w-10" />
        </button>

        {/* Nur Ton */}
        <button
          onClick={onAudioOnly}
          aria-label="Nur Ton"
          className="flex min-h-[80px] min-w-[80px] items-center justify-center rounded-full bg-white/20 text-white"
        >
          <VideoOff className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}
