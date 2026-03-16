// WebRTC Typen fuer Nachbar Plus Video-Anrufe

/** Signaling-Nachrichtentypen fuer WebRTC Verbindungsaufbau */
export type SignalingEventType = 'offer' | 'answer' | 'ice-candidate' | 'hangup';

/** Signaling-Nachricht, die ueber Supabase Realtime Broadcast versendet wird */
export interface SignalingMessage {
  type: SignalingEventType;
  /** SDP fuer offer/answer, ICE-Candidate fuer ice-candidate, leer fuer hangup */
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
  /** Absender-ID (Supabase User ID) */
  senderId: string;
  /** Zeitstempel der Nachricht */
  timestamp: number;
}

/** Zustandsmodell fuer einen Video-Anruf */
export type CallState = 'idle' | 'calling' | 'ringing' | 'active' | 'ended';

/** ICE-Server-Konfiguration fuer RTCPeerConnection */
export interface PeerConnectionConfig {
  iceServers: RTCIceServer[];
}

/** Callback-Typ fuer Signaling-Events */
export type SignalingCallback<T = unknown> = (data: T) => void;
