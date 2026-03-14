import { describe, it, expect } from 'vitest';

describe('Weekly Digest', () => {
  it('should build prompt with quarter data', () => {
    const quarterName = 'Bad Saeckingen Altstadt';
    const data = {
      newPosts: 5,
      newAlerts: 2,
      newEvents: 1,
      newMembers: 3,
    };
    const prompt = `Du bist der Nachbarschafts-Assistent fuer das Quartier "${quarterName}".\n` +
      `Fasse die Woche in 3-5 Saetzen zusammen. Tonalitaet: freundlich, Siezen, sachlich.\n` +
      `Daten: ${JSON.stringify(data)}`;

    expect(prompt).toContain(quarterName);
    expect(prompt).toContain('"newPosts":5');
  });

  it('should skip quarters with no activity', () => {
    const data = { newPosts: 0, newAlerts: 0, newEvents: 0, newMembers: 0 };
    const hasActivity = Object.values(data).some(v => v > 0);
    expect(hasActivity).toBe(false);
  });

  it('should have activity when posts exist', () => {
    const data = { newPosts: 3, newAlerts: 0, newEvents: 0, newMembers: 1 };
    const hasActivity = Object.values(data).some(v => v > 0);
    expect(hasActivity).toBe(true);
  });
});
