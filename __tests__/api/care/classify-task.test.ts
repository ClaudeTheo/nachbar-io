import { describe, it, expect } from 'vitest';
import { parseClassifyResponse } from '@/lib/care/voice-classify';

// Tests fuer die Klassifizierungs-Logik (ohne API-Aufruf)
describe('parseClassifyResponse', () => {
  it('parst gueltige JSON-Antwort korrekt', () => {
    const response = JSON.stringify({
      category: 'shopping',
      title: 'Einkauf beim REWE',
      description: 'Milch, Brot und Obst besorgen',
    });

    const result = parseClassifyResponse(response, 'Ich brauche jemanden zum Einkaufen');

    expect(result.category).toBe('shopping');
    expect(result.title).toBe('Einkauf beim REWE');
    expect(result.description).toBe('Milch, Brot und Obst besorgen');
  });

  it('entfernt Markdown-Wrapper aus der Antwort', () => {
    const response = '```json\n{"category": "transport", "title": "Fahrt zum Arzt", "description": "Termin am Dienstag"}\n```';

    const result = parseClassifyResponse(response, 'Arzt fahren');

    expect(result.category).toBe('transport');
    expect(result.title).toBe('Fahrt zum Arzt');
  });

  it('faellt zurueck auf "other" bei ungueltiger Kategorie', () => {
    const response = JSON.stringify({
      category: 'ungueltig',
      title: 'Irgendwas',
      description: 'Test',
    });

    const result = parseClassifyResponse(response, 'Test');

    expect(result.category).toBe('other');
    expect(result.title).toBe('Irgendwas');
  });

  it('faellt zurueck auf Rohtext bei ungueltigem JSON', () => {
    const result = parseClassifyResponse('Das ist kein JSON', 'Mein Originaltext');

    expect(result.category).toBe('other');
    expect(result.title).toBe('Mein Originaltext');
    expect(result.description).toBe('');
  });

  it('behandelt leere Antwort korrekt', () => {
    const result = parseClassifyResponse('', 'Fallback');

    expect(result.category).toBe('other');
    expect(result.title).toBe('Fallback');
  });

  it('kuerzt Titel auf 80 Zeichen', () => {
    const longTitle = 'A'.repeat(120);
    const response = JSON.stringify({
      category: 'household',
      title: longTitle,
      description: 'Test',
    });

    const result = parseClassifyResponse(response, 'Original');

    expect(result.title.length).toBeLessThanOrEqual(80);
  });

  it('kuerzt Beschreibung auf 200 Zeichen', () => {
    const longDesc = 'B'.repeat(300);
    const response = JSON.stringify({
      category: 'garden',
      title: 'Garten',
      description: longDesc,
    });

    const result = parseClassifyResponse(response, 'Original');

    expect(result.description.length).toBeLessThanOrEqual(200);
  });

  it('erkennt alle gueltigen Kategorien', () => {
    const categories = [
      'transport', 'shopping', 'companionship', 'garden',
      'tech_help', 'pet_care', 'household', 'other',
    ];

    for (const cat of categories) {
      const response = JSON.stringify({ category: cat, title: 'Test', description: '' });
      const result = parseClassifyResponse(response, 'Test');
      expect(result.category).toBe(cat);
    }
  });

  it('verwendet Originaltext als Titel-Fallback wenn title fehlt', () => {
    const response = JSON.stringify({
      category: 'shopping',
      description: 'Einkauf machen',
    });

    const result = parseClassifyResponse(response, 'Brot kaufen bitte');

    // title ist nicht im JSON → Fallback auf Originaltext
    expect(result.title).toBe('Brot kaufen bitte');
  });
});
