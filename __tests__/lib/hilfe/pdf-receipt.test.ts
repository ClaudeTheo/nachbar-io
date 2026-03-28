// __tests__/lib/hilfe/pdf-receipt.test.ts
// Nachbar Hilfe — Tests fuer PDF-Quittung Generierung

import { describe, expect, it } from 'vitest';
import { generateReceipt, formatCents, formatDate, type ReceiptData } from '@/modules/hilfe/services/pdf-receipt';

const MOCK_RECEIPT_DATA: ReceiptData = {
  resident: {
    name: 'Helga Mueller',
    address: 'Purkersdorfer Strasse 12, 79713 Bad Saeckingen',
    insurance_name: 'AOK Baden-Wuerttemberg',
    insurance_number: 'A123456789',
    care_level: 2,
  },
  helper: {
    name: 'Thomas Schmidt',
    address: 'Sanarystrasse 5, 79713 Bad Saeckingen',
    date_of_birth: '1990-05-15',
  },
  session: {
    session_date: '2026-03-25',
    start_time: '10:00',
    end_time: '12:00',
    duration_minutes: 120,
    activity_category: 'einkaufen',
    activity_description: 'Wocheneinkauf Edeka',
    hourly_rate_cents: 1500,
    total_amount_cents: 3000,
  },
  signatures: {
    helper: '',
    resident: '',
  },
};

describe('pdf-receipt', () => {
  describe('formatCents', () => {
    it('formatiert Cent-Betraege als EUR', () => {
      expect(formatCents(1500)).toBe('15,00 EUR');
      expect(formatCents(3000)).toBe('30,00 EUR');
      expect(formatCents(0)).toBe('0,00 EUR');
      expect(formatCents(99)).toBe('0,99 EUR');
    });
  });

  describe('formatDate', () => {
    it('formatiert ISO-Datum als deutsches Datumsformat', () => {
      expect(formatDate('2026-03-25')).toBe('25.03.2026');
      expect(formatDate('2026-01-01')).toBe('01.01.2026');
    });
  });

  describe('generateReceipt', () => {
    it('generiert PDF als Uint8Array', () => {
      const result = generateReceipt(MOCK_RECEIPT_DATA);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('PDF beginnt mit %PDF Header', () => {
      const result = generateReceipt(MOCK_RECEIPT_DATA);
      // %PDF als ASCII-Bytes: 0x25 0x50 0x44 0x46
      const header = String.fromCharCode(result[0], result[1], result[2], result[3]);
      expect(header).toBe('%PDF');
    });

    it('PDF enthaelt §45b Referenz', () => {
      const result = generateReceipt(MOCK_RECEIPT_DATA);
      const text = new TextDecoder().decode(result);
      expect(text).toContain('45b');
    });

    it('PDF enthaelt den Namen des Bewohners', () => {
      const result = generateReceipt(MOCK_RECEIPT_DATA);
      const text = new TextDecoder().decode(result);
      expect(text).toContain('Helga Mueller');
    });
  });
});
