"use client";

// Scrollbare Nachrichtenliste. Zeigt eigene Nachrichten rechts, Peer links.
// Auto-Scroll zur neuesten Nachricht beim Mount + bei neuen Nachrichten.

import { useEffect, useRef } from "react";
import { MediaAttachment } from "./MediaAttachment";

export interface MessageViewModel {
  id: string;
  sender_id: string;
  content: string | null;
  media_type: "image" | "audio" | null;
  media_url: string | null;
  media_duration_sec: number | null;
  created_at: string;
  read_at?: string | null;
}

interface MessageListProps {
  messages: MessageViewModel[];
  currentUserId: string;
  showReadReceipts?: boolean;
}

export function MessageList({
  messages,
  currentUserId,
  showReadReceipts,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Messages kommen aus API in desc Reihenfolge — umkehren fuer Anzeige
  const ordered = [...messages].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {ordered.length === 0 ? (
        <div className="flex h-full items-center justify-center text-base text-[#2D3142]/60">
          Noch keine Nachrichten. Sagen Sie Hallo!
        </div>
      ) : null}

      {ordered.map((msg) => {
        const isSelf = msg.sender_id === currentUserId;
        return (
          <div
            key={msg.id}
            className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                isSelf
                  ? "bg-[#4CAF87] text-white"
                  : "bg-white text-[#2D3142] shadow-sm"
              }`}
            >
              {msg.media_type && msg.media_url ? (
                <div className="mb-2">
                  <MediaAttachment
                    mediaType={msg.media_type}
                    mediaPath={msg.media_url}
                    durationSec={msg.media_duration_sec}
                  />
                </div>
              ) : null}
              {msg.content ? (
                <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
                  {msg.content}
                </p>
              ) : null}
              <div
                className={`mt-1 text-xs ${
                  isSelf ? "text-white/70" : "text-[#2D3142]/60"
                }`}
              >
                {formatTime(msg.created_at)}
                {showReadReceipts && isSelf && msg.read_at ? " · gelesen" : ""}
              </div>
            </div>
          </div>
        );
      })}

      <div ref={endRef} />
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
