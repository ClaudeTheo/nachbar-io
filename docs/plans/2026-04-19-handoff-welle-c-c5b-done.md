# Handoff — Welle C Task C5b LIVE-ready (lokal)

**Datum:** 2026-04-19 (spät abend)
**Von:** Claude Opus 4.7 (1M) — Welle-C-Fortsetzungssession C5b
**An:** Nächste Session / Thomas
**Kontext-Stand bei Schreibweise:** ~65 % — saubere Zäsur nach einem Commit, bevor C6 begonnen wird.

---

## TL;DR

- **C5b fertig und lokal committed.** POST-Route `/api/ai/onboarding/turn` läuft als Adapter über die Welle-C-Infrastruktur (C2 Provider, C3 Wissensdokument, C4 save_memory, C5a system_cached).
- **28 neue Tests, alle grün** (21 Route + 7 Loader). Summe lib/ai + app/api/ai: **102/102**. tsc clean für Welle-C-Dateien (preexistente Skip-Liste-Errors unverändert).
- **Kein Push.** 7 lokale Commits in nachbar-io seit `24d34b7`.
- **Pre-Check funktionierte:** Vor Route-Neubau codebase-weit geprüft: `app/api/ai/` existierte nicht, aber `app/api/companion/chat` + `app/api/kiosk/companion` + `modules/voice/services/companion-chat.service.ts` nutzen bereits `loadMemoryContext` + `buildMemoryTool` mit direktem Anthropic-SDK. C5b baut bewusst darauf NICHT auf, weil Zweck (Onboarding-Wizard, nicht Quartier-Lotse), Provider-Abstraktion (C2-neu statt direkt Anthropic) und System-Prompt (Wissensdokument statt Quartier-Kontext) anders sind. Entscheidung dokumentiert, kein Duplikat.
- **Offen:** C6 (Wizard-UI mit Speech + `VoiceChatSession`-Hook), C7 (Senior-Memory-Übersicht), C8 (Angehörigen-Edit + Caregiver-Scope in save_memory), C9 (Deploy — rote Zone, wartet auf AVV + GmbH).

---

## Lokaler Commit-Stand

**nachbar-io HEAD: `ddf50d0`** (7 lokale Commits seit `24d34b7`, kein Push):

| SHA | Task | Beschreibung |
|---|---|---|
| `26e3da4` | C2 | feat(ai): provider abstraction for Claude / Mistral / mock |
| `477f344` | C1 | feat(db): mig 173 memory-consents + ai_onboarding consent key |
| `cd300dc` | C2-Review | refactor(ai): review fixes — OffProvider throws AIProviderError |
| `133bdcf` | C3 | feat(ai): system-prompt wissensdokument senior-app DE + CH |
| `196aa8a` | C4 | feat(ai): save_memory tool adapter |
| `71f8c56` | C5a | feat(ai): prompt-caching flag system_cached for Claude |
| **`ddf50d0`** | **C5b** | **feat(ai): onboarding-turn route** |

Parent-Repo (Handy APP) unverändert seit `8bb5a74`.

---

## Was diese Session gebaut hat

### Neue Dateien

```
app/api/ai/onboarding/turn/route.ts                       (200 LOC produktiv)
app/api/ai/onboarding/turn/__tests__/route.test.ts        (470 LOC, 21 Tests)
lib/ai/system-prompts/loader.ts                           (28 LOC)
lib/ai/system-prompts/__tests__/loader.test.ts            (105 LOC, 7 Tests)
```

### Route-Verhalten

| Fall | Response |
|---|---|
| Keine Session | 401 `{ error: "Nicht authentifiziert", code: "UNAUTHORIZED" }` |
| Kaputter JSON-Body | 400 `{ error: "Ungueltiger Request-Body (JSON)" }` |
| `messages` nicht Array | 400 `{ error: "messages must be an array" }` |
| `userInput` fehlt/leer/whitespace | 400 `{ error: "userInput must be a non-empty string" }` |
| `AI_PROVIDER=off` / fehlender Key | 503 `{ error: "KI-Assistent ist deaktiviert (ai_disabled)" }` |
| Zu viele Tool-Calls (>3) | 500 `{ error: "Zu viele Tool-Calls ... Tool-Loop-Overflow" }` |
| Happy-Path | 200 `{ assistant_text, tool_results: SaveMemoryResult[], stop_reason }` |

### Request-Body

```ts
{
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userInput: string,  // non-empty, wird als letzte user-Message an Provider übergeben
}
```

Stateless: Client hält die History, Route appendet nur `userInput` an `messages`. Keine neue DB-Tabelle. Optionaler `step?: number` (für UI-Hinweise) wird aktuell ignoriert — kann bei Bedarf in C6 ohne Schema-Bruch hinzugefügt werden.

### Tool-Call-Verhalten (abweichend vom C4/C5a-Handoff)

**Keine Round-Trip-Schleife implementiert.** Begründung: Die C2-Provider-Abstraktion hat `AIMessage.content: string` (keine Content-Blocks). Ein echter Claude-Tool-Use-Roundtrip (assistant mit `tool_use`-Block → user mit `tool_result`-Block → assistant) lässt sich mit der aktuellen Abstraktion nicht sauber fahren. Würde die Welle-C-API verlassen oder Tool-Results als Fake-User-Text zurückfeeden (hacky).

Stattdessen:
- **Ein Provider-Call pro Turn.** Die KI emittiert Text + Tool-Calls in einer Response.
- **MAX_TOOLS_PER_TURN = 3.** Mehr Tool-Calls in einer Response → 500 "tool loop overflow". Das ist die Umsetzung der "loop overflow"-Semantik aus dem C4/C5a-Handoff, nur auf eine Turn-Grenze statt auf Round-Trips bezogen.
- **Tool-Namen gefiltert:** Nur `save_memory` geht in `saveMemoryToolHandler`. Andere Tool-Namen → synthetisches `{ ok: false, reason: "validation_error" }`, kein Handler-Call.
- **Actor-Scope hart verdrahtet:** `{ actor: { userId: user.id, role: "senior" }, targetUserId: user.id, supabase }` — Welle C Senior-only, matched C4-Erwartungen. Caregiver-Scope kommt in C8.

Wenn in späteren Wellen ein echter Multi-Turn-Tool-Loop nötig wird (z. B. für komplexe Dialoge mit mehrstufiger Abklärung), muss die Provider-Abstraktion erweitert werden: `AIMessage.content` wird `string | ContentBlock[]`, und jeder Provider übernimmt die Serialisierung in sein natives Format. Das ist eine saubere, aber größere Änderung — nicht C5b-Scope.

### Loader

`loadSeniorAppKnowledge()` liest `lib/ai/system-prompts/senior-app-knowledge.md` beim ersten Aufruf per `fs/promises.readFile(__dirname+..., "utf-8")` und cached das Ergebnis prozess-lokal. Fehler werden **nicht** gecached — der nächste Aufruf liest neu (wichtig für transiente IO-Fehler). `__resetSeniorAppKnowledgeCache()` ist nur für Tests exportiert.

Kombiniert mit `system_cached=true` aus C5a bedeutet das für Claude: das 4014-Wörter-Wissensdokument wird pro Prozess 1× von Disk gelesen UND pro 5-min-Window 1× tokenisiert.

---

## Test-Stand

| Datei | Tests | Status |
|---|---|---|
| `lib/ai/__tests__/provider.test.ts` | 36 | ✅ pre-existing |
| `lib/ai/system-prompts/__tests__/senior-app-knowledge.test.ts` | 13 | ✅ pre-existing |
| `lib/ai/tools/__tests__/save-memory.test.ts` | 25 | ✅ pre-existing |
| `lib/ai/system-prompts/__tests__/loader.test.ts` | **7** | ✅ **neu** |
| `app/api/ai/onboarding/turn/__tests__/route.test.ts` | **21** | ✅ **neu** |

**Gesamt: 102/102 grün.**

`npx tsc --noEmit`: **keine neuen Errors.** Die 8 preexistenten E2E-/Device-Fingerprint-Errors (Skip-Liste in `.claude/rules/testing.md`) unverändert:
- `__tests__/lib/security/device-fingerprint.test.ts:267`
- `__tests__/pages/quartier-info-vorlesen.test.tsx:170`
- `tests/e2e/cross-portal/x01-checkin-heartbeat.spec.ts:134-136`
- `tests/e2e/cross-portal/x19-postfach-thread.spec.ts:428-429`
- `tests/e2e/scenarios/s12-neighbor-request-chat.spec.ts:92`

Keine neuen npm-Dependencies.

---

## Uncommitted Reste (NICHT anfassen außer gezielt)

```
nachbar-io:
 M app/datenschutz/page.tsx                                    (Welle-B-Folgearbeit-Rest)
?? docs/plans/2026-04-18-handoff-live-test-blocked-voice-latency.md
?? docs/plans/2026-04-18-handoff-tts-layer1-cache.md
?? docs/plans/2026-04-19-handoff-welle-c-c0-c3-done.md
?? docs/plans/2026-04-19-handoff-welle-c-c4-c5a-done.md
?? docs/plans/2026-04-19-handoff-welle-c-c5b-done.md           (dieses File)
?? supabase/migrations/067_doctor_registration_BACKUP_DB.sql

Parent-Repo:
 M CLAUDE.local.md
```

---

## Pre-Check-Protokoll (C5b)

Pflicht-Grep vor Implementierung:

| Stichwort | Befund | Entscheidung |
|---|---|---|
| `app/api/ai/**` | existiert nicht | Verzeichnis neu anlegen — OK |
| `onboarding/turn` | nur in Handoff-Docs, keine Route | neu bauen — OK |
| `loadMemoryContext` Aufrufer | `modules/voice/services/companion-chat.service.ts`, `app/api/kiosk/companion/route.ts` | bestehende Services wiederverwenden, Routen nicht erweitern (anderer Zweck) |
| `buildMemoryTool` Aufrufer | `modules/voice/services/companion-chat.service.ts`, Tests | wiederverwenden aus `modules/memory/services/chat-integration.ts` |
| `saveMemoryToolHandler` Aufrufer | nur C4-Datei + C4-Tests | erster echter Konsument — Route ist Target-Caller |
| `senior-app-knowledge` Datei-Loader | nur in Tests via direkter `readFileSync` | Loader-Helper neu bauen (C5b-Helper) — OK |

**Ergebnis:** C5b ist ein echter Adapter, kein Duplikat. Neuen Loader + neue Route zu bauen ist korrekt, weil beide der vorhandenen Infrastruktur klaren Mehrwert geben (Caching + HTTP-Oberfläche).

---

## Nächster Task: C6 — Onboarding-Wizard-UI

### Scope (aus `docs/plans/2026-04-19-senior-app-stufe1-implementation.md` C6)

React-Client für den Onboarding-Wizard, der die POST-Route aus C5b anspricht. Senior-App-Optik (mind. 80 px Touch, 4.5:1 Kontrast, max. 4 Taps). Aufteilen in:

1. **`VoiceChatSession`-Hook** (oder Komponente): hält die Client-seitige History, sendet `{ messages, userInput }` an `/api/ai/onboarding/turn`, rendert `assistant_text` + ggf. Confirmation-UI für `tool_results` mit `mode === "confirm"`.
2. **Audio-Stack:** Speech-to-Text (Whisper-API oder browser-native) für `userInput`, TTS-Playback für `assistant_text` (Hook `useTtsPlayback` aus Welle B wiederverwenden — Glob dort prüfen).
3. **Wizard-Frame:** Schritt-Nummerierung optional, Fallback "Tippen statt Sprechen"-Button, Abbrechen-Button, Fertig-Button.
4. **Error-Handling im UI:**
   - 401 → Redirect Login
   - 400 → Toast "Bitte senden Sie einen Text"
   - 503 → "KI-Assistent ist gerade nicht verfügbar, bitte später erneut versuchen"
   - 500 → neutraler Toast + Retry-Button
5. **Memory-Confirmation-UI:** Für `tool_results[i].mode === "confirm"` zwei große Buttons "Ja, speichern" / "Nein, danke".

### Pre-Check-Befund C6 (am Ende der C5b-Session durchgeführt)

| Thema | Gefunden in | Was macht es | Empfehlung für C6 |
|---|---|---|---|
| **STT-Engine** | [`modules/voice/engines/create-speech-engine.ts`](../../modules/voice/engines/create-speech-engine.ts) + `whisper-engine.ts` + `native-speech-engine.ts` + `silence-detector.ts` | Factory liefert eine `SpeechEngine` (native Browser-API ODER Whisper-API je nach Verfügbarkeit). Events: `onTranscript`, `onStateChange`, `onError`. | **Wiederverwenden**. `createSpeechEngine()` direkt importieren wie in `useCompanionChat.ts`. |
| **TTS-Service** | [`modules/voice/services/tts.service.ts`](../../modules/voice/services/tts.service.ts) + `__tests__/api/voice/tts.test.ts` + Mig 168 `tts-cache` Bucket | POST-Endpoint liefert Audio-Stream. Layer-1-Cache via Supabase-Storage. Senior-Voice "ash" mit Instructions. | **Wiederverwenden**. `fetch('/api/voice/tts', { method: 'POST', body: JSON.stringify({ text }) })` → Audio-Response → HTMLAudioElement. |
| **TTS-Button (UI)** | [`modules/voice/components/companion/TTSButton.tsx`](../../modules/voice/components/companion/TTSButton.tsx) | Lautsprecher-Knopf, spielt/stoppt Audio. | Pattern kopieren, nicht importieren (kleiner als Import-Aufwand). |
| **Companion-Hook (Referenz)** | [`modules/voice/components/companion/hooks/useCompanionChat.ts`](../../modules/voice/components/companion/hooks/useCompanionChat.ts) (359 LOC) | Voller Voice-Chat-Hook mit STT, Streaming-Chat (SSE!), Tool-Confirm, Supabase-History. Nutzt `useStreamingChat`. | **NICHT direkt wiederverwenden.** Architektur-Unterschied: companion nutzt SSE-Stream zum Direct-Anthropic-Endpoint; C5b gibt JSON aus Provider-Abstraktion. **Pattern kopieren** (Speech-Engine-Wiring, localStorage, Toast-Error), aber neuer Hook `useOnboardingTurn`. |
| **Streaming-Chat-Hook** | `hooks/useStreamingChat` | SSE-Client. | **Nicht für C6** — Onboarding-Turn ist JSON, kein Stream. |
| **Senior-Layout** | [`app/(senior)/layout.tsx`](../../app/(senior)/layout.tsx) | Einfach, max-w-md, fontSize 20px, PushBanner. | **Passt für Onboarding** — einfach eine neue Page unter `app/(senior)/onboarding/page.tsx` einhängen. Kein neues Layout. |
| **Senior-Pages** | `app/(senior)/page.tsx`, `pair/`, `kreis-start/`, `schreiben/`, `sos/`, `checkin/`, `profil/`, `sprechstunde/`, `medications/`, `confirmed/` | Onboarding existiert noch NICHT. | **Neu: `app/(senior)/onboarding/page.tsx`**. |
| **shadcn AlertDialog** | `components/ui/alert-dialog.tsx` (Standard shadcn) | Confirm-Dialog-Komponente. | **Wiederverwenden** für MemoryConfirmDialog. |
| **`modules/senior/`** | existiert NICHT | — | **Alternative Struktur**: Components unter `modules/voice/components/onboarding/` (nah am Verwandten) ODER unter `app/(senior)/onboarding/_components/` (co-located). Vorzug: **co-located**, weil nur von einer Page genutzt. |

**Schlüssel-Entscheidung:** Neuer Hook `useOnboardingTurn` statt Wrapper um `useCompanionChat`. Begründung: Protocol-Mismatch (SSE vs. JSON), Scope-Mismatch (Navigation-Tools vs. Memory-Confirm), Concerns-Mismatch (History-Persistence-Logik gehört nicht ins Onboarding, wo Wizard nach Abschluss weggeworfen wird).

### Genaue Dateien/Pfade für C6

- **Neu:** `app/(senior)/onboarding/page.tsx` — Wizard-Einstieg, 'use client', rendert `OnboardingChat`.
- **Neu:** `app/(senior)/onboarding/_components/OnboardingChat.tsx` — UI mit Chat-Bubbles, STT-Button, TTS-Button, MemoryConfirmDialog.
- **Neu:** `app/(senior)/onboarding/_components/MemoryConfirmDialog.tsx` — wrappt shadcn `AlertDialog`. Input: `{ value, onConfirm, onCancel }`.
- **Neu:** `app/(senior)/onboarding/_hooks/useOnboardingTurn.ts` — Hook mit `{ messages, isLoading, error, sendUserInput, confirmedMemory }`. Pattern aus `useCompanionChat` übernehmen (Speech-Engine, localStorage-Persistence unter eigenem Key `nachbar.onboarding.session`, Error-Toasts), aber JSON-fetch statt SSE und Memory-Confirm-Logik.
- **Neu:** Tests:
  - `app/(senior)/onboarding/_hooks/__tests__/useOnboardingTurn.test.ts`
  - `app/(senior)/onboarding/_components/__tests__/MemoryConfirmDialog.test.tsx`
- **Evtl. neu:** `app/api/memory/confirm/route.ts` — separate POST-Route, die `saveFact({ confirmed: true })` aufruft für `mode === "confirm"`-Bestätigungen. Alternative: Parameter an `/api/ai/onboarding/turn` (uglier). **Empfehlung dedizierte Route.**

### Reihenfolge für C6 (3-4 Teilsteps, je mit eigenem Commit)

1. **Confirm-Route** (klein): `POST /api/memory/confirm` + Tests. Saves a fact with `confirmed: true` via existing `saveFact`. Auth + Scope-Check (senior only). 20-30min.
2. **useOnboardingTurn-Hook** + Tests (fetch-Mock-basiert). 45-60min.
3. **MemoryConfirmDialog** + OnboardingChat-Komponente. 45-60min.
4. **Page + End-to-End-Smoke** (manuelles Browser-Testen, nicht automatisiert).

### Dateien für C6 (Schätzung)

- Modify oder Create: `app/(senior)/onboarding/page.tsx` (Wizard-Einstieg, falls nicht vorhanden)
- Create: `modules/senior/onboarding/components/VoiceChatSession.tsx`
- Create: `modules/senior/onboarding/hooks/useOnboardingTurn.ts` (fetch-Wrapper mit State: idle/loading/error)
- Create: `modules/senior/onboarding/components/MemoryConfirmDialog.tsx`
- Create: Tests für Hook + Komponenten (mindestens Happy-Path + Error-Cases)

### Test-Plan C6 (Vitest + React-Testing-Library)

- Hook: `useOnboardingTurn`
  - ruft Route mit korrektem Body auf
  - appendet `userInput` an history NACH erfolgreicher Response (nicht vorher)
  - setzt error-State bei 503 + 500
  - stellt `isLoading` während des Requests
- Komponente: `VoiceChatSession`
  - rendert `assistant_text`
  - bei `tool_results[i].mode === "confirm"` erscheint Confirm-Dialog
  - STT-Button triggert STT + `sendTurn`
  - TTS spielt automatisch bei neuem `assistant_text` (außer Mute)
- Komponente: `MemoryConfirmDialog`
  - zeigt `value` lesbar an
  - Ja-Button triggert Memory-Save (über separate Route? Siehe unten.)

### Offene Design-Fragen für C6

1. **Memory-Confirm-Endpoint:** Braucht C6 eine separate POST-Route `/api/ai/memory/confirm` (mit `factId: null, category, key, value, confirmed: true`)? Oder reicht `/api/ai/onboarding/turn` mit einer Hilfsnachricht? **Empfehlung:** kleine dedizierte Route `/api/memory/confirm` (ohne AI), die `saveFact({ confirmed: true })` aufruft. Das hält C6 einfach und ist in Welle C entscheidbar.
2. **Session-Persistenz:** C5b ist stateless. C6 braucht mindestens localStorage-Persistenz der History, damit ein Reload den Wizard nicht neu startet. **Empfehlung:** localStorage mit Key `nachbar.onboarding.session`, TTL 24h.
3. **Onboarding-Abschluss:** Wann ist das Onboarding fertig? **Empfehlung:** Wenn die KI `stop_reason === "end_turn"` zurückgibt UND im Text eine Abschluss-Marker-Phrase erscheint (z. B. "Das war's für heute."). Oder einfach nach N Turns. In der ersten Version: expliziter "Fertig"-Button für den Senior, keine automatische Erkennung.

---

## AVV- und Deploy-Stand (unverändert)

- AVV mit Anthropic + Mistral signiert **erst nach GmbH-Eintragung** (Notar 27.04.2026).
- Bis dahin: `AI_PROVIDER=off` oder `mock` in Prod. C5b testet vollständig mit `mock`-Provider.
- C9 Deploy (rote Zone) wartet auf AVV + Anthropic-Keys + Mig 173 apply + Push.

---

## Start-Prompt für die nächste Session

```
Ich möchte mit Welle C weitermachen. Stand: C0–C5b fertig und lokal committed.
Kein Push.

Bitte lies ZUERST:
1. nachbar-io/docs/plans/2026-04-19-handoff-welle-c-c5b-done.md
   (dieser Handoff — Commit-Liste, Pre-Check-Befunde, C6-Scope)
2. nachbar-io/docs/plans/2026-04-19-handoff-welle-c-c4-c5a-done.md
   (Vorgänger — C4+C5a Details, Provider-Abstraktion)
3. nachbar-io/docs/plans/2026-04-19-senior-app-stufe1-implementation.md
   (Gesamtplan — C6 ab dem entsprechenden Abschnitt)

KRITISCH — Pflicht-Pre-Check:
Vor JEDEM Schritt in C6 codebase-weit grep machen, nicht dem Plan blind folgen.
Besonders wichtig: prüfe, ob Welle-B-Folgearbeit bereits TTS-Hook und STT-Hook
gebaut hat (useTtsPlayback, Speech-Recognition). Wenn ja: wiederverwenden, nicht
duplizieren.

Nächster Task: C6 — Onboarding-Wizard-UI.
Wiederverwenden: POST /api/ai/onboarding/turn (C5b), useTtsPlayback (Welle-B),
shadcn/ui AlertDialog.
Arbeitsweise: TDD strict, Mock-Fetch für Hook-Tests, kein Push, bei 65% Context
Handoff schreiben.

Offene Design-Entscheidungen — Empfehlungen aus C5b-Handoff übernehmen, solange
Founder nicht widerspricht: separate /api/memory/confirm-Route statt Turn-Hack,
localStorage mit 24h-TTL für History, expliziter Fertig-Button (keine
Auto-Erkennung).
```

---

## Dinge, die diese Session NICHT gemacht hat (bewusst)

- Kein Push.
- Keine Prod-Änderung, keine Mig 173 Apply, keine Env-Vars.
- `app/datenschutz/page.tsx` nicht angefasst.
- Kein Multi-Turn-Tool-Loop (s. o. — wäre Interface-Split der C2-Abstraktion).
- MEMORY.md-Zeile 34 (veraltete Prototyp-Notiz) weiterhin nicht korrigiert.

---

## Dinge, die diese Session GELERNT hat

1. **Pre-Check verhindert falsche Adapter-Entscheidung:** Ohne Grep wäre die naheliegende Versuchung gewesen, die bestehende `/api/companion/chat`-Route zu erweitern. Der Grep zeigte, dass diese Route einen komplett anderen Zweck hat (Quartier-Lotse mit direktem Anthropic-SDK, nicht Wizard mit neuer Provider-Abstraktion). Neue Route war richtig — aber nur weil bewusst entschieden, nicht weil ignorant.
2. **Mock-Hoisting bei `node:fs/promises`:** Der `...actual`-Spread-Trick aus der Vitest-Doku funktioniert dort NICHT zuverlässig, weil `readFile` sowohl als Named-Export als auch auf dem Default-Export sitzt. Lösung: `vi.hoisted()` mit separatem `vi.fn()`, das in Named- und Default-Slot gleichzeitig eingesetzt wird. Pattern für die nächste Session merken.
3. **Tool-Loop-Semantik ≠ Turn-Loop-Semantik:** Die "loop overflow"-Anforderung aus dem C4/C5a-Handoff wurde auf eine Turn-interne Obergrenze interpretiert statt auf Cross-Turn-Round-Trips. Begründung im Handoff oben dokumentiert. Falls Founder/Codex das anders liest: Interface-Split der C2-Abstraktion in separaten Task ziehen, nicht in C6 schmuggeln.
