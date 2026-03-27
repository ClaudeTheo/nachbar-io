import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

import { PageTransition } from '@/components/PageTransition';

describe('PageTransition', () => {
  it('rendert Kinder mit animate-page-enter Klasse', () => {
    render(
      <PageTransition>
        <div data-testid="child">Inhalt</div>
      </PageTransition>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    // Wrapper div sollte die Animation-Klasse haben
    const wrapper = screen.getByTestId('child').parentElement;
    expect(wrapper?.className).toContain('animate-page-enter');
  });

  it('rendert ohne Crash', () => {
    const { container } = render(
      <PageTransition>
        <p>Test</p>
      </PageTransition>
    );
    expect(container).toBeTruthy();
  });
});
