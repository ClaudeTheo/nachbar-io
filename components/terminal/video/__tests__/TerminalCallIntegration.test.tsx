import { describe, it, expect } from 'vitest';
import {
  normalizeActiveCallData,
  normalizeIncomingCallData,
  type TerminalScreen,
  type IncomingCallData,
  type ActiveCallData,
} from '@/lib/terminal/TerminalContext';

describe('Terminal Call Integration (Types)', () => {
  it('TerminalScreen enthält "active-call"', () => {
    const screen: TerminalScreen = 'active-call';
    expect(screen).toBe('active-call');
  });

  it('IncomingCallData hat alle Pflichtfelder', () => {
    const call: IncomingCallData = {
      callId: 'call-1',
      callerId: 'user-1',
      callerName: 'Lisa',
      callerAvatar: null,
      autoAnswer: true,
      offer: { type: 'offer', sdp: 'test' },
    };
    expect(call.callId).toBe('call-1');
    expect(call.autoAnswer).toBe(true);
  });

  it('ActiveCallData unterstützt video und audio-only', () => {
    const videoCall: ActiveCallData = {
      callId: 'call-1',
      remoteUserId: 'user-1',
      remoteName: 'Lisa',
      isInitiator: true,
      mediaMode: 'video',
    };
    const audioCall: ActiveCallData = {
      ...videoCall,
      mediaMode: 'audio-only',
    };
    expect(videoCall.mediaMode).toBe('video');
    expect(audioCall.mediaMode).toBe('audio-only');
  });

  it('ActiveCallData kann optionales offer enthalten', () => {
    const call: ActiveCallData = {
      callId: 'call-1',
      remoteUserId: 'user-1',
      remoteName: 'Lisa',
      isInitiator: false,
      offer: { type: 'offer', sdp: 'test-sdp' },
      mediaMode: 'video',
    };
    expect(call.offer?.sdp).toBe('test-sdp');
  });

  it('TerminalScreen enthält alle Welle-3-Screens', () => {
    const screens: TerminalScreen[] = ['videochat', 'active-call'];
    expect(screens).toContain('videochat');
    expect(screens).toContain('active-call');
  });

  it('normalisiert eingehende Calls bevor sie in den Terminal-State kommen', () => {
    const call = normalizeIncomingCallData({
      callId: 'call-1',
      callerId: 'user-1',
      callerName: '   ',
      callerAvatar: { url: 'https://example.test/avatar.png' } as unknown as string,
      autoAnswer: 'yes' as unknown as boolean,
      offer: { type: 'offer', sdp: 'valid-sdp' },
    } as IncomingCallData);

    expect(call?.callerName).toBe('Unbekannter Kontakt');
    expect(call?.callerAvatar).toBeNull();
    expect(call?.autoAnswer).toBe(false);
  });

  it('verwirft eingehende Calls mit kaputtem Offer', () => {
    const call = normalizeIncomingCallData({
      callId: 'call-2',
      callerId: 'user-2',
      callerName: 'Lisa',
      callerAvatar: null,
      autoAnswer: false,
      offer: { type: 'answer', sdp: 'wrong-kind' } as RTCSessionDescriptionInit,
    });

    expect(call).toBeNull();
  });

  it('normalisiert aktive Calls bevor sie in den Terminal-State kommen', () => {
    const call = normalizeActiveCallData({
      callId: 'call-3',
      remoteUserId: 'user-3',
      remoteName: '',
      isInitiator: false,
      mediaMode: 'screenshare' as ActiveCallData['mediaMode'],
      offer: { type: 'answer', sdp: 'wrong-kind' } as RTCSessionDescriptionInit,
    });

    expect(call?.remoteName).toBe('Unbekannter Kontakt');
    expect(call?.mediaMode).toBe('video');
    expect(call?.offer).toBeUndefined();
  });
});
