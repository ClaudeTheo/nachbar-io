# Brief: Claude → Claude (naechste Session)

**Datum:** 2026-05-09 abend
**Owner:** claude
**Founder-Auftrag:** Option 2 aus dem TeamViewer-Chat — `scripts/ai-test-users-cleanup-dry-run.ts` erweitern.
**Token-Status der vorherigen Session:** zu hoch geworden, deshalb Handoff statt direkt starten.

## Auslöser

Aus heutigem Pass-14c-Live-Test mit Playwright kam der Befund:

- Prod-DB hat **1183 User**, davon nur **2** mit `settings.is_test_user='true'` markiert.
- Die 1181 unmarkierten sind **alle synthetisch** (Stichprobe: `E2E Testnutzer`, `ai-test-onboarding-20260427`, `Petra K.`, `Klara S.`, `Xaver U.`, `Tanja P.`, `Gertrude H.`, alle 2026-04-19 erstellt).
- `scripts/ai-test-users-cleanup-dry-run.ts` filtert per Default nur auf `is_test_user='true'` → **erwischt 1181 nicht**.

Volldokumentation: `memory/project_db_test_users_cleanup_gap.md` (Auto-Memory).

## Auftrag

Erweitere das Cleanup-Skript um zusaetzliche Selektoren, sodass beim naechsten Pre-Pilot-Cleanup alle 1181 unmarkierten synthetischen User als Loeschkandidaten erkannt werden — inklusive sicherer Allowlist fuer Founder + bekannte Pilot-Test-Konten (Codex/Claude).

## Pflicht-Pre-Check (NICHT überspringen)

Bevor du ein Zeichen Code schreibst:

```bash
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"
ls scripts/ai-test-users-cleanup* 2>&1
cat scripts/ai-test-users-cleanup-dry-run.ts | head -100
grep -rn "ai-test-users-cleanup" scripts/ package.json __tests__/ 2>&1 | head
```

Mache den Pre-Check als ersten TodoWrite-Eintrag (siehe `.claude/rules/pre-check.md`).

Pruefe insbesondere:
1. Welche Selektoren das Skript heute schon kennt (vielleicht ist `name LIKE 'ai-test%'` schon drin).
2. Gibt es eine `.test.ts`-Datei dazu?
3. Wie wird es ausgefuehrt (Node, npm-Script)?
4. Gibt es schon eine Allowlist-Logik?

Falls einer der Selektoren im Brief unten bereits existiert: nicht duplizieren, nur fehlende ergaenzen.

## TDD-Plan

### Test-Strategie

`__tests__/scripts/ai-test-users-cleanup.test.ts` (oder bestehender Test-File falls vorhanden):

- **Mocks:** Supabase-Client mockt `from("users").select()` mit synthetischen Datensaetzen.
- **RED-Cases:**
  1. User mit `name='E2E Testnutzer'`, `settings.is_test_user=null` → muss als Loeschkandidat erkannt werden.
  2. User mit `name='Petra K.'`, kein Marker → erkannt.
  3. User mit `name='ai-test-onboarding-20260427'`, kein Marker → erkannt.
  4. Founder `email=thomasth@gmx.de` → NICHT erkannt (Allowlist).
  5. Pilot-Test-Konten Claude `6f3e06ce-...` und Codex `53aaea93-...` → NICHT erkannt (Allowlist), bis Pilot-Familien live.
  6. User mit `settings.is_test_user='true'` → erkannt (Backwards-Compat).
- **Edge-Cases:**
  - Echter User-Stub mit Familienname und Vorname → NICHT erkannt (z.B. `Maria Mustermann`).
  - User mit Markdown-Pattern aber Allowlist-ID → NICHT erkannt (Allowlist hat Vorrang).

### Code-Erweiterung

Drei zusaetzliche Selektoren in `is dry-run candidate`-Logik:

1. **`E2E Testnutzer`-Pattern:** `name === 'E2E Testnutzer'` (exakter Match, nicht ILIKE — Sicherheit gegen Kollision mit echten Nachnamen).
2. **`ai-test-`-Praefix:** `name.toLowerCase().startsWith('ai-test')` ODER `name.toLowerCase().startsWith('test-')` (siehe project_ai_testnutzer_regel.md fuer kanonischen Praefix).
3. **KI-Synthetik-Pattern `Vorname X.`:** Regex `/^[A-Za-zÄÖÜäöüß]+\s[A-Z]\.$/` (z.B. "Petra K.", "Xaver U."). Vorsicht: das matcht auch echte Nachnamen-Abkuerzungen — deshalb nur bei zusaetzlichem Created-At-Range (siehe Punkt 4).
4. **Created-At-Cutoff:** Optional als Flag `--before YYYY-MM-DD`. Default empfohlen: `--before <pilot-start-date>` aus Founder-Konfiguration.

### Allowlist

Hardcoded Liste mit Pflichtpfad nicht-loeschen:

```ts
const CLEANUP_ALLOWLIST = new Set([
  // Founder
  'thomasth@gmx.de',
  // Pilot-Onboarding-Test-Konten (siehe Memory)
  '6f3e06ce-...',  // Claude
  '53aaea93-...',  // Codex (vollen UUID aus Memory holen)
]);
```

UUIDs-Volltext aus `memory/project_session_handover.md` Reality-Check-Section: "AI-Test Thomas Admin/Paula Pending/Ben Blockiert, plus Pilot-Onboarding-Test-User Claude `6f3e06ce-...` und Codex `53aaea93-...`". Vollwert aus DB ziehen via Supabase-MCP.

### CLI-Interface

Wenn das Skript bisher nur einen Modus hat: erweitern um Flags:

```bash
npm run cleanup:test-users:dry-run                # Default — alle bisherigen Selektoren
npm run cleanup:test-users:dry-run -- --strict    # Nur is_test_user='true' (alter Default)
npm run cleanup:test-users:dry-run -- --before 2026-05-15
```

Dry-Run gibt aus: Anzahl Kandidaten + Anzahl Allowlist-Skips + Sample-CSV der ersten 20 Kandidaten + summe.

### Verifikation

```bash
npx vitest run __tests__/scripts/ai-test-users-cleanup.test.ts
npm run cleanup:test-users:dry-run             # Erwartet: ~1181 Kandidaten + Founder/Codex/Claude in Skip-Liste
npx tsc --noEmit
npm run lint
git diff --check
```

## Was NICHT Teil dieser Welle ist

- Echtes Loeschen aus Prod-DB (`apply_migration` oder DELETE-Statement) — bleibt **Rote Zone, Founder-Hand**.
- Test-Helper-Pflicht in `__tests__/_helpers/*` (zwingend `is_test_user=true` setzen) — separater Strang, eher Codex-Welle (siehe Option 3 aus dem TeamViewer-Chat).
- Memory-Praezisierung von `project_prod_db_test_data_only.md` — kann separat in einer kleineren Session laufen, optional Bonus dieser Welle.

## Erfolgskriterium

- Skript erkennt alle 1181 unmarkierten synthetischen User als Loeschkandidaten.
- Founder + Pilot-Onboarding-Test-Konten sind verlaesslich auf der Allowlist.
- Vitest gruen, ESLint clean, tsc clean.
- Push auf `master` (low-risk: Skript laeuft nicht im Lambda-Pfad, kein Deploy noetig).
- INBOX-Eintrag als `done`.

## Founder-Hand-Linie (NICHT beruehren)

- Vercel-Env (egal welche)
- Mig-Apply auf Prod
- Provider-Live (Anthropic/Mistral/Twilio)
- Echtes Loeschen aus Prod-DB

## Zur Erinnerung Pass-14c-Stand

- master == origin == Live == `1e3eb08`
- Letzter Deploy Production: `dpl_HPdqnaWPTv4XxzEqq6J6M3AHFZqQ`
- Service-Role-Key Vercel-Prod-Env funktioniert wieder (sb_secret_o63eX..., 41 chars, ASCII-only)
- Verifizierte API-Counts (heute live): rathaus=9, apotheken=3, events=2

## Empfohlene Sequenz

1. TodoWrite-Liste mit Pre-Check als Eintrag 1.
2. Pre-Check ausfuehren (Skript + Tests existieren? welche Selektoren?).
3. Skript-Architektur entscheiden (in-place erweitern vs. neu strukturieren).
4. Tests RED schreiben fuer die 6 Cases.
5. Implementation GREEN.
6. CLI-Flags hinzufuegen.
7. Allowlist mit echten UUIDs aus DB-Lookup.
8. Verifikation laufen lassen.
9. INBOX-Eintrag setzen, Commit, Push.
10. Auto-Memory `project_db_test_users_cleanup_gap.md` als gelöst markieren.
