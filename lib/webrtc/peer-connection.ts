// WebRTC PeerConnection-Manager fuer Nachbar Plus Video-Anrufe
// Verwaltet RTCPeerConnection, Media-Streams und ICE-Handling

import type { PeerConnectionConfig, SignalingMessage, CallState, SignalingCallback, ConnectionQuality } from './types';
import type { WebRTCSignaling } from './signaling';

// TURN/STUN-Konfiguration — zentral und austauschbar
// Pilot: Metered.ca Free, Go-Live: eigener coturn (Hetzner EU)
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}

/** Verbindungsqualitaet pruefen (fuer Audio-only-Fallback) */
export function isConnectionDegraded(state: RTCPeerConnectionState): boolean {
  return state === 'disconnected' || state === 'failed';
}

const DEFAULT_CONFIG: PeerConnectionConfig = {
  iceServers: getIceServers(),
};

/**
 * PeerConnectionManager — Verwaltet die WebRTC-Verbindung
 * zwischen zwei Nachbar Plus Nutzern.
 *
 * Einfache API fuer die UI-Schicht (Senior-Modus kompatibel):
 * - startCall() → Anruf starten
 * - answerCall() → Anruf annehmen
 * - hangup() → Anruf beenden
 */
export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private callState: CallState = 'idle';

  // Event-Callbacks fuer die UI-Schicht
  private remoteStreamCallback: SignalingCallback<MediaStream> | null = null;
  private stateChangeCallback: SignalingCallback<CallState> | null = null;

  constructor(
    private readonly signaling: WebRTCSignaling,
    private readonly senderId: string,
    private readonly config: PeerConnectionConfig = DEFAULT_CONFIG,
  ) {
    this.setupSignalingHandlers();
  }

  /** Anruf starten: Kamera/Mikro anfordern, Offer erstellen und senden */
  async startCall(remoteVideoEl: HTMLVideoElement): Promise<void> {
    this.setCallState('calling');

    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    this.peerConnection = new RTCPeerConnection(this.config);
    this.setupIceCandidateHandler();
    this.setupRemoteStreamHandler(remoteVideoEl);
    this.setupConnectionStateHandler();

    // Lokale Tracks zur Verbindung hinzufuegen
    for (const track of this.localStream.getTracks()) {
      this.peerConnection.addTrack(track, this.localStream);
    }

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.signaling.sendOffer(offer, this.senderId);
  }

  /** Eingehenden Anruf annehmen: Kamera/Mikro anfordern, Answer erstellen */
  async answerCall(
    remoteVideoEl: HTMLVideoElement,
    offer: RTCSessionDescriptionInit,
  ): Promise<void> {
    this.setCallState('ringing');

    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    this.peerConnection = new RTCPeerConnection(this.config);
    this.setupIceCandidateHandler();
    this.setupRemoteStreamHandler(remoteVideoEl);
    this.setupConnectionStateHandler();

    // Lokale Tracks hinzufuegen
    for (const track of this.localStream.getTracks()) {
      this.peerConnection.addTrack(track, this.localStream);
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.signaling.sendAnswer(answer, this.senderId);
    this.setCallState('active');
  }

  /** Anruf beenden: Tracks stoppen, Verbindung schliessen, Signaling aufraeumen */
  hangup(): void {
    // Hangup-Signal an Remote senden
    this.signaling.sendHangup(this.senderId);

    this.cleanup();
    this.setCallState('ended');
  }

  /** Callback registrieren: Remote-Stream empfangen (fuer Video-Element) */
  onRemoteStream(cb: SignalingCallback<MediaStream>): void {
    this.remoteStreamCallback = cb;
  }

  /** Callback registrieren: Verbindungsstatus-Aenderungen */
  onConnectionStateChange(cb: SignalingCallback<CallState>): void {
    this.stateChangeCallback = cb;
  }

  /** Aktuellen Anruf-Status abfragen */
  getCallState(): CallState {
    return this.callState;
  }

  /** Lokalen MediaStream zurueckgeben (z.B. fuer lokales Video-Preview) */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /** Audio-only umschalten (Video-Track deaktivieren/reaktivieren) */
  setAudioOnly(enabled: boolean): void {
    if (!this.localStream) return;
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = !enabled;
    });
  }

  /** Aktuelle Verbindungsqualitaet abfragen */
  getConnectionQuality(): ConnectionQuality {
    if (!this.peerConnection) return 'failed';
    const state = this.peerConnection.connectionState;
    if (state === 'connected') return 'good';
    if (state === 'disconnected') return 'degraded';
    return 'failed';
  }

  // --- Private Methoden ---

  /** Signaling-Callbacks fuer eingehende Nachrichten registrieren */
  private setupSignalingHandlers(): void {
    this.signaling.onAnswer(async (msg: SignalingMessage) => {
      if (this.peerConnection && msg.payload) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit),
        );
        this.setCallState('active');
      }
    });

    this.signaling.onIceCandidate(async (msg: SignalingMessage) => {
      if (this.peerConnection && msg.payload) {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(msg.payload as RTCIceCandidateInit),
        );
      }
    });

    this.signaling.onHangup(() => {
      this.cleanup();
      this.setCallState('ended');
    });
  }

  /** ICE Candidate Handler: Neue Candidates an Remote senden */
  private setupIceCandidateHandler(): void {
    if (!this.peerConnection) return;

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendIceCandidate(event.candidate.toJSON(), this.senderId);
      }
    };
  }

  /** Remote-Stream Handler: Video des Gegenueber empfangen */
  private setupRemoteStreamHandler(remoteVideoEl: HTMLVideoElement): void {
    if (!this.peerConnection) return;

    this.peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        remoteVideoEl.srcObject = remoteStream;
        this.remoteStreamCallback?.(remoteStream);
      }
    };
  }

  /** Verbindungsstatus ueberwachen */
  private setupConnectionStateHandler(): void {
    if (!this.peerConnection) return;

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.cleanup();
        this.setCallState('ended');
      }
    };
  }

  /** Aufraeumen: Tracks stoppen, Verbindung schliessen, Signaling zerstoeren */
  private cleanup(): void {
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.signaling.destroy();
  }

  /** Internen Zustand setzen und Callback benachrichtigen */
  private setCallState(state: CallState): void {
    this.callState = state;
    this.stateChangeCallback?.(state);
  }
}
