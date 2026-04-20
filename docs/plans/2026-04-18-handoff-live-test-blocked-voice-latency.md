# Handoff — Live-Test blockiert, AI-Sprache zu langsam

Stand: 2026-04-18, mittags

## Was seit letztem Handoff erledigt ist

Session heute morgen (Crash danach) hat drei Bugs aus dem Live-Test gefixt.
Alle Commits + Migrationen + Vercel-Deploy sind live auf Prod.

### Code / Migrationen
- `52e97b8` — `fix(auth): backfill NULL token columns in auth.users`
- `1dabe4b` + Mig **165** (`on_chat_group_created` Trigger +
  `add_chat_group_creator_as_admin()` SECURITY-DEFINER Function) +
  Mig **166** (Creator-Select-Policy auf `chat_groups`) — loest RLS-Race
  beim Gruppe-Anlegen. Creator wird atomar Admin, bevor `.select()` greift.
- `0972370` + Mig **167** (`get_display_names(uuid[])` SECURITY-DEFINER RPC)
  — Chat-UI zeigte `89b7c18d…` statt Namen, weil `public.users` RLS auf
  Same-Quarter gated ist und Chat-MVP cross-quarter ist. RPC gibt
  nur `(id, display_name)` zurueck, nur fuer Peers die via accepted
  `contact_link` oder geteilte Chat-Gruppe erreichbar sind. Own name immer
  lesbar. Kein Oversharing.
- `modules/chat/services/display-names.ts` batch-Helper + Enrichment in
  `listContacts` / `listConversations`.

### Prod-Sync verifiziert
- `schema_migrations` hat heute: `20260418054815`, `074112`, `074413`, `075949`
- DB-Objekte pruefen gruen: Trigger `on_chat_group_created` da, Policy
  creator-related auf `chat_groups` da, RPC `get_display_names` da
- Vercel manuell deployed 2026-04-18 mittags → `dpl_jz4ozi1afirTSQcdH3SyCw9tnt1L`,
  aliased auf `https://nachbar-io.vercel.app`

### Working tree
- Clean. Alles gepusht auf `origin/master`.
- Untracked: `supabase/migrations/067_doctor_registration_BACKUP_DB.sql`
  (alter Backup, nicht relevant — nicht mit in den nächsten Commit nehmen).

## Was blockiert den Live-Test

Versuch den Live-Test via Chrome-MCP zu fahren ist an zwei Dingen gescheitert:

1. **Browser-Extension disconnected.** `form_input` liefert:
   "Browser extension is not connected." Claude-in-Chrome-Extension war
   im Moment des Tests nicht verbunden / nicht eingeloggt.
2. **Latenz zu hoch fuer live-Testing.** Thomas: Antwortzeiten im
   Chrome-MCP-Loop zu lang zum produktiven Durchklicken. Ausserdem:
   "Die Sprache der KI geht nur beim Testen" — AI-Voice-Feature in der
   App (vermutlich `voice_preferences`-Flow / `quartier-info-vorlesen`)
   antwortet zu langsam und/oder nur in Test-Gate.

## Setup fuer Live-Test (falls in naechster Session fortgesetzt)

- Zwei Browser-Tabs auf `https://nachbar-io.vercel.app/login`:
  - Tab A: `ThomasTh@gmx.de` (Admin, `dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd`,
    role doctor, is_admin) — OTP aus GMX-Postfach.
  - Tab B: `theovonbald@gmail.com` (Test, `61b42c9d-1918-4015-a4ab-dc076f6d7793`,
    role resident) — OTP aus Gmail. Claude kann das Postfach via Gmail-MCP
    lesen, wenn Claude den Login per Chrome-MCP macht.
- Beide Accounts haben `display_name` gesetzt (Thomas / Theo V.).
- Flow: Thomas → Contact-Request an Theo → Theo accept → 1:1 Chat →
  Media-Upload → Gruppe anlegen → Mitglied hinzufuegen → Realtime cross-tab.

## Naechste Session — Optionen in Prio-Reihenfolge

1. **Voice-Latenz-Problem diagnostizieren und loesen.** Thomas hat explizit
   das als Blocker markiert. Fragen:
   - Welcher Endpoint / welches Modul? (vermutlich `quartier-info-vorlesen`
     oder `voice_preferences` + TTS-Call)
   - Wo ist der Test-Gate, warum funktioniert's nur im Test-Modus?
   - Wo entsteht die Latenz? (TTS-Provider, Streaming vs Batch,
     Edge-Function-Cold-Start?)
   - Loesung kann sein: Streaming-TTS, schnelleres Modell, lokales Caching,
     anderer Provider.
2. **Chrome-MCP-Bridge fixen oder Live-Test anders fahren.**
   - Extension-Status pruefen, ggf. Chrome neu starten.
   - Alternative: Thomas klickt selbst im Browser, Claude begleitet nur
     mit SQL-Checks / Hotfixes. Das war der bisher produktivste Modus.
3. **Live-Test fortsetzen** wenn 1+2 geloest — Reihenfolge siehe oben.
4. **Schritt 4 (Invite-Flow DACH)** danach — shareable Link + Mail-Send
   statt UUID-Copy-Paste.

## Nicht verwechseln

- `group_members` (Mig 133) = Interest-Groups, **NICHT** Chat. Chat nutzt
  `chat_group_members` (Mig 161 + Namespace-Fix).
- `conversations.quarter_id` Spalte existiert noch, ist aber nicht mehr
  RLS-relevant. Cleanup ist eigene Task.
- Vercel-Auto-Deploy-on-Push ist kaputt (Turbopack-Artifact-Format,
  Next.js 16). Workflow triggert nur auf Cron (jede 3h, Min 17) oder
  manuellem `workflow_dispatch`. Fuer sofortigen Deploy immer
  `npx vercel --prod --yes` lokal.
