import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UpdateBanner } from '@/components/UpdateBanner';

afterEach(cleanup);

describe('UpdateBanner', () => {
  it('zeigt Update-Hinweis an', () => {
    render(<UpdateBanner onUpdate={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('Neue Version verfügbar')).toBeInTheDocument();
    expect(screen.getByTestId('update-apply-btn')).toBeInTheDocument();
  });

  it('ruft onUpdate bei Klick auf Aktualisieren auf', () => {
    const onUpdate = vi.fn();
    render(<UpdateBanner onUpdate={onUpdate} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTestId('update-apply-btn'));
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('ruft onDismiss bei Klick auf Schliessen auf', () => {
    const onDismiss = vi.fn();
    render(<UpdateBanner onUpdate={vi.fn()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('update-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('hat senior-freundliche Touch-Targets (min 44px)', () => {
    render(<UpdateBanner onUpdate={vi.fn()} onDismiss={vi.fn()} />);
    const updateButton = screen.getByTestId('update-apply-btn');
    expect(updateButton.className).toContain('min-h-[44px]');
    const dismissButton = screen.getByTestId('update-dismiss-btn');
    expect(dismissButton.className).toContain('min-h-[44px]');
  });
});
