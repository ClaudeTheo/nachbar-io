# 2026-04-28 spaet abend — Late-Evening-Handover (Claude-Audit-Block)

> **Historischer Claude-Audit-Snapshot.** Diese Datei wurde nachtraeglich im
> Codex-Nachtabschluss gespeichert, ist aber nicht mehr der frischeste Stand.
> Frischeste Abschlussdateien:
> `docs/plans/2026-04-28-night-handover.md` und
> `docs/plans/2026-04-28-push-bewertung-master-ahead.md`.
> Die dortige Konsolidierung deckt den Doku-Abschlusscommit und den finalen
> 63-ahead-Stand ab.

> Technischer Handoff fuer die naechste Session. Schliesst nahtlos an
> `docs/plans/2026-04-28-evening-handover.md` (HEAD `0e763d0`, 34 ahead) an;
> dieser File deckt die Folge-Arbeit + Audit-Befunde ab Stand HEAD `a85b76e`,
> 62 ahead.

## TL;DR

- master = `a85b76e`, **62 commits ahead** gegen origin/master. Vercel-Prod-Deploy weiterhin bewusst auf `10a72f0`.
- Codex hat heute zwischen den beiden Handovern weitergearbeitet: Block-3 (AI-Stufen-Settings) done, plus den gestrigen P3-Restposten (`.down`-Suffix bei 173/174 in `schema_migrations`) heute kommentarlos gefixt.
- Codex hat eine Push-Bewertung geschrieben: `docs/plans/2026-04-28-push-bewertung-master-ahead.md` — bezieht sich aber nur auf die ersten 53 von 62 Commits und uebersieht einen ENV-Drift.
- Audit heute Abend (Claude, read-only) hat ergaenzt: Tests gruen auf `a85b76e`, Mig 175 bereits applied, Auto-Deploy-Frage geklaert (Cron statt Push-Trigger), und einen NEUEN Push-Blocker gefunden.
- **Echter verbleibender Push-Blocker: `NEXT_PUBLIC_PILOT_MODE`-Env-Drift in Vercel-Production.** Fix ist 1 UI-Klick.
- Push selbst nicht heute — AVV/HR-Eintragung sind weiter externe Blocker (Memory `project_gmbh_gruendung.md`).

## Heute zwischen Evening-Handover und Late-Evening-Handover erledigt

| Was | Wer | Beleg |
|---|---|---|
| Block-3 AI-Stufen-Settings (Plan + Implementation) | Codex | INBOX `done`, Commits `e97b3f0..a85b76e` |
| P3-Restposten 173/174 `.down`-Suffix in schema_migrations | Codex | DB live: jetzt `173_memory_consents`, `174_tighten_memory_consents_rls` |
| Push-Bewertung (Scope 53 commits) | Codex | `docs/plans/2026-04-28-push-bewertung-master-ahead.md` |
| Test-Status auf finalem `a85b76e` | Claude | `npx tsc --noEmit` exit 0, `npx vitest run` exit 0 |
| ENV-Drift entdeckt: NEXT_PUBLIC_PILOT_MODE fehlt in Vercel | Claude | siehe Befund unten |
| Auto-Deploy-Gate aufgeklaert | Claude | Vercel-Schedule via Cron mit SHA-Check, KEIN Push-Trigger |
| Mig 175 Status verifiziert | Claude | DB-Read: `schema_migrations` enthaelt `175_fix_users_full_name_drift` |

## Aktuelle Push-Gate-Lage (Codex' Bericht + Audit-Updates)

| Gate | Codex | Nach Audit |
|---|---|---|
| 1 Auto-Deploy bei Push auf master | rot | gruen — Cron alle 3h, kein Push-Trigger |
| 2 Mig 175 | rot/gelb | gruen — bereits applied auf Prod |
| 3 KI-Route-Statuscodes (503 bei deaktivierter KI) | gelb | gelb (akzeptabel) |
| 4 Preview-Routen + Tests | gelb | gruen — `NODE_ENV !== "production"`-Guard + Tests gruen auf `a85b76e` |
| 5 Pi/Kiosk-Removal | gelb | gelb — Founder-Bestaetigung steht aus |
| 6 Secret-Sicht | gruen | gruen |
| **NEU** NEXT_PUBLIC_PILOT_MODE-Env-Drift | nicht erkannt | **rot — Push-Blocker** |
| **NEU** Block-3 (Commits e97b3f0..a85b76e) | ausgeklammert | offen — kurze Bewertung noetig |

## Push-Blocker im Detail — NEXT_PUBLIC_PILOT_MODE

11 Code-Stellen lesen `process.env.NEXT_PUBLIC_PILOT_MODE === "true"`. In Vercel-Production existiert aber nur `PILOT_MODE` (ohne `NEXT_PUBLIC_`-Prefix). Folge: Frontend-Branches sehen `undefined`, werten als „kein Pilot", und gehen den Non-Pilot-Pfad.

Betroffene Code-Stellen:

- `app/(app)/invitations/page.tsx:103`
- `app/(app)/praevention/buchen/page.tsx:33`
- `app/(app)/praevention/buchen-fuer-andere/page.tsx:29`
- `lib/invitations.ts:39`
- `lib/feature-flags-server.ts:20`
- `lib/feature-flags-middleware-cache.ts:22`
- `modules/voice/components/companion/TTSButton.tsx:18`
- `modules/praevention/services/reminders.service.ts:7`
- `modules/praevention/services/payment.service.ts:9`

Konsequenz bei Push ohne Fix: Praevention-Buchungen wuerden Stripe-Live ausloesen statt Pilot-Bypass. Invitations + Feature-Flag-Bypaesse nehmen Non-Pilot-Pfad. TTSButton zeigt falsche Hints.

Heute kein Live-Symptom, weil der Closed-Pilot-Smoke (`/api/register/check-invite`) nicht durch diese Stellen laeuft und der einzige Server-Code, der `process.env.PILOT_MODE` ohne Prefix nutzt (`modules/voice/services/companion-chat.service.ts:347`), den Wert korrekt sieht.

**Fix-Optionen:**

- **A (klein, Founder-Hand):** Vercel-Dashboard → Project nachbar-io → Settings → Environment Variables → `+ Add New`:
  - Name: `NEXT_PUBLIC_PILOT_MODE`
  - Value: gleicher Wert wie `PILOT_MODE` (i.d.R. `true`)
  - Environment: Production (Preview/Development optional)
  - Sensitive: nein
  Alternativ CLI: `cd nachbar-io && vercel env add NEXT_PUBLIC_PILOT_MODE production` (CLI fragt nach Wert).

- **B (sauberer, spaeter):** `/api/feature-flags`-Server-Route, Frontend liest darueber statt direkt `process.env`. Refactor.

Empfehlung: A vor Push.

## Plan fuer morgen — geordnet

### Schritt 1 — Codex-Auftrag (read-only Update)

```
Codex: Push-Bewertung erweitern um:
- Block-3-Scope (Commits e97b3f0..a85b76e, 9 Commits): kurze
  Risiko-Bewertung. Block-3 ist DB-frei (ai_assistance_level lebt
  in users.settings JSONB).
- NEXT_PUBLIC_PILOT_MODE-Drift: Push-Blocker, Fix vor Push noetig.
- Mig 175: bereits applied — Gate 2 gruen.
- Tests: tsc + Vitest gruen auf a85b76e — Gate 4 gruen.
- Auto-Deploy-Gate 1: aufgeklaert — kein Push-Trigger.

Keine Apply-Aktion, kein Push, kein Deploy. Update der gleichen Datei
docs/plans/2026-04-28-push-bewertung-master-ahead.md.
```

### Schritt 2 — Pilot-Mode-Env-Fix (Founder-Hand, 30 s)

Vercel-Dashboard oder `vercel env add NEXT_PUBLIC_PILOT_MODE production` mit Wert `true`.

### Schritt 3 — Push-Entscheidung

Mit Block-3-Bewertung + Env-Fix + Founder-Bestaetigung Gate 5 (Pi/Kiosk-Removal): alle Gates gruen, Push **freigegeben** — sofern AVV/HR-Eintragung soweit fortgeschritten sind, dass der Live-Pilot freigeschaltet werden kann.

Aber: Push haengt nicht an Code-Reife, sondern an Compliance-Reife (`project_gmbh_gruendung.md`). Ggf. trotzdem nicht pushen, sondern auf AVV warten — entscheiden bei klarem Kopf.

### Schritt 4 — Optional, niedrige Prio

- Test-User-Cleanup-Skript (Codex) als Vorbereitung fuer Echt-Pilot-Go.
- E-Mail-Confirm-Switch dokumentieren (`registration.service.ts:308-315`, `email_confirm: true` → Plan fuer Public-Rollout-Switch auf `false`).
- P5 `\n`-Escapes in Vercel-Env-Werten (Hygiene-Block).

## Was die naechste Session NICHT tun soll

- **Kein Push** auf master ohne explizites Founder-Go (62 Commits ahead, AVV/HR offen).
- **Kein Vercel-Redeploy** ohne Founder-Go.
- **Keine ENV-Schreibung in Vercel** ohne Founder-Go (auch nicht den NEXT_PUBLIC_PILOT_MODE-Fix — Founder-Hand).
- **Kein Disable/Revoke** in Supabase-Secret-Keys (erledigt).
- **Kein Loeschen** von Test-User `6f3e06ce-...` ohne Go.
- **Keine weitere DB-Schreibung** ausser auf explizites Go.
- **Keine Secrets** in Klartext lesen, kopieren, ausgeben.
- **AGENTS.md beachten:** Vor Multi-File-Writes INBOX-Row anlegen, status=in-progress, files=Lock-Liste.

## Wichtige IDs / Pfade

| Was | Wert |
|---|---|
| Repo | `C:\Users\thoma\Claud Code\Handy APP\nachbar-io` |
| Branch | master ahead **62** commits gegen origin (Prod auf `10a72f0`) |
| HEAD | `a85b76e docs(handoff): mark block 3 done` |
| Vorgaenger-Handover (heute frueher) | `docs/plans/2026-04-28-evening-handover.md` (Stand 34 ahead, HEAD `0e763d0`) |
| Codex' Push-Bewertung | `docs/plans/2026-04-28-push-bewertung-master-ahead.md` (Scope 53 von 62, ergaenzungsbeduerftig) |
| Onboarding-Handover gestern (committed `dd6bec2`) | `docs/plans/2026-04-27-onboarding-pilot-test-handover.md` |
| INBOX (Multi-Agent-Tafel) | `docs/plans/handoff/INBOX.md` |
| Cross-Agent-Regeln | `nachbar-io/AGENTS.md` |
| Claude-Notes | `nachbar-io/CLAUDE.md` |
| Test-User-ID | `6f3e06ce-3df2-44b0-86a6-567e87bb0e2c` (must_delete_before_pilot=true) |
| Supabase Project | `uylszchlyhbpbmslcnka` (eu-central-1) |
| Vercel Project | `thomasth1977s-projects/nachbar-io` |
| Aktiver Supabase Secret Key | `nachbar_io_vercel_prod_20260427_codex_v2` |

## Memory-Diff zu MEMORY.md

`MEMORY.md` schreibt aktuell `nachbar-io master 97593a2 — 53 Commits VOR origin/master`. Real ist HEAD `a85b76e` mit 62 Commits ahead. Auto-Dream konsolidiert das, kein manueller Eingriff noetig.

## Time-Tracking-Stempel

- T0 = 21:08:38
- T_handover = 21:18:12
- Δ ≈ 10 min Audit + diese Datei

## Zustand des Repos beim Sessionende

- HEAD zum Zeitpunkt dieses Claude-Snapshots: `a85b76e`.
- Diese Datei wurde danach durch Codex im Nachtabschluss als historischer Audit-Snapshot mitgespeichert.
- Sonstige untracked Files (Logs, scripts, alte Handoffs, output/, .playwright-cli/) wie zuvor unangetastet.
- Modified im Working Tree: `supabase/config.toml` (bewusst nicht angefasst).
- Auto-Memory wurde danach durch Codex auf den Nachtstand aktualisiert.
