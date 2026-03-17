import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import KioskActiveCall from '../KioskActiveCall';

// Mock WebRTC + Supabase
vi.mock('@/lib/webrtc', () => {
  class MockSignaling {
    onAnswer = vi.fn();
    onIceCandidate = vi.fn();
    onHangup = vi.fn();
    sendOffer = vi.fn();
    sendAnswer = vi.fn();
    sendIceCandidate = vi.fn();
    sendHangup = vi.fn();
    destroy = vi.fn();
  }
  class MockPeerConnectionManager {
    startCall = vi.fn();
    answerCall = vi.fn();
    hangup = vi.fn();
    getLocalStream = vi.fn().mockReturnValue(null);
    onConnectionStateChange = vi.fn();
    onRemoteStream = vi.fn();
    setAudioOnly = vi.fn();
  }
  return {
    WebRTCSignaling: MockSignaling,
    PeerConnectionManager: MockPeerConnectionManager,
  };
});

afterEach(() => {
  cleanup();
});

describe('KioskActiveCall', () => {
  const defaultProps = {
    callId: 'call-123',
    remoteUserId: 'user-456',
    callerName: 'Lisa',
    isInitiator: true,
    onHangup: vi.fn(),
    onAudioOnly: vi.fn(),
  };

  it('zeigt Statusleiste mit Verbindungsstatus', () => {
    render(<KioskActiveCall {...defaultProps} />);
    expect(screen.getByText(/wird aufgebaut/i)).toBeInTheDocument();
  });

  it('zeigt Auflegen-Button (100px, rot)', () => {
    render(<KioskActiveCall {...defaultProps} />);
    const hangup = screen.getByRole('button', { name: /auflegen/i });
    expect(hangup).toBeInTheDocument();
    expect(hangup.className).toMatch(/min-h-\[100px\]/);
  });

  it('zeigt Mikrofon-Button', () => {
    render(<KioskActiveCall {...defaultProps} />);
    expect(screen.getByRole('button', { name: /mikrofon/i })).toBeInTheDocument();
  });

  it('zeigt Nur-Ton-Button', () => {
    render(<KioskActiveCall {...defaultProps} />);
    expect(screen.getByRole('button', { name: /nur ton/i })).toBeInTheDocument();
  });

  it('ruft onHangup bei Klick auf Auflegen', () => {
    render(<KioskActiveCall {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /auflegen/i }));
    expect(defaultProps.onHangup).toHaveBeenCalledTimes(1);
  });
});
