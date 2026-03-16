// WebRTC Signaling ueber Supabase Realtime Broadcast
// Verwendet fuer Nachbar Plus Video-Anrufe (Peer-to-Peer)

import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SignalingCallback, SignalingMessage } from './types';

/**
 * WebRTCSignaling — Kapselt die Supabase Realtime Broadcast-Kommunikation
 * fuer den WebRTC Signaling-Austausch (Offer, Answer, ICE Candidates, Hangup).
 *
 * Jeder Anruf bekommt einen eigenen Channel: `call:{callId}`
 */
export class WebRTCSignaling {
  private channel: RealtimeChannel | null = null;
  private readonly channelName: string;
  private callbacks: Map<string, SignalingCallback<SignalingMessage>> = new Map();

  constructor(private readonly callId: string) {
    this.channelName = `call:${callId}`;
  }

  /** Supabase Realtime Channel abonnieren und auf Broadcast-Events lauschen */
  subscribe(): void {
    const supabase = createClient();
    this.channel = supabase.channel(this.channelName);

    // Alle Signaling-Event-Typen auf einem einzigen Broadcast-Event lauschen
    this.channel.on('broadcast', { event: 'signaling' }, ({ payload }) => {
      const message = payload as SignalingMessage;
      const callback = this.callbacks.get(message.type);
      if (callback) {
        callback(message);
      }
    });

    this.channel.subscribe();
  }

  /** SDP Offer an den Remote-Peer senden */
  sendOffer(sdp: RTCSessionDescriptionInit, senderId: string): void {
    this.broadcast({
      type: 'offer',
      payload: sdp,
      senderId,
      timestamp: Date.now(),
    });
  }

  /** SDP Answer an den Remote-Peer senden */
  sendAnswer(sdp: RTCSessionDescriptionInit, senderId: string): void {
    this.broadcast({
      type: 'answer',
      payload: sdp,
      senderId,
      timestamp: Date.now(),
    });
  }

  /** ICE Candidate an den Remote-Peer senden */
  sendIceCandidate(candidate: RTCIceCandidateInit, senderId: string): void {
    this.broadcast({
      type: 'ice-candidate',
      payload: candidate,
      senderId,
      timestamp: Date.now(),
    });
  }

  /** Hangup-Signal senden (Anruf beenden) */
  sendHangup(senderId: string): void {
    this.broadcast({
      type: 'hangup',
      payload: null,
      senderId,
      timestamp: Date.now(),
    });
  }

  /** Callback registrieren fuer eingehende Offers */
  onOffer(cb: SignalingCallback<SignalingMessage>): void {
    this.callbacks.set('offer', cb);
  }

  /** Callback registrieren fuer eingehende Answers */
  onAnswer(cb: SignalingCallback<SignalingMessage>): void {
    this.callbacks.set('answer', cb);
  }

  /** Callback registrieren fuer eingehende ICE Candidates */
  onIceCandidate(cb: SignalingCallback<SignalingMessage>): void {
    this.callbacks.set('ice-candidate', cb);
  }

  /** Callback registrieren fuer Hangup-Signal */
  onHangup(cb: SignalingCallback<SignalingMessage>): void {
    this.callbacks.set('hangup', cb);
  }

  /** Channel abbestellen und aufraeumen */
  destroy(): void {
    if (this.channel) {
      const supabase = createClient();
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.callbacks.clear();
  }

  /** Interne Hilfsmethode: Broadcast-Nachricht senden */
  private broadcast(message: SignalingMessage): void {
    if (!this.channel) {
      throw new Error('Signaling-Channel nicht abonniert. Bitte subscribe() aufrufen.');
    }
    this.channel.send({
      type: 'broadcast',
      event: 'signaling',
      payload: message,
    });
  }
}
