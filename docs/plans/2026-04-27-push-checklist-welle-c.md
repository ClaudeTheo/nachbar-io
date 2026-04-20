# Push-Checklist — Welle C (Zieldatum 27.04.2026 / nach HRB)

**Erzeugt:** 2026-04-20 (Aktionsplan-Option A)
**Letzte Aktualisierung:** 2026-04-21 (B6 Task 6.3, vorgezogen via Variante B)
**Ziel-Push:** `nachbar-io` HEAD `328c354` (47 lokale Commits seit `5de2a58`) auf origin/master.
**Ausloeser:** Theobase GmbH im Handelsregister eingetragen + beide AVV signiert (Anthropic + Mistral).
**Nicht fruehzeitig pushen!** Rote Zone — jeder Schritt braucht Founder-Go.

---

## Status der Code-Checks (Stand 2026-04-21 Abend)

Haertungs-Runde Bausteine B1-B3 abgeschlossen, B6 Task 6.2 (Release-Notes)
vorgezogen. Damit sind die "Claude erledigt autonom"-Checks unten zum
groessten Teil schon einmal durchgelaufen — der Push-Tag-Re-Verify (B6
Task 6.1) wiederholt sie zur Sicherheit.

| Check | Stand 2026-04-21 | Re-Verify am Push-Tag |
|---|---|---|
| Vitest Voll-Suite | ✅ 3480 passed / 3 skipped / 0 failed | erneut laufen |
| `npx tsc --noEmit` | ✅ 0 Errors (Skip-Liste leer, B3 `dda2a66`) | erneut laufen |
| E2E Smoke | ✅ 11 passed + 1 flaky (Retry gruen) | optional erneut |
| Release-Notes Draft | ✅ `328c354` — `2026-04-27-release-notes-welle-c.md` | Final-Review vor Push |
| Walkthrough-Checkliste | ✅ `ca70c34` — Termin Fr 24.04. ausstehend | Stolperstellen-Fixes pro Commit |

---

## Pre-Push — Voraussetzungen (ALLE ✅ bevor Schritt 1 startet)

- [ ] GmbH Theobase im Handelsregister (HRB-Nummer vorhanden).
- [ ] AVV Anthropic signiert, PDF in `IONOS-Cloud/Theobase-GmbH/AVV/`.
- [ ] AVV Mistral signiert, PDF ebenda.
- [ ] `ANTHROPIC_API_KEY` (Organization-Key, nicht privat) existiert.
- [ ] `MISTRAL_API_KEY` (Organization-Key) existiert.
- [ ] Founder-Bestaetigung "AVV signiert" im Turn (sonst STOP).

---

## Pre-Push — Code-Checks (Claude erledigt autonom)

### 1. Commit-Bestand pruefen
```bash
cd nachbar-io && git log --oneline 5de2a58..HEAD
```
Erwartung: **47 Commits** (Stand 2026-04-21):
- 9 Welle-C-Feature-Commits (C0-C7) bis `cd543f0`
- 8 C8-Commits inkl. UX-Upgrade + E2E-Skelett bis `a46cc15`
- 6 Doku-/Aktionsplan-Commits (Handoffs, Aktionsplan E-D-A-B)
- 2 Plan-Commits (Haertungs-Runde Plan + Freigabe) bis `677d320`
- 8 Haertungs-Runde-Commits B1-B4 (`41106a9`, `4b0fdd1`, `78a7aa7`, `226f390`, `4b6e676`, `dda2a66`, `ca70c34`, `4e83d43`)
- 1 Release-Notes-Commit (`328c354`)
- weitere Push-Prep-Commits am Mo 26.04. moeglich (B6 Task 6.1 + 6.3 + Walkthrough-Fixes)

Abweichung = STOP + melden.

### 2. Uncommitted Reste pruefen
```bash
git status --short
```
Erwartung: nur dokumentierte Uncommitted-Artefakte aus Handoff (`M app/datenschutz/page.tsx` (Welle-B-Rest, entweder committen oder verwerfen), `??`-Handoff-Dateien, ein BACKUP-SQL-File).

**Entscheidung Founder:**
- `app/datenschutz/page.tsx`-Diff (+64 LOC): **committen** (Welle-B-Folgearbeit-Abschluss) oder **verwerfen** (wenn Diff veraltet ist)?

### 3. Tests gruen
```bash
# Welle-C-Smoke-Suite
npx vitest run __tests__/modules/memory/ \
               __tests__/components/senior/ \
               __tests__/components/caregiver/ \
               __tests__/api/memory/ \
               __tests__/hooks/useTtsPlayback.test.ts \
               __tests__/hooks/useOnboardingTurn.test.ts \
               __tests__/hooks/useSpeechInput.test.ts \
               __tests__/components/onboarding/ \
               lib/ai/__tests__/provider.test.ts \
               lib/ai/tools/__tests__/save-memory.test.ts \
               app/api/ai/onboarding/turn/__tests__/route.test.ts

# Voll-Suite (Pflicht am Push-Tag, B6 Task 6.1)
npm run test
```
Erwartung Voll-Suite (Stand 2026-04-21 nach B2): **3480 passed / 3 skipped / 0 failed**. Skips dokumentiert in `.claude/rules/testing.md` (billing-checkout, hilfe/tasks ×2 — Reaktivierungs-Tickets vorhanden, kein Welle-C-Regress).

### 4. Type-Check sauber
```bash
npx tsc --noEmit
```
Erwartung (Stand 2026-04-21 nach B3): **0 Errors**. Skip-Liste leer, alle 9 vorherigen tsc-Errors via Typ-Casts behoben (`dda2a66`). Keine `@ts-expect-error`-Marker im Repo (ausser Test-Setup falls neu hinzugekommen).

### 5. Audit
```bash
npm audit --omit=dev
```
Erwartung: keine neuen kritischen Vulns (Basis-Level: unveraendert vs. letztem Push).

---

## Push-Reihenfolge (rote Zone, Founder-Go pro Schritt)

**Regel:** Nach jedem Schritt kurz auf Founder warten. Keine automatische Weiterverkettung.

### Schritt 1 — Mig 173 auf Prod applyen

```
MCP apply_migration(
  project_id: "uylszchlyhbpbmslcnka",
  name: "173_memory_consents",
  query: <Inhalt aus supabase/migrations/173_memory_consents.sql>
)
```
**Verifizieren:**
```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid = 'public.care_consents'::regclass
   AND conname = 'care_consents_feature_check';
```
Erwartung: `CHECK (... 'ai_onboarding' ...)`.

### Schritt 2 — Mig 174 auf Prod applyen

```
MCP apply_migration(
  project_id: "uylszchlyhbpbmslcnka",
  name: "174_tighten_memory_consents_rls",
  query: <Inhalt aus supabase/migrations/174_tighten_memory_consents_rls.sql>
)
```
**Verifizieren:** `SELECT polname, polqual FROM pg_policies WHERE tablename='user_memory_consents';` zeigt die neuen Policies.

### Schritt 3 — Vercel-Env setzen (Founder)

Im Vercel-Dashboard `nachbar-io` → Settings → Environment Variables (production + preview + development):
- `ANTHROPIC_API_KEY` = `<theobase-gmbh-key>`
- `MISTRAL_API_KEY` = `<theobase-gmbh-key>`
- `AI_PROVIDER` = `off` (vorerst — Umschaltung in Schritt 6)

### Schritt 4 — Datenschutz-Diff entscheiden (Founder)

```bash
cd nachbar-io && git diff app/datenschutz/page.tsx
```
Commit oder `git checkout app/datenschutz/page.tsx`. Dann `git status --short` = clean ausser Handoff-Files.

### Schritt 5 — Push

```bash
cd nachbar-io && git push origin master
```
Vercel-Deploy loslaufen lassen. GitHub-Actions bauen ~3 Min.

**Monitoring:**
- Vercel-Dashboard Build-Status beobachten.
- Sentry-Dashboard auf neue Fehler achten.

### Schritt 6 — AI_PROVIDER=claude aktivieren (Founder, nach Build-Erfolg)

- Vercel-Env `AI_PROVIDER=claude` setzen.
- Vercel "Redeploy" ausloesen (damit der neue Env-Wert greift).

### Schritt 7 — Smoke-Test in Prod

Analog zu `nachbar-io/docs/founder-test-anleitung.md` Schritte 1-11, aber auf Live-URL `https://nachbar-io.vercel.app/`.

**Gruene Lampe:** alle 11 Schritte funktionieren ohne Server-500 + KI antwortet sinnvoll.

---

## Rollback-Plan

**Wenn irgendein Schritt schief geht:**

### Rollback-A — AI_PROVIDER killen
```
Vercel-Env: AI_PROVIDER=off → Redeploy
```
Sofortiger Fallback auf Banner "KI nicht verfuegbar". Keine Prod-Schmerzen.

### Rollback-B — Code revert
```bash
cd nachbar-io && git revert --no-commit 5de2a58..HEAD && git commit -m "revert: welle c"
git push origin master
```
Vercel baut automatisch den Pre-Welle-C-Stand.

### Rollback-C — Migrationen rueckbauen
Nur bei Schema-Problemen noetig:
```
MCP apply_migration(name: "174_tighten_memory_consents_rls.down",
                    query: <Inhalt 174_tighten_memory_consents_rls.down.sql>)
MCP apply_migration(name: "173_memory_consents.down",
                    query: <Inhalt 173_memory_consents.down.sql>)
```
Dann `DELETE FROM supabase_migrations.schema_migrations WHERE version IN (...);`.

### Rollback-D — Vercel Instant-Rollback
Vercel-Dashboard → Deployments → letzten vorherigen Deploy "Promote to Production" klicken. Kein Git-Push noetig, Rollback in 10 Sekunden aktiv.

---

## Was nach erfolgreichem Push dran ist (nicht Teil dieser Checklist)

- ~~C8 Caregiver-Scope~~ ✅ DONE (2026-04-20, 8 Commits, lokal Teil dieses Push)
- ~~F7 cache_control-Rename~~ ✅ DONE (Patch in Welle C, `cache_control.system`)
- ~~B1-B3 Haertungs-Runde Tests + tsc~~ ✅ DONE (2026-04-21)
- ~~B6 Task 6.2 Release-Notes Draft~~ ✅ DONE (2026-04-21, `328c354`)
- B4 Founder-Walkthrough Fr 24.04. — Stolperstellen-Fixes pro Commit
- B5 E2E x20b-e (optional, Rote Zone Senior-Seed) — Sa/So 25./26.04.
- B6 Task 6.1 Final-Re-Verify am Mo 26.04. abend
- C9 Deploy-Konsolidierung + Monitoring-Alerts fuer Anthropic-Rate-Limits
- Founder-Aufbau des Bad-Saeckingen-Pilot (5-10 Familien)
- Hausmeister-Modul (Founder-Wunsch 2026-04-20, brainstorming nach Push)

---

## Notfall-Kontakte waehrend Push

- **Anthropic-Status:** https://status.anthropic.com/
- **Vercel-Status:** https://www.vercel-status.com/
- **Supabase-Status:** https://status.supabase.com/
- **Sentry-Dashboard:** https://sentry.io/organizations/... (nachbar-io Project)

---

## Claude-Instruktion fuer den Push-Tag

```
Wir machen heute den Welle-C-Push. AVV ist signiert, GmbH ist im HRB.

Lies zuerst nachbar-io/docs/plans/2026-04-27-push-checklist-welle-c.md.

Arbeite die Schritte 1-7 in der Reihenfolge ab. Jeder Schritt braucht
Founder-Go — warte nach jedem Schritt auf Bestaetigung.

Wenn irgendetwas schief geht: Rollback-Plan parat. Default: AI_PROVIDER=off
sofort, dann Ursache pruefen.

Modell: Opus 4.7 (rote Zone, kritische Reihenfolge).
```
