// __tests__/components/youth-points-display.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PointsDisplay } from '@/modules/youth';

afterEach(cleanup);

describe('PointsDisplay', () => {
  it('zeigt Punkte-Anzahl an', () => {
    render(<PointsDisplay points={150} />);
    expect(screen.getByText('150')).toBeDefined();
  });

  it('zeigt Label an', () => {
    render(<PointsDisplay points={0} />);
    expect(screen.getByText('Punkte')).toBeDefined();
  });
});
