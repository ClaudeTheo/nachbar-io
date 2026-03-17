import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import KioskAudioOnlyScreen from '../KioskAudioOnlyScreen';

afterEach(() => {
  cleanup();
});

describe('KioskAudioOnlyScreen', () => {
  const defaultProps = {
    callerName: 'Lisa',
    callerAvatar: null as string | null,
    onHangup: vi.fn(),
    onRetryVideo: vi.fn(),
  };

  it('zeigt "Nur Ton" Hinweis', () => {
    render(<KioskAudioOnlyScreen {...defaultProps} />);
    expect(screen.getByText(/nur ton/i)).toBeInTheDocument();
  });

  it('zeigt Anrufername', () => {
    render(<KioskAudioOnlyScreen {...defaultProps} />);
    expect(screen.getByText('Lisa')).toBeInTheDocument();
  });

  it('zeigt Auflegen-Button und Video-Retry-Button', () => {
    render(<KioskAudioOnlyScreen {...defaultProps} />);
    expect(screen.getByRole('button', { name: /auflegen/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /video.*versuchen/i })).toBeInTheDocument();
  });

  it('ruft onRetryVideo bei Klick', () => {
    render(<KioskAudioOnlyScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /video.*versuchen/i }));
    expect(defaultProps.onRetryVideo).toHaveBeenCalledTimes(1);
  });
});
