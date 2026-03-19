// __tests__/components/municipal/PhotoUpload.test.tsx
// Tests fuer die wiederverwendbare Foto-Upload Komponente

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Supabase Client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/test.jpg' } })),
      })),
    },
  })),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { PhotoUpload } from '@/components/municipal/PhotoUpload';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PhotoUpload', () => {
  const defaultProps = {
    bucket: 'report-photos',
    onPhotoUploaded: vi.fn(),
    onPhotoRemoved: vi.fn(),
    photoPreview: null,
  };

  it('rendert Kamera- und Galerie-Buttons ohne Foto', () => {
    render(<PhotoUpload {...defaultProps} />);

    const kameraButtons = screen.getAllByText('Kamera');
    const galerieButtons = screen.getAllByText('Galerie');
    expect(kameraButtons.length).toBeGreaterThanOrEqual(1);
    expect(galerieButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('zeigt Hinweistext wenn angegeben', () => {
    render(<PhotoUpload {...defaultProps} hint="Bitte nur den Mangel fotografieren." />);

    const hints = screen.getAllByText('Bitte nur den Mangel fotografieren.');
    expect(hints.length).toBeGreaterThanOrEqual(1);
  });

  it('zeigt Foto-Vorschau wenn photoPreview gesetzt', () => {
    render(<PhotoUpload {...defaultProps} photoPreview="blob:http://localhost/abc" />);

    const imgs = document.querySelectorAll('img[alt="Foto-Vorschau"]');
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    expect(imgs[0]?.getAttribute('src')).toBe('blob:http://localhost/abc');
  });

  it('zeigt Entfernen-Button bei Foto-Vorschau', () => {
    render(<PhotoUpload {...defaultProps} photoPreview="blob:http://localhost/abc" />);

    const removeButtons = screen.getAllByLabelText('Foto entfernen');
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('hat versteckte file-inputs fuer Kamera und Galerie', () => {
    render(<PhotoUpload {...defaultProps} />);

    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('akzeptiert nur Bilder', () => {
    render(<PhotoUpload {...defaultProps} />);

    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input) => {
      expect(input.getAttribute('accept')).toBe('image/*');
    });
  });

  it('exportiert PhotoUploadProps Interface', async () => {
    // Typ-Pruefung: Props muessen korrekt typisiert sein
    const props: import('@/components/municipal/PhotoUpload').PhotoUploadProps = {
      bucket: 'test',
      onPhotoUploaded: vi.fn(),
      onPhotoRemoved: vi.fn(),
      photoPreview: null,
      maxSize: 1024,
      maxWidth: 800,
      quality: 0.5,
      hint: 'Test-Hinweis',
    };
    expect(props.bucket).toBe('test');
  });
});
