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

  it('zeigt Fallback statt leerem Anrufernamen und kaputtem Avatar', () => {
    render(
      <KioskAudioOnlyScreen
        {...defaultProps}
        callerName="   "
        callerAvatar={{ url: 'https://example.test/avatar.png' } as unknown as string}
      />,
    );

    expect(screen.getByRole('dialog', { name: /audioanruf mit unbekannter kontakt/i })).toBeInTheDocument();
    expect(screen.getByText('Unbekannter Kontakt')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
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
