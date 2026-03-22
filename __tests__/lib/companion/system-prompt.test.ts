import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, type QuarterContext, type PromptOptions } from '@/lib/companion/system-prompt';

// Vollen Kontext fuer Tests
function fullContext(): QuarterContext {
  return {
    quarterName: 'Oberer Rebberg',
    wasteDate: [
      { date: '2026-03-25', type: 'Restmuell' },
      { date: '2026-03-28', type: 'Gelber Sack' },
    ],
    events: [
      { title: 'Fruehlingsfest', date: '2026-04-01' },
      { title: 'Seniorencafé', date: '2026-04-05' },
    ],
    bulletinPosts: [
      { title: 'Parkplatz gesperrt', category: 'board' },
      { title: 'Suche Gartenhelfer', category: 'help' },
    ],
  };
}

// Leerer Kontext (keine Daten)
function emptyContext(): QuarterContext {
  return {
    quarterName: 'Testquartier',
    wasteDate: [],
    events: [],
    bulletinPosts: [],
  };
}

describe('buildSystemPrompt', () => {
  it('enthaelt Siezen (Sie) im Prompt', () => {
    const prompt = buildSystemPrompt(fullContext());
    expect(prompt).toContain('Sie');
    expect(prompt).toContain('Sieze');
  });

  it('enthaelt den Quartier-Namen', () => {
    const prompt = buildSystemPrompt(fullContext());
    expect(prompt).toContain('Oberer Rebberg');
  });

  it('formatiert Muelltermine als DD.MM.YYYY', () => {
    const prompt = buildSystemPrompt(fullContext());
    expect(prompt).toContain('25.03.2026');
    expect(prompt).toContain('28.03.2026');
    expect(prompt).toContain('Restmuell');
    expect(prompt).toContain('Gelber Sack');
  });

  it('enthaelt Veranstaltungen mit Datum', () => {
    const prompt = buildSystemPrompt(fullContext());
    expect(prompt).toContain('Fruehlingsfest');
    expect(prompt).toContain('01.04.2026');
    expect(prompt).toContain('Seniorencafé');
    expect(prompt).toContain('05.04.2026');
  });

  it('enthaelt Schwarzes-Brett-Beitraege mit Kategorie', () => {
    const prompt = buildSystemPrompt(fullContext());
    expect(prompt).toContain('Parkplatz gesperrt');
    expect(prompt).toContain('[board]');
    expect(prompt).toContain('Suche Gartenhelfer');
    expect(prompt).toContain('[help]');
  });

  it('enthaelt Notfall-Regel (112/110)', () => {
    const prompt = buildSystemPrompt(fullContext());
    expect(prompt).toContain('112');
    expect(prompt).toContain('110');
  });

  it('enthaelt Regel gegen medizinische Beratung', () => {
    const prompt = buildSystemPrompt(fullContext());
    expect(prompt).toContain('medizinische Beratung');
  });

  it('zeigt Fallback-Text wenn kein Kontext vorhanden', () => {
    const prompt = buildSystemPrompt(emptyContext());
    expect(prompt).toContain('Keine aktuellen Infos verfuegbar.');
    // Sollte keine Muelltermin-Sektion haben
    expect(prompt).not.toContain('Naechste Muelltermine');
    expect(prompt).not.toContain('Naechste Veranstaltungen');
    expect(prompt).not.toContain('Aktuelle Beitraege');
  });

  it('enthaelt Quartier-Name auch bei leerem Kontext', () => {
    const prompt = buildSystemPrompt(emptyContext());
    expect(prompt).toContain('Testquartier');
  });

  // Formality-Tests (Task 18)
  it('System-Prompt enthaelt "Sieze" bei formality=formal (Default)', () => {
    const prompt = buildSystemPrompt(fullContext());
    expect(prompt).toContain('Sieze');
    expect(prompt).toContain('Sie/Ihnen/Ihr');
  });

  it('System-Prompt enthaelt "Duze" bei formality=informal', () => {
    const prompt = buildSystemPrompt(fullContext(), { formality: 'informal' });
    expect(prompt).toContain('Duze');
    expect(prompt).toContain('du/dein/dir');
    // Sollte NICHT Siezen enthalten
    expect(prompt).not.toContain('Sie/Ihnen/Ihr');
  });

  it('Default-Formality ist formal (Siezen)', () => {
    const promptDefault = buildSystemPrompt(fullContext());
    const promptFormal = buildSystemPrompt(fullContext(), { formality: 'formal' });
    expect(promptDefault).toBe(promptFormal);
  });
});
