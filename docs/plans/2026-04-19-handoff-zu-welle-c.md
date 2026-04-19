# Handoff — Weiter mit Welle C (KI + Senior-Memory)

**Datum:** 2026-04-19 (spät abend)
**Ausgangs-Session:** Claude Opus 4.7 (Welle-B-Folgearbeit)
**Ziel:** Nächste Session startet Welle C

---

## Aktueller Stand (frisch geprüft)

- **nachbar-io HEAD:** `24d34b7` — LIVE auf `origin/master`
- **Deploy:** GH-Run [24629551024](https://github.com/ClaudeTheo/nachbar-io/actions/runs/24629551024) manuell getriggert 2026-04-19 ~12:52
- **Welle B:** QR-Pairing LIVE (`09142ea`) + Welle-B-Folgearbeit LIVE (TTS-Voiceover, 6-stelliger Code-Pairing, Numpad)
- **Mig 172 + Mig 168:** auf Prod
- **Tests:** 33 Folgearbeit + 40 Welle-B alle grün, 0 neue TS-Errors

## Blocker für Welle C (PFLICHT vor Start)

Die nächste Session **darf Welle C nicht ohne diese beiden Dinge starten**:

### 1. AVV-Verträge (Founder, ~20 min, nicht-technisch)

- [ ] **Anthropic AVV signieren:** https://www.anthropic.com/legal/dpa
- [ ] **Mistral AVV signieren:** https://mistral.ai/terms/#data-processing-addendum

Ohne AVV keine KI-Nutzung mit personenbezogenen Daten (DSGVO Art. 28).

### 2. API-Keys in Vercel (Founder oder Claude mit Go)

Nach Unterschrift der AVVs:

```bash
# Anthropic API Key besorgen: https://console.anthropic.com/settings/keys
vercel env add ANTHROPIC_API_KEY production
vercel env add ANTHROPIC_API_KEY preview
vercel env add ANTHROPIC_API_KEY development

# Mistral API Key besorgen: https://console.mistral.ai/
vercel env add MISTRAL_API_KEY production
vercel env add MISTRAL_API_KEY preview
vercel env add MISTRAL_API_KEY development
```

Muster wie bei DEVICE_PAIRING_SECRET heute (2026-04-19 ~12:43).

## Welle C — 9 Tasks im Überblick

Vollständig spezifiziert in [docs/plans/2026-04-19-senior-app-stufe1-implementation.md](2026-04-19-senior-app-stufe1-implementation.md) Sektion ab Zeile 455.

| Task | Beschreibung | Scope |
|---|---|---|
| **C1** | Migration 173 — Memory-Consents erweitern | DB (Rote Zone) |
| **C2** | KI-Provider-Abstraktion (Claude / Mistral / off) | Lib |
| **C3** | App-Wissensdokument (RAG, ~5000 Wörter) | Content |
| **C4** | `save_memory` Tool-Implementierung | Lib + Tests |
| **C5** | Onboarding-API `/api/ai/onboarding/turn` | Route + Tests |
| **C6** | Onboarding-Wizard Frontend (7 Schritte) | UI + Tests |
| **C7** | Memory-Übersicht Senior-Seite | UI + Tests |
| **C8** | Memory-Edit Angehörigen-Seite | UI + Tests |
| **C9** | Welle C Deploy + Smoke-Test | Ops |

**Schätzung:** ~7 Arbeitstage / 3-4 Sessions à ~70% Context.

## Arbeitsweise (vom Founder vorgegeben)

- **Subagent-driven, TDD strict** — analog Welle B
- **Keine Pushes bis Welle C komplett + Founder-Go**
- **Bei >60% Context:** stoppen, Handoff schreiben, neue Session
- **Rote Zone (Founder-Go):** Migration 173 anwenden, Env-Vars setzen, final Push
- **Feature-Flag `AI_PROVIDER=off` als Default** im Pilot — User können KI ganz deaktivieren

## Env-Vars-Status (für neue Session zum Check)

Bereits gesetzt (Welle B):
- `DEVICE_PAIRING_SECRET` (Production + Development)
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (für TTS)
- `KV_REST_API_*` (Upstash Redis)

Muss noch gesetzt werden (vor Welle C C9 Deploy):
- `ANTHROPIC_API_KEY`
- `MISTRAL_API_KEY`
- `DEVICE_PAIRING_SECRET` im Vercel-Preview-Branch (optional, nur für PR-Preview-Tests)

## Offene nicht-blockierende Punkte

- **Caregiver-UI "Code erzeugen":** API ist da (`/api/device/pair/start-code`), UI fehlt. Kleiner Task (~1h) — kann VOR oder WÄHREND Welle C in einem Seitentask erledigt werden.
- **Cron-Cleanup `device_refresh_tokens`:** Seit Welle B offen, nicht dringend (erste Schmerzen in ~6 Monaten).

## Was die nächste Session NICHT tun soll

- Nicht Welle C starten ohne AVV-Check
- Kein `PILOT_MODE=false` umlegen (eigenes Thema, separate Diskussion)
- Keine Änderungen an Welle-B-Code (ist LIVE, stable)

## Nützliche Referenzen

- [Welle-B-Folgearbeit Handoff](2026-04-19-handoff-welle-b-folgearbeit-done.md) — was gestern gebaut wurde
- [Senior-App Design](2026-04-19-senior-app-stufe1-design.md) — Gesamt-Architektur
- [Senior-App Implementation Plan](2026-04-19-senior-app-stufe1-implementation.md) — Welle C ab Zeile 455
- `topics/senior-app.md` (Memory) — Statushistorie
- `topics/feature-flags.md` (Memory) — Gesundheits + Care-Access-Flags (7 Flags, alle OFF in Pilot)

---

## Start-Prompt für die neue Session

**Copy-Paste in die neue Claude-Session:**

```
Ich möchte mit Welle C (KI + Senior-Memory) weitermachen.

Status: Welle B + Welle-B-Folgearbeit sind LIVE (nachbar-io HEAD 24d34b7).
AVV mit Anthropic und Mistral sind [SIGNIERT / NOCH OFFEN — bitte austauschen bevor Du sendest].

Lies zuerst:
1. nachbar-io/docs/plans/2026-04-19-handoff-zu-welle-c.md  (diesen Handoff)
2. nachbar-io/docs/plans/2026-04-19-senior-app-stufe1-implementation.md Sektion "Welle C"

Arbeitsweise:
- Subagent-driven, TDD strict
- Kein Push bis Welle C komplett + mein Founder-Go
- Bei >60% Context: stoppen, Handoff schreiben, neue Session
- Migration 173 nur mit meinem Go anwenden
- ANTHROPIC_API_KEY + MISTRAL_API_KEY setzen nur mit meinem Go

Wenn AVV noch nicht signiert: bitte sag mir welche Welle-C-Schritte ich
vorbereiten kann ohne echten KI-Call (z.B. Provider-Abstraktion als Stub,
Tests mit Mock-Provider) und welche erst nach AVV kommen.

Starte mit dem brainstorming-Skill falls noch Klärung nötig, sonst
direkt mit writing-plans wenn der bestehende Plan ausreicht.
```

Nachdem Du das gesendet hast: Die neue Session liest die beiden Files,
wertet Deinen AVV-Status aus und schlägt die nächsten 1-2 Tasks vor.
