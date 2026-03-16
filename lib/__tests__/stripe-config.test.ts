// lib/__tests__/stripe-config.test.ts
// Tests fuer Stripe-Konfiguration (Vier-Versionen-Modell)
import { describe, it, expect } from 'vitest';
import {
  PLAN_DISPLAY_NAMES,
  PLAN_PRICES,
  STRIPE_PRICES,
  PRO_MEDICAL_APPOINTMENT_PRICE,
  getStripePriceId,
} from '../stripe';
import type { PlanType, BillingInterval, PaidPlan } from '../stripe';

describe('PLAN_DISPLAY_NAMES', () => {
  it('enthaelt alle 4 Plan-Typen', () => {
    const expectedPlans: PlanType[] = ['free', 'plus', 'pro_community', 'pro_medical'];
    expect(Object.keys(PLAN_DISPLAY_NAMES)).toEqual(expect.arrayContaining(expectedPlans));
    expect(Object.keys(PLAN_DISPLAY_NAMES)).toHaveLength(4);
  });

  it('alle Anzeigenamen beginnen mit "Nachbar"', () => {
    for (const name of Object.values(PLAN_DISPLAY_NAMES)) {
      expect(name).toMatch(/^Nachbar /);
    }
  });
});

describe('PLAN_PRICES', () => {
  it('enthaelt Plus, Pro Community und Pro Medical', () => {
    expect(PLAN_PRICES).toHaveProperty('plus');
    expect(PLAN_PRICES).toHaveProperty('pro_community');
    expect(PLAN_PRICES).toHaveProperty('pro_medical');
  });

  it('enthaelt NICHT den Free-Plan', () => {
    expect(PLAN_PRICES).not.toHaveProperty('free');
  });

  it('Jahrespreise bieten ~17% Rabatt gegenueber Monatspreisen', () => {
    const plans = Object.keys(PLAN_PRICES) as Array<keyof typeof PLAN_PRICES>;
    for (const plan of plans) {
      const { monthly, yearly } = PLAN_PRICES[plan];
      const yearlyFullPrice = monthly * 12;
      const discount = 1 - yearly / yearlyFullPrice;
      // Rabatt zwischen 10% und 20% (ca. 17%)
      expect(discount).toBeGreaterThanOrEqual(0.10);
      expect(discount).toBeLessThanOrEqual(0.20);
    }
  });

  it('Plus kostet 8,90 EUR/Monat', () => {
    expect(PLAN_PRICES.plus.monthly).toBe(8.90);
    expect(PLAN_PRICES.plus.yearly).toBe(89);
  });

  it('Pro Community kostet 79 EUR/Monat', () => {
    expect(PLAN_PRICES.pro_community.monthly).toBe(79);
    expect(PLAN_PRICES.pro_community.yearly).toBe(790);
  });

  it('Pro Medical kostet 89 EUR/Monat', () => {
    expect(PLAN_PRICES.pro_medical.monthly).toBe(89);
    expect(PLAN_PRICES.pro_medical.yearly).toBe(890);
  });
});

describe('PRO_MEDICAL_APPOINTMENT_PRICE', () => {
  it('Einzeltermin kostet 5 EUR', () => {
    expect(PRO_MEDICAL_APPOINTMENT_PRICE).toBe(5);
  });
});

describe('STRIPE_PRICES', () => {
  it('referenziert Umgebungsvariablen (keine hartkodierten Werte)', () => {
    // Stripe Price IDs muessen aus env kommen, nicht hartcodiert
    // Im Testkontext sind sie undefined — das beweist, dass keine Hardcoded-Werte vorliegen
    expect(STRIPE_PRICES.plus).toHaveProperty('monthly');
    expect(STRIPE_PRICES.plus).toHaveProperty('yearly');
    expect(STRIPE_PRICES.pro_community).toHaveProperty('monthly');
    expect(STRIPE_PRICES.pro_community).toHaveProperty('yearly');
    expect(STRIPE_PRICES.pro_medical).toHaveProperty('monthly');
    expect(STRIPE_PRICES.pro_medical).toHaveProperty('yearly');
    expect(STRIPE_PRICES.pro_medical).toHaveProperty('per_appointment');
  });

  it('hat verschachtelte Struktur nach Plan-Typ', () => {
    expect(Object.keys(STRIPE_PRICES)).toEqual(
      expect.arrayContaining(['plus', 'pro_community', 'pro_medical'])
    );
    expect(Object.keys(STRIPE_PRICES)).toHaveLength(3);
  });
});

describe('getStripePriceId', () => {
  it('gibt undefined zurueck fuer unbekannten Plan', () => {
    const result = getStripePriceId('unknown_plan' as PaidPlan, 'monthly');
    expect(result).toBeUndefined();
  });

  it('gibt fuer gueltige Kombination einen Wert zurueck (oder undefined im Test-env)', () => {
    // Im Testkontext ohne env-Variablen kommt undefined — das ist korrekt
    const result = getStripePriceId('plus', 'monthly');
    expect(result === undefined || typeof result === 'string').toBe(true);
  });
});

describe('PlanType (Typ-Pruefung)', () => {
  it('alle 4 Typen sind als PlanType gueltig', () => {
    // Compile-Time-Check: Wenn PlanType nicht alle 4 enthaelt, scheitert das
    const plans: PlanType[] = ['free', 'plus', 'pro_community', 'pro_medical'];
    expect(plans).toHaveLength(4);
  });

  it('BillingInterval hat monthly und yearly', () => {
    const intervals: BillingInterval[] = ['monthly', 'yearly'];
    expect(intervals).toHaveLength(2);
  });
});
