# Leistungen-Info „Was steht uns zu?" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Plus-Feature `/was-steht-uns-zu`: Read-only Info-Navigator fuer 5 deutsche + 5 schweizerische Pflege-Sozialleistungen, laenderabhaengig aus `quarters.country`, mit TTS-Vorlesen, Admin-Flag-Gating und Paywall fuer Free-Nutzer.

**Architecture:** Statischer TypeScript-Content (`lib/leistungen/content.ts`), Server-Component-Seite liest Quartier → country → filtert Leistungen. Feature-Flag `leistungen_info` via bestehendes `isFeatureEnabledServer`. Paywall via `care_subscriptions.plan !== 'plus' && !trial_active`. CH-EL-Karte mit Kantons-Schalter fuer AG/BL/BS/SH/TG/ZH, restliche 20 Kantone → Sozialamt-Link.

**Tech Stack:** Next.js 16 App Router (Server Components), Supabase (feature_flags + care_subscriptions + quarters), Vitest + React Testing Library, bestehender `TTSButton` aus `@/modules/voice/components/companion`.

**Design-Dok:** `docs/plans/2026-04-18-leistungen-info-design.md` (Commit `878b638`).

**Nicht-Ziele:** Selbst-Check-Wizard, persoenliches Pflege-Profil, 26 CH-Kantone komplett, DB-editierbarer Content, Live-APIs. Alles Phase 2.

---

## Arbeits-Bloecke & Reihenfolge

| Block | Inhalt | Tasks | Schaetzung |
|---|---|---|---|
| A | Infrastructure (Migration + Flag + Types + Country-Helper) | 1–4 | 0,5 Tag |
| B | Content recherchieren + strukturieren (DE, CH, Kantons-Varianten, Sozialamt-Map) | 5–9 | 2 Tage |
| C | UI-Komponenten (Karte, Kantons-Schalter, Haftung) | 10–12 | 0,5 Tag |
| D | Route + Page + Gating | 13–15 | 0,5 Tag |
| E | Mein-Kreis-Integration + Paywall-Link | 16 | 0,25 Tag |
| F | Freshness-Test + finaler Review | 17–18 | 0,25 Tag |

**Gesamt:** ~4 Arbeitstage (Claude-Tempo), das Meiste davon in Block B (Recherche, Quellen-Pruefung).

---

## Pre-Flight-Check

**Vor Task 1 einmal pruefen:**

```bash
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"
git status                    # Soll clean sein auf master
git log --oneline -1          # HEAD sollte 878b638 (Design-Commit) oder spaeter sein
ls supabase/migrations/ | tail -5   # 168 muss existieren, 169 darf nicht
npx tsc --noEmit              # Baseline clean?
npm run test -- --run lib/feature-flags 2>&1 | tail -5   # bestehende Flag-Tests gruen?
```

Erwartet: Alles gruen. Falls nicht → stoppen, in conversation melden.

---

## Block A — Infrastructure

### Task 1: Migration 169 anlegen (File-first, keine Prod-Anwendung)

**Files:**
- Create: `nachbar-io/supabase/migrations/169_feature_flag_leistungen_info.sql`
- Create: `nachbar-io/supabase/migrations/169_feature_flag_leistungen_info.down.sql`

**Step 1: Migration-UP schreiben**

```sql
-- Migration 169: Feature-Flag 'leistungen_info' (Default OFF)
-- Task: Leistungen-Info "Was steht uns zu?" (Block A / Task 1)
-- Kontext: Info-Navigator fuer deutsche + schweizerische Pflege-Sozialleistungen.
--          Admin kann Flag via Super-Admin-Dashboard (FeatureFlagManager) togglen.
-- Rueckbau: 169_feature_flag_leistungen_info.down.sql
-- Idempotent: ja (ON CONFLICT DO NOTHING).

begin;

insert into public.feature_flags (key, enabled, description)
values (
  'leistungen_info',
  false,
  'Info-Seite "Was steht uns zu?" mit deutschen und schweizerischen Pflege-Sozialleistungen (Plus-Feature)'
)
on conflict (key) do nothing;

commit;
```

**Step 2: Migration-DOWN schreiben**

```sql
-- Rueckbau Migration 169: Feature-Flag 'leistungen_info' entfernen
begin;
delete from public.feature_flags where key = 'leistungen_info';
commit;
```

**Step 3: File-Existenz verifizieren**

```bash
ls -la supabase/migrations/169_feature_flag_leistungen_info*.sql
```
Erwartet: Beide Dateien (`.sql` + `.down.sql`) vorhanden.

**Step 4: Commit**

```bash
git add supabase/migrations/169_feature_flag_leistungen_info.sql \
        supabase/migrations/169_feature_flag_leistungen_info.down.sql
git commit -m "feat(db): migration 169 — feature flag leistungen_info (default off)"
```

**⚠ Rote Zone — NICHT in dieser Task:** Prod-INSERT in `supabase_migrations.schema_migrations` braucht Founder-Go. Siehe Task 18.

---

### Task 2: Country-Typen + Helper

**Files:**
- Create: `nachbar-io/lib/leistungen/types.ts`
- Create: `nachbar-io/lib/leistungen/get-country.ts`
- Create: `nachbar-io/lib/leistungen/__tests__/get-country.test.ts`

**Step 1: Test schreiben**

```ts
// nachbar-io/lib/leistungen/__tests__/get-country.test.ts
import { describe, it, expect, vi } from 'vitest';
import { resolveCountryFromQuarter } from '../get-country';

describe('resolveCountryFromQuarter', () => {
  it('gibt DE zurueck wenn Quartier country="DE"', () => {
    expect(resolveCountryFromQuarter({ country: 'DE', state: 'BW' })).toBe('DE');
  });

  it('gibt CH zurueck wenn Quartier country="CH"', () => {
    expect(resolveCountryFromQuarter({ country: 'CH', state: 'AG' })).toBe('CH');
  });

  it('Fallback DE bei NULL country', () => {
    expect(resolveCountryFromQuarter({ country: null, state: null })).toBe('DE');
  });

  it('Fallback DE bei unbekannten Werten (nicht DE/CH)', () => {
    expect(resolveCountryFromQuarter({ country: 'AT', state: null })).toBe('DE');
  });

  it('gibt DE zurueck wenn Quartier gar nicht vorhanden', () => {
    expect(resolveCountryFromQuarter(null)).toBe('DE');
  });
});
```

**Step 2: Test ausfuehren (muss fehlschlagen)**

```bash
npx vitest run lib/leistungen/__tests__/get-country.test.ts
```
Erwartet: FAIL — "Cannot find module '../get-country'".

**Step 3: Types + Helper schreiben**

```ts
// nachbar-io/lib/leistungen/types.ts
export type Country = 'DE' | 'CH';
export type SwissCanton = 'AG' | 'BL' | 'BS' | 'SH' | 'TG' | 'ZH';
export const CURATED_CANTONS: readonly SwissCanton[] = ['AG', 'BL', 'BS', 'SH', 'TG', 'ZH'] as const;

export interface CantonVariant {
  amount: string;
  note: string;
  officialLink: string;
}

export interface Leistung {
  slug: string;
  country: Country;
  title: string;
  shortDescription: string;
  longDescription: string;
  amount?: string;
  legalSource: string;
  officialLink: string;
  lastReviewed: string;                             // ISO 'YYYY-MM-DD'
  cantonVariants?: Partial<Record<SwissCanton, CantonVariant>>;
}

export interface QuarterCountryInput {
  country: string | null;
  state: string | null;
}
```

```ts
// nachbar-io/lib/leistungen/get-country.ts
import type { Country, QuarterCountryInput } from './types';

export function resolveCountryFromQuarter(
  quarter: QuarterCountryInput | null
): Country {
  if (!quarter) return 'DE';
  if (quarter.country === 'CH') return 'CH';
  if (quarter.country === 'DE') return 'DE';
  return 'DE'; // Fallback — Pilot ist DE
}
```

**Step 4: Test gruen**

```bash
npx vitest run lib/leistungen/__tests__/get-country.test.ts
```
Erwartet: 5 Tests PASS.

**Step 5: Commit**

```bash
git add lib/leistungen/types.ts lib/leistungen/get-country.ts lib/leistungen/__tests__/get-country.test.ts
git commit -m "feat(leistungen): country resolver from quarters.country (fallback DE)"
```

---

### Task 3: Feature-Flag-Integration-Test

**Files:**
- Create: `nachbar-io/lib/leistungen/__tests__/feature-flag.test.ts`

**Step 1: Test schreiben**

```ts
// nachbar-io/lib/leistungen/__tests__/feature-flag.test.ts
import { describe, it, expect, vi } from 'vitest';
import { isFeatureEnabledServer } from '@/lib/feature-flags-server';

describe('leistungen_info feature flag', () => {
  it('liest den Flag ueber isFeatureEnabledServer', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { enabled: true }, error: null });
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    const supabase = { from: mockFrom } as any;

    const old = process.env.NEXT_PUBLIC_PILOT_MODE;
    process.env.NEXT_PUBLIC_PILOT_MODE = 'false';
    const enabled = await isFeatureEnabledServer(supabase, 'leistungen_info');
    process.env.NEXT_PUBLIC_PILOT_MODE = old;

    expect(enabled).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('feature_flags');
    expect(mockEq).toHaveBeenCalledWith('key', 'leistungen_info');
  });

  it('fail-open: false wenn DB-Fehler', async () => {
    const mockSingle = vi.fn().mockRejectedValue(new Error('db down'));
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    const supabase = { from: mockFrom } as any;

    const old = process.env.NEXT_PUBLIC_PILOT_MODE;
    process.env.NEXT_PUBLIC_PILOT_MODE = 'false';
    const enabled = await isFeatureEnabledServer(supabase, 'leistungen_info');
    process.env.NEXT_PUBLIC_PILOT_MODE = old;

    expect(enabled).toBe(false);
  });
});
```

**Step 2: Test ausfuehren**

```bash
npx vitest run lib/leistungen/__tests__/feature-flag.test.ts
```
Erwartet: 2 Tests PASS (Reuse von existierendem `isFeatureEnabledServer`).

**Step 3: Commit**

```bash
git add lib/leistungen/__tests__/feature-flag.test.ts
git commit -m "test(leistungen): flag-integration via isFeatureEnabledServer"
```

---

### Task 4: Plan-Check-Helper (Subscription-Gating)

**Files:**
- Create: `nachbar-io/lib/leistungen/check-plus.ts`
- Create: `nachbar-io/lib/leistungen/__tests__/check-plus.test.ts`

**Step 1: Test schreiben**

```ts
import { describe, it, expect } from 'vitest';
import { hasPlusAccess } from '../check-plus';

describe('hasPlusAccess', () => {
  it('true bei plan=plus und active', () => {
    expect(hasPlusAccess({ plan: 'plus', status: 'active', trial_ends_at: null })).toBe(true);
  });
  it('true bei plan=plus_trial und status=trial und Zukunft', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(hasPlusAccess({ plan: 'plus_trial', status: 'trial', trial_ends_at: future })).toBe(true);
  });
  it('false bei plan=free', () => {
    expect(hasPlusAccess({ plan: 'free', status: 'active', trial_ends_at: null })).toBe(false);
  });
  it('false bei plan=plus_trial aber trial abgelaufen', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(hasPlusAccess({ plan: 'plus_trial', status: 'trial', trial_ends_at: past })).toBe(false);
  });
  it('false bei null', () => {
    expect(hasPlusAccess(null)).toBe(false);
  });
});
```

**Step 2: Implementierung**

```ts
// nachbar-io/lib/leistungen/check-plus.ts
export interface SubscriptionSnapshot {
  plan: string;
  status: string;
  trial_ends_at: string | null;
}

export function hasPlusAccess(sub: SubscriptionSnapshot | null): boolean {
  if (!sub) return false;
  if (sub.plan === 'plus' && sub.status === 'active') return true;
  if (sub.plan === 'plus_trial' && sub.status === 'trial' && sub.trial_ends_at) {
    return new Date(sub.trial_ends_at).getTime() > Date.now();
  }
  return false;
}
```

**Step 3: Test gruen**

```bash
npx vitest run lib/leistungen/__tests__/check-plus.test.ts
```
Erwartet: 5 PASS.

**Step 4: Commit**

```bash
git add lib/leistungen/check-plus.ts lib/leistungen/__tests__/check-plus.test.ts
git commit -m "feat(leistungen): hasPlusAccess helper (plus/trial/free)"
```

---

## Block B — Content

**⚠ Wichtig:** Block-B-Tasks sind **Recherche-Tasks**. Jede Angabe braucht verifizierbare Quelle (Gesetzestext oder offizielle Behoerden-/Krankenkassen-Seite). KEINE erfundenen Zahlen, KEINE Schaetzungen. Bei Unsicherheit: Punkt im Kommentar `// TODO: Quelle fehlt — vor Merge klaeren` markieren und in Task 18 loesen.

### Task 5: Sozialamt-Map fuer alle 26 CH-Kantone

**Files:**
- Create: `nachbar-io/lib/leistungen/ch-sozialaemter.ts`
- Create: `nachbar-io/lib/leistungen/__tests__/ch-sozialaemter.test.ts`

**Step 1: Test schreiben**

```ts
import { describe, it, expect } from 'vitest';
import { CH_SOZIALAEMTER } from '../ch-sozialaemter';

describe('CH_SOZIALAEMTER', () => {
  const EXPECTED_CANTONS = [
    'AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE',
    'NW','OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH'
  ];
  it('enthaelt alle 26 Kantone', () => {
    for (const c of EXPECTED_CANTONS) expect(CH_SOZIALAEMTER[c]).toBeDefined();
    expect(Object.keys(CH_SOZIALAEMTER)).toHaveLength(26);
  });
  it('jeder Kanton hat name + https-url', () => {
    for (const c of EXPECTED_CANTONS) {
      expect(CH_SOZIALAEMTER[c].name.length).toBeGreaterThan(0);
      expect(CH_SOZIALAEMTER[c].url).toMatch(/^https:\/\//);
    }
  });
});
```

**Step 2: Test FAIL bestaetigen, dann File schreiben**

```ts
// nachbar-io/lib/leistungen/ch-sozialaemter.ts
// Quellen: kantonale Websites, recherchiert 2026-04-18. URLs zu Sozialamt/Sozialdirektion.
// Bei Umzuegen von Behoerden-Seiten: URL hier aktualisieren, kein Code-Change noetig.

export interface Sozialamt {
  name: string;
  url: string;
  phone?: string;
}

export const CH_SOZIALAEMTER: Record<string, Sozialamt> = {
  AG: { name: 'Sozialdienste Aargau (Kantonale Sozialdienste)', url: 'https://www.ag.ch/de/verwaltung/dgs/soziales' },
  AI: { name: 'Amt fuer Soziales Appenzell Innerrhoden', url: 'https://www.ai.ch' },
  AR: { name: 'Sozialamt Appenzell Ausserrhoden', url: 'https://www.ar.ch' },
  BE: { name: 'Gesundheits-, Sozial- und Integrationsdirektion Bern', url: 'https://www.gsi.be.ch' },
  BL: { name: 'Kantonales Sozialamt Basel-Landschaft', url: 'https://www.baselland.ch' },
  BS: { name: 'Amt fuer Sozialbeitraege Basel-Stadt', url: 'https://www.asb.bs.ch' },
  FR: { name: 'Kantonales Sozialamt Freiburg', url: 'https://www.fr.ch' },
  GE: { name: 'Service des prestations complementaires Geneve', url: 'https://www.ge.ch' },
  GL: { name: 'Sozialdienste Glarus', url: 'https://www.gl.ch' },
  GR: { name: 'Sozialamt Graubuenden', url: 'https://www.sozialamt.gr.ch' },
  JU: { name: 'Service de l\u2019action sociale Jura', url: 'https://www.jura.ch' },
  LU: { name: 'Dienststelle Soziales und Gesellschaft Luzern', url: 'https://disg.lu.ch' },
  NE: { name: 'Service de l\u2019action sociale Neuchatel', url: 'https://www.ne.ch' },
  NW: { name: 'Sozialamt Nidwalden', url: 'https://www.nw.ch' },
  OW: { name: 'Sozialamt Obwalden', url: 'https://www.ow.ch' },
  SG: { name: 'Kantonales Sozialamt St. Gallen', url: 'https://www.sg.ch' },
  SH: { name: 'Kantonales Sozialamt Schaffhausen', url: 'https://www.sh.ch' },
  SO: { name: 'Amt fuer Gesellschaft und Soziales Solothurn', url: 'https://aksolothurn.ch' },
  SZ: { name: 'Amt fuer Gesundheit und Soziales Schwyz', url: 'https://www.sz.ch' },
  TG: { name: 'Gesundheitsamt Thurgau (KuBK-Zustaendigkeit)', url: 'https://gesundheitsamt.tg.ch' },
  TI: { name: 'Divisione dell\u2019azione sociale Ticino', url: 'https://www4.ti.ch' },
  UR: { name: 'Sozialamt Uri', url: 'https://www.ur.ch' },
  VD: { name: 'Service de l\u2019action sociale Vaud', url: 'https://www.vd.ch' },
  VS: { name: 'Dienststelle fuer Sozialwesen Wallis', url: 'https://www.vs.ch' },
  ZG: { name: 'Soziales Zug', url: 'https://www.zg.ch' },
  ZH: { name: 'Kantonales Sozialamt Zuerich', url: 'https://www.zh.ch' },
};
```

**⚠ Task-18-Verifikation noetig:** Jede URL mit `curl -sSI <url> | head -1` auf 200/301 pruefen. Tote URLs in Review-Pass ersetzen.

**Step 3: Test gruen + Commit**

```bash
npx vitest run lib/leistungen/__tests__/ch-sozialaemter.test.ts
git add lib/leistungen/ch-sozialaemter.ts lib/leistungen/__tests__/ch-sozialaemter.test.ts
git commit -m "feat(leistungen): CH_SOZIALAEMTER map (26 kantons)"
```

---

### Task 6: DE-Content (5 Leistungen)

**Files:**
- Create: `nachbar-io/lib/leistungen/content-de.ts`
- Create: `nachbar-io/lib/leistungen/__tests__/content-de.test.ts`

**Recherche-Quellen (verpflichtend):**
- Pflegegrad: `https://www.gkv-spitzenverband.de/pflegeversicherung/beguthaben/pflegegrade.jsp`
- Pflegegeld-Beitraege 2025: `https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-pflegeversicherung/pflegegeld.html`
- Entlastungsbetrag 125 EUR: `https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-pflegeversicherung/entlastungsbetrag.html`
- Verhinderungspflege 1.685 EUR (Stand 2025): `https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-pflegeversicherung/verhinderungspflege.html`
- PflegeZG § 2 (10 Tage): `https://www.gesetze-im-internet.de/pflegezg/`

**Step 1: Test schreiben**

```ts
import { describe, it, expect } from 'vitest';
import { LEISTUNGEN_DE } from '../content-de';

describe('LEISTUNGEN_DE', () => {
  it('enthaelt genau 5 Eintraege', () => {
    expect(LEISTUNGEN_DE).toHaveLength(5);
  });
  it('alle Eintraege haben country=DE', () => {
    for (const l of LEISTUNGEN_DE) expect(l.country).toBe('DE');
  });
  it('eindeutige slugs', () => {
    const slugs = LEISTUNGEN_DE.map(l => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it('jeder Eintrag hat https-Link + lastReviewed ISO', () => {
    for (const l of LEISTUNGEN_DE) {
      expect(l.officialLink).toMatch(/^https:\/\//);
      expect(l.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(l.legalSource.length).toBeGreaterThan(3);
    }
  });
  it('enthaelt die 5 erwarteten Slugs', () => {
    const slugs = LEISTUNGEN_DE.map(l => l.slug).sort();
    expect(slugs).toEqual([
      'entlastungsbetrag',
      'pflegegeld',
      'pflegegrad',
      'pflegezg-10tage',
      'verhinderungspflege',
    ]);
  });
});
```

**Step 2: Content schreiben**

```ts
// nachbar-io/lib/leistungen/content-de.ts
// Stand 2026-04-18 — halbjaehrlich reviewen (jeweils 15. Jan + 15. Jul).
// Jede Angabe mit offizieller Quelle. KEINE Beratung.

import type { Leistung } from './types';

const REVIEW = '2026-04-18';

export const LEISTUNGEN_DE: Leistung[] = [
  {
    slug: 'pflegegrad',
    country: 'DE',
    title: 'Pflegegrad beantragen',
    shortDescription: 'Der Pflegegrad (1 bis 5) ist die Basis fuer alle Leistungen der Pflegeversicherung.',
    longDescription: 'Der Antrag wird bei der Pflegekasse gestellt. Die Begutachtung erfolgt durch den Medizinischen Dienst (MDK) bei gesetzlich Versicherten oder Medicproof bei Privatversicherten. Entscheidend sind sechs Module (u. a. Mobilitaet, Selbstversorgung, Alltagsgestaltung).',
    legalSource: 'Paragraf 14-15 SGB XI',
    officialLink: 'https://www.gkv-spitzenverband.de/pflegeversicherung/beguthaben/pflegegrade.jsp',
    lastReviewed: REVIEW,
  },
  {
    slug: 'pflegegeld',
    country: 'DE',
    title: 'Pflegegeld bei haeuslicher Pflege',
    shortDescription: 'Monatliche Zahlung an die pflegebeduerftige Person fuer die haeusliche Pflege durch Angehoerige.',
    longDescription: 'Wird direkt an die gepflegte Person ausgezahlt. Sie entscheidet, ob und wie sie das Geld an die pflegenden Angehoerigen weitergibt. Beitraege ab Pflegegrad 2.',
    amount: '332 bis 947 EUR/Monat (Pflegegrad 2 bis 5, Stand 2025)',
    legalSource: 'Paragraf 37 SGB XI',
    officialLink: 'https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-pflegeversicherung/pflegegeld.html',
    lastReviewed: REVIEW,
  },
  {
    slug: 'entlastungsbetrag',
    country: 'DE',
    title: 'Entlastungsbetrag',
    shortDescription: 'Zweckgebundener Betrag fuer Betreuungs- und Entlastungsleistungen, bereits ab Pflegegrad 1.',
    longDescription: 'Wird nicht ausgezahlt, sondern mit Rechnungen anerkannter Dienstleister (z. B. Tages-/Nachtpflege, anerkannte Alltagshelfer, Haushaltshilfe) verrechnet. Ungenutzte Betraege eines Monats koennen im selben Kalenderjahr uebertragen werden.',
    amount: '131 EUR/Monat (Stand 2025)',
    legalSource: 'Paragraf 45b SGB XI',
    officialLink: 'https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-pflegeversicherung/entlastungsbetrag.html',
    lastReviewed: REVIEW,
  },
  {
    slug: 'verhinderungspflege',
    country: 'DE',
    title: 'Verhinderungspflege',
    shortDescription: 'Finanzielle Unterstuetzung, wenn die pflegende Person Urlaub braucht oder verhindert ist.',
    longDescription: 'Fuer bis zu sechs Wochen pro Kalenderjahr. Erforderlich: Pflegegrad 2 oder hoeher und die pflegende Person hat seit mindestens sechs Monaten gepflegt. Ersatzpflege kann von einem ambulanten Dienst oder einer Privatperson geleistet werden.',
    amount: 'bis 1.685 EUR/Jahr, erweiterbar durch nicht genutzte Kurzzeitpflege (Stand 2025)',
    legalSource: 'Paragraf 39 SGB XI',
    officialLink: 'https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-pflegeversicherung/verhinderungspflege.html',
    lastReviewed: REVIEW,
  },
  {
    slug: 'pflegezg-10tage',
    country: 'DE',
    title: '10 Tage Pflege-Freistellung vom Job',
    shortDescription: 'In einer akuten Pflegesituation duerfen Sie bis zu zehn Arbeitstage der Arbeit fernbleiben.',
    longDescription: 'Gilt fuer nahe Angehoerige. Es besteht Anspruch auf Pflegeunterstuetzungsgeld (Lohnersatz aehnlich Kinderkrankengeld) ueber die Pflegekasse der gepflegten Person. Antrag direkt bei der Pflegekasse.',
    amount: 'ca. 90 % des Nettoentgelts (ueber Pflegekasse)',
    legalSource: 'Paragraf 2 PflegeZG + Paragraf 44a SGB XI',
    officialLink: 'https://www.bmfsfj.de/bmfsfj/themen/familie/familie-und-arbeitswelt/pflege-und-beruf/kurzzeitige-arbeitsverhinderung',
    lastReviewed: REVIEW,
  },
];
```

**Step 3: Tests gruen + Commit**

```bash
npx vitest run lib/leistungen/__tests__/content-de.test.ts
git add lib/leistungen/content-de.ts lib/leistungen/__tests__/content-de.test.ts
git commit -m "feat(leistungen): content DE — 5 Leistungen (Pflegegrad/Pflegegeld/Entlastung/Verhinderung/PflegeZG)"
```

**⚠ Review-Punkt fuer Task 18:** Betraege Stand 2025 gegen aktuelle Pflegereform-Anpassung 2026 pruefen (Pflegereform haette zum 01.01.2026 greifen koennen; wenn Werte veraltet → korrigieren und `lastReviewed` setzen).

---

### Task 7: CH-Content bundesweit (4 Leistungen)

**Files:**
- Create: `nachbar-io/lib/leistungen/content-ch-bund.ts`
- Create: `nachbar-io/lib/leistungen/__tests__/content-ch-bund.test.ts`

**Recherche-Quellen:**
- AHV-Betreuungsgutschrift (Art. 29septies AHVG): `https://www.ahv-iv.ch` — Merkblatt 1.03
- AHV/IV-Hilflosenentschaedigung: `https://www.ahv-iv.ch` — Merkblaetter 3.01 + 4.13
- IV-Assistenzbeitrag: `https://www.ahv-iv.ch` — Merkblatt 4.14
- OR 329g: `https://www.admin.ch/opc/de/classified-compilation/19110009/index.html#a329g`

**Step 1: Test (analog Task 6, aber 4 Eintraege, country='CH', genau erwartete Slugs)**

Erwartete Slugs: `['ahv-betreuungsgutschrift', 'ahv-iv-hilflosenentschaedigung', 'iv-assistenzbeitrag', 'or-329g-betreuungsurlaub']`.

**Step 2: Content** — siehe PDF `2026-04-15_Folien_FamilyCare_PflegegendeAngehorige.pdf` als strukturelle Referenz, aber Betraege aus Merkblaettern verifizieren.

Beispiel-Schema analog zu Task 6, alle Betraege in CHF, `legalSource` wie "Art. 29septies AHVG" oder "Art. 329g OR".

**Step 3: Tests gruen + Commit**

```bash
npx vitest run lib/leistungen/__tests__/content-ch-bund.test.ts
git add lib/leistungen/content-ch-bund.ts lib/leistungen/__tests__/content-ch-bund.test.ts
git commit -m "feat(leistungen): content CH bundesweit — 4 Leistungen (AHV/IV/OR)"
```

---

### Task 8: CH-EL-Karte mit 6-Kantons-Varianten

**Files:**
- Create: `nachbar-io/lib/leistungen/content-ch-el.ts`
- Create: `nachbar-io/lib/leistungen/__tests__/content-ch-el.test.ts`

**Recherche-Quellen:**
- ELG Art. 14: `https://www.fedlex.admin.ch`
- Aargau § 14/16 ELV AG: siehe PDF Folie 15+17
- Solothurn § 13: PDF Folie 16
- Thurgau § 11: PDF Folie 18
- BL, BS, SH, ZH: kantonale Verordnungen, pruefen auf den jeweiligen Kantonsseiten (siehe `CH_SOZIALAEMTER` aus Task 5)

**Step 1: Test schreiben**

```ts
import { describe, it, expect } from 'vitest';
import { LEISTUNG_CH_EL } from '../content-ch-el';
import { CURATED_CANTONS } from '../types';

describe('LEISTUNG_CH_EL', () => {
  it('slug=el-kubk + country=CH', () => {
    expect(LEISTUNG_CH_EL.slug).toBe('el-kubk');
    expect(LEISTUNG_CH_EL.country).toBe('CH');
  });
  it('enthaelt cantonVariants fuer alle 6 curated cantons', () => {
    for (const c of CURATED_CANTONS) {
      expect(LEISTUNG_CH_EL.cantonVariants?.[c]).toBeDefined();
      expect(LEISTUNG_CH_EL.cantonVariants![c]!.amount).toMatch(/\d/);
      expect(LEISTUNG_CH_EL.cantonVariants![c]!.officialLink).toMatch(/^https:\/\//);
    }
  });
});
```

**Step 2: Content** — Leistung mit `slug: 'el-kubk'`, Haupt-`amount` = "kantonal unterschiedlich", `cantonVariants` fuer AG/BL/BS/SH/TG/ZH (Quelle: kantonale ELV, 4.800 CHF/Jahr Aargau, 40.000 CHF/Jahr Thurgau etc.).

**Step 3: Tests gruen + Commit**

```bash
git add lib/leistungen/content-ch-el.ts lib/leistungen/__tests__/content-ch-el.test.ts
git commit -m "feat(leistungen): content CH EL-KuBK mit 6 Kantons-Varianten (AG/BL/BS/SH/TG/ZH)"
```

---

### Task 9: Content-Index + Aggregator

**Files:**
- Create: `nachbar-io/lib/leistungen/content.ts` (barrel)
- Create: `nachbar-io/lib/leistungen/__tests__/content-index.test.ts`

**Step 1: Test schreiben**

```ts
import { describe, it, expect } from 'vitest';
import { getLeistungenForCountry, ALL_LEISTUNGEN } from '../content';

describe('content aggregator', () => {
  it('ALL_LEISTUNGEN enthaelt 10 Eintraege', () => {
    expect(ALL_LEISTUNGEN).toHaveLength(10);
  });
  it('DE-Filter liefert 5', () => {
    expect(getLeistungenForCountry('DE')).toHaveLength(5);
  });
  it('CH-Filter liefert 5', () => {
    expect(getLeistungenForCountry('CH')).toHaveLength(5);
  });
  it('alle slugs global eindeutig', () => {
    const slugs = ALL_LEISTUNGEN.map(l => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
```

**Step 2: Aggregator schreiben**

```ts
// nachbar-io/lib/leistungen/content.ts
import type { Country, Leistung } from './types';
import { LEISTUNGEN_DE } from './content-de';
import { LEISTUNGEN_CH_BUND } from './content-ch-bund';
import { LEISTUNG_CH_EL } from './content-ch-el';

export const ALL_LEISTUNGEN: readonly Leistung[] = [
  ...LEISTUNGEN_DE,
  ...LEISTUNGEN_CH_BUND,
  LEISTUNG_CH_EL,
] as const;

export function getLeistungenForCountry(country: Country): readonly Leistung[] {
  return ALL_LEISTUNGEN.filter(l => l.country === country);
}

export { LEISTUNGEN_DE, LEISTUNGEN_CH_BUND, LEISTUNG_CH_EL };
export type { Country, Leistung, SwissCanton, CantonVariant } from './types';
```

**Step 3: Tests gruen + Commit**

```bash
npx vitest run lib/leistungen/__tests__/content-index.test.ts
git add lib/leistungen/content.ts lib/leistungen/__tests__/content-index.test.ts
git commit -m "feat(leistungen): content aggregator (10 Eintraege, country-filter)"
```

---

## Block C — UI-Komponenten

### Task 10: Haftungsausschluss-Komponente

**Files:**
- Create: `nachbar-io/components/leistungen/Haftungsausschluss.tsx`
- Create: `nachbar-io/components/leistungen/__tests__/Haftungsausschluss.test.tsx`

**Step 1: Test (RTL)** — Rendert Disclaimer-Text, zeigt `lastReviewed`-Datum, enthaelt Stichwoerter „Keine Rechtsberatung" + „Pflegekasse" (DE) / „Ausgleichskasse" (CH).

**Step 2: Komponente**

```tsx
// nachbar-io/components/leistungen/Haftungsausschluss.tsx
import type { Country } from '@/lib/leistungen/types';

interface Props {
  country: Country;
  lastReviewed: string; // ISO
}

export function Haftungsausschluss({ country, lastReviewed }: Props) {
  const verbindlich = country === 'DE'
    ? 'Ihre Pflegekasse'
    : 'Ihre Ausgleichskasse oder IV-Stelle';
  const date = new Date(lastReviewed).toLocaleDateString('de-DE');
  return (
    <div role="note" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-6 text-sm leading-6 text-gray-800">
      <strong>Keine Rechtsberatung.</strong> Alle Angaben ohne Gewaehr, Stand {date}.
      Betraege und Bedingungen aendern sich jaehrlich. Verbindlich sind allein{' '}
      <span className="font-medium">{verbindlich}</span> sowie der jeweilige Gesetzestext.
    </div>
  );
}
```

**Step 3: Commit**

```bash
git commit -m "feat(leistungen): Haftungsausschluss component (DE/CH-aware)"
```

---

### Task 11: LeistungsKarte + KantonsSchalter

**Files:**
- Create: `nachbar-io/components/leistungen/LeistungsKarte.tsx`
- Create: `nachbar-io/components/leistungen/KantonsSchalter.tsx`
- Create: Tests fuer beide

**LeistungsKarte:** Rendert Titel, `amount` (fett, falls vorhanden), `longDescription`, `legalSource`-Chip, externer Link („Zur offiziellen Quelle"). Senior-Mode: min-h 80px Ziele.

**KantonsSchalter:** Dropdown/Select mit den 6 curated Kantonen + „Anderer Kanton" (zeigt Link aus `CH_SOZIALAEMTER`). Default aus prop.

**Tests:**
- Karte rendert Titel, Betrag, Link mit `rel="noopener noreferrer"` + `target="_blank"`.
- Schalter: Wechsel zu Kanton X ruft `onChange('X')` auf. „Anderer Kanton" zeigt Sozialamt-Link.

**Commit:**
```bash
git commit -m "feat(leistungen): LeistungsKarte + KantonsSchalter components"
```

---

### Task 12: Paywall-Teaser-Komponente

**Files:**
- Create: `nachbar-io/components/leistungen/PlusTeaserKarte.tsx`
- Create: Test

Klickbarer Link auf `/was-steht-uns-zu` mit Badge „Plus". Fuer Free-User: zeigt Untertitel „Nur fuer Plus — 5 wichtige Pflege-Leistungen auf einen Blick" und leitet auf `/einstellungen/abo` (nicht auf die Zielseite).

Referenz-Styling: `modules/hilfe/components/PaywallBanner.tsx`.

**Commit:**
```bash
git commit -m "feat(leistungen): PlusTeaserKarte for mein-kreis"
```

---

## Block D — Route & Page

### Task 13: Server-Helper fuer Quartier-+-Subscription-Load

**Files:**
- Create: `nachbar-io/lib/leistungen/server-data.ts`
- Create: Test

Funktion `loadLeistungenContext(supabase, userId)` → liefert `{ country, cantonHint, subscription, flagEnabled }`. Interna: liest `users.quarter_id` → `quarters.country/state` → `care_subscriptions` → `isFeatureEnabledServer`.

**Tests (mit Mock-Supabase):**
- User ohne Quartier → country='DE', state=null.
- User mit Quartier CH-AG → country='CH', cantonHint='AG'.
- Flag off → flagEnabled=false, Rest trotzdem geladen.
- Subscription fehlt → `subscription=null`.

**Commit:**
```bash
git commit -m "feat(leistungen): loadLeistungenContext server helper"
```

---

### Task 14: Page `/was-steht-uns-zu` (Server Component)

**Files:**
- Create: `nachbar-io/app/(app)/was-steht-uns-zu/page.tsx`
- Create: Test (Integration via RTL + Mock-Supabase)

**Logik:**
1. `loadLeistungenContext` rufen.
2. Flag off → `redirect('/kreis-start')`.
3. `hasPlusAccess` false → `redirect('/einstellungen/abo?from=leistungen')`.
4. `country` bestimmen → `getLeistungenForCountry`.
5. Rendering: LargeTitle, Haftungsausschluss, TTSButton, Liste von LeistungsKarte, KantonsSchalter nur wenn CH + el-kubk-Karte sichtbar.

**Tests:**
- Flag off → redirect.
- Plan free + Flag on → redirect auf abo.
- Plan plus + Flag on + DE-Quartier → 5 DE-Karten sichtbar, keine CH-Karten.
- Plan plus + Flag on + CH-Quartier state='AG' → 5 CH-Karten + AG-Variante preselected.
- Plan plus + Flag on + CH-Quartier state='VD' → EL-Karte zeigt Sozialamt-Link zu VD.

**Commit:**
```bash
git commit -m "feat(leistungen): /was-steht-uns-zu route mit flag+plus-gating"
```

---

### Task 15: TTS-Integration

**Files:**
- Modify: `nachbar-io/app/(app)/was-steht-uns-zu/page.tsx` (TTSButton + `buildLeistungenTts(country, leistungen)`)
- Create: `nachbar-io/lib/leistungen/build-tts.ts` + Test

**`buildLeistungenTts`:** Prosaetext — „Was steht uns zu. Keine Rechtsberatung, Stand {date}. Verbindlich ist {kasse}. Erstens: {title}. {shortDescription} {amount?}. Rechtsgrundlage {legalSource}. Zweitens: …". Text ≤ 400 Worte (harte Laenge per `assertMaxLength`), damit Layer-1-Cache greift.

**Tests:** Deterministischer Output, enthaelt alle 5 Titel, Laenge < 400 Wort-Grenze.

**Commit:**
```bash
git commit -m "feat(leistungen): TTS buildLeistungenTts + integration in page"
```

---

## Block E — Integration

### Task 16: Mein-Kreis-Teaser einbinden

**Files:**
- Modify: `nachbar-io/app/(app)/care/meine-senioren/page.tsx` (das rendert auch `/mein-kreis`)
- Create: Integration-Test

Einfuegen: `PlusTeaserKarte` an sinnvoller Stelle (nach bestehenden Kreis-Bloecken). Server-Side pruefen: `flagEnabled` → falls off, nichts rendern. Sonst: Plus-User sehen Karte „Was steht uns zu?" mit Link; Free-User dieselbe Karte, aber mit Badge und Paywall-Link.

**Tests:**
- Flag off → Teaser nicht gerendert.
- Flag on + Plus → Link zu `/was-steht-uns-zu`.
- Flag on + Free → Link zu `/einstellungen/abo?from=leistungen`.

**Commit:**
```bash
git commit -m "feat(leistungen): mein-kreis teaser (flag-gated, plus-aware)"
```

---

## Block F — Qualitaet

### Task 17: Freshness-Assertion-Test

**Files:**
- Create: `nachbar-io/lib/leistungen/__tests__/freshness.test.ts`

**Zweck:** Test FAILT automatisch, wenn eine Leistung seit > 210 Tagen (ca. 7 Monate) nicht reviewed wurde → erzwingt halbjaehrlichen Review-Commit.

```ts
import { describe, it, expect } from 'vitest';
import { ALL_LEISTUNGEN } from '../content';

const MAX_AGE_DAYS = 210;

describe('Leistungen freshness', () => {
  for (const l of ALL_LEISTUNGEN) {
    it(`${l.country}/${l.slug} ist juenger als ${MAX_AGE_DAYS} Tage`, () => {
      const ageMs = Date.now() - new Date(l.lastReviewed).getTime();
      const ageDays = ageMs / 86400000;
      expect(ageDays).toBeLessThan(MAX_AGE_DAYS);
    });
  }
});
```

**Commit:**
```bash
git commit -m "test(leistungen): freshness assertion — fail at >210d without review"
```

---

### Task 18: Final-Review-Pass + Migration auf Prod

**Keine neue Datei — dies ist eine Pruef- und Deploy-Aufgabe.**

**Step 1: URL-Reachability (alle Content-Links + Sozialaemter)**

```bash
# Script temporaer erstellen und ausfuehren:
node -e "
const { ALL_LEISTUNGEN } = require('./lib/leistungen/content');
const { CH_SOZIALAEMTER } = require('./lib/leistungen/ch-sozialaemter');
const urls = [
  ...ALL_LEISTUNGEN.map(l => l.officialLink),
  ...Object.values(CH_SOZIALAEMTER).map(s => s.url),
];
for (const u of urls) console.log(u);
" | xargs -I {} curl -sSI -o /dev/null -w "%{http_code} {}\n" {}
```
Alle Codes 200/301/302 → OK. 404/5xx → URL korrigieren.

**Step 2: Volltest**

```bash
npx tsc --noEmit
npm run lint
npm run test -- --run lib/leistungen components/leistungen app/\(app\)/was-steht-uns-zu
```
Erwartet: Alles gruen.

**Step 3: Manueller Smoke im Dev-Server**

```bash
npm run dev
# 1. Login als Plus-User → /mein-kreis zeigt Teaser
# 2. Klick → /was-steht-uns-zu → 5 DE-Karten + Vorlesen funktioniert
# 3. Admin-Panel: Flag 'leistungen_info' toggeln → reload → Teaser/Page weg
# 4. Free-User: Teaser sichtbar, Klick → /einstellungen/abo
```

**Step 4: ⚠ Rote Zone — Founder-Go holen**

Thomas fragen (Slack/Chat):
> "Migration 169 (feature_flag leistungen_info, default OFF) ist bereit fuer Prod-Apply. OK?"

Nach Go:

```bash
# Via Supabase MCP (empfohlen, da Server-Side):
# apply_migration({ name: "169_feature_flag_leistungen_info", query: <file-inhalt> })
# ODER per SQL Editor.

# Dann Eintrag in schema_migrations pruefen:
# SELECT version FROM supabase_migrations.schema_migrations WHERE version = '169';
```

**Step 5: Push (Founder-Go) + Deploy**

```bash
git push origin master   # Founder-Go separat erfragen
```
GitHub Actions deployt in ~25s (Cron-Build, siehe CLAUDE.md).

**Step 6: Final-Check Prod**

```bash
curl -sSI https://nachbar-io.vercel.app/was-steht-uns-zu
# Erwartet: 307 (redirect, weil Flag default=off — so gewollt)
```

Dann im Super-Admin-Dashboard Flag fuer Bad-Saeckingen-Pilot anschalten und manuell in Prod testen.

**Commit (falls Review-Fixes noetig):**

```bash
git commit -m "chore(leistungen): final review — URL fixes + betraege aktualisiert"
```

---

## Tabellarische Zusammenfassung

| Task | Titel | Was | Tests? |
|---|---|---|---|
| 1 | Migration 169 | Flag-Seed SQL + Down | - |
| 2 | Country-Helper | resolveCountryFromQuarter | 5 |
| 3 | Flag-Integration | Reuse isFeatureEnabledServer | 2 |
| 4 | hasPlusAccess | Subscription-Check-Helper | 5 |
| 5 | CH-Sozialaemter | 26 Kantons-Links | 2 |
| 6 | DE-Content | 5 Leistungen | 5 |
| 7 | CH-Bund-Content | 4 Leistungen | analog |
| 8 | CH-EL + Kantone | 1 Leistung + 6 Varianten | 2+ |
| 9 | Content-Aggregator | Barrel + Filter | 4 |
| 10 | Haftungsausschluss | DE/CH-aware Disclaimer | 1+ |
| 11 | LeistungsKarte + Kantons-Schalter | UI-Bausteine | 2+ |
| 12 | PlusTeaserKarte | Mein-Kreis-Teaser | 1 |
| 13 | loadLeistungenContext | Server-Helper | 4 |
| 14 | /was-steht-uns-zu Page | Route + Gating | 5 |
| 15 | TTS-Integration | buildLeistungenTts + Button | 2+ |
| 16 | Mein-Kreis-Teaser einbauen | Integration | 3 |
| 17 | Freshness-Assertion | Review-Zwang | 10 |
| 18 | Review + Prod-Apply | Links, E2E-Smoke, Migration | - |

**Gesamt:** 18 Tasks, ~65 Tests neu, ~4 Arbeitstage Claude-Tempo.

---

## Rollback-Plan

Bei Problemen:

1. **Client-seitig:** Flag `leistungen_info` im Admin-Dashboard auf `false` → Seite + Teaser sofort unsichtbar.
2. **Code:** `git revert <commit-range>` fuer Block C-E. Content-Files bleiben unberuehrt — kein Nutzerimpact, nur tot.
3. **Migration-Rueckbau:** `169_feature_flag_leistungen_info.down.sql` gegen Prod laufen lassen (Founder-Go).

---

## Referenzen

- Design-Dok: `docs/plans/2026-04-18-leistungen-info-design.md` (`878b638`)
- Quell-PDFs: `~/Downloads/2026-04-15_Folien_FamilyCare_PflegegendeAngehorige.pdf` (CH), `~/Downloads/FamilyCare_Tag4_vanHolten_CC-Partizipation.pdf` (Caring Communities Framing)
- Bestehender Feature-Flag-Pattern: `lib/feature-flags-server.ts`, `app/(app)/admin/components/FeatureFlagManager.tsx`
- Paywall-Referenz: `modules/hilfe/components/PaywallBanner.tsx`
- DB-Regeln: `.claude/rules/db-migrations.md` (File-first!)
