import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('lucide-react', () => ({
  HandHeart: (props: Record<string, unknown>) => <svg {...props} />,
  MapPin: (props: Record<string, unknown>) => <svg {...props} />,
  Clock: (props: Record<string, unknown>) => <svg {...props} />,
  CheckCircle2: (props: Record<string, unknown>) => <svg {...props} />,
  X: (props: Record<string, unknown>) => <svg {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <svg {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg {...props} />,
  ArrowLeft: (props: Record<string, unknown>) => <svg {...props} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/ui/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('@/lib/haptics', () => ({ haptic: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'helper-001' }, loading: false }),
}));

const mockRequests = [
  { id: 'r1', title: 'Einkaufen gehen', description: 'Aldi fuer Frau Mueller', category: 'Einkaufen', urgency: 'normal', created_at: new Date(Date.now() - 30 * 60000).toISOString(), requester: { display_name: 'Frau Mueller' } },
  { id: 'r2', title: 'Medikamente abholen', description: '', category: 'Apotheke', urgency: 'urgent', created_at: new Date(Date.now() - 2 * 3600000).toISOString(), requester: { display_name: 'Herr Schmidt' } },
];

const mockUpdate = vi.fn(() => ({
  eq: () => Promise.resolve({ error: null }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: mockRequests, error: null }),
            }),
          }),
        }),
      }),
      update: mockUpdate,
    }),
  }),
}));

import HelferRequestsPage from '@/app/(app)/hilfe/requests/page';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('HelferRequestsPage', () => {
  it('rendert die Seite mit Anfragen-Liste', async () => {
    const { container } = render(<HelferRequestsPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="requests-page"]')).toBeTruthy();
    });
  });

  it('zeigt Anfragen mit Titel und Anfragesteller', async () => {
    const { container } = render(<HelferRequestsPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="request-r1"]')).toBeTruthy();
    });
    expect(container.textContent).toContain('Einkaufen gehen');
    expect(container.textContent).toContain('Frau Mueller');
  });

  it('zeigt Dringlichkeits-Badge fuer urgente Anfragen', async () => {
    const { container } = render(<HelferRequestsPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="request-r2"]')).toBeTruthy();
    });
    expect(container.textContent).toContain('Dringend');
  });

  it('hat Annehmen und Ablehnen Buttons', async () => {
    const { container } = render(<HelferRequestsPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="accept-r1"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="decline-r1"]')).toBeTruthy();
    });
  });

  it('entfernt Anfrage nach Ablehnen', async () => {
    const { container } = render(<HelferRequestsPage />);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="request-r1"]')).toBeTruthy();
    });
    const declineBtn = container.querySelector('[data-testid="decline-r1"]') as HTMLElement;
    fireEvent.click(declineBtn);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="request-r1"]')).toBeNull();
    });
  });
});
