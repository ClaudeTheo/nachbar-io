// app/(app)/call/[userId]/page.tsx
// Nachbar Plus — Video-Anruf Seite
// Startet einen P2P WebRTC Video-Anruf mit dem angegebenen Nutzer

'use client';

import { useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoCall } from '@/components/video/VideoCall';

/**
 * CallPage — Seite fuer einen aktiven Video-Anruf.
 *
 * Route: /call/[userId]
 * - Extrahiert userId aus den URL-Parametern
 * - Generiert eine eindeutige callId (UUID)
 * - Rendert die VideoCall-Komponente im Vollbild
 * - Bei Auflegen: Navigation zurueck
 */
export default function CallPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();

  // callId einmalig generieren (stabil ueber Re-Renders)
  const callId = useMemo(() => crypto.randomUUID(), []);

  const handleHangup = useCallback(() => {
    router.back();
  }, [router]);

  if (!params.userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-lg text-white">Kein Anrufziel angegeben.</p>
      </div>
    );
  }

  return (
    <VideoCall
      callId={callId}
      remoteUserId={params.userId}
      onHangup={handleHangup}
      isInitiator
    />
  );
}
