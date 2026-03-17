import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AutoAnswerSettings from './AutoAnswerSettings';

describe('AutoAnswerSettings', () => {
  const defaultProps = {
    linkId: 'link-123',
    initialEnabled: false,
    initialStart: '08:00',
    initialEnd: '20:00',
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('zeigt Toggle fuer Auto-Answer', () => {
    render(<AutoAnswerSettings {...defaultProps} />);
    expect(screen.getByRole('switch', { name: /automatisch annehmen/i })).toBeInTheDocument();
  });

  it('zeigt Zeitfelder wenn aktiviert', () => {
    render(<AutoAnswerSettings {...defaultProps} initialEnabled={true} />);
    expect(screen.getByLabelText(/von/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bis/i)).toBeInTheDocument();
  });

  it('verbirgt Zeitfelder wenn deaktiviert', () => {
    render(<AutoAnswerSettings {...defaultProps} initialEnabled={false} />);
    expect(screen.queryByLabelText(/von/i)).not.toBeInTheDocument();
  });

  it('Toggle aktiviert/deaktiviert Auto-Answer', () => {
    render(<AutoAnswerSettings {...defaultProps} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    // Zeitfelder sollten jetzt sichtbar sein
    expect(screen.getByLabelText(/von/i)).toBeInTheDocument();
  });

  it('zeigt Speichern-Button', () => {
    render(<AutoAnswerSettings {...defaultProps} />);
    expect(screen.getByRole('button', { name: /speichern/i })).toBeInTheDocument();
  });
});
