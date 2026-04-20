# Handoff — Welle C Tasks C0 bis C3 LIVE-ready (lokal)

**Datum:** 2026-04-19 (Nacht)
**Von:** Claude Opus 4.7 (1M) — Welle-C-Startsession
**An:** Nächste Session / Thomas
**Kontext-Stand:** ca. 60 % — Stopp vor C4 aus Vorsicht, wie vom Founder vorgegeben

---

## 🛑 Pflicht-Pre-Check vor jedem Task (C4 + alle weiteren)

**Bevor du Code schreibst: codebase-weiter Grep-Check ob Infrastruktur existiert.** Der Plan ist nicht autoritativ, der Code ist autoritativ. Dieser Handoff hat den Fehler ursprünglich zweimal gemacht (C1: `user_memory_consents` aus Mig 122 übersehen; C4: `modules/memory/services/*` übersehen → siehe C4-Sektion unten). Regel: [feedback_existing_infrastructure_check.md](../../../.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/feedback_existing_infrastructure_check.md).

Konkrete Grep-Stichworte pro restlichem Task:
- **C4 (save_memory):** `Grep: "user_memory_facts|user_memory_consents|validateMemorySave|containsMedicalTerms|CATEGORY_TO_CONSENT"` → Treffer in `modules/memory/` → Adapter bauen, nicht neu.
- **C5 (/api/ai/onboarding/turn):** `Grep: "onboarding|ai.*route|chat-integration"` → `modules/memory/services/chat-integration.ts` existiert, prüfen ob relevant.
- **C6 (Wizard UI):** `Glob: "modules/memory/components/**"` + `Grep: useTtsPlayback` → TTS-Hook wiederverwenden.
- **C7 (Memory-Übersicht):** `Glob: "modules/memory/components/**"` + `Grep: "memory.*page|profil/memory"`.
- **C8 (Caregiver Memory-Edit):** wie C7 + `Grep: "caregiver_links"` für Scope-Check.

---

## TL;DR

- C0 (Prototyp weg), C1 (Mig 173 Memory-Consents Datei), C2 (KI-Provider-Abstraktion inkl. 2× Review), C3 (4014-Wörter-Wissensdokument DE + CH) **fertig und lokal committed**. Kein Push.
- Wichtig: **Scope-Korrektur durchgezogen — App ist DE + CH, Bad Säckingen nur Pilot.** Neue Memory-Datei [project_scope_de_ch.md](../../../../.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/project_scope_de_ch.md).
- Offen: C4 (save_memory-Tool), C5 (Onboarding-Route), C6 (Wizard-UI), C7 (Senior Memory-Übersicht), C8 (Angehörigen-Edit), C9 (Deploy — rote Zone).
- **AVV-Status geklärt (Founder-Update 2026-04-19 Nacht):** AVV mit Anthropic + Mistral werden **erst nach GmbH-Eintragung** signiert, NICHT privat und NICHT vor Notar-Termin (27.04.2026). Heißt: bis ~Mai/Juni 2026 keine echten KI-Calls in Prod, nur `AI_PROVIDER=off` oder `mock`. Alle C-Tasks weiter lokal vorbereitbar, aber C9 Deploy wartet auf AVV + GmbH. Nicht mehr "privat signieren" vorschlagen.

---

## Lokaler Commit-Stand

**nachbar-io:**

| SHA | Beschreibung |
|---|---|
| `26e3da4` | feat(ai): provider abstraction for Claude / Mistral / mock — C2 |
| `477f344` | feat(db): mig 173 memory-consents + ai_onboarding consent key — C1 |
| `cd300dc` | refactor(ai): review fixes — OffProvider throws AIProviderError + doc polish |
| `133bdcf` | feat(ai): system-prompt wissensdokument senior-app DE + CH — C3 |

**Parent-Repo (Handy APP):**

| SHA | Beschreibung |
|---|---|
| `8bb5a74` | docs(rules): migration naming aligned to repo reality (NNN_* default) |

**Kein Push.** 4 lokale Commits in nachbar-io, 1 lokaler Commit im Parent-Repo, warten auf Founder-Go für Push + Mig 173 apply + Env-Vars.

---

## Was steht, was offen ist

### Dateien neu (seit HEAD `24d34b7`)

```
lib/ai/types.ts                                              (63 LOC)
lib/ai/provider.ts                                           (82 LOC)
lib/ai/claude.ts                                             (157 LOC, +Kommentar)
lib/ai/mistral.ts                                            (187 LOC)
lib/ai/off.ts                                                (21 LOC, AIProviderError)
lib/ai/mock.ts                                               (62 LOC)
lib/ai/__tests__/provider.test.ts                            (~650 LOC, 34 Tests)
lib/ai/system-prompts/senior-app-knowledge.md                (4014 Wörter, 11 Kapitel)
lib/ai/system-prompts/__tests__/senior-app-knowledge.test.ts (~60 LOC, 13 Tests)
supabase/migrations/173_memory_consents.sql                  (Mig-File, NICHT applied)
supabase/migrations/173_memory_consents.down.sql             (Rollback)
```

Geänderte Datei außerhalb: `.claude/rules/db-migrations.md` (Naming-Doku an Repo-Realität angepasst).

### Test-Stand

- `lib/ai/__tests__/provider.test.ts` — 34/34 grün
- `lib/ai/system-prompts/__tests__/senior-app-knowledge.test.ts` — 13/13 grün
- `npx tsc --noEmit` — **keine neuen Errors in `lib/ai/`**. Die 8 präexistenten E2E-Errors (siehe Memory) unverändert.
- Keine neuen npm-Dependencies.

### Uncommitted Reste (NICHT anfassen, gehören anderen Themen)

```
 M app/datenschutz/page.tsx               (Welle-B-Folgearbeit-Rest)
?? docs/plans/2026-04-18-handoff-live-test-blocked-voice-latency.md
?? docs/plans/2026-04-18-handoff-tts-layer1-cache.md
?? supabase/migrations/067_doctor_registration_BACKUP_DB.sql
```

Dazu die drei Handoff-Dateien in `docs/plans/` die heute geschrieben wurden (inkl. dieses Files) — sind frisch und werden normal mit dem nächsten Commit eingebunden.

---

## Wichtige Entscheidungen dieser Session

### 1. Scope DE + CH (nicht nur Bad Säckingen)

Founder hat in der Session explizit gesagt: **"nicht nur für Quartier Bad Säckingen, es soll überall in Deutschland und der Schweiz funktionieren"**.

Konsequenz:
- Memory-Datei `project_scope_de_ch.md` neu angelegt + im MEMORY.md-Index verlinkt.
- Wissensdokument C3 durchgehend generisch DE + CH geschrieben, Bad Säckingen als klar markiertes Pilot-Kapitel.
- Notrufnummern: DE 112/110 + **CH 112/117/118/144** — Pflicht in Dokument.
- Schweizer Äquivalente: **Spitex** (statt Pflegedienst), **AHV-Hilflosenentschädigung** (statt Pflegegrad), **revDSG** (statt DSGVO im CH-Kontext).
- Preise: **nur EUR**, für CH "Preise werden gerade zusammengestellt".
- Künftige Features / Texte: generisch DE + CH planen.

### 2. Mig 173 = Memory-Consents, NICHT mehr "ki_assistent_foundation"

Alter Prototyp `173_ki_assistent_foundation.sql` wurde gelöscht (C0). Neue Mig 173 dokumentiert:
- `care_consents` (Mig 108) erweitert um Feature-Key `ai_onboarding` (DSGVO Art. 6+28 Consent für KI-Datenübermittlung).
- `user_memory_consents` (Mig 122) bleibt Single-Source-of-Truth für Memory-Consents (`memory_basis/care/personal`). Zwei Tabellen, zwei Scopes — sauber dokumentiert via `COMMENT ON TABLE`.

**Warum nicht wie Plan-Text ("Erweitert care_consents um Memory-Features"):** Plan-Autor hat die bestehende `user_memory_consents`-Tabelle aus Mig 122 übersehen. Hätte die Memory-Consents dupliziert. Design-Entscheidung: Zwei getrennte Tabellen, klar kommentiert, kein Redundanz-Hack.

### 3. Provider-Abstraktion ohne SDK

Kein `@anthropic-ai/sdk`, kein `@mistralai/mistralai`. Direkter `fetch` mit injizierbarem `fetchImpl` für Tests. Lehre aus dem alten Prototyp.

### 4. TDD-Disziplin gehalten

C2 Implementer-Subagent + Spec-Review + Code-Quality-Review + Fixes durchgezogen. C3 hat eigenes Test-File mit 11 Pflicht-Markern + Wortzahl + Emoji-Check.

### 5. Doku-Fix: Migration-Naming

`.claude/rules/db-migrations.md` verlangte Timestamp-Format — Realität im Repo: NNN-Format für 172 Migrationen, Timestamp nur für Repair-Baselines. Regel an Realität angepasst.

### 6. Alte Memory-Notiz `MEMORY.md:34` ist veraltet

Die Zeile sagt "KI-Assistent (Mistral Medium 3) IMPLEMENTIERT, NICHT COMMITTED: lib/assistent/, app/(app)/assistent/, app/api/assistent/, Mig 173". Dieser Prototyp wurde in C0 gelöscht und sauber durch Welle C in `lib/ai/` ersetzt. **Nächste Session: MEMORY.md-Zeile aktualisieren** (veraltet, missverständlich).

---

## Offene Tasks Welle C

### C4 — save_memory Tool (Lib + Tests)

**⚠️ PLAN-KORREKTUR 2026-04-19 (Nacht, nach Pre-Implementation-Check):**

Bevor hier ein Byte Code entsteht: IMMER zuerst mit Grep/Glob den codebase-weiten Pre-Check machen. Bei C4 wurde so festgestellt, dass die komplette Memory-Infrastruktur bereits in `modules/memory/services/` existiert. Der ursprüngliche Plan ("komplett neu in `lib/ai/tools/` bauen") hätte dupliziert. Siehe Memory: [feedback_existing_infrastructure_check.md](../../../.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/feedback_existing_infrastructure_check.md).

**Bestehende Infrastruktur (NICHT duplizieren, wiederverwenden):**

| Was | Wo | Was macht es |
|---|---|---|
| 4-stufige Validation (Limit, Consent, Blocklist, Auto-Save-Mode) | `modules/memory/services/facts.service.ts:25` `validateMemorySave()` | Reine Funktion, kein DB-Zugriff, testbar |
| Medizin-Blocklist (Diagnosen, Meds, Vitalwerte, Therapien — 80+ Terms) | `modules/memory/services/medical-blocklist.ts` `containsMedicalTerms()` | Umlaut-normalisierte Regex-Prüfung |
| AES-Encryption für `care_need` + `personal` | `modules/memory/services/facts.service.ts:140` `saveFact()` | Ruft `encryptField` aus `lib/care/field-encryption.ts` intern |
| Audit-Log `user_memory_audit_log` | `modules/memory/services/facts.service.ts:288` `logAudit()` | Wird von `saveFact/deleteFact/resetFacts` automatisch aufgerufen |
| Consent-Check `user_memory_consents` | `modules/memory/services/consent.service.ts:16` `hasConsent()` | DB-Query mit `granted=true AND revoked_at IS NULL` |
| Fact-Count für Limits | `modules/memory/services/facts.service.ts:110` `getFactCount()` | Basis/Sensitive-Split |
| Types + Mappings | `modules/memory/types.ts` `CATEGORY_TO_CONSENT`, `SENSITIVE_CATEGORIES`, `MEMORY_LIMITS` | Single-Source-of-Truth |

**Was wirklich noch fehlt (neu zu bauen):**

Der KI-Tool-Adapter ist ein dünner Layer zwischen `AIToolCall.input` und den bestehenden Services. Neu:

1. **JSON-Schema des Tool-Inputs** (KI-seitig) → `{ category: MemoryCategory, key: string, value: string, confidence?: number }`. Validierung liegt beim Adapter.
2. **Scope-Check** (ist NICHT in `validateMemorySave`): `actor.role === 'senior' → targetUserId === actor.userId`. Für Caregiver: aktiver `caregiver_links`-Eintrag. Welle C ist Senior-first, Caregiver-Scope erst C8.
3. **AI-freundliches Result-Shape**: strukturiertes `{ ok: true, factId }` oder `{ ok: false, reason: 'consent_missing'|'scope_violation'|'medical_blocked'|'limit_reached'|'validation_error'|'needs_confirmation' }` — damit die KI den Grund an den Senior kommunizieren kann.

**Dateien (neu, überarbeitet):**
- Create: `lib/ai/tools/save-memory.ts` (Adapter, dünn — erwartet ~120 LOC statt ~400)
- Create: `lib/ai/tools/__tests__/save-memory.test.ts`
- **KEIN** `lib/ai/tools/medical-blocklist.ts` mehr — der vorhandene in `modules/memory/services/medical-blocklist.ts` wird wiederverwendet.

**Noch zu klären mit Founder (stand 2026-04-19 nacht):**
- Adapter-Ansatz vs. wörtlicher Plan-Nachbau (Founder-Entscheid offen).
- Scope: erstmal Senior-only (Caregiver-Edit per `source='caregiver'` erst in C8 aktivieren)?

### C5 — Onboarding-API `/api/ai/onboarding/turn`

**Was:** Ein Turn des Onboarding-Wizards. Liest Session-State, ruft Provider (via `getProvider()`), verarbeitet tool_calls (via `save-memory.ts`), gibt Response zurück.

**Prompt-Caching:** Für Claude `cache_control: { type: "ephemeral" }` auf System-Prompt setzen (5 min TTL, -90 % Input-Kosten). Heißt: `ClaudeProvider` muss um Caching-Unterstützung erweitert werden — aktuell sendet sie den System-Prompt plain. Entweder (a) Option auf `ClaudeProvider` neu, oder (b) `AIChatInput.system_cached?: boolean`-Flag zum Interface. Empfehlung: (b), provider-neutral gehalten, andere Provider ignorieren das Flag.

**Dateien:**
- Create: `app/api/ai/onboarding/turn/route.ts`
- Create: `app/api/ai/onboarding/turn/__tests__/route.test.ts`
- Modify: `lib/ai/types.ts` + `lib/ai/claude.ts` (cache_control-Support)
- Modify: `lib/ai/__tests__/provider.test.ts` (Test für Cache-Flag)

### C6 — Onboarding-Wizard UI

**Was:** Senior-App-Route `(senior)/onboarding/page.tsx`. 7 Schritte. Jeder mit Großtext + TTS + Weiter/Später-Button.

**Muss haben:**
- Pre-Chat-Disclaimer (EU AI Act Art. 50 ab 02.08.2026): "Hinweis: Hier spricht ein Computerprogramm mit Ihnen."
- 80-px-Touch-Targets, 4.5:1-Kontrast
- TTS über den bestehenden `useTtsPlayback`-Hook (in nachbar-io existent, siehe Welle-B-Folgearbeit)
- Playwright-E2E

### C7 — Senior Memory-Übersicht

Senior-Route `(senior)/profil/memory/page.tsx`. Liste aller Facts nach Kategorie, Löschen per Tap (DSGVO Art. 17).

### C8 — Angehörigen Memory-Edit

Caregiver-Route `(app)/care/meine-senioren/[id]/memory/page.tsx`. Sehen + editieren der Facts der verknüpften Senioren.

### C9 — ROTE ZONE: Deploy

**Alle Voraussetzungen:**
- [ ] AVV Anthropic signiert (https://www.anthropic.com/legal/dpa)
- [ ] AVV Mistral signiert (https://mistral.ai/terms/#data-processing-addendum)
- [ ] `ANTHROPIC_API_KEY` in Vercel (prod + preview + dev)
- [ ] `MISTRAL_API_KEY` in Vercel (prod + preview + dev)
- [ ] `AI_PROVIDER=off` als Default in Prod (Feature-Flag-Style, damit Senior im Pilot die KI ganz deaktivieren kann)
- [ ] Mig 173 auf Prod anwenden (Supabase MCP `apply_migration`, idempotent)
- [ ] Push `origin master`
- [ ] Smoke-Test: Pilot-Senior macht ein Onboarding-Turn mit `AI_PROVIDER=claude`, Memory-Fact wird erstellt, Angehöriger sieht ihn

---

## Nützliche Referenzen für die nächste Session

- **Plan:** [docs/plans/2026-04-19-senior-app-stufe1-implementation.md](2026-04-19-senior-app-stufe1-implementation.md) ab Zeile 455 (Welle C Tasks)
- **Memory-Scope:** [project_scope_de_ch.md](../../../../.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/project_scope_de_ch.md) (neu)
- **Existierende Verschlüsselung:** `lib/care/field-encryption.ts` (für C4 wiederverwenden)
- **Existierender TTS-Hook:** `useTtsPlayback` in `nachbar-io` (für C6 wiederverwenden)
- **Prompt-Caching-Doku:** https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching

---

## Start-Prompt für die nächste Session

```
Ich möchte mit Welle C weitermachen. Stand: C0, C1, C2, C3 fertig und lokal committed.
Kein Push.

Lies zuerst:
1. nachbar-io/docs/plans/2026-04-19-handoff-welle-c-c0-c3-done.md

AVV-Status: [BITTE VOR SENDEN AKTUALISIEREN — "signiert" oder "noch offen"].

Nächster Task: C4 save_memory-Tool mit 4-stufigem MDR-Schutz und AES-Verschlüsselung.
Arbeitsweise wie bisher: Subagent-driven, TDD strict, kein Push, bei >60% Context stoppen.

Wenn AVV signiert: auch C5 (Onboarding-Route) + C9 (Deploy) werden erreichbar.
Wenn AVV noch offen: nur C4–C8 (alles ohne echten KI-Call testbar mit Mock-Provider).
```

---

## Dinge, die diese Session NICHT gemacht hat (bewusst)

- Kein Push.
- Keine Mig 173 auf Prod appliziert.
- Keine Env-Vars gesetzt.
- `app/datenschutz/page.tsx` nicht angefasst (Welle-B-Folgearbeit-Scope, nicht meines).
- `MEMORY.md` Zeile 34 (veraltete Prototyp-Notiz) nicht korrigiert — kleiner Task für nächste Session.
- Keine Preview-Verifikation (Wissensdokument ist Content, keine UI).

---

## Dinge die eventuell das nächste Mal anders gemacht werden könnten

- C3 Subagent hat Kapitel 2 leicht über Wortzahl-Richtwert erweitert (DE↔CH-Glossar). War sinnvoll, aber die Struktur-Vorgabe war nicht flexibel genug. Für C6/C7/C8 Subagent-Briefs: explizit "± 20 %" beim Wortzahl-Richtwert zulassen.
- Two-Stage-Review (Spec + Code-Quality) kostet bei reinen Content-Tasks (C3) nichts und wurde weggelassen. Für C4 (Code mit Compliance-Implikationen) wieder einschalten.
