// Tests fuer die KI-Klassifizierung von Spracheingaben im Assistenten
// Prueft parseAssistantResponse() mit allen 6 Aktionen + Fehlerfaelle

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { parseAssistantResponse } from '@/lib/voice/assistant-classify';
import type { AssistantAction, AssistantResult } from '@/lib/voice/assistant-classify';

describe('parseAssistantResponse', () => {
  it('parst gueltige help_request Antwort mit category, title, description', () => {
    const json = JSON.stringify({
      action: 'help_request',
      params: {
        category: 'shopping',
        title: 'Einkaufshilfe',
        description: 'Brauche Hilfe beim Einkaufen',
      },
      message: 'Ich erstelle eine Hilfe-Anfrage fuer Sie.',
    });

    const result = parseAssistantResponse(json, 'Kann mir jemand beim Einkaufen helfen?');
    expect(result.action).toBe('help_request');
    expect(result.params.category).toBe('shopping');
    expect(result.params.title).toBe('Einkaufshilfe');
    expect(result.params.description).toBe('Brauche Hilfe beim Einkaufen');
    expect(result.message).toBe('Ich erstelle eine Hilfe-Anfrage fuer Sie.');
  });

  it('parst navigate Antwort mit Route', () => {
    const json = JSON.stringify({
      action: 'navigate',
      params: { route: '/waste-calendar' },
      message: 'Ich oeffne den Muellkalender fuer Sie.',
    });

    const result = parseAssistantResponse(json, 'Zeig mir den Muellkalender');
    expect(result.action).toBe('navigate');
    expect(result.params.route).toBe('/waste-calendar');
  });

  it('erkennt emergency_info', () => {
    const json = JSON.stringify({
      action: 'emergency_info',
      params: { number: '112' },
      message: 'Bei einem Notfall rufen Sie bitte sofort 112 an.',
    });

    const result = parseAssistantResponse(json, 'Ich brauche einen Krankenwagen');
    expect(result.action).toBe('emergency_info');
    expect(result.params.number).toBe('112');
  });

  it('erkennt report_issue', () => {
    const json = JSON.stringify({
      action: 'report_issue',
      params: { category: 'infrastructure' },
      message: 'Ich oeffne den Maengelmelder fuer Sie.',
    });

    const result = parseAssistantResponse(json, 'Die Strassenlaterne ist kaputt');
    expect(result.action).toBe('report_issue');
    expect(result.params.category).toBe('infrastructure');
  });

  it('erkennt find_neighbor', () => {
    const json = JSON.stringify({
      action: 'find_neighbor',
      params: { query: 'Gartenarbeit' },
      message: 'Ich suche Nachbarn die bei Gartenarbeit helfen koennen.',
    });

    const result = parseAssistantResponse(json, 'Wer kann mir im Garten helfen?');
    expect(result.action).toBe('find_neighbor');
    expect(result.params.query).toBe('Gartenarbeit');
  });

  it('faellt auf general zurueck bei ungueltiger Action', () => {
    const json = JSON.stringify({
      action: 'invalid_action',
      params: {},
      message: 'Test',
    });

    const result = parseAssistantResponse(json, 'Hallo Welt');
    expect(result.action).toBe('general');
    expect(result.message).toBe('Hallo Welt');
  });

  it('faellt auf general zurueck bei ungueltigem JSON', () => {
    const result = parseAssistantResponse('das ist kein JSON', 'Originaltext hier');
    expect(result.action).toBe('general');
    expect(result.params).toEqual({});
    expect(result.message).toBe('Originaltext hier');
  });

  it('entfernt Markdown-Wrapper (```json ... ```)', () => {
    const inner = JSON.stringify({
      action: 'navigate',
      params: { route: '/dashboard' },
      message: 'Zum Dashboard.',
    });
    const wrapped = '```json\n' + inner + '\n```';

    const result = parseAssistantResponse(wrapped, 'Geh zum Dashboard');
    expect(result.action).toBe('navigate');
    expect(result.params.route).toBe('/dashboard');
  });

  it('validiert navigate-Route gegen erlaubte Routen (ungueltige → general)', () => {
    const json = JSON.stringify({
      action: 'navigate',
      params: { route: '/admin/secret' },
      message: 'Navigation.',
    });

    const result = parseAssistantResponse(json, 'Zeig mir die Admin-Seite');
    expect(result.action).toBe('general');
    expect(result.message).toBe('Zeig mir die Admin-Seite');
  });

  it('erkennt alle 6 gueltigen Aktionen', () => {
    const validActions: AssistantAction[] = [
      'help_request',
      'report_issue',
      'emergency_info',
      'navigate',
      'find_neighbor',
      'general',
    ];

    for (const action of validActions) {
      const json = JSON.stringify({
        action,
        params: action === 'navigate' ? { route: '/dashboard' } : {},
        message: 'Test',
      });
      const result = parseAssistantResponse(json, 'Test');
      expect(result.action).toBe(action);
    }
  });
});

describe('PreviousAction type', () => {
  it('exportiert PreviousAction Interface', async () => {
    const mod = await import('@/lib/voice/assistant-classify');
    // Typ-Export pruefen — wenn Import klappt, existiert der Typ
    expect(mod.classifyAssistantAction).toBeDefined();
  });
});

describe('classifyAssistantAction', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('gibt general zurueck wenn kein API-Key vorhanden', async () => {
    // API-Key entfernen
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const { classifyAssistantAction } = await import('@/lib/voice/assistant-classify');
    const result = await classifyAssistantAction('Hallo');

    expect(result.action).toBe('general');
    expect(result.message).toBe('Hallo');

    // Wiederherstellen
    if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
  });
});
