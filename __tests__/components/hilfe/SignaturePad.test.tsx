import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SignaturePad from '@/modules/hilfe/components/SignaturePad';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SignaturePad', () => {
  it('rendert Canvas-Element und Label-Text', () => {
    render(<SignaturePad onSign={vi.fn()} label="Unterschrift" />);

    expect(screen.getByText('Unterschrift')).toBeDefined();
    // Canvas ist kein zugängliches Element, daher per Selektor suchen
    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });

  it('Canvas hat korrekte Dimensionen (300x150)', () => {
    render(<SignaturePad onSign={vi.fn()} label="Unterschrift" />);

    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(150);
  });

  it('hat einen Löschen-Button', () => {
    render(<SignaturePad onSign={vi.fn()} label="Unterschrift" />);

    const button = screen.getByRole('button', { name: /löschen/i });
    expect(button).toBeDefined();
  });
});
