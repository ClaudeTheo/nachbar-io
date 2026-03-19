// __tests__/components/municipal/GpsPicker.test.tsx
// Tests fuer die GPS-Picker Komponente (ohne Leaflet, da SSR-freier dynamic import)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/dynamic — gibt nur den Loader-Fallback zurueck
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockMap = () => <div data-testid="mock-leaflet-map">Kartenansicht</div>;
    MockMap.displayName = 'MockGpsPickerMap';
    return MockMap;
  },
}));

import { GpsPicker } from '@/components/municipal/GpsPicker';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GpsPicker', () => {
  const defaultProps = {
    lat: null as number | null,
    lng: null as number | null,
    locationText: '',
    onLocationChange: vi.fn(),
    onTextChange: vi.fn(),
  };

  it('rendert GPS-Button', () => {
    render(<GpsPicker {...defaultProps} />);
    // Suche nach dem Button mit GPS-Standort-Text
    const buttons = screen.getAllByRole('button');
    const gpsButton = buttons.find((b) => b.textContent?.includes('Standort'));
    expect(gpsButton).toBeDefined();
  });

  it('rendert Standort-Textfeld', () => {
    render(<GpsPicker {...defaultProps} />);
    const inputs = document.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it('zeigt Koordinaten wenn lat/lng gesetzt', () => {
    render(<GpsPicker {...defaultProps} lat={47.5535} lng={7.964} />);
    // Koordinaten sollten irgendwo im DOM stehen
    const body = document.body.textContent ?? '';
    expect(body).toContain('47.55350');
    expect(body).toContain('7.96400');
  });

  it('ruft onTextChange bei Eingabe auf', () => {
    const onTextChange = vi.fn();
    render(<GpsPicker {...defaultProps} onTextChange={onTextChange} />);

    // Alle Text-Inputs finden, den letzten nehmen (StrictMode rendert doppelt)
    const inputs = document.querySelectorAll('input[type="text"]');
    const textInput = inputs[inputs.length - 1] as HTMLInputElement;
    fireEvent.change(textInput, { target: { value: 'Sanarystraße 5' } });

    expect(onTextChange).toHaveBeenCalledWith('Sanarystraße 5');
  });

  it('hat mindestens 2 Buttons (GPS + Karte)', () => {
    render(<GpsPicker {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});
