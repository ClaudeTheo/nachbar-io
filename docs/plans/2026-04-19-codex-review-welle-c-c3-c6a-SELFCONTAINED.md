# Codex Review Request — Welle C C3 bis C6a (SELF-CONTAINED)

**Wenn dein Workspace das Repo NICHT sehen kann (Sandbox-Snapshot, falscher cwd):** Dieser File enthaelt im **Anhang** alle Code-Inhalte, die du zum Reviewen brauchst — kein git/cat/rg noetig. Wenn du das Repo hingegen sehen kannst, ist der knappere Originalfile `2026-04-19-codex-review-welle-c-c3-c6a.md` das, was du lesen solltest.

---

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

In `app/api/ai/onboarding/turn/route.ts` (s. Anhang D) haben wir KEINEN echten Multi-Turn-Tool-Roundtrip implementiert. Stattdessen `MAX_TOOLS_PER_TURN = 3` pro Provider-Response. Begruendung im Code: `lib/ai/types.ts` (Anhang B) definiert `AIMessage.content: string`, kein Block-Array — ein echter Anthropic-`tool_use` → `tool_result` → `assistant`-Roundtrip waere nur durch Re-Encoden als User-Text moeglich (hacky), oder durch Interface-Erweiterung der Provider-Abstraktion.

Konsequenz: KI sieht das Ergebnis von `save_memory` NICHT in der naechsten Antwort, sondern erst im naechsten User-Turn. Das ist fuer Onboarding (sequenziell) ok, fuer komplexe Mehrstufen-Dialoge nicht.

**Bitte beurteilen:**
- Ist das fuer C5b/C6 vertretbar? (Wir haben kein Use-Case der Multi-Turn-Loops braucht.)
- Falls `AIMessage.content` spaeter doch `string | ContentBlock[]` werden soll: ist die jetzige Abstraktion ein guter Startpunkt zum Erweitern, oder wuerdest du sie heute schon anders schneiden?

### Frage 2 — Pre-Check-Abweichungen vom C5b-Handoff in C6a

C6a weicht in 3 Punkten vom C5b-Handoff ab, weil Pre-Check Plan-vs-Code-Konflikte fand:

| Plan (C5b-Handoff) | Realitaet | Entscheidung C6a |
|---|---|---|
| `useTtsPlayback` aus Welle B wiederverwenden | Hook existierte nicht. Nur `TTSButton.tsx` mit komplettem Flow. | Hook frisch extrahiert in `modules/voice/hooks/useTtsPlayback.ts` (Anhang F). |
| Neue Route `POST /api/memory/confirm` | `POST /api/memory/facts` macht bereits exakt `saveFact({confirmed:true})` mit Consent + Caregiver + Quota + Medical-Blocklist. | Bestehende Route wiederverwendet, keine zweite angelegt. (s. `useOnboardingTurn.confirmMemory` in Anhang G) |
| `app/(senior)/onboarding/page.tsx` | `modules/onboarding/` ist klassischer Slide-Tour-Flow (Welcome, Map, Push). Naming-Kollision. | Page unter `app/(senior)/ki-wizard/page.tsx` (Anhang J). |

**Bitte beurteilen:**
- Sind alle drei Abweichungen vertretbar? Insbesondere: ist die Confirm-Funktionalitaet ueber `/api/memory/facts` semantisch sauber, oder sollte mode='confirm' ein eigenes Endpoint-Konzept bekommen (z.B. wegen Audit-Logging „confirmed by user explicitly")?
- Ist die Routenname-Wahl `ki-wizard` eindeutig genug, oder kollidiert sie spaeter mit anderem KI-getriebenem Wizard-Flow?

### Frage 3 — STT-Defer auf C6b

C6a liefert nur Text-Input (s. `WizardChat.tsx` Anhang H). STT-Mikrofon (`createSpeechEngine` aus `modules/voice/engines/`, im Repo bereits vorhanden) ist als C6b geplant. Begruendung: jsdom kann Web-Speech-API nicht testen, und die Komposition mit `useTtsPlayback` (Auto-Play) hat eine moegliche Race (Mikro hoert sich selbst zu).

**Bitte beurteilen:**
- Akzeptabler Schnitt fuer einen ersten Senior-App-Wizard? (Senioren koennen tippen, aber sprechen waere natuerlicher.)
- Oder sollte C6 atomar sein (kein Ship ohne STT) und wir verschieben den Page-Mount auf C6b?

### Frage 4 — Auto-Play-TTS-Hook: Race-Condition?

`WizardChat.tsx` (Anhang H) ruft `play(lastAssistantText)` in einem `useEffect`, getrackt ueber `lastSpokenIndexRef.current` (Index der letzten gesprochenen Message). Bei schneller Folge zweier Provider-Antworten oder bei Strict-Mode-Double-Mount koennte:
- (a) zwei `play()` parallel laufen — `useTtsPlayback.play()` ruft jedoch intern `stopInternal()` zuerst (s. Anhang F), sollte also serialisieren, aber Race zwischen fetch-Antwort und neuem `play()` ist nicht abgedeckt.
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

`supabase/migrations/173_memory_consents.sql` (Anhang A) erweitert die `care_consents.feature`-CHECK-Constraint um `'ai_onboarding'`. WICHTIG: Es wird KEINE neue Tabelle angelegt. Memory-Consents (memory_basis/care/personal) bleiben in `user_memory_consents` aus Mig 122 — nur der NEUE Feature-Key `ai_onboarding` wird in der bestehenden `care_consents` zugelassen, plus dokumentations-Comments auf beiden Tabellen.

**Bitte beurteilen:**
- Reicht ein CHECK-Constraint-Update, oder fehlt etwas (z.B. Audit-Trail, Consent-Versionierung, dezidierter Privacy-Notice-Hash pro Consent-Eintrag)?
- Ist die Trennung `care_consents` (Feature-Consents) vs. `user_memory_consents` (Memory-Consents) auch ohne Foreign-Key-Bruecke verstaendlich, oder ist das Refactor-Schuld?
- Ist die `.down.sql` ausreichend? (Sie wuerde den Constraint zurueck auf den engeren Wert setzen — aber was wenn schon `ai_onboarding`-Eintraege da sind?)

### Frage 7 — system_cached-Flag-Ergonomie (C5a)

Der `system_cached: true`-Flag in `provider.chat()` setzt fuer Anthropic die `cache_control:ephemeral`-Annotation auf den System-Prompt (s. `lib/ai/claude.ts` Anhang C, Zeilen 68-86). Mistral / Mock ignorieren ihn.

**Bitte beurteilen:**
- Ist die per-call Opt-in-Form korrekt, oder waere ein Provider-globales `enable_caching`-Setting + automatisches Caching aller Systems > 1024 Token besser?
- Wir trimmen NICHT auf min. Cache-Tokens — Anthropic fordert >=1024 Tokens fuer Caching. Das Wissensdokument liegt bei ~4014 Worten = ~5000 Tokens, also sicher. Fuer Spaeter (kuerzere Prompts): sollten wir guarden?
- `cache_control:ephemeral` hat 5min TTL — passt das zu einem Onboarding-Wizard wo der User vermutlich >5min braucht?

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

---

## Kontext fuer Codex (Welle-C-Stand kompakt)

- **AVV blockiert Deploy.** Anthropic/Mistral-Keys + Push erst nach GmbH-Eintragung (Notar 27.04.). `AI_PROVIDER=off` in Prod.
- **Test-Stand komplett:** 255/255 gruen in den Welle-C-Bereichen, keine npm-Dependencies neu, tsc clean ausser preexistente Skip-Liste.
- **Pre-Check-Regel** (`.claude/rules/pre-check.md`) wurde in C6a strikt durchgezogen.
- **TDD strict** in C6a: jedes File hat RED-Test vor GREEN-Implementation.
- **Senior-Mode-Constraints** (mind. 80px Touch, 4.5:1 Kontrast, max. 4 Taps) in MemoryConfirmDialog (Anhang I) und WizardChat (Anhang H, Send-Button und Input mit `style={{ minHeight: '60-80px' }}`) eingehalten.

---

# ANHAENGE — Code-Files inline

Pfade sind relativ zu `nachbar-io/`. Wenn du etwas nicht findest, sag Bescheid — ich pulle weitere Files in einer Folge-Nachricht.

## Anhang A — `supabase/migrations/173_memory_consents.sql` (46 LOC)

```sql
-- Migration 173: Memory-Consents + AI-Onboarding Consent
-- Kontext: Welle C (KI + Senior-Memory). Senior-App Stufe 1 Implementation Plan.
--
-- Zwei Aenderungen:
-- 1. care_consents (Mig 108) bekommt neuen Feature-Key 'ai_onboarding' fuer
--    DSGVO Art. 6 + 28 Consent zur KI-Datenuebermittlung (Claude/Mistral).
-- 2. Dokumentations-Comments auf care_consents + user_memory_consents,
--    damit klar ist welcher Consent-Key in welcher Tabelle wohnt.
--
-- user_memory_consents (Mig 122) bleibt Single-Source-of-Truth fuer
-- Memory-Consents (memory_basis, memory_care, memory_personal). Keine
-- neue Tabelle, keine Spaltenaenderung dort.
--
-- Rueckbau: 173_memory_consents.down.sql
-- Idempotent: ja (drop if exists + add constraint, comments sind idempotent)

begin;

-- 1. care_consents.feature CHECK-Constraint erweitern
alter table public.care_consents
  drop constraint if exists care_consents_feature_check;

alter table public.care_consents
  add constraint care_consents_feature_check
  check (feature in (
    'sos',
    'checkin',
    'medications',
    'care_profile',
    'emergency_contacts',
    'ai_onboarding'
  ));

-- 2. Dokumentations-Comments (idempotent)
comment on table public.care_consents is
  'DSGVO-Consent-Log (Feature-Level). Feature-Keys: sos, checkin, medications, '
  'care_profile, emergency_contacts, ai_onboarding. Memory-spezifische Consents '
  '(memory_basis, memory_care, memory_personal) liegen in user_memory_consents '
  '(Mig 122), nicht hier.';

comment on table public.user_memory_consents is
  'DSGVO-Consent-Log fuer KI-Memory (Mig 122). Keys via ENUM memory_consent_type: '
  'memory_basis, memory_care, memory_personal. Feature-Consents (sos, ai_onboarding, '
  'usw.) liegen in care_consents, nicht hier.';

commit;
```

## Anhang B — `lib/ai/types.ts` (71 LOC)

```ts
// lib/ai/types.ts
// Gemeinsame Typen fuer die AI-Provider-Abstraktion.
// Interface ist provider-neutral: Claude/Mistral/Mock/Off implementieren es.

export type AIRole = "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AIToolSchema {
  name: string;
  description: string;
  input_schema: Record<string, unknown>; // JSON Schema
}

export interface AIToolCall {
  name: string;
  input: Record<string, unknown>;
}

export type AIStopReason = "end_turn" | "tool_use" | "max_tokens" | "other";

export interface AIResponse {
  text: string; // Assistant-sichtbarer Text (kann "" sein, wenn nur Tool-Calls)
  tool_calls: AIToolCall[]; // Leeres Array wenn keine
  stop_reason: AIStopReason;
  usage: { input_tokens: number; output_tokens: number };
}

export interface AIChatInput {
  system: string;
  messages: AIMessage[];
  tools?: AIToolSchema[];
  max_tokens?: number; // Default 1024
  /**
   * Provider-neutraler Hinweis: System-Prompt gilt als statisch und darf
   * gecached werden. Claude packt den Prompt dann in einen Content-Block mit
   * cache_control:ephemeral (5 min TTL, -90% Input-Kosten). Andere Provider
   * ignorieren das Flag.
   */
  system_cached?: boolean;
}

export type AIProviderName = "claude" | "mistral" | "off" | "mock";

export interface AIProvider {
  /** Identifier fuer Telemetrie/Logging/Tests. Kein Routing-Key, nicht zur Provider-Auswahl gedacht. */
  readonly name: AIProviderName;
  chat(input: AIChatInput): Promise<AIResponse>;
}

/**
 * Gemeinsame Fehlerklasse fuer Provider-seitige Fehler (HTTP-Fehler,
 * Parse-Fehler, Konfigurationsfehler).
 */
export class AIProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

/**
 * Signatur fuer injizierbares fetch - erlaubt Tests ohne Netzwerk.
 */
export type FetchImpl = typeof fetch;
```

## Anhang C — `lib/ai/claude.ts` (167 LOC)

```ts
// lib/ai/claude.ts
// Anthropic-Claude-Implementierung via direktem fetch (KEIN SDK).
// Endpoint: POST https://api.anthropic.com/v1/messages
// Headers: x-api-key, anthropic-version=2023-06-01, content-type=application/json
// fetchImpl ist injizierbar fuer Tests.

import {
  AIProviderError,
  type AIChatInput,
  type AIProvider,
  type AIResponse,
  type AIStopReason,
  type AIToolCall,
  type FetchImpl,
} from "./types";

const CLAUDE_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// Offizieller Anthropic-Alias fuer Sonnet 4.6. Quelle: Anthropic Model-ID-Liste
// (https://docs.anthropic.com/en/docs/about-claude/models). Override via
// ANTHROPIC_MODEL in Env moeglich (siehe provider.ts).
const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 1024;

export interface ClaudeProviderOptions {
  apiKey: string;
  model?: string;
  /** Injizierbares fetch fuer Tests. Default: globales fetch. */
  fetchImpl?: FetchImpl;
}

interface ClaudeContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface ClaudeResponseBody {
  content?: ClaudeContentBlock[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

function mapStopReason(raw: string | undefined): AIStopReason {
  switch (raw) {
    case "end_turn":
      return "end_turn";
    case "tool_use":
      return "tool_use";
    case "max_tokens":
      return "max_tokens";
    default:
      return "other";
  }
}

class ClaudeProvider implements AIProvider {
  public readonly name = "claude" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: FetchImpl,
  ) {}

  async chat(input: AIChatInput): Promise<AIResponse> {
    // Prompt-Caching: bei system_cached=true wird der System-Prompt als
    // Content-Block-Array mit cache_control:ephemeral gesendet. 5 min TTL,
    // spart -90% Input-Kosten bei wiederholten Calls mit identischem Prompt.
    const systemPayload = input.system_cached
      ? [
          {
            type: "text" as const,
            text: input.system,
            cache_control: { type: "ephemeral" as const },
          },
        ]
      : input.system;

    const body = {
      model: this.model,
      max_tokens: input.max_tokens ?? DEFAULT_MAX_TOKENS,
      system: systemPayload,
      messages: input.messages,
      ...(input.tools && input.tools.length > 0 ? { tools: input.tools } : {}),
    };

    let response: Response;
    try {
      response = await this.fetchImpl(CLAUDE_ENDPOINT, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new AIProviderError(
        "claude",
        `Claude API fetch failed: ${(err as Error).message}`,
      );
    }

    if (!response.ok) {
      let errText = "";
      try {
        errText = await response.text();
      } catch {
        errText = "";
      }
      throw new AIProviderError(
        "claude",
        `Claude API HTTP ${response.status}: ${errText}`,
      );
    }

    let parsed: ClaudeResponseBody;
    try {
      parsed = (await response.json()) as ClaudeResponseBody;
    } catch (err) {
      throw new AIProviderError(
        "claude",
        `Claude API response not JSON: ${(err as Error).message}`,
      );
    }

    const content = parsed.content ?? [];
    const textParts: string[] = [];
    const toolCalls: AIToolCall[] = [];
    for (const block of content) {
      if (block.type === "text" && typeof block.text === "string") {
        textParts.push(block.text);
      } else if (block.type === "tool_use" && block.name) {
        toolCalls.push({
          name: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        });
      }
    }

    return {
      text: textParts.join(""),
      tool_calls: toolCalls,
      stop_reason: mapStopReason(parsed.stop_reason),
      usage: {
        input_tokens: parsed.usage?.input_tokens ?? 0,
        output_tokens: parsed.usage?.output_tokens ?? 0,
      },
    };
  }
}

export function createClaudeProvider(
  options: ClaudeProviderOptions,
): AIProvider {
  if (!options.apiKey) {
    throw new AIProviderError("claude", "ANTHROPIC_API_KEY is required");
  }
  const model = options.model ?? DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  return new ClaudeProvider(options.apiKey, model, fetchImpl);
}
```

## Anhang D — `app/api/ai/onboarding/turn/route.ts` (203 LOC)

```ts
// app/api/ai/onboarding/turn/route.ts
// C5b — Onboarding-Wizard-Turn fuer die Senior-App.
//
// Ein Turn besteht aus: Client schickt vorherige History + neuen userInput,
// die Route baut den System-Prompt aus dem Wissensdokument (C3) plus einem
// Memory-Block (loadMemoryContext) und ruft den konfigurierten AI-Provider
// (C2) auf. Tool-Calls (save_memory, C4) werden serverseitig ausgefuehrt und
// das Ergebnis kommt strukturiert zum Client zurueck. Stateless - der Client
// ist fuer die Persistenz der Conversation verantwortlich.
//
// AVV-Blocker: Solange AI_PROVIDER=off oder noch nicht gesigned, antwortet
// die Route mit 503. Kein Silent-Fallback.

import type { NextRequest } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import {
  getProvider,
  AIProviderError,
  type AIMessage,
  type AIToolCall,
} from "@/lib/ai/provider";
import { loadMemoryContext } from "@/modules/memory/services/memory-loader";
import { buildMemoryTool } from "@/modules/memory/services/chat-integration";
import {
  saveMemoryToolHandler,
  type SaveMemoryResult,
} from "@/lib/ai/tools/save-memory";
import { loadSeniorAppKnowledge } from "@/lib/ai/system-prompts/loader";

// Max Tool-Calls pro Turn. Schuetzt vor Runaway wenn der Provider
// unerwartet viele save_memory-Calls in einer Response emittiert.
const MAX_TOOLS_PER_TURN = 3;
// Max Token fuer Assistant-Output. Der System-Prompt selbst ist wesentlich
// groesser, wird aber via system_cached nur alle 5 Minuten neu abgerechnet.
const MAX_TOKENS = 1024;

interface TurnRequest {
  messages: AIMessage[];
  userInput: string;
}

function parseRequest(
  body: unknown,
): { ok: true; data: TurnRequest } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const raw = body as Record<string, unknown>;

  const messages = raw["messages"];
  if (!Array.isArray(messages)) {
    return { ok: false, message: "messages must be an array" };
  }
  for (const [i, m] of messages.entries()) {
    if (typeof m !== "object" || m === null) {
      return { ok: false, message: `messages[${i}] must be an object` };
    }
    const msg = m as Record<string, unknown>;
    if (msg["role"] !== "user" && msg["role"] !== "assistant") {
      return {
        ok: false,
        message: `messages[${i}].role must be 'user' or 'assistant'`,
      };
    }
    if (typeof msg["content"] !== "string") {
      return { ok: false, message: `messages[${i}].content must be a string` };
    }
  }

  const userInput = raw["userInput"];
  if (typeof userInput !== "string" || userInput.trim().length === 0) {
    return { ok: false, message: "userInput must be a non-empty string" };
  }

  return {
    ok: true,
    data: {
      messages: messages as AIMessage[],
      userInput,
    },
  };
}

export async function POST(request: NextRequest) {
  // 1. Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();
  const { supabase, user } = auth;

  // 2. Request-Body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungueltiger Request-Body (JSON)", 400);
  }
  const parsed = parseRequest(body);
  if (!parsed.ok) {
    return errorResponse(parsed.message, 400);
  }
  const { messages, userInput } = parsed.data;

  // 3. Memory-Kontext laden (relevant fuer den neuen userInput)
  let memoryBlock = "";
  try {
    memoryBlock = await loadMemoryContext(
      supabase,
      user.id,
      userInput,
      "plus_chat",
    );
  } catch (err) {
    console.warn(
      "[ai/onboarding/turn] loadMemoryContext-Fehler, Fallback ohne Memory:",
      err,
    );
  }

  // 4. System-Prompt bauen (Wissensdokument + Memory-Block)
  const knowledge = await loadSeniorAppKnowledge();
  const systemPrompt = memoryBlock
    ? `${knowledge}\n\n${memoryBlock}`
    : knowledge;

  // 5. Provider holen - bei AI_PROVIDER=off wird hier geworfen
  let provider;
  try {
    provider = getProvider();
  } catch (err) {
    if (err instanceof AIProviderError) {
      return errorResponse("KI-Assistent ist deaktiviert (ai_disabled)", 503);
    }
    throw err;
  }

  // 6. Chat-Call
  const chatMessages: AIMessage[] = [
    ...messages,
    { role: "user", content: userInput },
  ];

  let response;
  try {
    response = await provider.chat({
      system: systemPrompt,
      system_cached: true, // C5a: 5min-Cache fuer -90% Input-Kosten
      messages: chatMessages,
      tools: [buildMemoryTool()],
      max_tokens: MAX_TOKENS,
    });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return errorResponse(
        "KI-Assistent ist gerade nicht erreichbar (ai_disabled)",
        503,
      );
    }
    throw err;
  }

  // 7. Tool-Calls ausfuehren (wenn vorhanden und innerhalb des Limits)
  const toolCalls: AIToolCall[] = response.tool_calls ?? [];
  if (toolCalls.length > MAX_TOOLS_PER_TURN) {
    return errorResponse(
      `Zu viele Tool-Calls in einem Turn (Limit ${MAX_TOOLS_PER_TURN}, erhalten ${toolCalls.length}). Verdacht auf Tool-Loop-Overflow.`,
      500,
    );
  }

  const toolResults: SaveMemoryResult[] = [];
  for (const call of toolCalls) {
    if (call.name !== "save_memory") {
      toolResults.push({
        ok: false,
        reason: "validation_error",
        message: `unknown tool: ${call.name}`,
      });
      continue;
    }
    const result = await saveMemoryToolHandler(call, {
      actor: { userId: user.id, role: "senior" },
      targetUserId: user.id,
      supabase,
    });
    toolResults.push(result);
  }

  // 8. Response
  return Response.json({
    assistant_text: response.text,
    tool_results: toolResults,
    stop_reason: response.stop_reason,
  });
}
```

## Anhang E — `lib/ai/tools/save-memory.ts` (284 LOC)

```ts
// lib/ai/tools/save-memory.ts
// C4 — save_memory Tool-Adapter fuer die KI-Provider.
//
// Dieser Adapter ist bewusst duenn: alle schwere Logik (4-Stufen-Validation,
// Medizin-Blocklist, AES-Verschluesselung, Audit-Log) liegt bereits in
// modules/memory/services/. Der Adapter uebersetzt AIToolCall -> Service-Call
// und verpackt das Ergebnis in ein Shape, das die KI als Tool-Response lesen
// kann.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIToolCall } from "@/lib/ai/types";
import {
  CATEGORY_TO_CONSENT,
  SENSITIVE_CATEGORIES,
  MEMORY_LIMITS,
  type MemoryActorRole,
  type MemoryCategory,
  type MemorySaveProposal,
} from "@/modules/memory/types";
import {
  validateMemorySave,
  saveFact,
  getFactCount,
} from "@/modules/memory/services/facts.service";
import { hasConsent } from "@/modules/memory/services/consent.service";

const VALID_CATEGORIES: readonly MemoryCategory[] = [
  "profile",
  "routine",
  "preference",
  "contact",
  "care_need",
  "personal",
];

const VALUE_MAX_LEN = 500;

export type ParseResult =
  | { ok: true; proposal: MemorySaveProposal }
  | { ok: false; reason: "validation_error"; message: string };

export type SaveMemoryResult =
  | {
      ok: true;
      mode: "save";
      factId: string;
      category: MemoryCategory;
      key: string;
    }
  | {
      ok: true;
      mode: "confirm";
      factId: null;
      category: MemoryCategory;
      key: string;
      value: string;
    }
  | {
      ok: false;
      reason:
        | "validation_error"
        | "scope_violation"
        | "consent_missing"
        | "medical_blocked"
        | "limit_reached"
        | "db_error";
      message: string;
    };

export interface SaveMemoryContext {
  actor: { userId: string; role: MemoryActorRole };
  targetUserId: string;
  supabase: SupabaseClient;
}

export function parseToolInput(toolCall: AIToolCall): ParseResult {
  if (toolCall.name !== "save_memory") {
    return {
      ok: false,
      reason: "validation_error",
      message: `unknown tool: ${toolCall.name}`,
    };
  }

  const input = toolCall.input ?? {};

  const category = input["category"];
  if (
    typeof category !== "string" ||
    !VALID_CATEGORIES.includes(category as MemoryCategory)
  ) {
    return {
      ok: false,
      reason: "validation_error",
      message: "category missing or not in allowed enum",
    };
  }

  const key = input["key"];
  if (typeof key !== "string" || key.trim().length === 0) {
    return {
      ok: false,
      reason: "validation_error",
      message: "key missing or whitespace-only",
    };
  }

  const value = input["value"];
  if (typeof value !== "string" || value.length === 0) {
    return {
      ok: false,
      reason: "validation_error",
      message: "value missing or empty",
    };
  }
  if (value.length > VALUE_MAX_LEN) {
    return {
      ok: false,
      reason: "validation_error",
      message: `value exceeds ${VALUE_MAX_LEN} chars`,
    };
  }

  const confidence = input["confidence"];
  if (
    typeof confidence !== "number" ||
    Number.isNaN(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    return {
      ok: false,
      reason: "validation_error",
      message: "confidence must be a number in [0,1]",
    };
  }

  const needs_confirmation = input["needs_confirmation"];
  if (typeof needs_confirmation !== "boolean") {
    return {
      ok: false,
      reason: "validation_error",
      message: "needs_confirmation must be boolean",
    };
  }

  return {
    ok: true,
    proposal: {
      category: category as MemoryCategory,
      key: key.trim(),
      value,
      confidence,
      needs_confirmation,
    },
  };
}

export async function saveMemoryToolHandler(
  toolCall: AIToolCall,
  ctx: SaveMemoryContext,
): Promise<SaveMemoryResult> {
  const parsed = parseToolInput(toolCall);
  if (!parsed.ok) return parsed;

  // Welle C: nur Senior darf ueber sich selbst speichern. Caregiver-Scope
  // (via aktivem caregiver_link) kommt in C8.
  if (ctx.actor.role !== "senior") {
    return {
      ok: false,
      reason: "scope_violation",
      message: `actor role '${ctx.actor.role}' nicht erlaubt in Welle C (Senior-only)`,
    };
  }
  if (ctx.targetUserId !== ctx.actor.userId) {
    return {
      ok: false,
      reason: "scope_violation",
      message: "Senior kann nur ueber sich selbst speichern",
    };
  }

  const consentType = CATEGORY_TO_CONSENT[parsed.proposal.category];
  const sensitive = SENSITIVE_CATEGORIES.includes(parsed.proposal.category);
  const [consentGranted, factCount] = await Promise.all([
    hasConsent(ctx.supabase, ctx.targetUserId, consentType),
    getFactCount(ctx.supabase, ctx.targetUserId, sensitive),
  ]);
  const maxFacts = sensitive
    ? MEMORY_LIMITS.SENSITIVE_MAX
    : MEMORY_LIMITS.BASIS_MAX;

  const decision = validateMemorySave(parsed.proposal, {
    hasConsent: consentGranted,
    factCount,
    maxFacts,
  });

  if (!decision.allowed) {
    return {
      ok: false,
      reason: mapRejectionReason(decision.reason),
      message: `memory rejected: ${decision.reason ?? "unknown"}`,
    };
  }

  if (decision.mode === "confirm") {
    return {
      ok: true,
      mode: "confirm",
      factId: null,
      category: parsed.proposal.category,
      key: parsed.proposal.key,
      value: parsed.proposal.value,
    };
  }

  try {
    const fact = await saveFact(ctx.supabase, {
      category: parsed.proposal.category,
      key: parsed.proposal.key,
      value: parsed.proposal.value,
      source: "ai_learned",
      sourceUserId: ctx.actor.userId,
      confidence: parsed.proposal.confidence,
      confirmed: false,
    });
    return {
      ok: true,
      mode: "save",
      factId: fact.id,
      category: parsed.proposal.category,
      key: parsed.proposal.key,
    };
  } catch (e) {
    return {
      ok: false,
      reason: "db_error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

type RejectionReason =
  | "consent_missing"
  | "medical_blocked"
  | "limit_reached"
  | "validation_error";

function mapRejectionReason(reason: string | undefined): RejectionReason {
  switch (reason) {
    case "no_consent":
      return "consent_missing";
    case "medical_blocked":
      return "medical_blocked";
    case "limit_reached":
      return "limit_reached";
    default:
      return "validation_error";
  }
}
```

## Anhang F — `modules/voice/hooks/useTtsPlayback.ts` (173 LOC)

```ts
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { getIOSAudioManager } from "../services/ios-audio-manager";

interface VoicePrefs {
  voice: string;
  speed: number;
}

const DEFAULTS: VoicePrefs = { voice: "ash", speed: 0.95 };

function readVoicePrefs(): VoicePrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem("quartier-voice-prefs-synced");
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<VoicePrefs>;
    return {
      voice: parsed.voice || DEFAULTS.voice,
      speed: typeof parsed.speed === "number" ? parsed.speed : DEFAULTS.speed,
    };
  } catch {
    return DEFAULTS;
  }
}

export interface UseTtsPlaybackReturn {
  play: (text: string) => Promise<void>;
  stop: () => void;
  isLoading: boolean;
  isPlaying: boolean;
}

export function useTtsPlayback(): UseTtsPlaybackReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const stopInternal = useCallback(() => {
    try { getIOSAudioManager().stop(); } catch {}
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
    }
    if (objectUrlRef.current) {
      try { URL.revokeObjectURL(objectUrlRef.current); } catch {}
      objectUrlRef.current = null;
    }
    audioRef.current = null;
  }, []);

  const stop = useCallback(() => {
    stopInternal();
    setIsPlaying(false);
  }, [stopInternal]);

  const play = useCallback(
    async (text: string) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      stopInternal();
      setIsPlaying(false);
      setIsLoading(true);

      try {
        const { voice, speed } = readVoicePrefs();
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed.slice(0, 1000), voice, speed }),
        });
        if (!res.ok) throw new Error(`TTS-Fehler: ${res.status}`);
        const blob = await res.blob();

        const manager = getIOSAudioManager();
        if (manager.canPlay()) {
          setIsLoading(false);
          setIsPlaying(true);
          try {
            await manager.playBlob(blob);
          } finally {
            setIsPlaying(false);
          }
          return;
        }

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setIsPlaying(false);
          if (objectUrlRef.current === url) {
            try { URL.revokeObjectURL(url); } catch {}
            objectUrlRef.current = null;
          }
        };
        audio.onerror = () => {
          setIsPlaying(false);
          if (objectUrlRef.current === url) {
            try { URL.revokeObjectURL(url); } catch {}
            objectUrlRef.current = null;
          }
          toast.error("Wiedergabefehler.");
        };

        setIsLoading(false);
        setIsPlaying(true);
        await audio.play().catch(() => {
          setIsPlaying(false);
          throw new Error("playback_blocked");
        });
      } catch {
        setIsLoading(false);
        setIsPlaying(false);
        toast.error("Sprachausgabe nicht verfuegbar.");
      }
    },
    [stopInternal],
  );

  useEffect(() => {
    return () => { stopInternal(); };
  }, [stopInternal]);

  return { play, stop, isLoading, isPlaying };
}
```

## Anhang G — `modules/voice/hooks/useOnboardingTurn.ts` (169 LOC)

```ts
"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { AIMessage } from "@/lib/ai/types";
import type { SaveMemoryResult } from "@/lib/ai/tools/save-memory";

export type OnboardingError = "unauthorized" | "ai_disabled" | "generic" | null;

export type PendingConfirmation = Extract<
  SaveMemoryResult,
  { ok: true; mode: "confirm" }
>;

interface TurnResponse {
  assistant_text: string;
  tool_results: SaveMemoryResult[];
  stop_reason: string;
}

export interface UseOnboardingTurnReturn {
  messages: AIMessage[];
  isLoading: boolean;
  error: OnboardingError;
  pendingConfirmations: PendingConfirmation[];
  sendUserInput: (text: string) => Promise<void>;
  confirmMemory: (item: PendingConfirmation) => Promise<void>;
  dismissConfirmation: (item: PendingConfirmation) => void;
  reset: () => void;
}

function isPendingConfirmation(
  result: SaveMemoryResult,
): result is PendingConfirmation {
  return result.ok === true && result.mode === "confirm";
}

export function useOnboardingTurn(): UseOnboardingTurnReturn {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<OnboardingError>(null);
  const [pendingConfirmations, setPendingConfirmations] = useState<
    PendingConfirmation[]
  >([]);

  const sendUserInput = useCallback(
    async (text: string) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/ai/onboarding/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, userInput: trimmed }),
        });

        if (res.status === 401) { setError("unauthorized"); return; }
        if (res.status === 503) { setError("ai_disabled"); return; }
        if (!res.ok) {
          setError("generic");
          toast.error("Der KI-Assistent ist gerade nicht erreichbar. Bitte erneut versuchen.");
          return;
        }

        const data = (await res.json()) as TurnResponse;

        setMessages((prev) => [
          ...prev,
          { role: "user", content: trimmed },
          { role: "assistant", content: data.assistant_text },
        ]);

        const newConfirms = (data.tool_results ?? []).filter(isPendingConfirmation);
        if (newConfirms.length > 0) {
          setPendingConfirmations((prev) => [...prev, ...newConfirms]);
        }
      } catch {
        setError("generic");
        toast.error("Verbindungsfehler. Bitte erneut versuchen.");
      } finally {
        setIsLoading(false);
      }
    },
    [messages],
  );

  const confirmMemory = useCallback(async (item: PendingConfirmation) => {
    try {
      const res = await fetch("/api/memory/facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: item.category, key: item.key, value: item.value }),
      });

      if (!res.ok) { toast.error("Speichern fehlgeschlagen."); return; }

      toast.success("Gespeichert.");
      setPendingConfirmations((prev) =>
        prev.filter((p) => !(p.category === item.category && p.key === item.key)),
      );
    } catch {
      toast.error("Verbindungsfehler beim Speichern.");
    }
  }, []);

  const dismissConfirmation = useCallback((item: PendingConfirmation) => {
    setPendingConfirmations((prev) =>
      prev.filter((p) => !(p.category === item.category && p.key === item.key)),
    );
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setPendingConfirmations([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    messages, isLoading, error, pendingConfirmations,
    sendUserInput, confirmMemory, dismissConfirmation, reset,
  };
}
```

## Anhang H — `modules/voice/components/onboarding/WizardChat.tsx` (140 LOC)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useOnboardingTurn } from "@/modules/voice/hooks/useOnboardingTurn";
import { useTtsPlayback } from "@/modules/voice/hooks/useTtsPlayback";
import { MemoryConfirmDialog } from "@/modules/voice/components/onboarding/MemoryConfirmDialog";
import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<string, string> = {
  ai_disabled: "Der KI-Assistent ist gerade nicht verfuegbar. Bitte versuchen Sie es spaeter erneut.",
  unauthorized: "Bitte melden Sie sich an, um den KI-Assistenten zu nutzen.",
  generic: "Etwas ist schiefgegangen. Bitte versuchen Sie es erneut.",
};

export function WizardChat() {
  const {
    messages, isLoading, error, pendingConfirmations,
    sendUserInput, confirmMemory, dismissConfirmation,
  } = useOnboardingTurn();
  const { play } = useTtsPlayback();

  const [input, setInput] = useState("");
  const lastSpokenIndexRef = useRef<number>(-1);

  // Auto-Play TTS bei neuer Assistant-Antwort
  useEffect(() => {
    if (messages.length === 0) return;
    const lastIndex = messages.length - 1;
    const last = messages[lastIndex];
    if (last.role !== "assistant") return;
    if (lastIndex === lastSpokenIndexRef.current) return;
    lastSpokenIndexRef.current = lastIndex;
    void play(last.content);
  }, [messages, play]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendUserInput(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const firstPending = pendingConfirmations[0] ?? null;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="mt-8 text-center text-lg text-[#2D3142]/60">
            Sagen oder schreiben Sie mir etwas ueber sich, damit ich Sie kennenlernen kann.
          </div>
        )}
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "self-end max-w-[80%] rounded-2xl bg-[#4CAF87] px-4 py-3 text-lg text-white"
                  : "self-start max-w-[85%] rounded-2xl bg-[#F3F4F6] px-4 py-3 text-lg text-[#2D3142]"
              }
            >
              {m.content}
            </div>
          ))}
        </div>
        {isLoading && (
          <div className="mt-3 self-start text-base text-[#2D3142]/60">Einen Moment...</div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3 text-base text-[#2D3142]">
          {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.generic}
        </div>
      )}

      <div className="border-t border-[#2D3142]/10 bg-white p-4">
        <div className="flex items-stretch gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ihre Antwort..."
            disabled={isLoading}
            aria-label="Ihre Antwort"
            className="flex-1 rounded-xl border border-[#2D3142]/20 bg-white px-4 py-3 text-lg text-[#2D3142] outline-none focus:border-[#4CAF87]"
            style={{ minHeight: "60px" }}
          />
          <Button
            onClick={() => void handleSend()}
            disabled={isLoading || input.trim().length === 0}
            className="rounded-xl bg-[#4CAF87] px-6 text-lg font-semibold text-white hover:bg-[#4CAF87]/90"
            style={{ minHeight: "60px", touchAction: "manipulation" }}
          >
            Senden
          </Button>
        </div>
      </div>

      <MemoryConfirmDialog
        item={firstPending}
        onConfirm={() => firstPending && void confirmMemory(firstPending)}
        onCancel={() => firstPending && dismissConfirmation(firstPending)}
      />
    </div>
  );
}
```

## Anhang I — `modules/voice/components/onboarding/MemoryConfirmDialog.tsx` (83 LOC)

```tsx
"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PendingConfirmation } from "@/modules/voice/hooks/useOnboardingTurn";
import type { MemoryCategory } from "@/modules/memory/types";

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  profile: "Profil",
  routine: "Tagesablauf",
  preference: "Vorliebe",
  contact: "Kontakt",
  care_need: "Pflege-Hinweis",
  personal: "Persoenlich",
};

interface MemoryConfirmDialogProps {
  item: PendingConfirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MemoryConfirmDialog({ item, onConfirm, onCancel }: MemoryConfirmDialogProps) {
  if (!item) return null;
  const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogTitle className="text-2xl font-semibold text-[#2D3142]">
          Soll ich mir das merken?
        </DialogTitle>
        <DialogDescription className="text-base text-[#2D3142]/70">
          Ich habe folgende Information aus dem Gespraech entnommen:
        </DialogDescription>

        <div className="my-4 rounded-xl border border-[#4CAF87]/30 bg-[#4CAF87]/5 p-4">
          <div className="text-sm uppercase tracking-wide text-[#2D3142]/60">
            {categoryLabel}
          </div>
          <div className="mt-1 text-xl font-medium text-[#2D3142]">
            {item.value}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={onConfirm}
            className="w-full rounded-xl bg-[#4CAF87] text-lg font-semibold text-white hover:bg-[#4CAF87]/90"
            style={{ minHeight: "80px", touchAction: "manipulation" }}
          >
            Ja, speichern
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full rounded-xl border-[#2D3142]/20 text-lg font-medium text-[#2D3142]"
            style={{ minHeight: "80px", touchAction: "manipulation" }}
          >
            Nein, danke
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## Anhang J — `app/(senior)/ki-wizard/page.tsx` (29 LOC)

```tsx
"use client";

import { WizardChat } from "@/modules/voice/components/onboarding/WizardChat";

export default function KiWizardPage() {
  return (
    <div className="-mx-6 -my-8 flex h-[100dvh] flex-col">
      <header className="border-b border-[#2D3142]/10 bg-white px-6 py-4">
        <h1 className="text-2xl font-semibold text-[#2D3142]">
          Lernen wir uns kennen
        </h1>
        <p className="mt-1 text-base text-[#2D3142]/70">
          Erzaehlen Sie mir etwas ueber sich, damit ich Ihnen besser helfen kann.
        </p>
      </header>
      <div className="flex-1 overflow-hidden">
        <WizardChat />
      </div>
    </div>
  );
}
```

---

**Ende der Anhänge.** Alle 7 Fragen sollten jetzt mit dem Inline-Code beantwortbar sein. Falls du `lib/ai/provider.ts`, `lib/ai/mistral.ts`, `lib/ai/off.ts`, `modules/memory/services/*` oder die Test-Files brauchst, sag Bescheid — ich liefere nach.
