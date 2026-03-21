// __tests__/components/moderation-dialog.test.tsx
// Tests fuer ReportDialog, ContentActions und BlockButton

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ReportDialog } from '@/components/moderation/ReportDialog';
import { ContentActions } from '@/components/moderation/ContentActions';
import { BlockButton } from '@/components/moderation/BlockButton';

// Mock sonner Toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ReportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('rendert Dialog-Titel wenn offen', () => {
    render(
      <ReportDialog
        contentType="post"
        contentId="p1"
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText('Inhalt melden')).toBeDefined();
  });

  it('zeigt alle 7 Meldegruende', () => {
    render(
      <ReportDialog
        contentType="post"
        contentId="p1"
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText('Spam oder Werbung')).toBeDefined();
    expect(screen.getByText('Belästigung')).toBeDefined();
    expect(screen.getByText('Hass oder Beleidigung')).toBeDefined();
    expect(screen.getByText('Betrug oder Scam')).toBeDefined();
    expect(screen.getByText('Unangemessener Inhalt')).toBeDefined();
    expect(screen.getByText('Falsche Kategorie')).toBeDefined();
    expect(screen.getByText('Sonstiges')).toBeDefined();
  });

  it('Melden-Button ist initial deaktiviert', () => {
    render(
      <ReportDialog
        contentType="post"
        contentId="p1"
        open={true}
        onOpenChange={() => {}}
      />,
    );
    const submitBtn = screen.getByText('Melden');
    expect(submitBtn.closest('button')?.disabled).toBe(true);
  });

  it('aktiviert Melden-Button nach Auswahl eines Grundes', async () => {
    render(
      <ReportDialog
        contentType="post"
        contentId="p1"
        open={true}
        onOpenChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByText('Spam oder Werbung'));
    const submitBtn = screen.getByText('Melden');
    expect(submitBtn.closest('button')?.disabled).toBe(false);
  });

  it('sendet Report an API und zeigt Toast', async () => {
    const onOpenChange = vi.fn();
    render(
      <ReportDialog
        contentType="post"
        contentId="p1"
        open={true}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByText('Betrug oder Scam'));
    fireEvent.click(screen.getByText('Melden'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/moderation/report', expect.objectContaining({
        method: 'POST',
      }));
    });

    // Body pruefen
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.contentType).toBe('post');
    expect(callBody.contentId).toBe('p1');
    expect(callBody.reasonCategory).toBe('scam');
  });

  it('zeigt Fehler bei Doppelmeldung (409)', async () => {
    const { toast } = await import('sonner');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: 'Bereits gemeldet' }),
    });

    render(
      <ReportDialog
        contentType="post"
        contentId="p1"
        open={true}
        onOpenChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('Spam oder Werbung'));
    fireEvent.click(screen.getByText('Melden'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Sie haben diesen Inhalt bereits gemeldet.');
    });
  });

  it('zeigt Textarea nach Auswahl eines Grundes', () => {
    render(
      <ReportDialog
        contentType="post"
        contentId="p1"
        open={true}
        onOpenChange={() => {}}
      />,
    );
    // Textarea ist erst nach Auswahl sichtbar
    expect(screen.queryByPlaceholderText('Beschreiben Sie das Problem...')).toBeNull();
    fireEvent.click(screen.getByText('Sonstiges'));
    expect(screen.getByPlaceholderText('Beschreiben Sie das Problem...')).toBeDefined();
  });
});

describe('ContentActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('rendert Drei-Punkte-Button', () => {
    render(
      <ContentActions
        contentType="post"
        contentId="p1"
        authorId="author-1"
      />,
    );
    expect(screen.getByLabelText('Weitere Aktionen')).toBeDefined();
  });

  it('zeigt Menue-Eintraege nach Klick', () => {
    render(
      <ContentActions
        contentType="post"
        contentId="p1"
        authorId="author-1"
      />,
    );
    fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
    expect(screen.getByText('Melden')).toBeDefined();
    expect(screen.getByText('Stummschalten')).toBeDefined();
    expect(screen.getByText('Blockieren')).toBeDefined();
    expect(screen.getByText('Sicherheit melden')).toBeDefined();
  });

  it('rendert nichts bei eigenem Content', () => {
    const { container } = render(
      <ContentActions
        contentType="post"
        contentId="p1"
        authorId="author-1"
        isOwnContent={true}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('oeffnet ReportDialog bei Melden-Klick', async () => {
    render(
      <ContentActions
        contentType="post"
        contentId="p1"
        authorId="author-1"
      />,
    );
    fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
    fireEvent.click(screen.getByText('Melden'));

    await waitFor(() => {
      expect(screen.getByText('Inhalt melden')).toBeDefined();
    });
  });

  it('sendet Mute-Request bei Stummschalten', async () => {
    render(
      <ContentActions
        contentType="post"
        contentId="p1"
        authorId="author-1"
      />,
    );
    fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
    fireEvent.click(screen.getByText('Stummschalten'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/moderation/block', expect.objectContaining({
        method: 'POST',
      }));
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.blockedId).toBe('author-1');
    expect(callBody.blockLevel).toBe('mute');
  });

  it('sendet Block-Request bei Blockieren', async () => {
    render(
      <ContentActions
        contentType="post"
        contentId="p1"
        authorId="author-1"
      />,
    );
    fireEvent.click(screen.getByLabelText('Weitere Aktionen'));
    fireEvent.click(screen.getByText('Blockieren'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/moderation/block', expect.objectContaining({
        method: 'POST',
      }));
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.blockLevel).toBe('block');
  });
});

describe('BlockButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('zeigt Blockieren-Text wenn nicht blockiert', () => {
    render(<BlockButton userId="u1" />);
    expect(screen.getByText('Blockieren')).toBeDefined();
  });

  it('zeigt Block-aufheben-Text wenn blockiert', () => {
    render(<BlockButton userId="u1" currentBlockLevel="block" />);
    expect(screen.getByText('Block aufheben')).toBeDefined();
  });

  it('sendet Block-Request bei Klick', async () => {
    render(<BlockButton userId="u1" />);
    fireEvent.click(screen.getByText('Blockieren'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/moderation/block', expect.objectContaining({
        method: 'POST',
      }));
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.blockedId).toBe('u1');
    expect(callBody.blockLevel).toBe('block');
  });

  it('sendet DELETE bei Block-aufheben', async () => {
    render(<BlockButton userId="u1" currentBlockLevel="block" />);
    fireEvent.click(screen.getByText('Block aufheben'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/moderation/block', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });

  it('ruft onBlockChange Callback auf', async () => {
    const onChange = vi.fn();
    render(<BlockButton userId="u1" onBlockChange={onChange} />);
    fireEvent.click(screen.getByText('Blockieren'));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('block');
    });
  });

  it('rendert kompakten Modus als Icon-Button', () => {
    render(<BlockButton userId="u1" compact={true} />);
    expect(screen.getByLabelText('Nutzer blockieren')).toBeDefined();
  });

  it('zeigt Fehler bei API-Fehler', async () => {
    const { toast } = await import('sonner');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Nicht authentifiziert' }),
    });

    render(<BlockButton userId="u1" />);
    fireEvent.click(screen.getByText('Blockieren'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nicht authentifiziert');
    });
  });
});
