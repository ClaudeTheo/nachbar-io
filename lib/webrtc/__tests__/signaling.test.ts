// Tests fuer WebRTC Signaling ueber Supabase Realtime
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCSignaling } from '../signaling';
import type { SignalingMessage } from '../types';

// Mock-Channel, der Broadcast-Events simuliert
const mockSend = vi.fn();
const mockSubscribe = vi.fn();
const mockOn = vi.fn().mockReturnThis();
let broadcastHandler: ((args: { payload: SignalingMessage }) => void) | null = null;

const mockChannel = {
  on: mockOn.mockImplementation(
    (
      _type: string,
      _filter: Record<string, string>,
      handler: (args: { payload: SignalingMessage }) => void,
    ) => {
      broadcastHandler = handler;
      return mockChannel;
    },
  ),
  send: mockSend,
  subscribe: mockSubscribe,
};

const mockRemoveChannel = vi.fn();

// Supabase Client Mock
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

describe('WebRTCSignaling', () => {
  let signaling: WebRTCSignaling;

  beforeEach(() => {
    vi.clearAllMocks();
    broadcastHandler = null;
    signaling = new WebRTCSignaling('test-call-123');
    signaling.subscribe();
  });

  it('sendOffer sendet Broadcast mit korrektem Event-Namen und Payload', () => {
    const sdp: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0...' };

    signaling.sendOffer(sdp, 'user-1');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'signaling',
        payload: expect.objectContaining({
          type: 'offer',
          payload: sdp,
          senderId: 'user-1',
        }),
      }),
    );
  });

  it('sendAnswer sendet Broadcast mit korrektem Event-Namen und Payload', () => {
    const sdp: RTCSessionDescriptionInit = { type: 'answer', sdp: 'v=0...' };

    signaling.sendAnswer(sdp, 'user-2');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'signaling',
        payload: expect.objectContaining({
          type: 'answer',
          payload: sdp,
          senderId: 'user-2',
        }),
      }),
    );
  });

  it('onOffer Callback wird bei eingehendem Offer-Broadcast ausgeloest', () => {
    const callback = vi.fn();
    signaling.onOffer(callback);

    const incomingMessage: SignalingMessage = {
      type: 'offer',
      payload: { type: 'offer', sdp: 'remote-sdp' },
      senderId: 'remote-user',
      timestamp: Date.now(),
    };

    // Broadcast-Handler simulieren
    broadcastHandler?.({ payload: incomingMessage });

    expect(callback).toHaveBeenCalledWith(incomingMessage);
  });

  it('destroy entfernt den Supabase Channel', () => {
    signaling.destroy();

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('sendHangup sendet Hangup-Event mit null Payload', () => {
    signaling.sendHangup('user-1');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'signaling',
        payload: expect.objectContaining({
          type: 'hangup',
          payload: null,
          senderId: 'user-1',
        }),
      }),
    );
  });
});
