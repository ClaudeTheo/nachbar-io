'use client';

import {
  normalizeIncomingCallData,
  useTerminal,
} from '@/lib/terminal/TerminalContext';
import KioskIncomingCall from './KioskIncomingCall';

/**
 * IncomingCallOverlay: Rendert das Incoming-Call-UI wenn ein Anruf eingeht.
 * Wird im Terminal-Layout eingebunden (z-48, über Screensaver/Appointment).
 */
export default function IncomingCallOverlay() {
  const { incomingCall, setIncomingCall, setActiveCall, setActiveScreen } = useTerminal();
  const safeIncomingCall = normalizeIncomingCallData(incomingCall);

  if (!safeIncomingCall) return null;

  return (
    <KioskIncomingCall
      callerName={safeIncomingCall.callerName}
      callerAvatar={safeIncomingCall.callerAvatar}
      autoAnswer={safeIncomingCall.autoAnswer}
      onAccept={() => {
        setActiveCall({
          callId: safeIncomingCall.callId,
          remoteUserId: safeIncomingCall.callerId,
          remoteName: safeIncomingCall.callerName,
          isInitiator: false,
          offer: safeIncomingCall.offer,
          mediaMode: 'video',
        });
        setIncomingCall(null);
        setActiveScreen('active-call');
      }}
      onDecline={() => setIncomingCall(null)}
    />
  );
}
