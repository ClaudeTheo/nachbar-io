# Haertungs-Runde vor Push — Implementation Plan (21.-27. April 2026)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Welle C (C0-C8) ist am 27. April, vor dem Notar-Termin, sauber pushbar — alle Tests gruen, tsc sauber, manuell durchgeklickt, dokumentierte Restrisiken.

**Architektur:** Fuenf Bausteine ueber sieben Tage. Kein neues Feature. Nur haerten + verifizieren. Jeder Baustein ist eine Session (Claude). Nach jedem Baustein lokaler Commit. Kein Push bis Notar-Tag.

**Tech Stack:** Vitest 4 (Unit), Playwright 1.58 (E2E), TypeScript 5, Next.js 16, Supabase. Startzustand: nachbar-io HEAD `a46cc15`, 33 Commits seit `5de2a58`, kein Push. AVV blockt bis 27.04.

**Ausgangs-Stand (verifiziert 2026-04-20):**

- `nachbar-io/__tests__/` + `tests/e2e/` enthalten 359 Test-Files.
- `tests/e2e/cross-portal/x20-caregiver-memory.spec.ts` existiert mit x20a lauffaehig, x20b-e als TODO.
- Arbeitsbaum: 1 modifizierte Datei (`app/datenschutz/page.tsx`), 3 neue Handoff-Dokumente, 1 Backup-SQL — alles aus Vorgaenger-Sessions.
- Laut MEMORY.md 4 pre-existing Test-Failures (sos-detail, billing-checkout, hilfe/tasks x2) und 8 tsc-Skip-Liste-Errors. **Muss in Baustein 1 verifiziert werden.**

**Regeln fuer alle Bausteine:**

- **Pre-Check first.** Vor jeder Code-Aenderung `Grep`/`Glob` auf die relevanten Stichworte.
- **Kein Push.** Alle Commits bleiben lokal bis Notar 27.04.
- **Rote Zone = Founder-Go.** Prod-DB, Stripe, Push, Billing = immer erst fragen.
- **Commit pro Task.** Kleine atomare Commits mit deutschem Code-Kommentar, englischer Commit-Message.
- **Kontext-Limit.** Bei ~65 % Handoff schreiben, nicht auf 85 % laufen lassen.

---

## Baustein-Uebersicht

| # | Titel | Dauer | Tag | Ergebnis |
|---|---|---|---|---|
| B1 | Bestandsaufnahme Tests + tsc | 1 Session | Di 21.04. | Ehrliche Liste: gruen/rot/skipped, mit Ursache |
| B2 | 4 kaputte Tests fixen | 1-2 Sessions | Di-Mi | Alle Unit/Integration-Tests gruen |
| B3 | tsc Skip-Liste aufraeumen | 1 Session | Do 23.04. | Skip-Liste leer oder begruendet dokumentiert |
| B4 | Manueller Senior-Walkthrough | 1 Session (mit Founder) | Fr 24.04. | Gefundene UX-Stolperstellen als einzelne Commits gefixt |
| B5 | E2E x20b-e (optional) | 1-2 Sessions | Sa-So 25.-26.04. | Caregiver-Workflow automatisiert |
| B6 | Push-Vorbereitung | 0.5 Session | Mo 26.04. abend | Push-Checkliste, Release-Notes, AVV-Check |

---

## Baustein 1 — Bestandsaufnahme Tests + tsc

**Ziel:** Ehrliche Liste, was im Code wirklich rot ist. **Kein Code geaendert.**

**Files:** (nur Lese-Zugriff)

- `package.json` (Test-Kommandos)
- Ausgabe von `npm run test` + `npx tsc --noEmit`

### Task 1.1 — Volle Vitest-Suite laufen lassen

**Step 1:** In nachbar-io navigieren.
```bash
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"
```

**Step 2:** Test-Suite laufen, Output in Datei speichern.
```bash
npm run test 2>&1 | tee ../../docs/plans/2026-04-21-baustein-1-vitest-output.txt
```
Erwartung: dauert 5-15 min. Am Ende Zusammenfassung `Tests: X passed | Y failed`.

**Step 3:** Output auswerten und Tabelle schreiben.

Fuer jeden gefailten Test:
- File-Pfad + Test-Name
- Fehler-Kurztext (z.B. *"expected 'foo' but got 'bar'"*, *"mock fn called with wrong args"*)
- Kategorie: **Bug (Prod-Code falsch)** / **Test-Bug (Mock falsch)** / **Flaky (instabil)**

Ergebnis-Tabelle in `docs/plans/2026-04-21-baustein-1-bericht.md` speichern.

**Step 4:** Keine Commits, nur Doku.

### Task 1.2 — tsc Check

**Step 1:** tsc laufen lassen, Output speichern.
```bash
npx tsc --noEmit 2>&1 | tee ../../docs/plans/2026-04-21-baustein-1-tsc-output.txt
```

**Step 2:** Errors auswerten. Falls die in MEMORY.md erwaehnte "Skip-Liste" als Konfiguration existiert (z.B. in `tsconfig.json` `exclude` oder als `// @ts-expect-error`-Kommentare):

```bash
grep -rn "@ts-expect-error\|@ts-ignore" --include="*.ts" --include="*.tsx" . 2>&1 | grep -v node_modules | head -50
```

Liste der `@ts-expect-error`-Vorkommen im Bericht ergaenzen.

**Step 3:** Bericht ergaenzen. Kategorien pro tsc-Error:
- **Echter Bug** (Typ-Fehler zeigt echten Code-Fehler)
- **Konservativer Typ** (Typ ist zu streng, Runtime ist ok)
- **Drittanbieter-Library-Bug** (oft Radix / Next-Types)

### Task 1.3 — E2E-Suite kurz antesten

**Step 1:** Nur den Smoke-Test laufen, nicht die volle E2E-Suite.
```bash
npm run test:e2e:smoke 2>&1 | tee ../../docs/plans/2026-04-21-baustein-1-e2e-smoke.txt
```

**Step 2:** Wenn rot: kurz dokumentieren, nicht fixen (nicht Ziel dieses Bausteins).

### Task 1.4 — Bericht finalisieren und Commit

**Step 1:** `docs/plans/2026-04-21-baustein-1-bericht.md` mit drei Abschnitten:

1. **Vitest:** Zusammenfassung + Tabelle `File | Test | Ursache | Kategorie`
2. **tsc:** Zusammenfassung + Tabelle `Datei:Zeile | Fehler | Kategorie`
3. **Empfehlung fuer Baustein 2+3:** welche Reihenfolge, welche Fixes realistisch in Tageszeit, welche auf "nicht in dieser Runde" verschieben.

**Step 2:** Commit:
```bash
git add docs/plans/2026-04-21-baustein-1-*
git commit -m "docs(quality): bestandsaufnahme tests + tsc vor push"
```

**Abbruchkriterium:** wenn Vitest-Output > 20 Fehler zeigt, ist der Stand schlechter als angenommen — Stopp, Founder melden, neu entscheiden.

---

## Baustein 2 — 4 kaputte Tests fixen (TDD / Debug)

**Ziel:** Laut Memory 4 Tests rot (sos-detail, billing-checkout, hilfe/tasks 1, hilfe/tasks 2). Echte Liste kommt aus Baustein 1. Jeden einzeln angehen.

**Vorgehen pro Test (Schema, exemplarisch fuer sos-detail):**

### Task 2.1 — sos-detail Test (Beispiel-Struktur)

**Files:** werden in Baustein 1 konkret benannt. Hier Schema:

- Lesen: `__tests__/<pfad>/sos-detail.test.ts[x]`
- Lesen: `app/<pfad>/sos-detail/page.tsx` oder Prod-Code
- Ggf. modifizieren: Prod-Code ODER Test-Code

**Step 1: Pre-Check**

```bash
grep -rn "sos-detail\|SosDetail" --include="*.ts" --include="*.tsx" . 2>&1 | grep -v node_modules | head -20
```

Pruefen, ob es mehrere Ort gibt, wo "sos-detail" referenziert ist, oder ob Welle C / C8 hier ueberhaupt etwas geaendert hat (`git log --all --oneline -- "**/sos-detail/**" | head -5`).

**Step 2: Test isoliert laufen lassen**

```bash
npx vitest run __tests__/pfad/sos-detail.test.ts
```

Fehler-Meldung lesen, nicht raten.

**Step 3: Ursache bestimmen**

Entweder:
- **Produktiv-Code falsch** → Test lassen, Prod fixen.
- **Test-Code falsch** → Test fixen (Mock, Expect-Wert, fehlende afterEach cleanup).
- **Beides falsch** → beide fixen, extra sorgfaeltig.

**Step 4: Fix schreiben**

- Bei Prod-Fix: Minimal-Change, keine Erweiterung.
- Bei Test-Fix: `afterEach(cleanup)` hinzufuegen wenn Multi-Match-Falle (siehe `feedback_test_cleanup_default.md`).

**Step 5: Test laufen lassen, grun sehen**

```bash
npx vitest run __tests__/pfad/sos-detail.test.ts
```

Erwartung: `1 passed` (oder mehr).

**Step 6: Commit**

```bash
git add __tests__/pfad/sos-detail.test.ts app/pfad/... 
git commit -m "fix(test): sos-detail test green by <kurz-beschreibung>"
```

### Task 2.2 — billing-checkout Test

Gleiches Schema. Vorher pruefen ob `billing-checkout.test.ts` mit Stripe-Mocking arbeitet oder echte Stripe-SDK braucht.

### Task 2.3 — hilfe/tasks Test #1

Gleiches Schema.

### Task 2.4 — hilfe/tasks Test #2

Gleiches Schema.

### Task 2.5 — Voll-Suite nochmal laufen lassen

**Step 1:** Alle Unit + Integration-Tests.

```bash
npm run test 2>&1 | tee ../../docs/plans/2026-04-22-baustein-2-final-output.txt
```

**Step 2:** Erwartung: 0 Failures. Falls neue Fehler auftauchen (Regression): sofort fixen, dann wieder laufen.

**Step 3:** Commit der Zusammenfassung:

```bash
git add docs/plans/2026-04-22-baustein-2-final-output.txt
git commit -m "docs(quality): baustein 2 abgeschlossen, alle tests gruen"
```

**Abbruchkriterium:** Wenn ein einzelner Test > 2 Stunden kostet, stopp — Founder melden, entscheiden ob Skip + dokumentieren ODER weiterbohren.

---

## Baustein 3 — tsc Skip-Liste aufraeumen

**Ziel:** Die 8 `@ts-expect-error` / `@ts-ignore`-Stellen pruefen. Fuer jede entscheiden: **wirklich fixbar** oder **bleibt mit Begruendung**.

### Task 3.1 — Liste aus Baustein 1 aufgreifen

**Files:** die aus Baustein 1 dokumentierten `@ts-expect-error`-Stellen.

**Step 1:** Fuer jede Stelle: Datei lesen, Kontext verstehen.

**Step 2:** Drei Moeglichkeiten:

a) **Typ korrekt definieren.** Oft `as SomeType` + passende Typ-Definition.
b) **Library-Typen ergaenzen.** z.B. via `declare module` in `types/globals.d.ts`.
c) **Bleibt mit Kommentar.** `// @ts-expect-error: <Grund> — <Datum>` statt nackt.

**Step 3:** Pro Stelle einzelner Commit.

```bash
git add <pfad>
git commit -m "fix(types): <stelle> ohne ts-expect-error typisiert"
```

### Task 3.2 — tsc nochmal laufen lassen

```bash
npx tsc --noEmit
```

Erwartung: **0 Fehler** oder explizit dokumentierte Restliste in `docs/plans/2026-04-23-baustein-3-restliste.md` mit Begruendung pro Stelle.

### Task 3.3 — Commit Restliste

```bash
git add docs/plans/2026-04-23-baustein-3-restliste.md
git commit -m "docs(types): skip-liste aufgeraeumt, restliste dokumentiert"
```

**Abbruchkriterium:** Wenn ein Fix einen Kaskaden-Effekt ausloest (mehr Typ-Fehler entstehen) und > 30 min kostet, zurueckrollen und als "bleibt mit Kommentar" dokumentieren.

---

## Baustein 4 — Manueller Senior-Walkthrough

**Ziel:** Nichts kann ersetzen, dass der Founder selbst durchklickt. Claude kann das nicht.

**Files:** keine Aenderungen direkt durch Claude. Nach dem Walkthrough ggf. Fixes in:

- `app/(senior)/**` — Senior-UI
- `modules/memory/components/**` — Gedaechtnis-UI
- `modules/senior/onboarding/**` — Onboarding-Schritte
- Sonstiges je nach Befund

### Task 4.1 — Vorbereitung durch Claude (vor Termin)

**Step 1:** Dev-Server starten.
```bash
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"
npm run dev
```

**Step 2:** Checkliste fuer Founder als Markdown in `docs/plans/2026-04-24-baustein-4-walkthrough-checkliste.md`:

Senior-Flow:
1. Login als Senior-Test-Account
2. Onboarding starten, 3-5 Fakten sprechen/tippen
3. KI fragt Geburtstag — Confirm-Dialog beobachten (TTS-Autoplay, Stichwort + Wert, Beruhigungs-Hinweis?)
4. "Ja, speichern" klicken
5. `/profil/gedaechtnis` — Eintrag da?
6. Eintrag loeschen — Confirm-Dialog, danach weg?
7. DSGVO-Uebersicht `/profil/gedaechtnis/uebersicht` — lesbar?

Caregiver-Flow:
8. Zweiter Login als Angehoeriger
9. `/caregiver/senior/<id>/gedaechtnis` — Senior-Name korrekt im Header?
10. Fakt eintragen
11. Liste zeigt "Von Ihnen"-Badge?
12. Zurueck zu Senior-Login
13. Senior sieht Caregiver-Eintrag mit "Von Angehoerigen"-Badge?

Pro Punkt Spalten: **OK / Stolperstelle / Kommentar**.

**Step 3:** Commit Checkliste.

```bash
git add docs/plans/2026-04-24-baustein-4-walkthrough-checkliste.md
git commit -m "docs(walkthrough): checkliste fuer founder-manueller test"
```

### Task 4.2 — Founder-Termin (Claude begleitet)

Founder klickt durch, Claude protokolliert live in die Checkliste. Jede Stolperstelle wird zu einem GitHub-Issue-ähnlichen Eintrag:

```markdown
### Stolperstelle 1: Confirm-Dialog-Button zu klein auf Handy
- Schwere: mittel
- Datei: modules/ai/components/MemoryConfirmDialog.tsx
- Fix-Vorschlag: min-height von 64 auf 80px
- Fix-Aufwand: 15 min
```

### Task 4.3 — Fixes nach Walkthrough (mehrere kleine Commits)

Pro Stolperstelle:

**Step 1:** Pre-Check — existiert schon eine aehnliche Fix-Stelle im Repo?

```bash
grep -rn "<relevantes-keyword>" --include="*.tsx" . | grep -v node_modules | head -10
```

**Step 2:** Fix schreiben.

**Step 3:** Relevante Tests aktualisieren oder neu schreiben (TDD).

**Step 4:** Tests laufen lassen.

**Step 5:** Commit.

```bash
git add <pfad>
git commit -m "fix(senior-ux): <stolperstelle>"
```

**Abbruchkriterium:** Wenn die Stolperstellen-Liste > 10 wird, nur die 5 wichtigsten diese Woche fixen, Rest auf nach Push.

---

## Baustein 5 — E2E x20b-e (optional)

**Ziel:** Die vier TODO-Tests in `tests/e2e/cross-portal/x20-caregiver-memory.spec.ts` ausbauen.

**Voraussetzung:** Senior-Test-Account existiert in lokaler / Staging-Supabase.

**Files:**

- Modifizieren: `tests/e2e/cross-portal/x20-caregiver-memory.spec.ts`
- Moeglicherweise: `tests/e2e/helpers/**` fuer neue Test-Setup-Helfer

### Task 5.0 — Senior-Test-Account

**Rote Zone!** Founder-Go erforderlich.

**Step 1:** Entscheiden — lokale Supabase-Instanz oder Preview-Branch?

Empfehlung: lokale Supabase via `supabase start`. Keine Prod-Daten, keine AVV-Relevanz.

**Step 2:** Seed-Script pruefen/erweitern.

```bash
grep -rn "seed\|fixture" scripts/ | grep -v node_modules | head -10
```

Wenn noch kein Senior-Seed existiert: `scripts/seed-senior-test-account.ts` schreiben mit:
- 1 Senior-User (role='senior')
- 1 Caregiver-User (role='resident' mit caregiver_links-Eintrag)
- care_consents.memory_basis + memory_care auf `granted` fuer den Senior

**Step 3:** Commit.

### Task 5.1 — x20b: Fakt anlegen + "Von Ihnen"-Badge

Siehe Blueprint im Skelett-File. Playwright-Steps:

**Step 1:** Test-Code schreiben (Pre-Check im Skelett-File).

**Step 2:** Lokal laufen lassen, gruen sehen.

**Step 3:** Commit.

### Task 5.2 — x20c: Senior sieht "Von Angehoerigen"-Badge

### Task 5.3 — x20d: Senior loescht, Caregiver sieht nichts

### Task 5.4 — x20e: Link widerrufen → 404

**Step 1-3 pro Task:** Wie 5.1.

### Task 5.5 — Voll-x20 laufen lassen

```bash
npx playwright test tests/e2e/cross-portal/x20-caregiver-memory.spec.ts
```

Erwartung: alle 5 Tests (a + b + c + d + e) gruen.

**Abbruchkriterium:** Wenn x20b nicht gruen zu kriegen ist in < 1 Session, abbrechen — Step 7 bleibt auf "nach Push".

---

## Baustein 6 — Push-Vorbereitung (26.04. Abend)

**Ziel:** Alles ist bereit, damit 27.04. nach Notar in 10 min gepusht werden kann.

### Task 6.1 — Voll-Suite noch einmal

```bash
npm run test 2>&1 | tail -10
npx tsc --noEmit
```

Erwartung: 0 Fehler, 0 Warnungen (oder dokumentierte Restliste).

### Task 6.2 — Release-Notes schreiben

**File:** `docs/plans/2026-04-27-release-notes-welle-c.md`

Struktur:

```markdown
# Welle C (C0-C8) Release Notes — 27.04.2026

## Enthaltene Features
- KI-Onboarding fuer Senioren (Provider-Layer)
- Wissensdokument (Senior-Fakten)
- save_memory Tool mit 4-stufigem Schutz
- Onboarding-Wizard-UI
- STT-Mikrofon
- DSGVO-Uebersicht
- Consent-Flow
- Caregiver-Scope (Angehoerige koennen Fakten fuer Senior speichern)
- Senior-UX-Upgrade fuer Confirm-Dialog
- E2E-Skelett x20a lauffaehig (b-e optional)

## Migrationen (Mig 173 + 174)
- ...

## Test-Stand
- 3800+ Unit-Tests gruen
- tsc clean
- E2E x20a lauffaehig

## DSGVO
- Art. 6, 7(3), 15, 17, 25, 32 durch Welle C erfuellt
- AVV mit Anthropic + Mistral am 27.04. unterschrieben (GmbH Theobase)

## Bekannte Einschraenkungen
- AI_PROVIDER_OFF=true im Env, bis erster Pilot-User Familie zustimmt
- x20b-e optional, nach Push
- Name-Aufloesung "Von Tochter Anna" noch nicht, generisch "Von Angehoerigen"
```

### Task 6.3 — Push-Checkliste aktualisieren

**File:** `docs/plans/2026-04-27-push-checklist-welle-c.md` (existiert bereits)

- Haken setzen bei: Tests gruen, tsc clean, Walkthrough-Fixes drin, AVV-Plan, Mig-Pruefung
- Offene Punkte klar markieren

### Task 6.4 — Commit

```bash
git add docs/plans/2026-04-27-*
git commit -m "docs(push): release notes + checkliste final"
```

### Task 6.5 — Schlaf ruhig (kein Push in dieser Runde)

---

## Post-Plan: Nach Notar 27.04. (Rote Zone, nicht Teil dieses Plans)

Dieser Plan endet am 26.04. mit allem bereit. Der Push am 27.04. ist **nicht Teil dieses Plans** — Founder entscheidet nach Notar-Termin, je nach AVV-Stand.

---

## Kill-Kriterien fuer den ganzen Plan

- **Wenn Baustein 1 zeigt > 20 rote Tests:** neu planen, Baustein 2 wird zu gross fuer die Woche.
- **Wenn Baustein 4 > 10 Stolperstellen findet:** nur top 5 diese Woche, Rest nach Push.
- **Wenn Founder absagt / Notar verschiebt:** Plan pausieren, alles lokal lassen.
- **Wenn Rote-Zone-Task blockiert (z.B. Senior-Seed nicht erlaubt):** Baustein 5 streichen.

---

## Zeitschaetzung

| Baustein | Optimistisch | Realistisch | Pessimistisch |
|---|---|---|---|
| B1 Bestandsaufnahme | 1 Session | 1 Session | 1.5 Sessions |
| B2 4 Tests fixen | 1 Session | 2 Sessions | 3 Sessions |
| B3 tsc | 0.5 Session | 1 Session | 1.5 Sessions |
| B4 Walkthrough | 1 Session + Founder | 2 Sessions + Founder | 3 Sessions |
| B5 E2E (optional) | 1 Session | 2 Sessions | streichen |
| B6 Push-Prep | 0.5 Session | 0.5 Session | 1 Session |
| **Summe** | **5 Sessions** | **8.5 Sessions** | **10 Sessions** |

Bei 1-2 Sessions pro Tag ueber 6 Tage (21.-26.04.) ist die **realistische Variante gut machbar**, die **pessimistische knapp**, die **optimistische laesst Luft fuer Notfall-Fixes**.

---

## Naechster Schritt

Nach Plan-Freigabe durch Founder: **Baustein 1 starten** (21.04., morgens). Dauer ~2-3 Stunden. Ergebnis: Bericht an Founder mit Empfehlung, welche Tests/Errors diese Woche realistisch gefixt werden koennen.

Founder-Go-Punkte im Plan:
- **B5.0 Senior-Seed** — lokal vs. Staging entscheiden.
- **B4.3 Walkthrough-Fixes** die Prod-Daten oder Supabase-DB beruehren (z.B. neue Felder) — Rote Zone.
- **B6 Push-Entscheidung** am 27.04. nach Notar — nicht Teil dieses Plans.

---

**Plan-Autor:** Claude Opus 4.7 (1M context)
**Plan-Datum:** 2026-04-20
**Plan-Start:** 2026-04-21
**Plan-Ende:** 2026-04-26 (Push-Tag 27.04. separat)
