// __tests__/lib/municipal/constants.test.ts
// Tests fuer Kommunal-Modul Konstanten

import { describe, it, expect } from 'vitest';
import {
  REPORT_CATEGORIES,
  REPORT_STATUS_CONFIG,
  WASTE_TYPES,
  ANNOUNCEMENT_CATEGORIES,
  SERVICE_LINK_CATEGORIES,
  WIKI_CATEGORIES,
  DISCLAIMERS,
} from '@/lib/municipal/constants';

describe('REPORT_CATEGORIES', () => {
  it('enthaelt 6 Kategorien', () => {
    expect(REPORT_CATEGORIES).toHaveLength(6);
  });

  it('hat korrekte IDs', () => {
    const ids = REPORT_CATEGORIES.map((c) => c.id);
    expect(ids).toEqual(['street', 'lighting', 'greenery', 'waste', 'vandalism', 'other']);
  });

  it('jede Kategorie hat label, icon und description', () => {
    for (const cat of REPORT_CATEGORIES) {
      expect(cat.label).toBeTruthy();
      expect(cat.icon).toBeTruthy();
      expect(cat.description).toBeTruthy();
    }
  });
});

describe('REPORT_STATUS_CONFIG', () => {
  it('enthaelt 4 Status-Konfigurationen', () => {
    expect(REPORT_STATUS_CONFIG).toHaveLength(4);
  });

  it('hat korrekte IDs in richtiger Reihenfolge', () => {
    const ids = REPORT_STATUS_CONFIG.map((s) => s.id);
    expect(ids).toEqual(['open', 'acknowledged', 'in_progress', 'resolved']);
  });

  it('jeder Status hat Farb-Klassen', () => {
    for (const status of REPORT_STATUS_CONFIG) {
      expect(status.color).toMatch(/^text-/);
      expect(status.bgColor).toMatch(/^bg-/);
    }
  });
});

describe('WASTE_TYPES', () => {
  it('enthaelt 6 Muellarten', () => {
    expect(WASTE_TYPES).toHaveLength(6);
  });

  it('hat korrekte IDs', () => {
    const ids = WASTE_TYPES.map((w) => w.id);
    expect(ids).toContain('restmuell');
    expect(ids).toContain('biomuell');
    expect(ids).toContain('papier');
    expect(ids).toContain('gelber_sack');
    expect(ids).toContain('gruenschnitt');
    expect(ids).toContain('sperrmuell');
  });

  it('jede Muellart hat color als Hex', () => {
    for (const type of WASTE_TYPES) {
      expect(type.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('jede Muellart hat icon und label', () => {
    for (const type of WASTE_TYPES) {
      expect(type.icon).toBeTruthy();
      expect(type.label).toBeTruthy();
    }
  });
});

describe('ANNOUNCEMENT_CATEGORIES', () => {
  it('enthaelt 6 Kategorien', () => {
    expect(ANNOUNCEMENT_CATEGORIES).toHaveLength(6);
  });

  it('hat IDs als deutsche Begriffe', () => {
    const ids = ANNOUNCEMENT_CATEGORIES.map((c) => c.id);
    expect(ids).toContain('verkehr');
    expect(ids).toContain('baustelle');
    expect(ids).toContain('veranstaltung');
  });
});

describe('SERVICE_LINK_CATEGORIES', () => {
  it('enthaelt mindestens 4 Kategorien', () => {
    expect(SERVICE_LINK_CATEGORIES.length).toBeGreaterThanOrEqual(4);
  });

  it('jede Kategorie hat id und label', () => {
    for (const cat of SERVICE_LINK_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
    }
  });
});

describe('WIKI_CATEGORIES', () => {
  it('enthaelt mindestens 3 Kategorien', () => {
    expect(WIKI_CATEGORIES.length).toBeGreaterThanOrEqual(3);
  });
});

describe('DISCLAIMERS', () => {
  it('hat alle erforderlichen Disclaimer-Texte', () => {
    expect(DISCLAIMERS.reportCreate).toBeTruthy();
    expect(DISCLAIMERS.reportPhoto).toBeTruthy();
    expect(DISCLAIMERS.reportRathaus).toBeTruthy();
    expect(DISCLAIMERS.wasteCalendar).toBeTruthy();
    expect(DISCLAIMERS.announcements).toBeTruthy();
  });

  it('reportCreate enthaelt NICHT-Hinweis', () => {
    expect(DISCLAIMERS.reportCreate).toContain('NICHT');
  });

  it('wasteCalendar enthaelt ohne-Gewaehr-Hinweis', () => {
    expect(DISCLAIMERS.wasteCalendar).toContain('ohne Gewähr');
  });
});
