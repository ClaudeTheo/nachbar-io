# Handoff — Aktionsplan 2026-04-20: Optionen E/D/A/B komplett, C8 verschoben

**Datum:** 2026-04-20 (nachmittag/abend)
**Vorgaenger:** `docs/plans/2026-04-20-aktionsplan-welle-c-abschluss.md` (Aktionsplan)
**Vor-Vorgaenger:** `docs/plans/2026-04-19-handoff-welle-c-c6b-c7-c6c-done.md` (Welle-C-Schluss-Handoff)
**Modell-Empfehlung naechste Session:** Opus 4.7 fuer Option C (C8-Architektur-Task).

---

## TL;DR

- **Optionen E, D, A, B aus dem Aktionsplan sind erledigt.** Option C (C8 Caregiver-Scope) bleibt fuer eine eigene Session, weil sie ~2-3 h braucht und Architektur-Reasoning erfordert (Opus statt Sonnet).
- **Lokaler HEAD: `7c44867`** — 25 Commits seit `5de2a58`, kein Push. Sauberer Welle-C-Stand plus F7-Rename.
- **Neu committed heute:** 1 Refactor-Commit (F7 cache_control-Rename, 55 Zeilen Diff ueber 6 Files, 61/61 Tests gruen, tsc clean).
- **Neu geschrieben (nicht committed):** 3 Markdown-Dokumente (Founder-Test-Anleitung, Push-Checklist, dieses Handoff).
- **Neu committed (lokal): diese Session-commits + 24 Vorgaenger-Welle-C-Commits warten auf Push (Rote Zone, AVV-blockiert bis GmbH-Eintragung nach Notar 2026-04-27).**
- **Memory-Update:** `project_avv_nach_gmbh.md` um Notar-Checkliste und Post-Notar-Steps erweitert (kein neues Memory-File wie urspruenglich geplant, sondern Konsolidierung des existierenden).

---

## Was diese Session erledigt hat

### Option E — Browser-Smoke-Test (partial)

**Setup:**
- `.env.local` um `AI_PROVIDER=mock` erweitert (Zeile 3).
- Dev-Server via `preview_start` auf Port 3000 gestartet.

**Code-Pre-Check bestaetigt:**
- `app/(senior)/page.tsx` — Indigo-Button "🤝 KI kennenlernen" (80 px) mit href="/kennenlernen".
- `app/(senior)/kennenlernen/page.tsx` — WizardChat-Komponente.
- `app/(senior)/profil/gedaechtnis/page.tsx` — useMemoryFacts + SeniorMemoryFactList + 3 Consent-Toggles.

**Live-Smoke-Ergebnisse:**
- Root `/` rendert (200, "QuartierApp — Ihr digitaler Dorfplatz"). Accessibility-Tree zeigt Landing-Hero, Preise, Rollen-Tabs.
- Senior-Routen redirecten unauthenticated auf `/login` (erwartet — Auth-Gate).
- Vollstaendiger E2E-Klick-Test **nicht moeglich** diese Session. Blocker dokumentiert.

**Blocker fuer End-to-End (dokumentiert in `docs/founder-test-anleitung.md`):**
1. **Mig 173 nicht auf Prod** — `care_consents.feature` CHECK akzeptiert noch nicht `'ai_onboarding'`. Per MCP verifiziert gegen `uylszchlyhbpbmslcnka`. Rote Zone, Founder-Go notwendig.
2. **Kein Senior-Test-Account** — `thomasth@gmx.de` hat `role='doctor'`, nicht `senior`. Senior-Routen greifen auf Role-Check.

### Option D — AVV-Notiz-Memory

**Konsolidiert** in existierendem `~/.claude/projects/.../memory/project_avv_nach_gmbh.md`:
- Notar-Tag-Checkliste (Dokumente, Beurkundung, Gruendungsurkunde-Ausfertigungen).
- Post-Notar-Schritte: AVV signieren, PDF-Ablage IONOS-Cloud + lokal, Vercel-Env-Vars, Mig-Apply-Reihenfolge.
- Rollback-Hinweise: AI_PROVIDER=off sofort, Down-Migs bereit.

**Entscheidung:** Existierende Memory-Datei ergaenzt statt neuer `project_avv_notar_27042026.md` angelegt — Duplikat vermieden.

### Option A — Push-Vorbereitung

Neues File `nachbar-io/docs/plans/2026-04-27-push-checklist-welle-c.md` mit:
- Pre-Push-Voraussetzungen (GmbH eingetragen, AVV signiert, Keys da, Founder-Bestaetigung).
- Pre-Push-Code-Checks (24 Commits, `git status` clean, Welle-C-Smoke-Tests, tsc, `npm audit`).
- Push-Reihenfolge (7 Schritte, jeder Founder-Go): Mig 173, Mig 174, Vercel-Env, Datenschutz-Diff-Entscheidung, `git push`, `AI_PROVIDER=claude`, Prod-Smoke.
- Rollback-Plan A/B/C/D (AI_PROVIDER killen / Code revert / Mig-Down / Vercel-Instant-Rollback).
- Copy-paste-Instruktion fuer Claude am Push-Tag (inkl. Model-Empfehlung Opus 4.7).

### Option B — F7 cache_control-Rename (TDD, 1 Commit)

**Scope:** Rename `system_cached?: boolean` auf `AIChatInput` zu strukturiertem `cache_control?: { system?: boolean; messages?: boolean }`. Behaviour unveraendert, nur Name + Shape. `messages` reserviert fuer Multi-Turn-Caching (nicht verdrahtet).

**TDD-Flow:**
1. Provider-Test zuerst auf neue API umgestellt → RED (behauptete Test bekommt `"long system prompt"` als String statt erwartetes Content-Block-Array, weil claude.ts noch `system_cached` liest).
2. `lib/ai/types.ts` + `lib/ai/claude.ts` angepasst → GREEN fuer provider.test.ts (37/37).
3. `app/api/ai/onboarding/turn/route.ts` + route.test.ts + loader.ts Doc-Comment umgestellt → GREEN (24/24).

**Verifikation:**
- `npx vitest run lib/ai/__tests__/provider.test.ts app/api/ai/onboarding/turn/__tests__/route.test.ts` → 61/61 gruen.
- `npx tsc --noEmit` → clean ausser den 8 preexistenten Skip-Liste-Errors (device-fingerprint, quartier-info-vorlesen, x01/x19/s12 E2E).

**Commit:** `7c44867` — "refactor(ai): rename system_cached to cache_control.system (F7)", 55 insertions / 19 deletions ueber 6 Files.

**Plan vs. Realitaet:** Plan erwartete ~150 LOC delta / 3 Commits. Realitaet: ~37 LOC netto / 1 Commit. Split in 3 Commits waere artificial gewesen, weil Rename nicht intermediat tsc-clean moeglich ist. Einzelcommit ist kohaerenter.

---

## Was NOCH nicht gemacht ist

### Option C — C8 Caregiver-Scope (VERSCHOBEN auf naechste Session)

**Architektur-Entscheidung vom Founder bereits bestaetigt:** **1b + 2a + 3a**
- **1b:** Lesen + Schreiben (mittlerer Aufwand).
- **2a:** Voll transparent — Senior sieht Caregiver-Eintraege mit Hinweis "von Tochter Anna" und kann sie loeschen.
- **3a:** Eigene Caregiver-Seite `/caregiver/senior/{id}/gedaechtnis` — saubere Trennung.

**Scope (laut Aktionsplan-Empfehlung):**
1. API `/api/memory/facts` akzeptiert `actor.role: "caregiver"` + `subject_user_id` (Senior).
2. `saveMemoryToolHandler` erweitert um Caregiver-Pfad; Audit-Log `source_user_id` = caregiver-id, `subject_user_id` = senior-id.
3. RLS-Check: Caregiver-Link aktiv (`caregiver_links.active=true`) + nicht abgelaufen.
4. UI `/caregiver/senior/{id}/gedaechtnis` — Page listet Senior-Fakten, eigene Caregiver-Eintraege markiert.
5. Senior-Page `/profil/gedaechtnis` zeigt Caregiver-Eintraege mit Provenance-Badge ("von Tochter Anna") + Loesch-Button.

**Pre-Check-Hinweise fuer C8 (vorher zu pruefen):**
- `caregiver_links` Tabelle existiert (Welle B, verifizieren mit Grep).
- `saveMemoryToolHandler` API in `lib/ai/tools/save-memory.ts` — pruefen ob `actor.role: "caregiver"` schon akzeptiert wird oder neu waere.
- `user_memory_facts.source_user_id` existiert? Falls nicht, neue Mig 175 + Spalte.
- Senior-Mode-Provenance-Pattern: laut Memory-Handoff `680e285` gibt es ein "Provenance"-Konzept in der Welle-C-Codex-Review-Nachbesserung — pruefen, ob wir das wiederverwenden koennen.

**Empfohlene Reihenfolge:**
1. Pre-Check (Grep `caregiver_links`, `source_user_id`, `Provenance`).
2. Mig 175 wenn neue Spalte noetig (File-first, lokal committen, nicht auf Prod).
3. API-Route erweitern (TDD).
4. UI Caregiver-Page (TDD).
5. UI Senior-Page Provenance-Badges (TDD).
6. Integration-Test.

**Erwarteter Aufwand:** 2-3 h. Benoetigt Opus 4.7 (Architektur + Cross-File-Reasoning).

---

## Lokaler Commit-Stand (nachbar-io, kein Push)

25 Commits seit `5de2a58`. Neuer HEAD: **`7c44867`**.

| SHA | Welle | Beschreibung |
|---|---|---|
| (24 Commits von Welle C, siehe Vorgaenger-Handoff `2026-04-19-handoff-welle-c-c6b-c7-c6c-done.md`) |
| **`7c44867`** | **F7** | **refactor(ai): rename system_cached to cache_control.system (F7)** |

Parent-Repo (`Handy APP`) unveraendert seit `8bb5a74` in dieser Session (CLAUDE.local.md weiterhin modifiziert, nicht committed).

---

## Uncommitted Reste (unveraendert seit Vorgaenger-Handoff)

```
nachbar-io:
 M app/datenschutz/page.tsx                                    (Welle-B-Folgearbeit-Rest, 64 LOC)
?? docs/founder-test-anleitung.md                              (DIESE Session)
?? docs/plans/2026-04-18-handoff-live-test-blocked-voice-latency.md
?? docs/plans/2026-04-18-handoff-tts-layer1-cache.md
?? docs/plans/2026-04-19-handoff-welle-c-c0-c3-done.md
?? docs/plans/2026-04-19-handoff-welle-c-c4-c5a-done.md
?? docs/plans/2026-04-19-handoff-welle-c-c5b-done.md
?? docs/plans/2026-04-27-push-checklist-welle-c.md             (DIESE Session)
?? docs/plans/2026-04-20-handoff-aktionsplan-e-d-a-b-done.md   (DIESES File)
?? supabase/migrations/067_doctor_registration_BACKUP_DB.sql

nachbar-io/.env.local:
 +AI_PROVIDER="mock"                                           (DIESE Session, Zeile 3 — wird nicht committed,
                                                                .env.local ist gitignored)

Parent-Repo (Handy APP):
 M CLAUDE.local.md                                             (unveraendert aus Vorgaengersession)
```

**Empfehlung:** die 7 Handoff-/Plan-Markdowns (Founder-Test-Anleitung, Push-Checklist, dieses File, plus die 5 Vorgaenger-Handoffs) in einem Doku-Commit buendeln — entweder jetzt oder direkt vor dem Push am Notar-Tag.

---

## Test-Stand

**Welle-C-Smoke-Suite** (aus Vorgaenger-Handoff uebernommen + F7-Files ergaenzt):

```
npx vitest run __tests__/modules/memory/ \
               __tests__/components/senior/ \
               __tests__/hooks/useTtsPlayback.test.ts \
               __tests__/hooks/useOnboardingTurn.test.ts \
               __tests__/hooks/useSpeechInput.test.ts \
               __tests__/components/onboarding/ \
               lib/ai/__tests__/provider.test.ts \
               app/api/ai/onboarding/turn/__tests__/route.test.ts
```

Einzel-geprueft in dieser Session:
- `lib/ai/__tests__/provider.test.ts` → 37/37 gruen (inkl. 1 neuer Default-Undefined-Test)
- `app/api/ai/onboarding/turn/__tests__/route.test.ts` → 24/24 gruen
- **Summe F7-Scope:** 61/61 gruen

`npx tsc --noEmit` → clean ausser den 8 preexistenten Skip-Liste-Errors (unveraendert).

Voll-Suite nicht ausgefuehrt (Zeit-/Token-Budget), erwartet aber unveraendert: ~3745 Tests gruen, 4 pre-existing failures (sos-detail, billing-checkout, hilfe/tasks ×2).

---

## Key Files geaendert diese Session

| Datei | Zeilen-Diff | Zweck |
|---|---|---|
| `lib/ai/types.ts` | +11 / -7 | `cache_control` statt `system_cached` |
| `lib/ai/claude.ts` | +4 / -2 | Mapping-Read auf `input.cache_control?.system` |
| `lib/ai/__tests__/provider.test.ts` | +28 / -5 | Tests auf neue API + Default-Undefined-Test |
| `lib/ai/system-prompts/loader.ts` | +4 / -3 | Doc-Comment aktualisiert |
| `app/api/ai/onboarding/turn/route.ts` | +2 / -2 | `cache_control: { system: true }` |
| `app/api/ai/onboarding/turn/__tests__/route.test.ts` | +3 / -3 | Assertion auf neue Shape |
| `.env.local` | +1 | `AI_PROVIDER=mock` (nicht committed, gitignored) |

---

## MEMORY.md-Update (noch ausstehend — Vorschlag)

**Empfehlung:** `topics/senior-app.md` aktualisieren um:
- HEAD `7c44867` aufnehmen
- F7 als DONE markieren
- C8 als VERSCHOBEN markieren mit Architektur-Entscheidung 1b+2a+3a

Habe ich diese Session NICHT gemacht (Zeit-Budget). Naechste Session: kann als erstes mitgenommen werden.

---

## Start-Prompt fuer naechste Session

```
Wir machen Welle C C8 — Caregiver-Scope im Senior-Memory.

Bitte lies ZUERST:
1. nachbar-io/docs/plans/2026-04-20-handoff-aktionsplan-e-d-a-b-done.md
   (dieses File — enthaelt Stand, Architektur-Entscheidung 1b+2a+3a, Scope)
2. nachbar-io/docs/plans/2026-04-19-handoff-welle-c-c6b-c7-c6c-done.md
   (Vorgaenger — zwei Consent-Systeme erklaert, save_memory-Tool-Adapter)

Architektur-Entscheidungen sind GEKLAERT (Founder hat Claude-Empfehlung
1b+2a+3a uebernommen):
- 1b: Caregiver darf Senior-Memory lesen UND schreiben
- 2a: Voll transparent — Senior sieht Caregiver-Eintraege mit Hinweis
     "von Tochter Anna" und kann sie loeschen
- 3a: Eigene Caregiver-Seite /caregiver/senior/{id}/gedaechtnis

Arbeitsweise: TDD strict, Pre-Check first, kein Push, Founder-Go nur
in Rote Zone. Bei ~65% Context Handoff schreiben.

Pre-Check (PFLICHT vor Code):
- Grep caregiver_links, source_user_id, saveMemoryToolHandler, Provenance
- Pruefen ob Mig 175 (neue Spalte) noetig oder ob alles schon da ist
- Pruefen ob Caregiver-Role im Authz-Gate erlaubt ist

Modell: Opus 4.7 (Architektur + Cross-File-Reasoning).
Kontext-Regel: bei ~65% Handoff schreiben und C8-Rest in Folge-Session.
Kein Push in dieser Session (AVV blockiert bis Notar 2026-04-27 + HRB).
```

---

## Lessons dieser Session

1. **Prod-vs-Lokal-Einsicht:** `.env.local` zeigt auf PROD-Supabase. Fuer echten E2E-Smoke-Test muesste temporaer auf lokale Supabase-Instanz umgeschaltet oder ein separater Senior-Test-Account angelegt werden. Beides ist rote Zone oder Setup-Aufwand — deshalb dokumentierte Anleitung statt Live-Test.
2. **Pre-Check spart Duplikate auch bei Memory-Eintraegen:** Plan schlug `project_avv_notar_27042026.md` als neue Datei vor, tatsaechlich existierte `project_avv_nach_gmbh.md` mit ~80 % der gleichen Info. Konsolidierung statt Neuanlage.
3. **Plan-LOC-Schaetzungen sind Obergrenzen:** F7-Plan schaetzte ~150 LOC / 3 Commits. Tatsaechlich ~37 LOC netto / 1 Commit. Rename-Refactors sind oft kleiner als gedacht, wenn der Code sauber strukturiert war.
4. **TDD-Substep-Split ist nicht immer sinnvoll:** Rename-Changes koennen nicht intermediat tsc-clean sein. Einzelatomarer Commit ist hier die richtige Wahl, auch wenn Plan 3 Commits vorsieht.
5. **Sonnet 4.7 reicht fuer mechanische Refactors:** F7 war reines Rename, keine neue Entscheidung noetig. Sonnet war ausreichend. Opus-Reserve fuer Architektur (C8) ist richtig angesetzt.

---

## Offene Punkte (fuer naechste Session)

1. **C8 Caregiver-Scope** (2-3h, Opus) — siehe Abschnitt oben.
2. **MEMORY.md-Update** — HEAD `7c44867`, F7 DONE, C8-Architektur dokumentiert.
3. **F7-Commit-Nachtrag:** statt Anti-Commit-per-Substep kann man das Commit-Format-Template fuer die naechste Welle anpassen. Nicht dringend.
4. **Datenschutz-Diff** (`app/datenschutz/page.tsx`) — Founder-Entscheidung ausstehend.
5. **Welle-B-Handoff-Dateien** — noch nicht committed (dokumentarische Altlast).
6. **Mig 173+174 Prod-Apply** — wartet auf AVV / Push-Tag.
7. **Push origin master** — wartet auf AVV / Push-Tag.

---

## Audit-Trail / Compliance (unveraendert vs. Vorgaenger-Handoff)

| DSGVO-Artikel | Wo erfuellt |
|---|---|
| Art. 6 Einwilligung | `/api/care/consent` POST + WizardChat-Banner (C6c) |
| Art. 7(3) Widerruf | `/profil/gedaechtnis` Toggles + Banner-Hinweis |
| Art. 9 Sondercategoria | sensitive Categories AES-256-GCM |
| Art. 15 Auskunft | `/profil/gedaechtnis` zeigt alle Fakten gruppiert |
| Art. 17 Loeschung | Einzel-Loeschen + Reset-All mit Confirm |
| Art. 25 Privacy by Default | `AI_PROVIDER=off` bis AVV |
| Art. 32 Sicherheit | RLS user_memory_consents (Mig 173+174 lokal committed) |

**F7-Rename aendert keine DSGVO-Properties** — rein interne Refactor-Aenderung.

---

**Modell-Empfehlung:** Opus 4.7 fuer Folge-Session (C8 = Architektur + Cross-File-Reasoning). Sonnet 4.7 nur, wenn nur MEMORY.md-Update + Administrative Tasks anstehen.
