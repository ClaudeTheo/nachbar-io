'use client';

import { PhoneOff, Video } from 'lucide-react';

interface KioskAudioOnlyScreenProps {
  callerName: string;
  callerAvatar: string | null;
  onHangup: () => void;
  onRetryVideo: () => void;
}

export default function KioskAudioOnlyScreen({
  callerName,
  callerAvatar,
  onHangup,
  onRetryVideo,
}: KioskAudioOnlyScreenProps) {
  return (
    <div
      role="dialog"
      aria-label={`Audioanruf mit ${callerName}`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#2D3142]"
    >
      {/* Avatar */}
      <div className="mb-6 flex h-48 w-48 items-center justify-center rounded-full bg-white/20 text-7xl font-bold text-white">
        {callerAvatar ? (
          <img src={callerAvatar} alt={callerName} className="h-full w-full rounded-full object-cover" />
        ) : (
          callerName.charAt(0).toUpperCase()
        )}
      </div>

      {/* Wellenform-Animation (CSS) */}
      <div className="mb-4 flex items-center gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 animate-pulse rounded-full bg-[#4CAF87]"
            style={{
              animationDelay: `${i * 150}ms`,
              animationDuration: '0.8s',
              height: `${16 + (i % 3) * 8}px`,
            }}
          />
        ))}
      </div>

      {/* Name + Status */}
      <h2 className="mb-1 text-3xl font-bold text-white">{callerName}</h2>
      <p className="mb-10 text-lg text-white/60">Nur Ton — Verbindung reicht nicht für Video</p>

      {/* Buttons */}
      <div className="flex gap-6">
        <button
          onClick={onHangup}
          aria-label="Auflegen"
          className="flex min-h-[80px] min-w-[80px] flex-col items-center justify-center gap-2 rounded-2xl bg-red-500 px-6 text-white"
        >
          <PhoneOff className="h-8 w-8" />
          <span className="text-sm font-semibold">Auflegen</span>
        </button>
        <button
          onClick={onRetryVideo}
          aria-label="Video erneut versuchen"
          className="flex min-h-[80px] min-w-[80px] flex-col items-center justify-center gap-2 rounded-2xl bg-white/20 px-6 text-white"
        >
          <Video className="h-8 w-8" />
          <span className="text-sm font-semibold">Video versuchen</span>
        </button>
      </div>
    </div>
  );
}
