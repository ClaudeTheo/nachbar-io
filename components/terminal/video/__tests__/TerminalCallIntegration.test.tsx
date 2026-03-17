import { describe, it, expect } from 'vitest';
import type { TerminalScreen, IncomingCallData, ActiveCallData } from '@/lib/terminal/TerminalContext';

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
});
