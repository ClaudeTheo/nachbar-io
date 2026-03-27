// components/video/__tests__/VideoCall.test.tsx
// Nachbar Plus — Tests für VideoCall Komponente
// Prüft: Rendering, Senior-Modus Touch-Targets, Hangup-Callback

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { VideoCall } from '../VideoCall';

// Mock WebRTC APIs (nicht in jsdom verfügbar)
const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [],
  getAudioTracks: () => [{ enabled: true }],
  getVideoTracks: () => [{ enabled: true }],
});

const mockRTCPeerConnection = vi.fn().mockImplementation(() => ({
  addTrack: vi.fn(),
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
  connectionState: 'new',
  onicecandidate: null,
  ontrack: null,
  onconnectionstatechange: null,
}));

// Mock Supabase Client (für WebRTCSignaling)
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      send: vi.fn(),
    }),
    removeChannel: vi.fn(),
  }),
}));

// Mock lucide-react Icons
vi.mock('lucide-react', () => ({
  Phone: (props: Record<string, unknown>) => <svg data-testid="phone-icon" {...props} />,
  Mic: (props: Record<string, unknown>) => <svg data-testid="mic-icon" {...props} />,
  MicOff: (props: Record<string, unknown>) => <svg data-testid="micoff-icon" {...props} />,
  Video: (props: Record<string, unknown>) => <svg data-testid="video-icon" {...props} />,
  VideoOff: (props: Record<string, unknown>) => <svg data-testid="videooff-icon" {...props} />,
  PhoneOff: (props: Record<string, unknown>) => <svg data-testid="phoneoff-icon" {...props} />,
}));

beforeEach(() => {
  // WebRTC Globals in jsdom einfügen
  Object.defineProperty(globalThis, 'RTCPeerConnection', {
    value: mockRTCPeerConnection,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'RTCSessionDescription', {
    value: vi.fn().mockImplementation((init) => init),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'RTCIceCandidate', {
    value: vi.fn().mockImplementation((init) => init),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const defaultProps = {
  callId: 'test-call-123',
  remoteUserId: 'user-remote-456',
  onHangup: vi.fn(),
};

describe('VideoCall', () => {
  it('rendert den Auflegen-Button', () => {
    render(<VideoCall {...defaultProps} />);
    const hangupBtn = screen.getByTestId('hangup-button');
    expect(hangupBtn).toBeInTheDocument();
    expect(hangupBtn).toHaveAttribute('aria-label', 'Auflegen');
  });

  it('zeigt den Verbindungsstatus an', () => {
    render(<VideoCall {...defaultProps} />);
    const status = screen.getByTestId('connection-status');
    expect(status).toBeInTheDocument();
    // Anfangsstatus ist "Bereit" (idle)
    expect(status.textContent).toMatch(/Bereit|Verbindung/);
  });

  it('ruft onHangup beim Klick auf Auflegen auf', () => {
    const onHangup = vi.fn();
    render(<VideoCall {...defaultProps} onHangup={onHangup} />);

    fireEvent.click(screen.getByTestId('hangup-button'));
    expect(onHangup).toHaveBeenCalledTimes(1);
  });

  it('Auflegen-Button hat 80px Mindestgröße (Senior-Modus)', () => {
    render(<VideoCall {...defaultProps} />);
    const hangupBtn = screen.getByTestId('hangup-button');

    // Tailwind-Klassen w-20 h-20 = 5rem = 80px
    expect(hangupBtn.className).toContain('w-20');
    expect(hangupBtn.className).toContain('h-20');
  });

  it('rendert Mikrofon- und Kamera-Toggle-Buttons', () => {
    render(<VideoCall {...defaultProps} />);

    const micBtn = screen.getByTestId('mic-toggle');
    const camBtn = screen.getByTestId('cam-toggle');

    expect(micBtn).toBeInTheDocument();
    expect(camBtn).toBeInTheDocument();
  });

  it('Toggle-Buttons haben mindestens 64px Größe (w-16 h-16)', () => {
    render(<VideoCall {...defaultProps} />);

    const micBtn = screen.getByTestId('mic-toggle');
    const camBtn = screen.getByTestId('cam-toggle');

    // w-16 h-16 = 4rem = 64px (nah an 80px, Senior-freundlich)
    expect(micBtn.className).toContain('w-16');
    expect(micBtn.className).toContain('h-16');
    expect(camBtn.className).toContain('w-16');
    expect(camBtn.className).toContain('h-16');
  });

  it('hat ein aria-label für Barrierefreiheit', () => {
    render(<VideoCall {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Video-Anruf');
  });
});
