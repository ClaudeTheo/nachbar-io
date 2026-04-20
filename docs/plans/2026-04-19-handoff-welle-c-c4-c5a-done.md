# Handoff — Welle C Tasks C4 + C5a LIVE-ready (lokal)

**Datum:** 2026-04-19 (spät abend)
**Von:** Claude Opus 4.7 (1M) — Welle-C-Fortsetzungssession
**An:** Nächste Session / Thomas
**Kontext-Stand bei Schreibweise:** ~72 % — saubere Zäsur nach zwei Commits, bevor C5b begonnen wird.

---

## TL;DR

- **C4 (save_memory-Adapter) fertig und lokal committed** — als Adapter, nicht als Neubau. 25/25 Tests grün.
- **C5a (Prompt-Caching-Flag `system_cached`) fertig und lokal committed** — 2 Tests grün, 74/74 lib/ai regression clean.
- **Kein Push.** 6 lokale Commits in nachbar-io seit `24d34b7`.
- **Neue Pflicht-Regel etabliert:** Pre-Check vor jedem Task — Plan ist nicht autoritativ, Code ist autoritativ. Siehe [feedback_existing_infrastructure_check.md](../../../.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/feedback_existing_infrastructure_check.md) + Block oben im [C0-C3-Handoff](2026-04-19-handoff-welle-c-c0-c3-done.md).
- **Offen:** C5b (Onboarding-Route), C6 (Wizard-UI), C7 (Senior-Memory-Übersicht), C8 (Angehörigen-Edit), C9 (Deploy — rote Zone, wartet auf AVV + GmbH).

---

## Lokaler Commit-Stand

**nachbar-io HEAD: `71f8c56`** (6 lokale Commits seit `24d34b7`, kein Push):

| SHA | Task | Beschreibung |
|---|---|---|
| `26e3da4` | C2 | feat(ai): provider abstraction for Claude / Mistral / mock |
| `477f344` | C1 | feat(db): mig 173 memory-consents + ai_onboarding consent key |
| `cd300dc` | C2-Review | refactor(ai): review fixes — OffProvider throws AIProviderError |
| `133bdcf` | C3 | feat(ai): system-prompt wissensdokument senior-app DE + CH |
| **`196aa8a`** | **C4** | **feat(ai): save_memory tool adapter — C4** |
| **`71f8c56`** | **C5a** | **feat(ai): prompt-caching flag system_cached for Claude — C5a** |

Parent-Repo (Handy APP) unverändert seit `8bb5a74`.

---

## Was in dieser Session neu gebaut / geändert wurde

### C4 — save_memory-Adapter

**Dateien neu:**

```
lib/ai/tools/save-memory.ts                         (242 LOC)
lib/ai/tools/__tests__/save-memory.test.ts          (332 LOC, 25 Tests)
```

**Struktur:**
- Pure Funktion `parseToolInput(toolCall)` — JSON-Schema-Validation (category-Enum, key-non-empty, value-non-empty + max 500 Zeichen, confidence in [0,1], needs_confirmation boolean).
- Async `saveMemoryToolHandler(toolCall, ctx)` — Scope-Check → Consent/FactCount parallel laden → `validateMemorySave` → bei `mode='save'` → `saveFact` (mit `source='ai_learned'`) → strukturiertes Result.
- Result-Shape für KI:
  - `{ ok: true, mode: 'save', factId, category, key }`
  - `{ ok: true, mode: 'confirm', factId: null, category, key, value }` (Senior-UI fragt nach)
  - `{ ok: false, reason: 'validation_error'|'scope_violation'|'consent_missing'|'medical_blocked'|'limit_reached'|'db_error', message }`

**Wiederverwendet aus `modules/memory/services/`:**
- `validateMemorySave` (4-Stufen: Limit → Consent → Blocklist → Auto/Confirm)
- `medical-blocklist.ts` `containsMedicalTerms` (80+ deutsche Terms, Umlaut-normalisiert)
- `saveFact` inkl. AES-256-GCM für `care_need`/`personal` + Audit-Log `user_memory_audit_log`
- `hasConsent`, `getFactCount`, `CATEGORY_TO_CONSENT`, `MEMORY_LIMITS`

**Scope-Regel (Welle C Senior-only):**
- `actor.role !== 'senior'` → `scope_violation`
- `targetUserId !== actor.userId` → `scope_violation`
- Caregiver-Scope (mit `caregiver_links`-Check) folgt in **C8**.

### C5a — Prompt-Caching-Flag

**Dateien geändert:**

```
lib/ai/types.ts                     (+7 LOC — system_cached?: boolean auf AIChatInput)
lib/ai/claude.ts                    (+14 LOC — Content-Block-Array mit cache_control)
lib/ai/__tests__/provider.test.ts   (+58 LOC — 2 neue Tests)
```

**Verhalten:**
- `system_cached=true` → Claude-Body `system` wird zu `[{ type: "text", text: "<prompt>", cache_control: { type: "ephemeral" } }]`
- `system_cached=false` oder `undefined` → plain string (Backward-Compat).
- MistralProvider / MockProvider / OffProvider ignorieren das Flag.

---

## Test-Stand (Ende Session)

- `lib/ai/__tests__/provider.test.ts` — 36/36 grün (34 pre-existing + 2 neu)
- `lib/ai/system-prompts/__tests__/senior-app-knowledge.test.ts` — 13/13 grün
- `lib/ai/tools/__tests__/save-memory.test.ts` — 25/25 grün
- **Summe lib/ai: 74/74 grün.**
- `npx tsc --noEmit`: keine neuen Errors in `lib/ai/` oder `lib/ai/tools/`. Die 7–8 präexistenten E2E-/Device-Fingerprint-Errors aus [.claude/rules/testing.md](../../.claude/rules/testing.md) Skip-Liste unverändert.
- Keine neuen npm-Dependencies.

---

## Uncommitted Reste (NICHT anfassen außer gezielt)

```
nachbar-io:
 M app/datenschutz/page.tsx                                    (Welle-B-Folgearbeit-Rest)
?? docs/plans/2026-04-18-handoff-live-test-blocked-voice-latency.md
?? docs/plans/2026-04-18-handoff-tts-layer1-cache.md
?? docs/plans/2026-04-19-handoff-welle-c-c0-c3-done.md        (in dieser Session um Pre-Check-Block + C4-Korrektur erweitert)
?? docs/plans/2026-04-19-handoff-welle-c-c4-c5a-done.md       (dieses File)
?? supabase/migrations/067_doctor_registration_BACKUP_DB.sql

Parent-Repo:
 M CLAUDE.local.md

Memory (außerhalb Git):
+ feedback_existing_infrastructure_check.md      (neu, in MEMORY.md verlinkt)
~ MEMORY.md                                      (Zeile hinzugefügt)
```

---

## Nächster Task: C5b — Onboarding-Route

### Scope

Datei: `nachbar-io/app/api/ai/onboarding/turn/route.ts` (POST-Handler). Ein Turn im Onboarding-Wizard:

1. **Auth:** Supabase-Server-Client, `auth.uid()` holen, 401 bei fehlender Session.
2. **Request-Body validieren:** `{ messages: AIMessage[], userInput: string }` (stateless — Client hält History). Optional: `step?: number` für UI-Hinweise.
3. **Memory-Context laden** via `loadMemoryContext(supabase, userId, userInput, "plus_chat")` (aus `modules/memory/services/memory-loader.ts`).
4. **System-Prompt bauen:** Wissensdokument (C3, `lib/ai/system-prompts/senior-app-knowledge.md`) + Memory-Block. System-Prompt ist statisch → `system_cached: true` nutzen.
5. **Provider-Call** via `getProvider()` aus `lib/ai/provider.ts`. Bei `AI_PROVIDER=off` → 503 mit klarer Meldung.
6. **Tool-Call-Loop:** Wenn `response.stop_reason === "tool_use"` → `tool_calls` durch `saveMemoryToolHandler` jagen, Tool-Results an KI zurück, erneut chatten. Max 3 Iterationen (Schutz gegen Runaway).
7. **Response:** `{ assistant_text, tool_results: SaveMemoryResult[], stop_reason, done?: boolean }`.

### Pre-Check-Befund für C5b (aus dieser Session)

| Stichwort | Gefunden in | Was macht es |
|---|---|---|
| Memory-Context-Loader | `modules/memory/services/memory-loader.ts` `loadMemoryContext()` | 3-Stufen: Core-Profil + relevante Basis-Fakten + conditional sensitive. Baut Prompt-Block mit Regeln. **Wiederverwenden.** |
| Tool-Schema für KI | `modules/memory/services/chat-integration.ts` `buildMemoryTool()` | Liefert `save_memory`-Tool-Schema. **Wiederverwenden.** |
| Save-Handler | `lib/ai/tools/save-memory.ts` (diese Session) | Verarbeitet Tool-Call → DB + Result. **Wiederverwenden.** |
| Wissensdokument | `lib/ai/system-prompts/senior-app-knowledge.md` (C3) | ~4014 Wörter DE+CH. `await readFile()` zur Build-Time oder Request-Time einbauen. Mit `system_cached=true` nur 1× pro 5 min tokenisiert. |
| Provider-Factory | `lib/ai/provider.ts` `getProvider()` | Flag-basiert. Werft `AIProviderError` bei off. |
| Mock-Provider für Tests | `lib/ai/mock.ts` | Kann pre-programmierte Responses ausspielen, für Route-Tests einsetzen. |

**Kein vorhandener `/api/ai/`-Endpoint** — Verzeichnis ist neu anzulegen. `app/api/cron/onboarding/route.ts` ist was anderes (Cron-Welcome-Mail, nicht KI).

### Design-Entscheidungen (offen für nächste Session oder Founder)

1. **Session-State:** Stateless (Client schickt History) vs. DB-persisted (neue Tabelle `ai_onboarding_sessions`). Empfehlung **stateless** für Welle C — minimaler Scope, keine neue Migration nötig. Persistierung optional in Welle E.
2. **Wissensdokument laden:** build-time (webpack-Import als String) vs. runtime (`fs.readFile`). Empfehlung **runtime mit In-Memory-Cache** — keine Build-Anpassungen, einfach zu updaten.
3. **Tool-Call-Loop-Limit:** 3 Iterationen. Bei Hit → 500 mit "tool loop overflow".
4. **AI_PROVIDER=off Verhalten:** 503 mit `{ error: "ai_disabled", message: "KI-Assistent ist deaktiviert (AVV ausstehend)" }` — Senior-UI zeigt "Tut mir leid, ich kann gerade nicht antworten."
5. **Rate-Limiting:** In Welle C noch nicht. Kommt später via Upstash-Redis (`lib/security/rate-limit.ts` existiert bereits für andere Endpoints — bei Bedarf wiederverwenden).

### Test-Plan C5b

- `app/api/ai/onboarding/turn/__tests__/route.test.ts` — mindestens:
  - 401 ohne Auth
  - 400 bei kaputtem Body (messages missing, userInput empty)
  - 503 bei `AI_PROVIDER=off`
  - Happy-Path: Provider (Mock) antwortet mit Text → Response hat `assistant_text`
  - Tool-Call-Flow: Provider antwortet mit `tool_use` → `save_memory` wird aufgerufen → Tool-Result in Response
  - Tool-Call-Loop-Limit: 4× tool_use in Folge → 500 "loop overflow"
  - System-Prompt enthält Wissensdokument-Snippet (substring-check)
  - System-Prompt wird mit `system_cached=true` an Provider übergeben

### Dateien für C5b (Schätzung)

- Create: `app/api/ai/onboarding/turn/route.ts` (~200–250 LOC)
- Create: `app/api/ai/onboarding/turn/__tests__/route.test.ts` (~400–500 LOC)
- Helper (optional): `lib/ai/system-prompts/loader.ts` — cached-File-Read mit Ablauf
- Evtl. Modify: `lib/ai/types.ts` falls Route-Response-Shape als Typ extrahiert werden soll

---

## AVV- und Deploy-Stand (unverändert seit letztem Handoff)

- AVV mit Anthropic + Mistral signiert **erst nach GmbH-Eintragung** (Notar 27.04.2026, Eintragung Mai/Juni). Nicht privat, nicht vorher.
- Bis dahin: `AI_PROVIDER=off` oder `mock` in Prod. C5b kann lokal mit Mock-Provider vollständig getestet werden.
- C9 Deploy (rote Zone) wartet auf AVV + API-Keys + Mig 173 apply + Push.

---

## Start-Prompt für die nächste Session

```
Ich möchte mit Welle C weitermachen. Stand: C0–C4 + C5a fertig und lokal committed.
Kein Push.

Bitte lies ZUERST:
1. nachbar-io/docs/plans/2026-04-19-handoff-welle-c-c4-c5a-done.md
   (dieser Handoff — Commit-Liste, Pre-Check-Befunde, C5b-Design)
2. nachbar-io/docs/plans/2026-04-19-handoff-welle-c-c0-c3-done.md
   (Vorgänger — Pre-Check-Block ganz oben, C5–C9 Kurzbeschreibung)
3. nachbar-io/docs/plans/2026-04-19-senior-app-stufe1-implementation.md
   (Gesamtplan — C5 ab Zeile 523)

KRITISCH — Pflicht-Pre-Check:
Vor JEDEM Schritt in C5b codebase-weit grep machen, nicht dem Plan blind folgen.
Plan ist nicht autoritativ, Code ist autoritativ.
Regel: feedback_existing_infrastructure_check.md (auto-geladen).

Nächster Task: C5b — POST-Route /api/ai/onboarding/turn.
Wiederverwenden: loadMemoryContext, buildMemoryTool, saveMemoryToolHandler,
senior-app-knowledge.md (mit system_cached=true), getProvider().
Arbeitsweise: TDD strict, Mock-Provider für Tests, kein Push, bei 65% Context
Handoff schreiben.

Design-Entscheidungen offen — Empfehlungen aus Handoff übernehmen, solange
Founder nicht widerspricht: stateless Session-State, runtime File-Read mit
In-Memory-Cache für Wissensdokument, 3-Tool-Call-Loop-Limit, 503 bei off.
```

---

## Dinge, die diese Session NICHT gemacht hat (bewusst)

- Kein Push.
- Keine Prod-Änderung, keine Mig 173 Apply, keine Env-Vars.
- `app/datenschutz/page.tsx` nicht angefasst.
- Kein C5b begonnen — zu groß für die Rest-Token, sauberer Cut nach C5a.
- MEMORY.md-Zeile 34 (veraltete Prototyp-Notiz) weiterhin nicht korrigiert — kleiner Task, noch offen.

---

## Dinge, die diese Session GELERNT hat

1. **Plan vs. Realität bei Welle-C-Handoff:** Zum zweiten Mal (nach C1 Mig 122) wurde eine bereits vorhandene Infrastruktur von der Plan-/Handoff-Autorin übersehen (`modules/memory/services/*`). Neue Regel `feedback_existing_infrastructure_check.md` etabliert + Pre-Check-Block direkt oben im vorigen Handoff eingefügt, damit Folge-Sessions nicht mehr reinrennen.
2. **Adapter > Neubau:** C4 hätte ~400 LOC als Neubau gekostet. Als Adapter waren es 242 LOC produktiv + 332 LOC Tests. Kein Code-Duplikat, kein Drift-Risiko, höhere Test-Abdeckung für die geteilte Logik.
3. **Prompt-Caching provider-neutral gelöst** via optionalem Flag im Interface — andere Provider ignorieren es still. Kein Interface-Split nötig, der die Abstraktion kaputt machen würde.
