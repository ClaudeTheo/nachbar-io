// app/(app)/call/[userId]/page.tsx
// Nachbar Plus — Video-Anruf Seite
// Startet oder nimmt einen P2P WebRTC Video-Anruf an

'use client';

import { useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { VideoCall } from '@/components/video/VideoCall';

/**
 * CallPage — Seite fuer einen aktiven Video-Anruf.
 *
 * Route: /call/[userId]
 * Query-Params:
 * - callId: Bestehende Call-ID (bei eingehendem Anruf)
 * - answer: "true" wenn eingehender Anruf angenommen wird
 *
 * Ohne Query-Params: Ausgehender Anruf (Initiator)
 * Mit callId + answer=true: Eingehender Anruf annehmen
 */
export default function CallPage() {
  const params = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isAnswering = searchParams.get('answer') === 'true';
  const existingCallId = searchParams.get('callId');

  // callId: bestehende (eingehend) oder neue generieren (ausgehend)
  const callId = useMemo(
    () => existingCallId || crypto.randomUUID(),
    [existingCallId],
  );

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
      isInitiator={!isAnswering}
    />
  );
}
