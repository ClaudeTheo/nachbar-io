# S2 Schritt 3 — Chat vereinheitlichen (`/messages` → `/chat`)

> **Stand 2026-06-14.** Ausführbarer Migrationsplan. Erstellt nach Pre-Check, weil Schritt 3
> **test-verflochten** ist (entgegen der Übergabe-Einschätzung „niedrigstes Risiko"): ALLE
> Chat-E2E fahren `/messages`, **0** fahren `/chat`. Redirect ohne lockstep-Test-Migration
> bricht die gerade grün gemachte Suite. → In **EINEM Commit** ausführen.

## Ziel (Wave-Plan Schritt 3, Befund C2:3)
`/chat/[id]` (medienfähig, gruppenfähig, vom Dashboard schon genutzt) wird kanonisch.
`/messages` + `/messages/[id]` werden **Redirect-Shims** auf `/chat` + `/chat/[id]`. Alle
App-Links + die E2E-Suite ziehen auf `/chat` um.

## Warum koordiniert (CI-Fakten)
CI-E2E läuft `--project=multi-agent` (`scenarios/s[0-46-9]*` = s1-4,s6-13) + `--project=senior-terminal`
(s5) + Smoke-Job (s7). **NICHT** auf CI: `multi-agent-sim` (phase-*), `cross-portal`, `pilot-smoke`.
→ CI-gating-Specs mit `/messages`: **s3, s6, s7, s12, s13 + `pages/messages.page.ts`** (Page-Object).
Diese MÜSSEN im selben Commit migriert werden. phase-a/phase-b/pilot-smoke gehören aus Korrektheit
auch migriert (brechen aber das Push-Gate nicht).

## Teil A — Redirect-Shims (Kern)
1. `app/(app)/messages/[id]/page.tsx` → Server-Redirect:
   ```tsx
   import { redirect } from "next/navigation";
   export default async function MessagesIdRedirect({ params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
     redirect(`/chat/${id}`); // 307/308, serverseitig
   }
   ```
   (Ersetzt die ~514-Zeilen-Legacy-Detailseite vollständig — `/chat/[id]` ist der medienfähige Ersatz.)
2. `app/(app)/messages/page.tsx` → Server-Redirect:
   ```tsx
   import { redirect } from "next/navigation";
   export default function MessagesRedirect() { redirect("/chat"); }
   ```
   (Ersetzt die Legacy-Listenseite — `/chat` ist die reichere Liste inkl. Gruppen + Kontaktanfragen.)
   **Defense-in-Depth (optional, sauber):** zusätzlich `legacyRedirects`-Map in
   `lib/supabase/middleware.ts` (`/messages` → `/chat`) analog vorhandenem Muster — VOR Closed-Pilot-Gate.

## Teil B — App-Detail-Links `/messages/${id}` → `/chat/${id}`
| Datei:Zeile | Aktion |
|---|---|
| `app/(app)/care/contact/page.tsx:71` | `router.push(\`/chat/${data.conversation_id}\`)` |
| `app/(app)/care/meine-senioren/[seniorId]/page.tsx:308` | `router.push(\`/chat/${data.conversation_id}\`)` |
| `app/(app)/experts/[userId]/page.tsx:252,265` | `/chat/${existing.id}` bzw. `/chat/${newConv.id}` |
| `app/(app)/leihboerse/[id]/page.tsx:157` | `/chat/${convId}` |
| `app/(app)/marketplace/[id]/page.tsx:199` | `/chat/${convId}` |
| `components/HouseInfoPanel.tsx:209,223` | `/chat/${existing.id}` bzw. `/chat/${newConv.id}` |

## Teil C — App-Listen-Links `/messages` → `/chat`
| Datei:Zeile | Aktion |
|---|---|
| `app/(app)/my-day/page.tsx:204` | `href: "/chat"` |
| `app/(app)/notifications/page.tsx:44,48,49` | Route-Map `message`/`connection_accepted`/`connection_declined` → `"/chat"` |
| `lib/services/notifications.service.ts:24,27,28` | Server-Route-Map (Push-Deeplinks) → `"/chat"` |
| `modules/voice/services/tools.ts:34` + Prompt-Text `:526` | Voice-Nav-Ziel `/messages` → `/chat` (Prompt: „/chat (Nachrichten)") |

> Reine Kommentare (kein Change): `app/(app)/dashboard/page.tsx:61`, `app/(app)/care/status/page.tsx:163`
> (beschreiben bereits den /chat-Stand). `lib/ai/claude.ts` u.a. = Anthropic-API-URL, NICHT betroffen.

## Teil D — E2E-Migration (lockstep, CI-gating zuerst)
**Muss (CI-gating):**
- `tests/e2e/pages/messages.page.ts` — `goto("/messages")` → `/chat`, `waitForURL("**/messages/**")` → `**/chat/**`,
  Selektoren `a[href^='/messages/']` → `a[href^='/chat/']`. (Page-Object zentral → viele Specs erben den Fix.)
- `tests/e2e/scenarios/s3-chat.spec.ts` — `goto("/messages")`→`/chat`; `toHaveURL(/\/messages/)`→`/\/chat/`;
  `a[href^='/messages/']`→`a[href^='/chat/']`; `toHaveURL(/\/messages\/.+/)`→`/\/chat\/.+/`.
- `tests/e2e/scenarios/s12-neighbor-request-chat.spec.ts` — `goto("/messages")`→`/chat`;
  `waitForURL(/\/messages\/.+/)`→`/\/chat\/.+/`; Kommentar Z.2 anpassen.
- `tests/e2e/scenarios/s13-five-user-interaction.spec.ts` — `goto("/messages")`+`/messages/${id}` → `/chat` Pendants.
- `tests/e2e/scenarios/s6-permissions.spec.ts:29` — `goto("/messages")` → `/chat` (kanonische geschützte Route;
  Redirect-zu-Login-Check bleibt gültig).
- `tests/e2e/scenarios/s7-smoke.spec.ts:110` — Liste der auth-geschützten Routen `/messages` → `/chat`.

**Soll (nicht CI-gating, Korrektheit):**
- `tests/e2e/multi-agent/phase-a-solo.spec.ts:260`, `phase-b-cross-role.spec.ts:570,594`
- `tests/e2e/pilot-smoke.spec.ts:164,165` (Kommentar + `goto`)

**Achtung Selektor-Erwartung:** `/chat` (Liste) verlinkt Einzelchats als `a[href="/chat/<id>"]` via
`ConversationListItem` (verifiziert) → `a[href^='/chat/']` matcht. Gruppen sind `a[href^='/chat-groups/']`
(matcht NICHT `/chat/`, gut — Specs wollen 1:1-Chats). `/chat` rendert „Einzelchats"-Sektion erst wenn
`listConversations()` Daten liefert; s3/s12/s13 legen vorher Konversationen an → Liste ist befüllt.

## Verifikation (vor Push, in dieser Reihenfolge)
1. `npx tsc --noEmit` clean.
2. `npm run lint` clean.
3. Grep-Gate: `grep -rInE "/messages(/|\")" app components modules lib` ergibt nur noch API-Pfade
   (`/api/...`, `conversations/[id]/messages`, `chat-groups/[id]/messages`, `prevention/messages`) +
   `https://api.anthropic.com/v1/messages`. Keine Navigations-Treffer mehr.
4. Lokaler E2E gegen lokalen Stack wenn möglich: `s3` + `s12` (die /chat-Detail beweisen).
5. Push → CI (multi-agent + senior-terminal + smoke) grün abwarten (~22 min).

## Rollback
Alles in EINEM Commit → `git revert <sha>` stellt `/messages` vollständig wieder her. Keine Migration,
keine DB-Änderung, kein Prod-Deploy (workflow_dispatch only).

## Mini-Audit
**Nicht nötig** (kein Auth-/RLS-/Admin-Surface, kein Token-/Code-Pfad, keine neue Migration) —
reiner Routen-/Link-Umbau. Pre-Check (dieser Plan) reicht.

## Definition of Done
`/chat` ist die einzige Chat-Oberfläche; `/messages*` leitet nur noch um; keine App-Stelle linkt mehr
navigatorisch auf `/messages`; CI (s3/s6/s7/s12/s13 + s5) grün.
