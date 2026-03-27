'use client';

import { useTerminal } from '@/lib/terminal/TerminalContext';
import KioskIncomingCall from './KioskIncomingCall';

/**
 * IncomingCallOverlay: Rendert das Incoming-Call-UI wenn ein Anruf eingeht.
 * Wird im Terminal-Layout eingebunden (z-48, über Screensaver/Appointment).
 */
export default function IncomingCallOverlay() {
  const { incomingCall, setIncomingCall, setActiveCall, setActiveScreen } = useTerminal();

  if (!incomingCall) return null;

  return (
    <KioskIncomingCall
      callerName={incomingCall.callerName}
      callerAvatar={incomingCall.callerAvatar}
      autoAnswer={incomingCall.autoAnswer}
      onAccept={() => {
        setActiveCall({
          callId: incomingCall.callId,
          remoteUserId: incomingCall.callerId,
          remoteName: incomingCall.callerName,
          isInitiator: false,
          offer: incomingCall.offer,
          mediaMode: 'video',
        });
        setIncomingCall(null);
        setActiveScreen('active-call');
      }}
      onDecline={() => setIncomingCall(null)}
    />
  );
}
