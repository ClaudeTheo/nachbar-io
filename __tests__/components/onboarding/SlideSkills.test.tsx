import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SlideSkills } from '@/modules/onboarding';
import { SKILL_CATEGORIES } from '@/lib/constants';
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('SlideSkills', () => {
  afterEach(() => cleanup());

  it('zeigt alle Skill-Kategorien als Checkboxen (ohne "other")', () => {
    render(<SlideSkills selectedSkills={[]} onToggle={vi.fn()} />);
    for (const cat of SKILL_CATEGORIES.filter(c => c.id !== 'other')) {
      expect(screen.getByText(cat.label)).toBeInTheDocument();
    }
  });

  it('markiert ausgewaehlte Skills visuell', () => {
    render(<SlideSkills selectedSkills={['garden', 'transport']} onToggle={vi.fn()} />);
    const gardenBtn = screen.getByText('Garten / Pflanzen').closest('button');
    expect(gardenBtn?.className).toContain('bg-quartier-green');
  });

  it('ruft onToggle beim Antippen auf', () => {
    const onToggle = vi.fn();
    render(<SlideSkills selectedSkills={[]} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Kochen / Backen').closest('button')!);
    expect(onToggle).toHaveBeenCalledWith('cooking');
  });

  it('hat min-h-[80px] Touch-Targets (Senior-Mode)', () => {
    render(<SlideSkills selectedSkills={[]} onToggle={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(SKILL_CATEGORIES.filter(c => c.id !== 'other').length);
    for (const btn of buttons) {
      expect(btn.className).toContain('min-h-[80px]');
    }
  });
});
