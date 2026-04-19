# Handoff — Welle C C6a + Codex-Review-Fixes komplett (lokal)

**Datum:** 2026-04-19 (sehr spaet abend)
**Von:** Claude Opus 4.7 (1M) — Welle-C-C6a + Codex-Review-Integrations-Session
**An:** Naechste Session / Thomas
**Modell-Empfehlung naechste Session:** Sonnet 4.7 fuer C6b STT (routine TDD), Opus zurueck wenn Architektur-Entscheidungen anstehen.
**Kontext-Stand bei Schreibweise:** Sauberer Schluss-Punkt — alle 3 Codex-Fix-Commits (A/B/C) drin, tsc clean, Tests gruen.

---

## TL;DR

- **C6a (Wizard-UI) + komplette Codex-Review-Integration fertig und lokal committed.** 11 Commits seit `5de2a58`, kein Push.
- **Codex-Review-Befunde:** 3 BLOCKER ✅ · 5 NACHBESSERN ✅ · 4 ZUSATZ-FUNDE ✅ · 3 OK · 1 vertagt (F7).
- **Test-Stand:** 183/183 gruen in C6 + adjacent (17 Files), tsc clean (8 preexistente Skip-Liste-Errors unveraendert), keine npm-Dependencies neu.
- **Kein Push.** AVV blockiert (Notar-Termin GmbH 27.04.).
- **Naechster Task:** C6b STT-Mikrofon-Button im WizardChat (s. unten), oder Alternativen.

---

## Lokaler Commit-Stand

**nachbar-io HEAD: `680e285`** (13 lokale Commits seit `5de2a58`, kein Push):

| SHA | Welle | Beschreibung |
|---|---|---|
| `26e3da4` | C2 | feat(ai): provider abstraction Claude/Mistral/mock |
| `477f344` | C1 | feat(db): mig 173 memory-consents + ai_onboarding consent key |
| `cd300dc` | C2-Review | refactor(ai): OffProvider throws AIProviderError + doc polish |
| `133bdcf` | C3 | feat(ai): system-prompt wissensdokument senior-app DE + CH |
| `196aa8a` | C4 | feat(ai): save_memory tool adapter |
| `71f8c56` | C5a | feat(ai): prompt-caching flag system_cached for Claude |
| `ddf50d0` | C5b | feat(ai): onboarding-turn route |
| `bb86ff7` | C6a | feat(senior): KI-onboarding-wizard UI (Hooks + Komponenten + Page) |
| `8720268` | docs | codex review request — Welle C C3-C6a (Frage-Markdown) |
| `18284f5` | docs | self-contained codex review (mit inline Code-Anhaengen) |
| **`1fc344a`** | **Codex-Fix A** | **BLOCKER F6.1 (consent) + Senior 80px + ZUSATZ B/C/D** |
| **`3fbe3b3`** | **Codex-Fix B** | **BLOCKER F6.2 (Mig 174 RLS) + F6.3 (Mig 173 down defensive)** |
| **`680e285`** | **Codex-Fix C** | **NACHBESSERN F2 (Provenance + Page-Rename) + F4 (AbortController)** |

Parent-Repo (Handy APP) unveraendert seit `8bb5a74`.

---

## Codex-Review-Status (vollstaendig)

| Frage | Befund | Status | Wo gefixt |
|---|---|---|---|
| F1 | Tool-Loop-Semantik OK fuer C5b/C6 | OK | — |
| F2 | Provenance-Mangel /api/memory/facts | NACHBESSERN ✅ | `680e285` (Hook + Route source-Whitelist) |
| F2 | Page-Name `ki-wizard` ist Technik-Name | NACHBESSERN ✅ | `680e285` (rename `kennenlernen`) |
| F3 | STT-Defer akzeptabel | OK | — |
| F4 | Auto-Play-TTS Race | NACHBESSERN ✅ | `680e285` (AbortController) |
| F5 | Mock-Strategie state.current OK | OK | — |
| F6.1 | ai_onboarding-Consent nicht erzwungen | BLOCKER ✅ | `1fc344a` (route checkCareConsent) |
| F6.2 | RLS user_memory_consents zu weit | BLOCKER ✅ | `3fbe3b3` (Mig 174 + API 403) |
| F6.3 | Mig 173 .down nicht defensiv | NACHBESSERN ✅ | `3fbe3b3` (DO-Block precheck) |
| F7 | system_cached zu eng benannt | NACHBESSERN | **vertagt** (mittelfristig, eigene Welle) |
| ZUSATZ-A | WizardChat 60px statt 80px | BLOCKER (Senior-Mode!) ✅ | `1fc344a` |
| ZUSATZ-B | Tool-only -> leere Bubbles | NACHBESSERN ✅ | `1fc344a` (skip empty assistant_text) |
| ZUSATZ-C | useTtsPlayback verlor Supabase-Fallback | NACHBESSERN ✅ | `1fc344a` (Lazy-Sync useEffect) |
| ZUSATZ-D | confirmMemory category+key Mehrdeutigkeit | NACHBESSERN ✅ | `1fc344a` (reference-equality) |

---

## Was diese Session gebaut hat

### Phase 1 — C6a Wizard-UI (Commit `bb86ff7`)
- **Neu:** `modules/voice/hooks/useTtsPlayback.ts`, `modules/voice/hooks/useOnboardingTurn.ts`, `modules/voice/components/onboarding/MemoryConfirmDialog.tsx`, `modules/voice/components/onboarding/WizardChat.tsx`, `app/(senior)/ki-wizard/page.tsx` (spaeter zu `kennenlernen/` umbenannt)
- **Tests:** 37 neue (10 useTtsPlayback + 13 useOnboardingTurn + 5 MemoryConfirmDialog + 9 WizardChat)
- **Pre-Check fand 3 Plan-vs-Code-Konflikte:** kein useTtsPlayback in Welle B, keine /api/memory/confirm noetig, Naming-Kollision mit modules/onboarding/

### Phase 2 — Codex-Review-Datei (Commits `8720268` + `18284f5`)
- 7 Architektur-Fragen + Output-Schema BLOCKER/NACHBESSERN/OK
- Self-contained Variante mit allen Code-Files inline (fuer sandboxed Codex)

### Phase 3 — Codex-Fix A (Commit `1fc344a`)
- F6.1 Consent-Check in `app/api/ai/onboarding/turn/route.ts` (vor `loadMemoryContext` + `getProvider`, 403 `consent_required`)
- Senior-Mode 80px Touch in WizardChat (Input + Senden-Button)
- ZUSATZ-B: skip empty/whitespace assistant_text in useOnboardingTurn
- ZUSATZ-D: confirmMemory + dismissConfirmation auf reference-equality
- ZUSATZ-C: Lazy-Sync der voice_preferences in useTtsPlayback
- Type-Update: `CONSENT_FEATURES` um `'ai_onboarding'` erweitert + 5 Folge-Records (LABELS, DESCRIPTIONS, ROUTES, FEATURE_DATA_TABLES, FEATURE_ICONS)

### Phase 4 — Codex-Fix B (Commit `3fbe3b3`)
- Mig 174 `tighten_memory_consents_rls` (file-first, kein Prod-Apply)
  - `caregiver_consents` Policy von FOR ALL auf FOR SELECT only
  - Caregiver darf Consent-Status sehen, aber nicht aendern
- API-Routen `/api/memory/consent/grant` + `/revoke` lehnen caregiver-on-behalf-of-senior mit 403 `consent_self_only` ab
- Mig 173 `.down.sql` defensiver: DO-Block prueft `ai_onboarding`-Rows vorab und bricht mit klarer 3-Optionen-Fehlermeldung ab (statt CHECK-Violation-Crash)

### Phase 5 — Codex-Fix C (Commit `680e285`)
- NACHBESSERN F2 — Provenance: `useOnboardingTurn.confirmMemory` schickt `source: "ai_learned"`. Route `/api/memory/facts` akzeptiert via Whitelist.
- NACHBESSERN F4 — AbortController in `useTtsPlayback`: pro `play()` neuer Controller, `stopInternal()` ruft `abort()`. AbortError im catch geschluckt.
- NACHBESSERN F2 — Page-Rename `app/(senior)/ki-wizard/` -> `app/(senior)/kennenlernen/` (Zweck- statt Technik-Name).

---

## Test-Stand

```
Ausgefuehrt (Voll-Suite-Smoke):
  npx vitest run __tests__/hooks/useTtsPlayback.test.ts \
                 __tests__/hooks/useOnboardingTurn.test.ts \
                 __tests__/components/onboarding/ \
                 app/api/ai/ \
                 lib/ai/ \
                 __tests__/modules/memory/

Ergebnis: 183 / 183 gruen (17 Files)
```

Detail:
- `useTtsPlayback`: 12 Tests (inkl. AbortController + Lazy-Sync)
- `useOnboardingTurn`: 17 Tests (inkl. Provenance + reference-equality + empty-skip)
- `MemoryConfirmDialog`: 5 Tests
- `WizardChat`: 10 Tests (inkl. 80px Senior-Touch)
- `app/api/ai/onboarding/turn`: 24 Tests (inkl. 3 Consent-Check Tests)
- `lib/ai/*`: 84 Tests (provider, system-prompts, save-memory)
- `__tests__/modules/memory/*`: 33 Tests

`npx tsc --noEmit`: clean ausser **8 preexistente Skip-Liste-Errors** (unveraendert):
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
?? docs/plans/2026-04-19-handoff-welle-c-c6-codex-fixes-done.md  (DIESES File)
?? supabase/migrations/067_doctor_registration_BACKUP_DB.sql

Parent-Repo (Handy APP):
 M CLAUDE.local.md
```

---

## Naechster Task — Empfehlungen mit Pre-Check-Befund

### Option A — C6b: STT-Mikrofon-Button im WizardChat (empfohlen, wenn Welle C atomar ship-fertig sein soll)

**Scope:** Mikrofon-Button neben dem Text-Input. Druecken -> Aufnahme; Loslassen -> STT -> Text -> Senden.

**Pre-Check-Befund (am Ende der C6a-Session erhoben, weiterhin gueltig):**

| Thema | Gefunden in | Empfehlung |
|---|---|---|
| Speech-Engine | [`modules/voice/engines/create-speech-engine.ts`](../../modules/voice/engines/create-speech-engine.ts) + native + whisper + silence-detector | **Wiederverwenden**, `createSpeechEngine()` direkt importieren wie in `useCompanionChat.ts:359 LOC` |
| Companion-Chat-Hook (Referenz) | `modules/voice/components/companion/hooks/useCompanionChat.ts` | **Pattern kopieren**, NICHT direkt wiederverwenden — anderes Protocol (SSE vs JSON), anderer Scope |
| Test-Pattern STT in jsdom | n/a | jsdom kann Web-Speech-API nicht — STT-Logik hinter Hook abstrahieren, Hook mocken in WizardChat-Tests |

**Wichtig:** Race mit `useTtsPlayback` muss adressiert werden — Mikro hoert sich selbst zu wenn TTS noch lauft. Loesung: vor Mikro-Start `tts.stop()` callen.

**Reihenfolge (TDD strict):**
1. Neuen Hook `useSpeechInput()` (oder direkt in WizardChat-Komponente) — RED-Test: Mock `createSpeechEngine`, simulate `onTranscript("Hallo")`, expect `setInput("Hallo")`
2. UI: Mic-Button neben Senden-Button, mit Listening-State (visuelles Feedback). RED-Test: Click triggert engine.start()
3. Race-Fix: vor `engine.start()` automatisch `tts.stop()`. RED-Test: ueberlappend
4. Tippen-Fallback bleibt sichtbar (kein Mode-Switch noetig)

### Option B — C7: Senior-Memory-Uebersicht (`/profil/memory`)

**Scope:** Liste aller gespeicherten Fakten, Loeschen pro Eintrag, Bulk-Reset pro Kategorie.

**Pre-Check-Befund (oberflaechlich):**
- `useMemoryFacts` Hook existiert in `modules/memory/hooks/useMemoryFacts.ts` — **wiederverwenden**, hat `facts`, `consents`, `deleteFact`, `updateFact`, `resetFacts`, `reload`
- `app/api/memory/facts`, `/facts/[id]`, `/facts/reset` existieren — Backend ist fertig
- Senior-Page muss neu — vermutlich unter `app/(senior)/profil/memory/page.tsx`
- shadcn `Dialog` fuer Loesch-Confirm wiederverwenden (wie in MemoryConfirmDialog gemacht)

### Option C — F7 cache_control rename (Codex NACHBESSERN, mittelfristig)

**Scope:** `system_cached: boolean` -> `cache_control: { system?: boolean; messages?: boolean }`-Pattern, provider-neutral.

Codex-Begruendung: Anthropic dokumentiert inzwischen auch top-level Multi-Turn Caching. Per-Call Opt-in bleibt, nur Naming wird sprechender.

Aufwand: ~150 LOC delta in `lib/ai/types.ts` + `claude.ts` + alle Aufrufer (3 Stellen) + Tests. Kein BLOCKER, kein NACHBESSERN-Gegen-Ship — nur "wenn man nochmal an dem Code ist".

### Option D — Push-Vorbereitung + MEMORY.md-Update (defensiver Schluss)

**Scope:** 
- MEMORY.md `topics/senior-app.md` updaten mit C6a + Codex-Fixes-Stand
- AVV-Status checken (Notar 27.04. naht!)
- Push-Plan: was muss vor Push geprueft werden (Mig 174 .sql apply, Env-Vars, etc.)

---

## Pflicht-Pre-Check fuer naechste Session

Vor JEDEM neuen Code-Schritt: Grep/Glob laufen lassen. Dieses Session hat folgende Befunde gemacht, die naechste Session sollte sie verifizieren statt blind zu glauben:

| Komponente | Status laut C6a | Verifizieren bei naechstem Anfassen |
|---|---|---|
| `useVoicePreferences` | existiert, syncht localStorage beim Mount | greppen ob er in der Senior-Page gemounted ist; sonst greift Lazy-Sync |
| `createSpeechEngine` | Factory in `modules/voice/engines/` | grep aktuelle Aufrufer, Pattern uebernehmen |
| `useCompanionChat` | 359 LOC, SSE-basiert, fuer Companion (NICHT Onboarding) | nicht direkt importieren, Pattern kopieren |
| `app/api/memory/facts` | nimmt jetzt optional `source: "ai_learned"` | wenn neuer Pfad: nicht ueberschreiben |
| `caregiver_links` | Tabelle fuer Pflege-Beziehung | greppen wo schon abgefragt wird |

---

## Offene Design-Fragen

1. **Wann mounten wir die Wizard-Page?** Aktuell `app/(senior)/kennenlernen/page.tsx` direkt erreichbar, aber kein Link von `app/(senior)/page.tsx`. Frage: einmaliger Welcome-Trigger nach Pairing? Permanenter Link in der Home-Toolbar? -> Founder-Entscheidung.
2. **Consent-Grant-Flow vor erstem Wizard-Aufruf:** Aktuell wirft Route 403 wenn Consent fehlt. Aber wo grantet der User den Consent? Es braucht eine Senior-Page oder einen Banner im Wizard, der den Consent-Grant anbietet ("Ja, ich erlaube den KI-Assistenten"). Danach erneuter Versuch.
3. **C8 Caregiver-Scope:** save_memory nutzt aktuell nur `actor.role: "senior"`. Caregiver-on-behalf-of-Senior-Speichern (via aktivem caregiver_link) ist im Original-Plan als C8 definiert. Brauchen wir das fuer Stufe 1, oder erst Stufe 2?
4. **Confirm-Dialog Position:** Wenn `pendingConfirmations` mehrere hat, zeigen wir nur `[0]`. Soll der User alle nacheinander sehen, oder Liste mit "Alle akzeptieren / einzeln entscheiden"?

---

## AVV- und Deploy-Stand (unveraendert)

- AVV mit Anthropic + Mistral signiert **erst nach GmbH-Eintragung** (Notar 27.04.2026).
- Bis dahin: `AI_PROVIDER=off` oder `mock` in Prod. C6a + Fixes testen vollstaendig mit `mock`-Provider.
- Mig 174 wartet auf Founder-Go fuer `apply_migration` auf Prod (rote Zone).
- Push wartet auf AVV + Anthropic-Keys + Mig 173 + 174 Apply.

---

## Modell-Strategie fuer naechste Session

- **Sonnet 4.7** fuer C6b STT (routine TDD, Hook-Extraction, RED-GREEN-Cycles)
- **Sonnet 4.7** fuer C7 Memory-Uebersicht (UI-Komponenten, hookgetrieben)
- **Opus 4.7 (1M)** wenn:
  - neue Architektur-Entscheidung (z.B. C8 Caregiver-Scope)
  - Codex-Review-Integration
  - Cross-File-Reasoning (z.B. RLS + API + Type-System gleichzeitig)
  - Pre-Check meldet komplexe Plan-Code-Konflikte

Entscheidung: User wechselt manuell via `/model claude-sonnet-4-7`. Kein silent downgrade (Memory `feedback_staerkstes_modell.md`).

---

## Start-Prompt fuer die naechste Session

```
Ich moechte mit Welle C weitermachen. Stand: C6a + komplette
Codex-Review-Integration fertig und lokal committed. 13 Commits seit
5de2a58, kein Push.

Bitte lies ZUERST:
1. nachbar-io/docs/plans/2026-04-19-handoff-welle-c-c6-codex-fixes-done.md
   (dieser Handoff — Commit-Liste, Codex-Befunde, naechste Optionen)
2. nachbar-io/docs/plans/2026-04-19-handoff-welle-c-c5b-done.md
   (Vorgaenger — C5b Route-Details)
3. nachbar-io/docs/plans/2026-04-19-codex-review-welle-c-c3-c6a.md
   (Codex-Review-Anfrage mit Architekturfragen)

KRITISCH — Pflicht-Pre-Check (.claude/rules/pre-check.md):
Vor JEDEM Code-Schritt codebase-weit grep machen. Plan-Texte sind NICHT
autoritativ, der Code ist autoritativ.

Naechster Task (Empfehlung): C6b — STT-Mikrofon im WizardChat.
Wiederverwenden: createSpeechEngine aus modules/voice/engines/.
NICHT wiederverwenden: useCompanionChat (anderes Protocol).
Race-Fix: vor mic.start() automatisch tts.stop().

Modell-Strategie: Sonnet 4.7 fuer C6b ok (routine TDD). Wenn
Architektur-Entscheidung kommt -> auf Opus 4.7 wechseln.

Arbeitsweise: TDD strict, Pre-Check first, kein Push, bei 65% Context
Handoff schreiben. Best-Practice-Pfad automatisch waehlen
(feedback_best_practice_default.md).

Alternativen wenn nicht C6b:
- C7 Senior-Memory-Uebersicht /profil/memory (useMemoryFacts existiert)
- F7 cache_control rename (Codex NACHBESSERN, mittelfristig)
- Push-Vorbereitung + MEMORY.md-Update + Founder-Go fuer Mig 174
```

---

## Dinge die diese Session NICHT gemacht hat (bewusst)

- Kein Push.
- Kein Prod-Apply von Mig 174 (rote Zone).
- `app/datenschutz/page.tsx` nicht angefasst (Welle-B-Folgearbeit-Rest).
- F7 `system_cached` -> `cache_control` rename verschoben.
- Kein STT.
- Keine Senior-Memory-Uebersicht-Page.
- Wizard-Page nicht in der Senior-Home verlinkt.
- Consent-Grant-UI fuer ai_onboarding nicht gebaut (User wuerde aktuell vor leerem Wizard mit Banner "Bitte Einwilligung erteilen" stehen).

---

## Was diese Session GELERNT hat

1. **Codex-Workspace-Sandbox-Problem:** Codex sah das Repo nicht via cwd. Loesung: User kann `cd nachbar-io && codex` machen, oder ich liefere self-contained Markdown mit Code inline. Beide Wege jetzt dokumentiert.
2. **Pre-Check verhindert Plan-Folgesitten:** Codex-Review hat 3 BLOCKER, 5 NACHBESSERN, 4 ZUSATZ-Befunde gefunden — alle waren legitim. Ohne Codex-Review waeren wir naiv mit C6a in C6b weitergegangen und haetten DSGVO-Luecke + RLS-Loch + Provenance-Verlust gestapelt.
3. **CONSENT_FEATURES-Tuple-Erweiterung kaskadiert:** ein neuer Key in einem `as const`-Tuple bricht alle `Record<CareConsentFeature, ...>`-Maps. Faustregel: bei jedem neuen Feature-Key direkt im selben Commit alle 5 Folge-Records mitziehen, sonst tsc-Crash.
4. **Mock-Strategie state.current ist OK:** Codex hat das Pattern fuer Hook-Mocks in WizardChat.test.tsx als idiomatisch eingestuft. Beibehalten fuer C6b/C7.
5. **AbortController-Pattern fuer fetch+playback:** Standardrezept fuer ueberlappende async-UI-Calls — pro `play()` neuer Controller, im stop alten abort. Test mit setInterval-Polling auf signal.aborted statt Real-AbortError.
