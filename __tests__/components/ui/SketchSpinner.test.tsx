import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { SketchSpinner } from '@/components/ui/SketchSpinner';

afterEach(() => {
  cleanup();
});

describe('SketchSpinner', () => {
  it('rendert SVG mit Accessibility-Label', () => {
    render(<SketchSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Wird geladen...')).toBeInTheDocument();
  });

  it('akzeptiert benutzerdefinierte Groesse', () => {
    render(<SketchSpinner size={60} />);
    const svg = screen.getByRole('status');
    expect(svg.getAttribute('width')).toBe('60');
  });

  it('hat animate-sketch-spinner Klasse auf dem Kreis', () => {
    render(<SketchSpinner />);
    const circle = screen.getByRole('status').querySelector('circle');
    expect(circle?.className.baseVal).toContain('animate-sketch-spinner');
  });
});
