// components/care/MedicationCard.test.tsx
// Nachbar.io — Tests fuer Medikamenten-Karte (Medikamentensicherheit)

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MedicationCard } from './MedicationCard';
import type { CareMedication } from '@/lib/care/types';

vi.mock('lucide-react', () => ({
  Pill: (props: Record<string, unknown>) => <svg data-testid="pill-icon" {...props} />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const TEST_MEDICATION: CareMedication = {
  id: 'med-1',
  senior_id: 'user-1',
  name: 'Metoprolol',
  dosage: '50mg',
  schedule: { type: 'daily', times: ['08:00', '20:00'] },
  instructions: 'Vor dem Essen einnehmen',
  managed_by: null,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const TEST_SCHEDULED_AT = '2026-03-12T08:00:00Z';

describe('MedicationCard', () => {
  it('zeigt Medikamentenname und Dosierung', () => {
    render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="pending" />);
    expect(screen.getByText('Metoprolol')).toBeInTheDocument();
    expect(screen.getByText('50mg')).toBeInTheDocument();
  });

  it('zeigt Anweisungen', () => {
    render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="pending" />);
    expect(screen.getByText('Vor dem Essen einnehmen')).toBeInTheDocument();
  });

  it('zeigt Pill-Icon', () => {
    render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="pending" />);
    expect(screen.getByTestId('pill-icon')).toBeInTheDocument();
  });

  describe('Status-Badges', () => {
    it('zeigt "Ausstehend" fuer pending', () => {
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="pending" />);
      expect(screen.getByText('Ausstehend')).toBeInTheDocument();
    });

    it('zeigt "Genommen" fuer taken', () => {
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="taken" />);
      expect(screen.getByText('Genommen')).toBeInTheDocument();
    });

    it('zeigt "Uebersprungen" fuer skipped', () => {
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="skipped" />);
      expect(screen.getByText('Uebersprungen')).toBeInTheDocument();
    });

    it('zeigt "Verschoben" fuer snoozed', () => {
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="snoozed" />);
      expect(screen.getByText('Verschoben')).toBeInTheDocument();
    });

    it('zeigt "Verpasst" fuer missed', () => {
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="missed" />);
      expect(screen.getByText('Verpasst')).toBeInTheDocument();
    });
  });

  describe('Aktions-Buttons', () => {
    it('zeigt Aktions-Buttons NUR bei pending-Status', () => {
      const onAction = vi.fn();
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="pending" onAction={onAction} />);
      expect(screen.getByText('Genommen')).toBeInTheDocument();
      expect(screen.getByText('Spaeter')).toBeInTheDocument();
      expect(screen.getByText('Uebersprungen')).toBeInTheDocument();
    });

    it('zeigt KEINE Aktions-Buttons bei taken-Status', () => {
      const onAction = vi.fn();
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="taken" onAction={onAction} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('zeigt KEINE Aktions-Buttons ohne onAction', () => {
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="pending" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('ruft onAction("taken") bei Klick auf "Genommen"', () => {
      const onAction = vi.fn();
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="pending" onAction={onAction} />);
      fireEvent.click(screen.getByText('Genommen'));
      expect(onAction).toHaveBeenCalledWith('taken');
    });

    it('ruft onAction("snoozed") bei Klick auf "Spaeter"', () => {
      const onAction = vi.fn();
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="pending" onAction={onAction} />);
      fireEvent.click(screen.getByText('Spaeter'));
      expect(onAction).toHaveBeenCalledWith('snoozed');
    });

    it('ruft onAction("skipped") bei Klick auf "Uebersprungen"', () => {
      const onAction = vi.fn();
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="pending" onAction={onAction} />);
      fireEvent.click(screen.getByText('Uebersprungen'));
      expect(onAction).toHaveBeenCalledWith('skipped');
    });

    it('Aktions-Buttons haben minHeight 48px (Touch-Target)', () => {
      const onAction = vi.fn();
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="pending" onAction={onAction} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach(btn => {
        expect(btn.style.minHeight).toBe('48px');
      });
    });

    it('Aktions-Buttons haben touchAction: manipulation', () => {
      const onAction = vi.fn();
      render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="pending" onAction={onAction} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach(btn => {
        expect(btn.style.touchAction).toBe('manipulation');
      });
    });
  });

  it('zeigt Snoozed-Until-Hinweis bei verschobenem Status', () => {
    render(
      <MedicationCard
        medication={TEST_MEDICATION}
        scheduledAt={TEST_SCHEDULED_AT}
        status="snoozed"
        snoozedUntil="2026-03-12T08:30:00Z"
      />
    );
    expect(screen.getByText(/Erneute Erinnerung um/)).toBeInTheDocument();
  });

  it('zeigt KEINEN Snoozed-Hinweis ohne snoozedUntil', () => {
    render(<MedicationCard medication={TEST_MEDICATION} scheduledAt={TEST_SCHEDULED_AT} status="snoozed" />);
    expect(screen.queryByText(/Erneute Erinnerung/)).not.toBeInTheDocument();
  });

  it('zeigt KEINE Dosierung wenn nicht angegeben', () => {
    const medOhneDosierung = { ...TEST_MEDICATION, dosage: null };
    render(<MedicationCard medication={medOhneDosierung} scheduledAt={TEST_SCHEDULED_AT} status="pending" />);
    expect(screen.getByText('Metoprolol')).toBeInTheDocument();
    expect(screen.queryByText('50mg')).not.toBeInTheDocument();
  });

  it('zeigt KEINE Anweisungen wenn nicht angegeben', () => {
    const medOhneAnweisungen = { ...TEST_MEDICATION, instructions: null };
    render(<MedicationCard medication={medOhneAnweisungen} scheduledAt={TEST_SCHEDULED_AT} status="pending" />);
    expect(screen.queryByText('Vor dem Essen einnehmen')).not.toBeInTheDocument();
  });
});
