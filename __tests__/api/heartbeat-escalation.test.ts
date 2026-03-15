import { describe, it, expect } from 'vitest';

describe('Heartbeat-Eskalation Logik', () => {
  it('berechnet Eskalationsstufe korrekt', () => {
    function getStage(hoursAgo: number): string | null {
      if (hoursAgo <= 4) return null;
      if (hoursAgo <= 8) return 'reminder_4h';
      if (hoursAgo <= 12) return 'alert_8h';
      if (hoursAgo <= 24) return 'lotse_12h';
      return 'urgent_24h';
    }

    expect(getStage(2)).toBe(null);
    expect(getStage(6)).toBe('reminder_4h');
    expect(getStage(10)).toBe('alert_8h');
    expect(getStage(18)).toBe('lotse_12h');
    expect(getStage(30)).toBe('urgent_24h');
  });
});
