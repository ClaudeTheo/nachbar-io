import { render, fireEvent, act, within } from '@testing-library/react';
import { VoiceInput } from '@/components/care/VoiceInput';
import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock SpeechRecognition
class MockSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start() { this.onstart?.(); }
  stop() { this.onend?.(); }
  abort() { this.onend?.(); }
}

// Hilfsfunktion: SpeechRecognition API setzen/entfernen
function enableSpeechRecognition(ctor: unknown = MockSpeechRecognition) {
  (window as unknown as Record<string, unknown>).SpeechRecognition = ctor;
}

function disableSpeechRecognition() {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
}

afterEach(() => {
  disableSpeechRecognition();
});

describe('VoiceInput', () => {
  it('rendert nichts wenn SpeechRecognition nicht verfuegbar ist', () => {
    disableSpeechRecognition();
    const { container } = render(<VoiceInput onTranscript={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('rendert Mikrofon-Button wenn SpeechRecognition verfuegbar ist', () => {
    enableSpeechRecognition();
    const { container } = render(<VoiceInput onTranscript={vi.fn()} />);
    const scope = within(container);

    expect(scope.getByRole('button', { name: /spracheingabe starten/i })).toBeDefined();
    expect(scope.getByText('Sprechen')).toBeDefined();
  });

  it('zeigt korrekten Zustand waehrend der Aufnahme', () => {
    enableSpeechRecognition();
    const { container } = render(<VoiceInput onTranscript={vi.fn()} />);
    const scope = within(container);

    fireEvent.click(scope.getByRole('button', { name: /spracheingabe starten/i }));
    expect(scope.getByText('Aufnahme...')).toBeDefined();
  });

  it('ruft onTranscript auf wenn Sprache erkannt wurde', () => {
    const mockOnTranscript = vi.fn();
    let instance: MockSpeechRecognition | null = null;

    class TrackableSR extends MockSpeechRecognition {
      constructor() { super(); instance = this; }
    }
    enableSpeechRecognition(TrackableSR);

    const { container } = render(<VoiceInput onTranscript={mockOnTranscript} />);
    const scope = within(container);

    fireEvent.click(scope.getByRole('button', { name: /spracheingabe starten/i }));

    act(() => {
      instance?.onresult?.({
        results: [{ isFinal: true, 0: { transcript: 'Ich brauche Hilfe beim Einkaufen' }, length: 1 }],
        resultIndex: 0,
        length: 1,
      });
    });

    expect(mockOnTranscript).toHaveBeenCalledWith('Ich brauche Hilfe beim Einkaufen');
  });

  it('zeigt "Erkannt" nach erfolgreichem Transkript', () => {
    let instance: MockSpeechRecognition | null = null;
    class TrackableSR extends MockSpeechRecognition {
      constructor() { super(); instance = this; }
    }
    enableSpeechRecognition(TrackableSR);

    const { container } = render(<VoiceInput onTranscript={vi.fn()} />);
    const scope = within(container);

    fireEvent.click(scope.getByRole('button', { name: /spracheingabe starten/i }));

    act(() => {
      instance?.onresult?.({
        results: [{ isFinal: true, 0: { transcript: 'Test' }, length: 1 }],
        resultIndex: 0,
        length: 1,
      });
    });

    expect(scope.getByText('Erkannt ✓')).toBeDefined();
  });

  it('ist deaktiviert wenn disabled=true', () => {
    enableSpeechRecognition();
    const { container } = render(<VoiceInput onTranscript={vi.fn()} disabled />);
    const scope = within(container);

    const button = scope.getByRole('button', { name: /spracheingabe starten/i });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('hat 80px Mindesthoehe (Senior-Mode)', () => {
    enableSpeechRecognition();
    const { container } = render(<VoiceInput onTranscript={vi.fn()} />);
    const scope = within(container);

    const button = scope.getByRole('button', { name: /spracheingabe starten/i });
    expect(button.style.minHeight).toBe('80px');
  });
});
