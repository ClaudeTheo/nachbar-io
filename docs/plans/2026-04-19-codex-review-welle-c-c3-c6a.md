# Codex Review Request — Welle C C3 bis C6a (lokal, kein Push)

**Datum:** 2026-04-19
**Reviewer:** Codex (hoechstes Modell)
**Autor:** Claude Opus 4.7 (1M)
**Scope:** 7 Commits (C2 bereits in `cd300dc` reviewed, hier nicht mehr)
**Branch:** `master` lokal, HEAD `bb86ff7`, kein Push

---

## Was bitte reviewen

| SHA | Task | Layer | LOC produktiv | Tests |
|---|---|---|---|---|
| `477f344` | C1 | Migration 173 (memory_consents) | ~46 SQL | — |
| `133bdcf` | C3 | Wissensdokument senior-app DE+CH | 338 MD + 30 LOC Loader | 13 (preexistent) |
| `196aa8a` | C4 | save_memory Tool-Adapter | 284 LOC | 25 |
| `71f8c56` | C5a | Prompt-Caching Flag system_cached | ~30 LOC delta | (in provider.test.ts) |
| `ddf50d0` | C5b | Onboarding-Turn Route | 203 LOC | 21 |
| `bb86ff7` | C6a | Wizard-UI (Hooks + Komponenten + Page) | 475 LOC | 37 |

**C2 (`26e3da4` + `cd300dc` Review-Fixes) ist bereits durch.** Dieses Dokument haengt darauf auf.

---

## Test- und tsc-Stand am Review-Punkt

- `npx vitest run __tests__/hooks/useTtsPlayback.test.ts __tests__/hooks/useOnboardingTurn.test.ts __tests__/components/onboarding/ __tests__/lib/voice/ __tests__/components/companion/ lib/ai/ app/api/ai/` → **255 / 255 gruen** (24 Files).
- `npx tsc --noEmit` → **clean** ausser den 8 preexistenten Skip-Liste-Errors (`device-fingerprint.test.ts:267`, `quartier-info-vorlesen.test.tsx:170`, `cross-portal/x01:134-136`, `cross-portal/x19:428-429`, `scenarios/s12:92`).

---

## Kritische Architekturfragen — bitte BLOCKER / NACHBESSERN / OK markieren

### Frage 1 — Tool-Loop-Semantik in C5b

In `app/api/ai/onboarding/turn/route.ts` haben wir KEINEN echten Multi-Turn-Tool-Roundtrip implementiert. Stattdessen `MAX_TOOLS_PER_TURN = 3` pro Provider-Response. Begruendung im Code: `lib/ai/types.ts` definiert `AIMessage.content: string`, kein Block-Array — ein echter Anthropic-`tool_use` → `tool_result` → `assistant`-Roundtrip waere nur durch Re-Encoden als User-Text moeglich (hacky), oder durch Interface-Erweiterung der Provider-Abstraktion.

Konsequenz: KI sieht das Ergebnis von `save_memory` NICHT in der naechsten Antwort, sondern erst im naechsten User-Turn. Das ist fuer Onboarding (sequenziell) ok, fuer komplexe Mehrstufen-Dialoge nicht.

**Bitte beurteilen:**
- Ist das fuer C5b/C6 vertretbar? (Wir haben kein Use-Case der Multi-Turn-Loops braucht.)
- Falls `AIMessage.content` spaeter doch `string | ContentBlock[]` werden soll: ist die jetzige Abstraktion ein guter Startpunkt zum Erweitern, oder wuerdest du sie heute schon anders schneiden?

### Frage 2 — Pre-Check-Abweichungen vom C5b-Handoff in C6a

C6a weicht in 3 Punkten vom C5b-Handoff ab, weil Pre-Check Plan-vs-Code-Konflikte fand:

| Plan (C5b-Handoff) | Realitaet | Entscheidung C6a |
|---|---|---|
| `useTtsPlayback` aus Welle B wiederverwenden | Hook existierte nicht. Nur `TTSButton.tsx` mit komplettem Flow. | Hook frisch extrahiert in `modules/voice/hooks/useTtsPlayback.ts`. |
| Neue Route `POST /api/memory/confirm` | `POST /api/memory/facts` macht bereits exakt `saveFact({confirmed:true})` mit Consent + Caregiver + Quota + Medical-Blocklist. | Bestehende Route wiederverwendet, keine zweite angelegt. |
| `app/(senior)/onboarding/page.tsx` | `modules/onboarding/` ist klassischer Slide-Tour-Flow (Welcome, Map, Push). Naming-Kollision. | Page unter `app/(senior)/ki-wizard/page.tsx`. |

**Bitte beurteilen:**
- Sind alle drei Abweichungen vertretbar? Insbesondere: ist die Confirm-Funktionalitaet ueber `/api/memory/facts` semantisch sauber, oder sollte mode='confirm' ein eigenes Endpoint-Konzept bekommen (z.B. wegen Audit-Logging „confirmed by user explicitly")?
- Ist die Routenname-Wahl `ki-wizard` eindeutig genug, oder kollidiert sie spaeter mit anderem KI-getriebenem Wizard-Flow?

### Frage 3 — STT-Defer auf C6b

C6a liefert nur Text-Input. STT-Mikrofon (createSpeechEngine aus `modules/voice/engines/`) ist als C6b geplant. Begruendung: jsdom kann Web-Speech-API nicht testen, und die Komposition mit `useTtsPlayback` (Auto-Play) hat eine moegliche Race (Mikro hoert sich selbst zu).

**Bitte beurteilen:**
- Akzeptabler Schnitt fuer einen ersten Senior-App-Wizard? (Senioren koennen tippen, aber sprechen waere natuerlicher.)
- Oder sollte C6 atomar sein (kein Ship ohne STT) und wir verschieben den Page-Mount auf C6b?

### Frage 4 — Auto-Play-TTS-Hook: Race-Condition?

`WizardChat.tsx` ruft `play(lastAssistantText)` in einem `useEffect`, getrackt ueber `lastSpokenIndexRef.current` (Index der letzten gesprochenen Message). Bei schneller Folge zweier Provider-Antworten oder bei Strict-Mode-Double-Mount koennte:
- (a) zwei `play()` parallel laufen — `useTtsPlayback.play()` ruft jedoch intern `stopInternal()` zuerst, sollte also serialisieren, aber Race zwischen fetch-Antwort und neuem `play()` ist nicht abgedeckt.
- (b) die erste Antwort beim React-Strict-Mode-Re-Mount nochmal abgespielt werden — `lastSpokenIndexRef` haelt den Wert NICHT ueber Mount-Zyklen hinweg.

**Bitte beurteilen:**
- Sind die Cases real bedrohlich (User-perceptable double-play, falsche Audio-Reihenfolge)?
- Falls ja: Setup-Cost vs. Wert eines AbortController-Patterns oder einer Token-basierten Sequenz-ID im Hook?

### Frage 5 — Hook-Mock-Strategie in `WizardChat.test.tsx`

Wir mocken die beiden Hooks (`useOnboardingTurn`, `useTtsPlayback`) als globale Module-Mocks mit einem `state.current`-Pattern, um pro Test den Hook-Return zu setzen:

```ts
const onboardingState = { current: { messages: [], ... } };
vi.mock("@/.../useOnboardingTurn", () => ({
  useOnboardingTurn: () => onboardingState.current,
}));
function setOnboarding(partial) { onboardingState.current = { ...onboardingState.current, ...partial }; }
```

**Bitte beurteilen:**
- Ist das idiomatisch im Vitest-Oekosystem oder gibt es ein cleaneres Pattern (z.B. `vi.fn()` mit `mockImplementation` per Test, oder eine Hook-Factory)?
- Die alternative waere echte `useOnboardingTurn`-Aufrufe mit nur fetch-Mock — fuehrt aber zu langen Setup-Bloecken in jedem WizardChat-Test.

### Frage 6 — Migration 173 Sicherheits-Surface

`supabase/migrations/173_memory_consents.sql` legt `user_memory_consents`-Erweiterung an plus den `ai_onboarding`-Consent-Key.

**Bitte beurteilen:**
- RLS-Policy korrekt? Insbesondere: kann ein anderer User die Consents eines Seniors lesen oder schreiben?
- Fehlt ein Audit-Trigger (`updated_by`, `consent_source`)?
- Ist die `.down.sql` defensiv genug (DROP nur wenn leer)?

### Frage 7 — system_cached-Flag-Ergonomie (C5a)

Der `system_cached: true`-Flag in `provider.chat()` setzt fuer Anthropic die `cache_control`-Annotation auf den System-Prompt. Mistral / Mock ignorieren ihn.

**Bitte beurteilen:**
- Ist die per-call Opt-in-Form korrekt, oder waere ein Provider-globales `enable_caching`-Setting + automatisches Caching aller Systems > 1024 Token besser?
- Wir trimmen NICHT auf min. Cache-Tokens — Anthropic fordert >=1024 Tokens fuer Caching. Das Wissensdokument liegt bei ~4014 Worten = ~5000 Tokens, also sicher. Fuer Spaeter (kuerzere Prompts): sollten wir guarden?

---

## Output-Schema fuer dich, Codex

Bitte deine Antwort in dieser Form:

```
## BLOCKER (muss vor naechstem Commit gefixt werden)
- Frage X: <kurze Begruendung> + <konkreter Fix>

## NACHBESSERN (sollte vor C6b/C7 angeschaut werden, nicht-blockierend)
- Frage Y: <Vorschlag>

## OK (Entscheidung tragfaehig, kein Aenderungsbedarf)
- Frage Z

## ZUSATZ-FUNDE (was du ausserhalb der 7 Fragen siehst)
- ...
```

Wenn du mehr Code-Stellen sehen willst: gib mir die Pfade, ich pulle.

---

## Kontext fuer Codex (Welle-C-Stand kompakt)

- **AVV blockiert Deploy.** Anthropic/Mistral-Keys + Push erst nach GmbH-Eintragung (Notar 27.04.). `AI_PROVIDER=off` in Prod.
- **Test-Stand komplett:** 255/255 gruen in den Welle-C-Bereichen, keine npm-Dependencies neu, tsc clean ausser preexistente Skip-Liste.
- **Pre-Check-Regel** (`.claude/rules/pre-check.md`) wurde in C6a strikt durchgezogen — Befunde s. Frage 2.
- **TDD strict** in C6a: jedes File hat RED-Test vor GREEN-Implementation.
- **Senior-Mode-Constraints** (mind. 80px Touch, 4.5:1 Kontrast, max. 4 Taps) in MemoryConfirmDialog (Buttons explizit `style={{ minHeight: '80px' }}`) und WizardChat (Send-Button, Input-Field) eingehalten. Kann Codex aus dem JSX nachpruefen.
