"use client";

import { Phone } from "lucide-react";

interface KioskContactCardProps {
  name: string;
  avatar: string | null;
  isOnline: boolean;
  autoAnswerInfo: string | null;
  onCall: () => void;
}

const UNKNOWN_CONTACT_NAME = "Unbekannter Kontakt";

function resolveContactName(value: unknown): string {
  if (typeof value !== "string") return UNKNOWN_CONTACT_NAME;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : UNKNOWN_CONTACT_NAME;
}

function resolveNullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function KioskContactCard({
  name,
  avatar,
  isOnline,
  autoAnswerInfo,
  onCall,
}: KioskContactCardProps) {
  const displayName = resolveContactName(name);
  const displayAvatar = resolveNullableText(avatar);
  const displayAutoAnswerInfo = resolveNullableText(autoAnswerInfo);
  const displayIsOnline = isOnline === true;

  return (
    <div
      data-testid="contact-card"
      className="flex items-center gap-4 rounded-2xl bg-white/10 p-4"
    >
      {/* Avatar */}
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white">
          {displayAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayAvatar}
              alt={displayName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        {/* Online-Punkt */}
        <div
          data-online={displayIsOnline}
          className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#2D3142] ${
            displayIsOnline ? "bg-[#4CAF87]" : "bg-gray-500"
          }`}
        />
      </div>

      {/* Name + Info */}
      <div className="flex-1">
        <p className="text-lg font-semibold text-white">{displayName}</p>
        {displayAutoAnswerInfo && (
          <p className="text-sm text-white/60">{displayAutoAnswerInfo}</p>
        )}
        <p className="text-sm text-white/40">
          {displayIsOnline ? "Online" : "Offline"}
        </p>
      </div>

      {/* Anrufen-Button */}
      <button
        onClick={onCall}
        aria-label={`${displayName} anrufen`}
        className="flex min-h-[80px] min-w-[80px] items-center justify-center rounded-2xl bg-[#4CAF87] text-white transition-colors hover:bg-[#3d9a73] active:bg-[#2d7a5a]"
      >
        <Phone className="h-8 w-8" />
      </button>
    </div>
  );
}
