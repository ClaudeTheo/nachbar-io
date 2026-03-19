// __tests__/components/youth-task-card.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { TaskCard } from '@/components/youth/TaskCard';

afterEach(cleanup);

describe('TaskCard', () => {
  const defaultProps = {
    title: 'Laptop-Hilfe fuer Frau Mueller',
    category: 'technik' as const,
    points: 30,
    estimatedMinutes: 45,
    status: 'open' as const,
  };

  it('zeigt Titel an', () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText('Laptop-Hilfe fuer Frau Mueller')).toBeDefined();
  });

  it('zeigt Punkte an', () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText('30 Punkte')).toBeDefined();
  });

  it('zeigt Kategorie an', () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText('Technik')).toBeDefined();
  });

  it('zeigt geschaetzte Dauer an', () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText('~45 Min.')).toBeDefined();
  });
});
