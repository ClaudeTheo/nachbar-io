// components/video/CallButton.tsx
// Nachbar Plus — Button zum Starten eines Video-Anrufs
// Senior-Modus: 80px Touch-Target

'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone } from 'lucide-react';

interface CallButtonProps {
  /** Supabase User-ID des Anruf-Ziels */
  targetUserId: string;
  /** Anzeigename des Anruf-Ziels */
  targetName: string;
  /** Ob eine Caregiver-Verbindung besteht (geprueft von uebergeordneter Komponente) */
  hasCaregiverLink?: boolean;
}

/**
 * CallButton — Gruener Telefon-Button zum Starten eines Video-Anrufs.
 *
 * - Nur sichtbar wenn eine caregiver_link Verbindung besteht
 * - 80px Touch-Target (Senior-Modus konform)
 * - Generiert eine callId (UUID) und navigiert zur Anruf-Seite
 */
export function CallButton({
  targetUserId,
  targetName,
  hasCaregiverLink = false,
}: CallButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const startCall = useCallback(async () => {
    if (isStarting) return;
    setIsStarting(true);

    try {
      // Anruf-Seite oeffnen — callId wird dort generiert
      router.push(`/call/${targetUserId}`);
    } catch (err) {
      console.error('[CallButton] Fehler beim Starten des Anrufs:', err);
      setIsStarting(false);
    }
  }, [isStarting, router, targetUserId]);

  // Nur anzeigen wenn Caregiver-Verbindung besteht
  if (!hasCaregiverLink) {
    return null;
  }

  return (
    <button
      onClick={startCall}
      disabled={isStarting}
      className="flex h-20 w-20 items-center justify-center rounded-full bg-[#4CAF87] shadow-lg transition-colors hover:bg-[#3d9b73] disabled:opacity-50"
      aria-label={`Video-Anruf mit ${targetName} starten`}
      title={`${targetName} anrufen`}
      data-testid="call-button"
    >
      <Phone className="h-8 w-8 text-white" />
    </button>
  );
}
