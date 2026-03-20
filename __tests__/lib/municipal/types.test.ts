// __tests__/lib/municipal/types.test.ts
// Tests fuer Kommunal-Modul Typdefinitionen (Compile-Time + Runtime-Checks)

import { describe, it, expect } from 'vitest';
import type {
  WasteType,
  WasteRemindTime,
  ReportCategory,
  ReportStatus,
  WasteSchedule,
  WasteReminder,
  MunicipalReport,
  MunicipalReportComment,
  MunicipalConfig,
  MunicipalAnnouncement,
  AnnouncementCategory,
} from '@/lib/municipal/types';

describe('Kommunal-Modul Typen (Compile-Time)', () => {
  it('WasteType akzeptiert gueltige Werte', () => {
    const validTypes: WasteType[] = ['restmuell', 'biomuell', 'papier', 'gelber_sack', 'gruenschnitt', 'sperrmuell'];
    expect(validTypes).toHaveLength(6);
  });

  it('WasteRemindTime akzeptiert evening_before und morning_of', () => {
    const times: WasteRemindTime[] = ['evening_before', 'morning_of'];
    expect(times).toHaveLength(2);
  });

  it('ReportCategory akzeptiert 6 Kategorien', () => {
    const cats: ReportCategory[] = ['street', 'lighting', 'greenery', 'waste', 'vandalism', 'other'];
    expect(cats).toHaveLength(6);
  });

  it('ReportStatus akzeptiert 4 Status-Werte', () => {
    const statuses: ReportStatus[] = ['open', 'acknowledged', 'in_progress', 'resolved'];
    expect(statuses).toHaveLength(4);
  });

  it('AnnouncementCategory akzeptiert 6 Kategorien', () => {
    const cats: AnnouncementCategory[] = ['verkehr', 'baustelle', 'veranstaltung', 'verwaltung', 'warnung', 'sonstiges'];
    expect(cats).toHaveLength(6);
  });

  it('WasteSchedule hat erforderliche Felder', () => {
    const schedule: WasteSchedule = {
      id: 'test-id',
      quarter_id: 'quarter-1',
      waste_type: 'restmuell',
      collection_date: '2026-04-02',
      notes: null,
      source: 'manual',
      created_at: '2026-03-19T00:00:00Z',
    };
    expect(schedule.id).toBeTruthy();
    expect(schedule.quarter_id).toBeTruthy();
    expect(schedule.waste_type).toBe('restmuell');
  });

  it('WasteReminder hat Nutzer-Bezug', () => {
    const reminder: WasteReminder = {
      id: 'rem-1',
      user_id: 'user-1',
      waste_type: 'biomuell',
      enabled: true,
      remind_at: 'evening_before',
      created_at: '2026-03-19T00:00:00Z',
    };
    expect(reminder.user_id).toBeTruthy();
    expect(reminder.enabled).toBe(true);
  });

  it('MunicipalReport hat Pflichtfelder und optionale', () => {
    const report: MunicipalReport = {
      id: 'report-1',
      user_id: 'user-1',
      quarter_id: 'quarter-1',
      category: 'street',
      description: 'Schlagloch',
      photo_url: null,
      location: null,
      location_text: 'Purkersdorfer Str. 5',
      status: 'open',
      status_note: null,
      resolved_at: null,
      created_at: '2026-03-19T00:00:00Z',
      updated_at: '2026-03-19T00:00:00Z',
    };
    expect(report.category).toBe('street');
    expect(report.status).toBe('open');
    expect(report.photo_url).toBeNull();
  });

  it('MunicipalReport kann GeoJSON-Location haben', () => {
    const report: MunicipalReport = {
      id: 'report-2',
      user_id: 'user-1',
      quarter_id: 'quarter-1',
      category: 'lighting',
      description: null,
      photo_url: 'https://example.com/photo.jpg',
      location: { type: 'Point', coordinates: [7.964, 47.5535] },
      location_text: 'Sanarystraße 10',
      status: 'acknowledged',
      status_note: 'Wird geprueft',
      resolved_at: null,
      created_at: '2026-03-19T00:00:00Z',
      updated_at: '2026-03-19T12:00:00Z',
    };
    expect(report.location?.type).toBe('Point');
    expect(report.location?.coordinates).toHaveLength(2);
  });

  it('MunicipalReportComment hat Pflichtfelder', () => {
    const comment: MunicipalReportComment = {
      id: 'comment-1',
      report_id: 'report-1',
      user_id: 'user-2',
      text: 'Kann ich bestaetigen',
      created_at: '2026-03-19T00:00:00Z',
    };
    expect(comment.text).toBeTruthy();
    expect(comment.report_id).toBeTruthy();
  });

  it('MunicipalConfig hat Service-Links und Wiki', () => {
    const config: MunicipalConfig = {
      id: 'config-1',
      quarter_id: 'quarter-1',
      city_name: 'Bad Säckingen',
      state: 'Baden-Württemberg',
      rathaus_url: 'https://www.bad-saeckingen.de',
      rathaus_phone: '07761 51-0',
      rathaus_email: 'info@bad-saeckingen.de',
      opening_hours: { mo: '8:00-12:00' },
      features: { reports: true, waste_calendar: true },
      service_links: [{ label: 'Rathaus', url: 'https://example.com', icon: 'building', category: 'kontakt' }],
      wiki_entries: [{ question: 'Test?', answer: 'Ja.', category: 'infrastruktur' }],
      created_at: '2026-03-19T00:00:00Z',
      updated_at: '2026-03-19T00:00:00Z',
    };
    expect(config.city_name).toBe('Bad Säckingen');
    expect(config.service_links).toHaveLength(1);
    expect(config.wiki_entries).toHaveLength(1);
  });

  it('MunicipalAnnouncement hat alle Felder', () => {
    const announcement: MunicipalAnnouncement = {
      id: 'ann-1',
      quarter_id: 'quarter-1',
      author_id: 'user-admin',
      title: 'Straßensperrung',
      body: 'Die Hauptstraße wird gesperrt.',
      source_url: null,
      category: 'verkehr',
      pinned: false,
      published_at: '2026-03-19T00:00:00Z',
      expires_at: '2026-04-19T00:00:00Z',
      created_at: '2026-03-19T00:00:00Z',
      updated_at: '2026-03-19T00:00:00Z',
      amtsblatt_issue_id: null,
    };
    expect(announcement.category).toBe('verkehr');
    expect(announcement.pinned).toBe(false);
  });
});
