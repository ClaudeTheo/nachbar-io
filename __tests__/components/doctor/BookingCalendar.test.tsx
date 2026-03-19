import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { DoctorProfile, type DoctorProfileData } from '@/components/doctor/DoctorProfile';
import { BookingCalendar } from '@/components/doctor/BookingCalendar';

afterEach(cleanup);

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock Supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockAuthGetUser = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'appointments') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                lt: () => ({
                  in: () => mockSelect(),
                }),
              }),
            }),
          }),
          insert: (data: unknown) => mockInsert(data),
        };
      }
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) };
    },
    auth: { getUser: () => mockAuthGetUser() },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockResolvedValue({ data: [] });
  mockInsert.mockResolvedValue({ error: null });
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
});

const mockDoctor: DoctorProfileData = {
  id: 'doc-1',
  user_id: 'user-doc-1',
  name: 'Dr. Mueller',
  specialization: ['Allgemeinmedizin', 'Innere Medizin'],
  bio: 'Erfahrener Arzt im Quartier Bad Saeckingen.',
  visible: true,
  accepts_new_patients: true,
  video_consultation: true,
  avg_rating: 4.5,
  review_count: 12,
  quarter_names: ['Bad Saeckingen'],
};

// --- DoctorProfile ---

describe('DoctorProfile', () => {
  it('zeigt Arztname und Fachgebiete', () => {
    render(<DoctorProfile doctor={mockDoctor} />);
    expect(screen.getByText('Dr. Mueller')).toBeInTheDocument();
    expect(screen.getByText('Allgemeinmedizin')).toBeInTheDocument();
    expect(screen.getByText('Innere Medizin')).toBeInTheDocument();
  });

  it('zeigt Bewertung', () => {
    render(<DoctorProfile doctor={mockDoctor} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(12)')).toBeInTheDocument();
  });

  it('zeigt Status-Badges', () => {
    render(<DoctorProfile doctor={mockDoctor} />);
    expect(screen.getByText('Nimmt neue Patienten auf')).toBeInTheDocument();
    expect(screen.getByText('Video-Sprechstunde')).toBeInTheDocument();
  });

  it('zeigt Termin-Button', () => {
    render(<DoctorProfile doctor={mockDoctor} />);
    expect(screen.getByText('Termin buchen')).toBeInTheDocument();
  });

  it('versteckt Termin-Button wenn deaktiviert', () => {
    render(<DoctorProfile doctor={mockDoctor} showBookButton={false} />);
    expect(screen.queryByText('Termin buchen')).not.toBeInTheDocument();
  });
});

// --- BookingCalendar ---

describe('BookingCalendar', () => {
  it('zeigt Datumsauswahl initial', () => {
    render(
      <BookingCalendar doctorId="doc-1" doctorName="Dr. Mueller" videoEnabled={false} />
    );
    expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
    expect(screen.getByText('Waehlen Sie einen Tag:')).toBeInTheDocument();
  });

  it('zeigt Zeitslots nach Datumsauswahl', async () => {
    render(
      <BookingCalendar doctorId="doc-1" doctorName="Dr. Mueller" videoEnabled={false} />
    );

    // Ersten Tag klicken
    const dayButtons = screen.getAllByRole('button');
    const firstDay = dayButtons.find(b => b.textContent?.match(/Mo|Di|Mi|Do|Fr/));
    if (firstDay) {
      fireEvent.click(firstDay);
      await waitFor(() => {
        expect(screen.getByText(/Verfuegbare Zeiten/)).toBeInTheDocument();
      });
    }
  });

  it('zeigt Terminart-Auswahl bei Video-Sprechstunde', async () => {
    render(
      <BookingCalendar doctorId="doc-1" doctorName="Dr. Mueller" videoEnabled={true} />
    );

    // Tag waehlen
    const dayButtons = screen.getAllByRole('button');
    const firstDay = dayButtons.find(b => b.textContent?.match(/Mo|Di|Mi|Do|Fr/));
    if (firstDay) {
      fireEvent.click(firstDay);

      await waitFor(() => {
        expect(screen.getByText(/Verfuegbare Zeiten/)).toBeInTheDocument();
      });

      // Zeitslot waehlen (08:00)
      const timeButton = screen.getByText('08:00');
      fireEvent.click(timeButton);

      await waitFor(() => {
        expect(screen.getByText('Vor Ort')).toBeInTheDocument();
        expect(screen.getByText('Video-Sprechstunde')).toBeInTheDocument();
      });
    }
  });
});
