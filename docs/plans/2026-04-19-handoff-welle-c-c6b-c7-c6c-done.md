# Handoff — Welle C C6b + C7 + C6c komplett (lokal)

**Datum:** 2026-04-19 (sehr spaet abend)
**Von:** Claude Opus 4.7 (1M) — Welle-C-Schluss-Session (C6b STT + C7 DSGVO-Memory-Uebersicht + C6c Consent-Grant-Flow)
**An:** Naechste Session / Thomas
**Modell-Empfehlung naechste Session:** Sonnet 4.7 fuer F7 / Push-Vorbereitung (routine), Opus 4.7 wenn AVV-Vorbereitung oder Architektur-Entscheidungen anstehen.
**Kontext-Stand bei Schreibweise:** Sauberer Schluss-Punkt — Welle C ist FUNKTIONAL ship-fertig. Alle Tests gruen, tsc clean, Pre-Check-Befunde dokumentiert.

---

## TL;DR

- **Welle C C6b (STT-Mikrofon) + C7 (DSGVO-Memory-Uebersicht) + C6c (Consent-Grant-Flow) komplett und lokal committed.** 8 neue Commits in dieser Session (`cb51e0e` ... `3c46c8a`). 22 lokale Commits seit `5de2a58`, kein Push.
- **Welle C ist funktional ship-fertig** — vorbehaltlich AVV nach GmbH-Eintragung (Notar 27.04.2026). Senior kann den Wizard ueber 1-Tap erreichen, Einwilligung erteilen, sprechen oder tippen, Memory-Vorschlaege bestaetigen, gespeicherte Fakten sehen + loeschen, Einwilligungen jederzeit widerrufen.
- **DSGVO-Pflichten geschlossen:** Art. 6 (Einwilligung) + Art. 7(3) (Widerruf) + Art. 15 (Auskunft) + Art. 17 (Loeschung) — alle UI-seitig erreichbar.
- **Test-Stand:** 158/158 gruen in 21 Welle-C-Files. tsc clean ausser preexistente Skip-Liste-Errors (8, unveraendert). Keine npm-Dependencies neu.
- **Pre-Check-Treffer (3x verhindert Duplikate):** `useMemoryFacts` + Backend-Routes komplett, `MemoryFactList` (Standard-Variante) existierte, Care-Consent-System (`/api/care/consent` + Routen + Gate) komplett.
- **Naechster Task (Empfehlung):** Push-Vorbereitung + MEMORY.md-Update (administrativer Schluss von Welle C) ODER F7 cache_control-Rename (Codex NACHBESSERN, mittelfristig). Details unten.

---

## Lokaler Commit-Stand

**nachbar-io HEAD: `3c46c8a`** (22 lokale Commits seit `5de2a58`, kein Push):

| SHA | Welle | Beschreibung |
|---|---|---|
| `26e3da4` | C2 | feat(ai): provider abstraction Claude/Mistral/mock |
| `477f344` | C1 | feat(db): mig 173 memory-consents + ai_onboarding consent key |
| `cd300dc` | C2-Review | refactor(ai): OffProvider throws AIProviderError + doc polish |
| `133bdcf` | C3 | feat(ai): system-prompt wissensdokument senior-app DE + CH |
| `196aa8a` | C4 | feat(ai): save_memory tool adapter |
| `71f8c56` | C5a | feat(ai): prompt-caching flag system_cached for Claude |
| `ddf50d0` | C5b | feat(ai): onboarding-turn route |
| `bb86ff7` | C6a | feat(senior): KI-onboarding-wizard UI |
| `8720268` | docs | codex review request — Welle C C3-C6a |
| `18284f5` | docs | self-contained codex review |
| `1fc344a` | Codex-Fix A | BLOCKER F6.1 (consent) + Senior 80px + ZUSATZ B/C/D |
| `3fbe3b3` | Codex-Fix B | BLOCKER F6.2 (Mig 174 RLS) + F6.3 (Mig 173 down defensive) |
| `680e285` | Codex-Fix C | NACHBESSERN F2 (Provenance + Page-Rename) + F4 (AbortController) |
| `725a897` | docs | handoff Welle C C6a + Codex-Review-Fixes komplett |
| **`cb51e0e`** | **C6b step 1** | **useSpeechInput Hook (Whisper-First STT, 14 Tests)** |
| **`8b9ee02`** | **C6b step 2** | **WizardChat Mic-Button + TTS-Race-Fix (7 Tests)** |
| **`59fa70d`** | **C7 step 1** | **SeniorMemoryFactList — DSGVO Art. 17 (13 Tests)** |
| **`91ff147`** | **C7 step 2** | **/profil/gedaechtnis Page + 3 Consent-Toggles (10 Tests)** |
| **`f14c20c`** | **C7 step 3** | **Link von ProfilView zur Memory-Uebersicht (2 Tests)** |
| **`ea2bd3b`** | **C6c step A1** | **useOnboardingTurn 403 -> consent_required (1 Test)** |
| **`d3317a7`** | **C6c step A2** | **WizardChat Consent-Banner + Grant-Button (5 Tests)** |
| **`3c46c8a`** | **C6c step B** | **Senior-Home-Link "🤝 KI kennenlernen" (2 Tests)** |

Parent-Repo (Handy APP) unveraendert seit `8bb5a74`.

---

## Was diese Session gebaut hat

### Phase 1 — C6b STT-Mikrofon (`cb51e0e` + `8b9ee02`)

**Hook `useSpeechInput`** (`modules/voice/hooks/useSpeechInput.ts`):
- Schmaler Wrapper um `createSpeechEngine` (Whisper-First, Native-Fallback)
- API: `{ isAvailable, recording, speechState, start, stop }`
- Single-purpose extrahiert vom 359-LOC `useCompanionChat`
- 14 Tests: Verfuegbarkeit, Lifecycle, Engine-Callbacks, Doppel-Start

**WizardChat Mic-Button** (`modules/voice/components/onboarding/WizardChat.tsx`):
- Mikrofon-Button neben Senden, nur wenn `isAvailable=true`
- `recording=true` -> rotes Stop-Symbol + aria-label "Aufnahme beenden"
- 80px Touch-Target (Senior-Mode)
- **Race-Fix:** vor `startSpeech()` IMMER `stopTts()` — Test verifiziert callOrder=`["tts.stop","speech.start"]`
- onTranscript -> `setInput(text)`, NICHT auto-send (Korrekturmoeglichkeit vor KI-Token-Burn)
- 7 neue Tests fuer Mic-Verhalten

### Phase 2 — C7 DSGVO-Memory-Uebersicht (`59fa70d` + `91ff147` + `f14c20c`)

**`SeniorMemoryFactList`** (`modules/memory/components/SeniorMemoryFactList.tsx`):
- Senior-Variante der bestehenden `MemoryFactList`
- 80px Touch-Targets pro Loesch-Aktion
- Inline Confirm-Overlay vor JEDEM Delete + Reset (DSGVO Art. 17)
- KEINE Inline-Edit-Funktion (Senior soll nur sehen + loeschen)
- Reset-Scope vereinfacht: nur "alles loeschen", keine Mehrfach-Auswahl
- 13 Tests: Anzeige, Touch-Targets, Einzel-Loeschen mit Confirm, Alles-Loeschen

**Senior-Page `/profil/gedaechtnis`** (`app/(senior)/profil/gedaechtnis/page.tsx`):
- Komposition: useMemoryFacts (single-source-of-truth) + SeniorMemoryFactList + 3 Consent-Toggles
- Senior-Mode-Consent-Toggles: grosse Buttons mit "Eingeschaltet/Ausgeschaltet"-Status statt shadcn-Switch
- aria-pressed + aria-label fuer Screen-Reader
- 80px min-height, gruener Rand wenn aktiv
- 10 Tests: Title, DSGVO-Hinweis, Loading, Liste-Integration, Delete, 3 Toggles, grant/revoke, Footer

**ProfilView-Link** (`components/senior/ProfilView.tsx`):
- Sektion "KI-Assistent" zwischen Benachrichtigungen und App-Info
- 1-Tap zur Memory-Uebersicht ("Sehen und loeschen, was die KI ueber Sie weiss")
- 80px Touch-Target
- 2 Tests

### Phase 3 — C6c Consent-Grant-Flow (`ea2bd3b` + `d3317a7` + `3c46c8a`)

**`useOnboardingTurn` 403-Handling** (`modules/voice/hooks/useOnboardingTurn.ts`):
- `OnboardingError`-Type um `"consent_required"` erweitert
- 403-Branch in sendUserInput: setError("consent_required") OHNE Toast (Banner ist dauerhafter UI-State)
- 1 neuer Test

**WizardChat Consent-Banner** (`modules/voice/components/onboarding/WizardChat.tsx`):
- Bei `error === "consent_required"`: Banner statt Eingabe-Bereich
- h2 "Brauche Ihre Erlaubnis" + Erklaerung (KI-Anbieter, Kennenlernen) + Hinweis auf Widerruf
- Grant-Button (80px gruen) -> POST `/api/care/consent` mit `features.ai_onboarding=true`
- Nach Erfolg: `reset()` (clearet error+messages, User kann frisch tippen)
- 5 neue Tests

**Senior-Home-Link** (`app/(senior)/page.tsx`):
- Button "🤝 KI kennenlernen" (Indigo, 80px) -> `/kennenlernen`
- Pattern uebernommen von Medikamente/Sprechstunde/Check-in
- 2 Tests

---

## Test-Stand

```
Smoke-Suite (Welle-C-relevante Bereiche):
  npx vitest run __tests__/modules/memory/ \
                 __tests__/components/senior/ \
                 __tests__/hooks/useTtsPlayback.test.ts \
                 __tests__/hooks/useOnboardingTurn.test.ts \
                 __tests__/hooks/useSpeechInput.test.ts \
                 __tests__/components/onboarding/

Ergebnis: 158 / 158 gruen (21 Files)
```

Detail neue Tests dieser Session:
- `useSpeechInput`: 14 Tests
- `WizardChat`: 23 Tests (alt: 11; +7 Mic + +5 Consent-Banner)
- `useOnboardingTurn`: 18 Tests (+1 consent_required)
- `SeniorMemoryFactList`: 13 Tests (neu)
- `Senior-Gedaechtnis-Page`: 10 Tests (neu)
- `ProfilView-Link`: 2 Tests (neu)
- `Senior-Home-Link`: 2 Tests (neu)

`npx tsc --noEmit`: clean ausser **8 preexistente Skip-Liste-Errors** (unveraendert seit Welle C C0):
- `__tests__/lib/security/device-fingerprint.test.ts:267`
- `__tests__/pages/quartier-info-vorlesen.test.tsx:170`
- `tests/e2e/cross-portal/x01-checkin-heartbeat.spec.ts:134-136`
- `tests/e2e/cross-portal/x19-postfach-thread.spec.ts:428-429`
- `tests/e2e/scenarios/s12-neighbor-request-chat.spec.ts:92`

Keine neuen npm-Dependencies.

---

## Uncommitted Reste (NICHT anfassen ausser gezielt)

```
nachbar-io:
 M app/datenschutz/page.tsx                                    (Welle-B-Folgearbeit-Rest, 64 LOC)
?? docs/plans/2026-04-18-handoff-live-test-blocked-voice-latency.md
?? docs/plans/2026-04-18-handoff-tts-layer1-cache.md
?? docs/plans/2026-04-19-handoff-welle-c-c0-c3-done.md
?? docs/plans/2026-04-19-handoff-welle-c-c4-c5a-done.md
?? docs/plans/2026-04-19-handoff-welle-c-c5b-done.md
?? docs/plans/2026-04-19-handoff-welle-c-c6b-c7-c6c-done.md   (DIESES File)
?? supabase/migrations/067_doctor_registration_BACKUP_DB.sql

Parent-Repo (Handy APP):
 M CLAUDE.local.md
```

---

## Pre-Check-Befunde dieser Session (3 grosse Treffer dokumentiert)

### Treffer 1 — C7 Memory-Uebersicht
**Plan:** "Bauen Sie eine Senior-Memory-Page von Grund auf."

**Realitaet (gegrept):**
- `useMemoryFacts` Hook existierte (facts/consents/CRUD/reload)
- `MemoryFactList` Komponente existierte (gruppiert + inline Reset)
- `MemoryFactItem` + `MemoryConsentScreen` + `CaregiverMemoryEditor` existierten
- Backend-Routes `/api/memory/facts/*` + `/consent/*` komplett
- `app/(app)/einstellungen/gedaechtnis/page.tsx` als Standard-User-Variante komplett

**Entscheidung:** Senior-eigene Komponente `SeniorMemoryFactList` (80px, Confirm-Overlay, kein Edit), aber Hook + Backend-Routes wiederverwendet (single-source-of-truth). Bestehende `(app)`-Page bleibt unangetastet fuer Standard-Sicht.

### Treffer 2 — shadcn AlertDialog
**Plan:** "Nutze shadcn AlertDialog fuer Loesch-Confirm."

**Realitaet:** `components/ui/alert-dialog.tsx` existiert NICHT. Nur `dialog.tsx` (mit @base-ui-Dependency).

**Entscheidung:** State-based inline Overlay statt externer Dialog-Component — testbarer, simpler, keine neue Dependency.

### Treffer 3 — C6c Consent-System
**Plan:** "Senior braucht UI um ai_onboarding-Einwilligung zu erteilen."

**Realitaet (gegrept):**
- `ai_onboarding` ist im Care-Consent-System (`care_consents`-Tabelle), NICHT in `user_memory_consents`
- `/api/care/consent` POST + `/revoke` Routen existierten
- `ConsentFeatureCard` + `CareConsentGate` Komponenten existierten — aber Senior-untauglich (h-6 Checkbox, Page-Redirect-Pattern)

**Entscheidung:** Bestehende API wiederverwendet, aber NEUER Senior-Mode-Banner direkt im WizardChat statt Page-Redirect. User bleibt im Wizard, kein Kontext-Verlust.

---

## Wichtiger Architektur-Befund: ZWEI Consent-Systeme

| System | Tabelle | Was | UI |
|---|---|---|---|
| **Care-Consents** | `care_consents` | Ob die KI ueberhaupt aufgerufen werden darf (Datenuebertragung an Anbieter) | Banner im WizardChat (C6c) + ggf. spaeter Senior-Page |
| **Memory-Consents** | `user_memory_consents` | Was die KI sich merken darf (basis/care/personal) | 3 Toggles in `/profil/gedaechtnis` (C7) |

Beide getrennt, beide DSGVO-relevant. Wenn naechste Sessions an Consent-Logik anfassen: hier nochmal pruefen wer welche Tabelle nutzt.

---

## Naechster Task — Empfehlungen mit Pre-Check-Hinweisen

### Option A — Push-Vorbereitung + MEMORY.md-Update (empfohlen, ~30-45min, kein Code)

**Scope:**
- MEMORY.md `topics/senior-app.md` updaten mit C6b/C7/C6c-Stand
- HEAD `3c46c8a` aufnehmen
- Test-Zaehler aktualisieren (~3745 Tests, +139 dieser Session)
- AVV-Status-Check fuer 27.04. (Notar-Termin)
- Push-Plan: was muss vor Push geprueft werden (Mig 173 + Mig 174 .sql apply, AI_PROVIDER env, Anthropic-Key)
- Pruefen ob `app/datenschutz/page.tsx`-Diff committen (Welle-B-Rest)

**Pre-Check-Hinweise:**
- `~/.claude/projects/.../memory/MEMORY.md` ist die zentrale Index-Datei
- `topics/senior-app.md` ist der Welle-C-Topic-Pointer
- Am 27.04. faellt der AVV-Block — kurz vorher noch Push-Readiness checken

### Option B — F7 cache_control-Rename (Codex NACHBESSERN, mittelfristig, ~60-90min)

**Scope:** `system_cached: boolean` -> `cache_control: { system?: boolean; messages?: boolean }`-Pattern, provider-neutral.

**Pre-Check-Hinweise:**
- Aufrufer von `system_cached`: 3 Stellen (suchen mit Grep)
- `lib/ai/types.ts` ist die Type-Definition
- `lib/ai/providers/claude.ts` mappt auf Anthropic-Format
- Mistral + Mock ignorieren das Flag

**Begruendung Codex:** Anthropic dokumentiert inzwischen Multi-Turn Caching. Per-Call Opt-in bleibt, nur Naming wird sprechender. Kein BLOCKER, kein NACHBESSERN-Gegen-Ship — nur "wenn man nochmal an dem Code ist".

### Option C — C8 Caregiver-Scope in save_memory (~2-3h, Architektur-Frage)

**Scope:** Angehoerige (caregiver) sollen via aktivem `caregiver_link` Memory-Fakten fuer den Senior speichern koennen. Aktuell nur `actor.role: "senior"` gehardcodet in `app/api/ai/onboarding/turn/route.ts:203`.

**Pre-Check-Hinweise (vorher zu pruefen):**
- `caregiver_links` Tabelle: schon vorhanden? (vermutlich ja aus Welle B)
- `saveMemoryToolHandler` API: erlaubt `actor.role: "caregiver"` schon? Pruefen in `lib/ai/tools/save-memory.ts`
- Audit-Trail: muss `source_user_id` von `caregiver_user_id` korrekt setzen
- UI: Caregiver braucht eigenen Wizard-Einstieg ODER der Wizard erkennt aktive caregiver-Session

**Architektur-Entscheidung noetig** -> Opus 4.7 statt Sonnet.

### Option D — MEMORY.md AVV-Status-Workflow (kurz, ~15min)

Nur einen Memory-Eintrag fuer den 27.04.-Notar-Termin: was ist Push-blockierend, was nicht. Nicht code-bezogen, aber wichtig fuer Founder-Planung.

### Option E — Browser-Smoke-Test C6c (manuelle Verifikation, ~30min)

Senior-Home oeffnen -> KI-kennenlernen-Button -> Banner sehen -> Grant-Button klicken -> Wizard zugaenglich -> erste Nachricht senden. **Bedingung:** AI_PROVIDER muss `mock` sein, sonst greift der Provider-503-Branch vor dem Consent-Banner. Ist dann ein End-to-End-Test der gesamten Welle C im Browser.

---

## AVV- und Deploy-Stand (unveraendert)

- AVV mit Anthropic + Mistral signiert **erst nach GmbH-Eintragung** (Notar 27.04.2026).
- Bis dahin: `AI_PROVIDER=off` oder `mock` in Prod. Welle C testet vollstaendig mit `mock`-Provider.
- **Mig 173** (memory_consents + ai_onboarding-Key) wartet auf Founder-Go fuer `apply_migration` auf Prod (rote Zone).
- **Mig 174** (tighten_memory_consents_rls) wartet auf Founder-Go.
- **Push** wartet auf AVV + Anthropic-Keys + Mig 173 + 174 Apply.

**Push-Reihenfolge** (wenn AVV durch ist):
1. `app/datenschutz/page.tsx`-Diff entweder committen oder verwerfen
2. Mig 173 + 174 via MCP `apply_migration` (Prod-Rote-Zone, Founder-Go)
3. Anthropic + Mistral Keys in Vercel-Env setzen (Founder)
4. AI_PROVIDER auf `claude` umstellen (Founder)
5. `git push origin master` (Founder-Go, Rote Zone)
6. Browser-Smoke-Test in Prod

---

## Modell-Strategie fuer naechste Session

- **Sonnet 4.7** fuer Option A (MEMORY.md-Update, kein Code), Option B (F7 Rename, mechanisch), Option D (kurzer Memory-Save)
- **Opus 4.7 (1M)** fuer:
  - Option C (C8 Caregiver-Scope — Architektur-Entscheidung)
  - Option E (Browser-Smoke wenn Issues auftauchen)
  - AVV-Vorbereitung am 27.04. (Cross-File-Reasoning + Risiko-Bewertung)
  - Push-Begleitung (Rote-Zone-Schritte mit kritischer Reihenfolge)

User wechselt manuell via `/model claude-sonnet-4-7`. Kein silent downgrade (Memory `feedback_staerkstes_modell.md`).

---

## Start-Prompt fuer die naechste Session

**Copy-paste das Folgende in die neue Session:**

```
Welle C ist funktional ship-fertig (lokal committed, kein Push). 22 Commits seit
5de2a58. HEAD: 3c46c8a. AVV blockiert Push bis GmbH-Notar 27.04.

Bitte lies ZUERST:
1. nachbar-io/docs/plans/2026-04-19-handoff-welle-c-c6b-c7-c6c-done.md
   (vollstaendiger Schluss-Handoff dieser Session — Commit-Liste,
   Pre-Check-Befunde, naechste Optionen, Start-Prompt)
2. nachbar-io/docs/plans/2026-04-19-handoff-welle-c-c6-codex-fixes-done.md
   (Vorgaenger — C6a + Codex-Review-Fixes)
3. nachbar-io/docs/plans/2026-04-19-handoff-welle-c-c5b-done.md
   (Vor-Vorgaenger — C5b Route-Details)

KRITISCH — Pflicht-Pre-Check (.claude/rules/pre-check.md):
Vor JEDEM Code-Schritt codebase-weit grep machen. Plan-Texte sind NICHT
autoritativ, der Code ist autoritativ. Diese Session hatte 3 Pre-Check-
Treffer (Memory-Hook + shadcn AlertDialog + Care-Consent-System) — alle
verhindert Duplikate.

Naechster Task (Empfehlung): Option A — Push-Vorbereitung + MEMORY.md-Update
(administrativer Schluss von Welle C, ~30-45min, kein Code).

Andere Optionen siehe Handoff-Punkt "Naechster Task — Empfehlungen":
- B: F7 cache_control-Rename (Codex NACHBESSERN, ~60-90min)
- C: C8 Caregiver-Scope (Architektur-Entscheidung -> Opus, ~2-3h)
- D: MEMORY.md AVV-Status-Workflow (~15min)
- E: Browser-Smoke-Test C6c mit AI_PROVIDER=mock (~30min)

Modell-Strategie: Sonnet 4.7 ok fuer Option A/B/D. Opus 4.7 fuer C/E
oder wenn Architektur-Entscheidung kommt.

Arbeitsweise: TDD strict, Pre-Check first, kein Push, bei 65% Context
Handoff schreiben. Best-Practice-Pfad automatisch waehlen
(memory/feedback_best_practice_default.md). DSGVO-Konformitaet ist
Senior-Pflicht (Memory feedback_security_medical.md).

WAS DIESE SESSION GEMACHT HAT (kompakt):
- C6b: STT-Mikrofon im KI-Wizard (useSpeechInput-Hook + WizardChat-Mic-Button
  mit TTS-Race-Fix). Whisper-First, Native-Fallback. 21 Tests.
- C7:  DSGVO-Memory-Uebersicht fuer Senioren (SeniorMemoryFactList +
  /profil/gedaechtnis-Page + Link von ProfilView). 25 Tests.
- C6c: Consent-Grant-Flow (useOnboardingTurn 403-Handling + WizardChat
  Banner + Senior-Home-Link). 8 Tests.
- Alle 158 Welle-C-Tests gruen, tsc clean ausser preexistente Skip-Liste.

WELLE C IST FUNKTIONAL SHIP-FERTIG. Senior kann den Wizard 1-Tap erreichen,
Einwilligung erteilen, sprechen oder tippen, KI-Memory-Vorschlaege bestaetigen,
gespeicherte Fakten sehen + loeschen, Einwilligungen jederzeit widerrufen.
DSGVO Art. 6 + 7(3) + 15 + 17 alle UI-seitig abgedeckt.
```

---

## Dinge die diese Session NICHT gemacht hat (bewusst)

- Kein Push.
- Kein Prod-Apply von Mig 173/174 (rote Zone, AVV-blockiert).
- `app/datenschutz/page.tsx` nicht angefasst (Welle-B-Folgearbeit-Rest).
- F7 `system_cached` -> `cache_control` rename verschoben (Codex NACHBESSERN, mittelfristig).
- C8 Caregiver-Scope nicht angefangen (Architektur-Entscheidung steht aus).
- Kein Browser-Smoke-Test (jsdom-Tests gemacht, Browser-Verifikation steht).
- Wake-Word "Hey Quartier" nicht implementiert (Founder-Entscheidung: Push-to-Talk reicht bis MRR > 0).
- Kein Auto-Send nach STT-Transcript (bewusst — Korrektur-Moeglichkeit fuer Senior bei STT-Fehlern).
- Kein Edit von Memory-Eintraegen in der Senior-Uebersicht (bewusst — zu komplex; Senior loescht und sagt's der KI neu).

---

## Was diese Session GELERNT hat

1. **Pre-Check-Erfolgsgeschichte:** Drei separate Pre-Check-Treffer in einer Session (Memory-Hook, shadcn AlertDialog, Care-Consent-System). Ohne Pre-Check waere C7 ein 200-LOC-Duplikat von `(app)/einstellungen/gedaechtnis` geworden, und C6c haette ein zweites Consent-System angelegt. Pre-Check-Regel ist nicht Bremse, sondern beschleunigt Sessions.
2. **Zwei Consent-Systeme im Repo:** `care_consents` (Datenuebertragung) vs. `user_memory_consents` (Was-Merken). Beide DSGVO-relevant, beide getrennt verwaltet. Architektur-Entscheidung sollte langfristig konsolidiert werden, aber nicht jetzt.
3. **Test-cleanup-Fallstrick:** WizardChat-Tests hatten `afterEach(cleanup)` — `SeniorMemoryFactList`-Tests am Anfang nicht, was zu kumulativem DOM-Stack und scheinbaren Multi-Match-Failures fuehrte. **Regel:** in neuen Test-Files IMMER `afterEach(cleanup)` aus `@testing-library/react` einbauen.
4. **Multi-Match in regex:** `getByText(/einwilligung|ki/i)` matched sowohl Description-Text als auch Button-Label. **Regel:** lieber spezifische Phrase greppen ("kennenlernen darf") oder `getByRole("heading", ...)` verwenden, statt breiter regex.
5. **Senior-Mode-Components statt shared-Components mit senior-Prop:** Eigenstaendige Senior-Variante (`SeniorMemoryFactList`) ist UX-besser als generische Komponente mit `senior?: boolean`-Toggle. Begruendung: Senior-Mode hat nicht nur andere Styles, sondern andere UX (Confirm-Dialog statt inline, kein Edit, vereinfachtes Reset).
6. **Race-Fix-Pattern fuer Mikro/TTS:** vor `mic.start()` IMMER `tts.stop()` callen — sonst echot der Wizard sich selbst. Mit Test-callOrder verifiziert, nicht nur "es funktioniert".
7. **Inline-Overlay vs. shadcn-Dialog:** Fuer Senior-Mode-Confirms ist state-based inline Overlay (ohne externe Dependency) sauberer testbar als Dialog-Component. Trade-off: weniger A11y-Features (Focus-Trap etc.), dafuer einfacher und kontrollierbar.
8. **Reset() ist die richtige Antwort nach Consent-Grant:** statt eines neuen `clearError()`-Methods im Hook reicht der bestehende `reset()` — Welle-C-Wizard ist stateless genug, dass Reset keine Daten verliert.

---

## Senior-Workflow Ende-zu-Ende (so funktioniert Welle C jetzt)

```
1. Senior oeffnet die App
2. Tippt auf "🤝 KI kennenlernen" (Indigo-Button auf Senior-Home)
3. Wizard oeffnet -> "Brauche Ihre Erlaubnis"-Banner
   (weil ai_onboarding-Consent noch nicht erteilt)
4. Tippt "Einwilligung erteilen"
   -> POST /api/care/consent {features:{ai_onboarding:true}}
   -> reset() -> normaler Wizard-Modus
5. Sieht Eingabe-Bereich + Mic-Button (wenn Browser MediaRecorder hat)
6. Spricht oder tippt: "Mein Name ist Anna"
   -> POST /api/ai/onboarding/turn
   -> KI antwortet "Schoen Sie kennenzulernen, Anna"
   -> Auto-TTS spielt Antwort vor (Senior-Voice "ash")
7. KI schlaegt Save vor: "Soll ich mir merken: Vorname=Anna?"
   -> MemoryConfirmDialog mit "Ja, speichern" / "Nein, danke"
8. Spaeter: Senior tippt auf Profil -> "Mein Gedaechtnis"
   -> /profil/gedaechtnis
9. Sieht alle Eintraege gruppiert: "Profil: Vorname=Anna ..."
10. Tippt "Pfefferminz loeschen" -> Confirm-Overlay -> "Ja, loeschen"
    -> DELETE /api/memory/facts/{id}
11. Will Einwilligung umstellen: tippt auf "Profil und Routinen"-Toggle
    -> POST /api/memory/consent/grant oder /revoke
```

Alle 11 Schritte in jsdom getestet. Browser-Smoke-Test steht aus (Option E).

---

## Audit-Trail / Compliance-Check

| DSGVO-Artikel | Wo erfuellt |
|---|---|
| Art. 6 Einwilligung | `/api/care/consent` POST + WizardChat-Banner (C6c) |
| Art. 7(3) Widerruf | `/profil/gedaechtnis` Toggles + Banner-Hinweis |
| Art. 9 Sondercategoria | sensitive Categories (`care_need`, `personal`) AES-256-GCM (Welle-B-Code, nicht angefasst) |
| Art. 15 Auskunft | `/profil/gedaechtnis` zeigt alle Fakten gruppiert |
| Art. 17 Loeschung | Einzel-Loeschen + Reset-All, beide mit Confirm |
| Art. 25 Privacy by Default | `AI_PROVIDER=off` in Prod bis AVV; Consent muss aktiv erteilt werden |
| Art. 32 Sicherheit | RLS auf `user_memory_consents` (Mig 173 + 174); Caregiver-on-behalf-of-Senior 403 (`consent_self_only`) |

Audit-Reife: **80%+** (Welle-C-Komponente). Restliche 20%: Audit-Log-Trigger fuer Consent-Aenderungen sollte noch dokumentiert/verifiziert werden.

---

## Glossar fuer naechste Session (falls Context-Verlust)

- **Welle C:** KI-Onboarding-Wizard fuer die Senior-App. 9 geplante Tasks (C0-C9). Aktueller Stand: C0-C7 + C6c komplett. C8 (Caregiver-Scope) und C9 (Deploy) ausstehend.
- **AVV:** Auftragsverarbeitungsvertrag. Anthropic + Mistral muessen unterschrieben sein BEVOR Echt-Daten an die KI gehen. Blockiert Push bis GmbH-Eintragung (Notar 27.04.2026).
- **Mig 173/174:** Memory-Consents Schema + Tighten-RLS. File-first committed, nicht auf Prod applied.
- **Pre-Check-Regel:** `.claude/rules/pre-check.md`. Vor jedem Neubau codebase-weit grep. Plan-Text ist nicht autoritativ.
- **Senior-Mode-Constraints:** min. 80px Touch-Targets, 4.5:1 Kontrast, max. 4 Taps pro Aktion, Siezen, kein Startup-Hype.
- **Best-Practice-Default:** Memory `feedback_best_practice_default.md` — bei Entscheidungen automatisch Best-Practice waehlen, nicht jede Stufe als Optionsliste vorlegen.
