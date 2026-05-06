# Medical-Blocklist NFKD/Diacritic-Strip

Datum: 2026-05-06 abend
Owner: Codex

## Kontext

Restpunkt aus dem Security-/Code-Quality-Handover:

- LOW: Medical-Blocklist Bypass durch Unicode-Diakritika.
- Ziel: bestehende Blocklist erweitern, keine neue Infrastruktur.

## Pre-Check

Codebase-weite Suche auf `medical-blocklist`, `containsMedicalTerms`, `normalize`, `NFKD`, `diacritic`, `blocklist` ergab:

- Bestehender Helper: `modules/memory/services/medical-blocklist.ts`
- Bestehender Test: `__tests__/modules/memory/medical-blocklist.test.ts`
- Call-Sites bleiben unveraendert ueber `containsMedicalTerms`.

Folgerung: Adapter/Erweiterung der vorhandenen Blocklist, kein Neubau.

## Umsetzung

- RED-Test ergaenzt: medizinische Begriffe mit Combining Marks wie `Diabe\u0301tes` und `Me\u0301tformin` muessen blockieren.
- Bestehende Umlaut-Normalisierung in `normalizeGermanUmlauts` extrahiert.
- Neue `stripDiacritics`-Variante nutzt `normalize('NFKD')` plus Combining-Mark-Strip.
- `containsMedicalTerms` prueft jetzt Lowercase, deutsche Umlaut-Normalisierung und diakritikfreie Variante.

## Verifikation

- RED: `npx vitest run __tests__/modules/memory/medical-blocklist.test.ts` fiel erwartbar bei Unicode-Diakritika.
- GREEN: `npx vitest run __tests__/modules/memory/medical-blocklist.test.ts __tests__/modules/memory/facts.service.test.ts lib/ai/tools/__tests__/save-memory.test.ts` -> 44/44 gruen.
- `npx eslint modules/memory/services/medical-blocklist.ts __tests__/modules/memory/medical-blocklist.test.ts` -> gruen.
- `npx tsc --noEmit` -> gruen.
- `git diff --check` -> gruen.
- `npm run build` -> gruen.

## Rote Zonen

Kein Push, kein Deploy, keine Prod-DB, keine Vercel-Env-/Secret-Aenderung.
