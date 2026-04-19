# Session-Handoff — Senior App Stufe 1, Welle A fertig

**Datum:** 2026-04-19 (später Nachmittag)
**Von:** Claude Opus 4.7
**An:** Naechste Session (morgen)

---

## TL;DR

Heute wurden **drei grosse Bloecke** durchgezogen, alle live auf Prod:

1. **Stufe 3 Gesundheits-Feature-Flags** (9 Tasks, Plan 2026-04-19) — komplett, deployed, Doku committed.
2. **Youth-Admin-Bugfix** (`first_name` -> `display_name`, `/jugend` freigegeben) — live.
3. **Senior-App Stufe 1 Welle A** (Admin-UI Care-Access-Gruppe + Mig 171 + nachbar-kiosk geloescht).

Gesamtumfang Session: ~13 Commits auf nachbar-io, ~1 Commit auf Parent-Repo, 2 Prod-Migrationen (170, 171), 2 Vercel-Deploys.

**Nichts blockiert.** Naechster Schritt: **Senior-App Welle B (QR-Onboarding)**, bitte in frischer Session starten.

---

## Was heute passiert ist

### Block 1: Gesundheits-Flags Stufe 3 (vor Mittag)

Ziel: 4 tote Feature-Flags (`APPOINTMENTS_ENABLED`, `VIDEO_CONSULTATION`, `HEARTBEAT_ENABLED`, `GDT_ENABLED`) + 2 neue (`MEDICATIONS_ENABLED`, `DOCTORS_ENABLED`) komplett verdrahten. Toggles im Admin-UI sollen tatsaechlich wirken.

**7 Commits** (`a9ad648..cb8f600`):
- `lib/health-feature-gate.ts` (Route->Flag-Mapping) + 10 Tests
- `lib/feature-flags-middleware-cache.ts` (Redis-Cache) + 7 Tests
- `proxy.ts` Flag-aware (redirects Health-Routes abhaengig von Flag) + 35 Tests
- `app/(app)/care/page.tsx` Tiles Flag-aware + 7 Tests
- Admin-UI Gruppe „Gesundheit" + Descriptions
- Audit-Test gegen tote Flags (6 Flags × 1 Test)
- Migration 170: `MEDICATIONS_ENABLED`, `DOCTORS_ENABLED` (beide OFF) auf Prod
- 4 bestehende Flags (APPOINTMENTS, VIDEO_CONSULTATION, HEARTBEAT, GDT) auf `false` gesetzt (waren historisch `true`, haetten nach Deploy unerwartete Features live geschaltet)

**Deploy:** 2026-04-19 07:37 UTC via manuell getriggertem GH-Action `deploy.yml`, Vercel Run `24623956530`.

### Block 2: Youth-Admin-Fix (Nachmittag)

User meldete: „Im Admin-Bereich konnten die Jugendschutz-Daten nicht geladen werden."

Diagnose: `/api/admin/youth/overview` liest `users.first_name`, aber Prod-DB hat `display_name` (kein Alias). Query schlaegt fehl -> 500 -> Frontend-Fehler.

Fix in Commit `c1d7b3c`:
- `first_name` -> `display_name` in `route.ts` (2 Stellen) und Test-Datei
- `/jugend` aus `LEGACY_ROUTE_PREFIXES` entfernt (Seite ist wieder erreichbar)
- 43/43 Tests gruen

**Deploy:** Vercel Run `24624312058`, Build erfolgreich 07:40 UTC.

### Block 3: Senior-App Brainstorm + Welle A (spaeter Nachmittag/Abend)

5-Fragen-Brainstorm durchgefuehrt. Entscheidungen:

| Bereich | Entscheidung |
|---|---|
| Plattformen | **Windows (AWOW) + Android + iOS** via Tauri + Capacitor |
| Onboarding | **QR-Pairing primaer**, Code-Einladung + Magic-Link als Backup |
| Zugriffsgruppen | **A** (Familie) **+ B** (Einzel-Pflegerin) **+ C** (Pflegefirma/Heim) **+ E** (Notfall) — alle als Feature-Flags |
| Scope Release 1 | **Ship-Fast X** (~3-4 Wochen), B+C per Flag OFF bis Rechtliches geklaert |
| KI-Provider | **Claude Haiku 4** als Pilot-Default, Mistral Small + Off als Alternativen |
| KI-Kosten Pilot | 1-15 €/Monat (Claude) oder 2 €/Monat (Mistral), alles pay-per-use |
| Datenspeicherung | Supabase EU-Frankfurt, Memory-Schema existiert (Mig 122) |
| Pflegeheim | C + Heim-Modus nach Zulassungen, Architektur von Anfang an vorbereitet |

Reality-Check-Audit ergab: **70 % der benoetigten Bausteine existieren bereits** (caregiver_links, emergency_profiles, organizations, senior_memory Mig 122, care_consents, team-chat). Das reduziert die Stufe 1 drastisch.

**3 Dokumente committed:**
- `docs/plans/2026-04-19-senior-app-stufe1-design.md` (Commit `94d9b21`) — Design in 6 Sektionen
- `docs/plans/2026-04-19-senior-app-stufe1-implementation.md` (Commit `38c8847`) — 4-Wellen-TDD-Plan, 37+ Tasks
- Dieser Handoff

**Welle A — 3 Tasks komplett:**

| Task | Commit | Inhalt |
|---|---|---|
| A1 | `809fd56` (nachbar-io) | Admin-UI neue Gruppe „Care-Access" mit 7 Flag-Beschreibungen |
| A2 | `9ee2e43` (nachbar-io) | Migration 171 + Prod-Apply (7 Flags, `AI_PROVIDER_OFF=true` als sicherer Default) |
| A3 | `e5a58fb` (Parent) | `nachbar-kiosk/` geloescht (85 Files, 17 876 Zeilen), CLAUDE.md aktualisiert |

**Prod-Status nach A+B+C:**
- Admin-UI zeigt Gruppe „Care-Access" (nach naechstem Deploy — A+B sind gepusht, aber Cron-Deploy alle 3h; manueller Trigger moeglich)
- 7 neue Flags in `feature_flags` (`AI_PROVIDER_OFF=true`, Rest `false`)
- `nachbar-kiosk/` existiert nicht mehr im Repo
- GitHub: `nachbar-io` bei `9ee2e43`, Parent bei `e5a58fb`

---

## Was morgen passieren soll — Senior-App Welle B

**Thema:** QR-Onboarding + Device-Pairing + Long-Lived-Refresh-Token.

**Ziel-Zustand Ende Welle B:** Ein Senior-Geraet (simuliert im Browser reicht) kann mit einem Angehoerigen-Handy via QR koppeln, bekommt einen 6-Monats-Refresh-Token, bleibt nach Reboot eingeloggt.

**8 Tasks (siehe `2026-04-19-senior-app-stufe1-implementation.md` Welle B):**
- B1 Migration 172 `device_refresh_tokens`
- B2 Pairing-Token-Lib (JWT)
- B3 API `/api/device/pair/start`
- B4 API `/api/device/pair/claim`
- B5 API `/api/device/pair/status` (Polling)
- B6 Senior-Pair-Seite (Vollbild-QR)
- B7 Refresh-Token-Rotation-Hook
- B8 E2E-Test

**Rote-Zone Checkpoints:**
- Ende B1: Founder-Go fuer Prod-Mig 172
- Ende B8: Founder-Go fuer Push + Deploy
- `DEVICE_PAIRING_SECRET` env-var in Vercel nachlegen (32 Bytes random hex)

**Geschaetzte Dauer:** 1-2 Sessions.

---

## Start-Prompt fuer naechste Session

Copy-Paste in der naechsten Session:

```
Lies docs/plans/2026-04-19-handoff-senior-app-welle-a-done.md und
docs/plans/2026-04-19-senior-app-stufe1-implementation.md.

Dann beginne mit Welle B (QR-Onboarding + Device-Pairing).
Arbeite subagent-driven, aber pragmatisch: trivial kleine Tasks
inline. Fuer Rote-Zone-Punkte (Prod-Migration, Push, env-vars)
halte an und hole Founder-Go ein.

Commits auf master, aber kein Push bis Welle B komplett + Founder-Go.
```

---

## Bekannte offene Punkte (nicht blockierend)

- **Preexistente Test-Failures** (MEMORY sagt 4): `sos-detail`, `billing-checkout`, `hilfe/tasks`. Nicht heute angefasst, nicht durch heutige Arbeit verschlechtert.
- **Preexistente TS-Errors:** 8 Stueck, alle in Tests oder E2E-Specs (nicht in Produktionscode).
- **Parent-Repo hat viele unstaged Deletions** aus alten Sessions (Maerz 2026 Plan-Dateien). Ich habe sie nicht angefasst — du entscheidest, ob sie irgendwann committed werden.
- **TTS Layer-1 Cache Mig 168** laut MEMORY noch nicht auf Prod (seit 2026-04-19). Unabhaengig von Senior-App, sollte aber eingeplant werden.
- **AVV-Unterschriften** fuer Anthropic + Mistral muessen vor Welle C (KI-Integration) durch. Ueberwiegend Copy/Paste auf deren Webseite.

---

## Preexistenter Drift: CLAUDE.md + MEMORY.md

CLAUDE.md wurde heute aktualisiert (`nachbar-kiosk/` raus, Senior-App-Hinweis dazu).

MEMORY.md sollte beim naechsten Session-Start aktualisiert werden:
- `nachbar-io HEAD=9ee2e43`
- `Parent-Repo HEAD=e5a58fb`
- Stufe-3-Gesundheits-Flags LIVE
- Youth-Admin-Fix LIVE
- Senior-App Stufe-1 Plan + Welle A DONE
- Folge-Prioritaet: Welle B QR-Onboarding

---

## Rollback-Anweisungen falls ein Feature von heute Probleme macht

**Gesundheits-Flags (Stufe 3):**
```sql
update public.feature_flags set enabled = false
where key in ('MEDICATIONS_ENABLED','DOCTORS_ENABLED',
              'APPOINTMENTS_ENABLED','VIDEO_CONSULTATION',
              'HEARTBEAT_ENABLED','GDT_ENABLED');
```

**Youth-Fix:** `git revert c1d7b3c`. `/jugend` waere dann wieder geblockt, Admin-Tab weiterhin kaputt.

**Care-Access-Flags (Welle A):**
```sql
delete from public.feature_flags where key like 'CARE_ACCESS_%' or key like 'AI_PROVIDER_%';
```
oder einfach `git revert 9ee2e43 809fd56 e5a58fb`.

**nachbar-kiosk wiederherstellen:** `git revert e5a58fb` im Parent-Repo. Aber: der Pi-Kiosk lief nie live, kein User-Impact.

---

Viel Erfolg morgen. Wenn was unklar ist: Dateipfade sind im Plan-Doc unter „Files", fuer jeden Task.
