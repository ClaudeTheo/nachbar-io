"use client";

import { Phone } from "lucide-react";

interface KioskContactCardProps {
  name: string;
  avatar: string | null;
  isOnline: boolean;
  autoAnswerInfo: string | null;
  onCall: () => void;
}

export default function KioskContactCard({
  name,
  avatar,
  isOnline,
  autoAnswerInfo,
  onCall,
}: KioskContactCardProps) {
  return (
    <div
      data-testid="contact-card"
      className="flex items-center gap-4 rounded-2xl bg-white/10 p-4"
    >
      {/* Avatar */}
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        {/* Online-Punkt */}
        <div
          data-online={isOnline}
          className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#2D3142] ${
            isOnline ? "bg-[#4CAF87]" : "bg-gray-500"
          }`}
        />
      </div>

      {/* Name + Info */}
      <div className="flex-1">
        <p className="text-lg font-semibold text-white">{name}</p>
        {autoAnswerInfo && (
          <p className="text-sm text-white/60">{autoAnswerInfo}</p>
        )}
        <p className="text-sm text-white/40">
          {isOnline ? "Online" : "Offline"}
        </p>
      </div>

      {/* Anrufen-Button */}
      <button
        onClick={onCall}
        aria-label={`${name} anrufen`}
        className="flex min-h-[80px] min-w-[80px] items-center justify-center rounded-2xl bg-[#4CAF87] text-white transition-colors hover:bg-[#3d9a73] active:bg-[#2d7a5a]"
      >
        <Phone className="h-8 w-8" />
      </button>
    </div>
  );
}
