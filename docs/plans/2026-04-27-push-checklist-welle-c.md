# Push-Checklist — Welle C (Zieldatum 27.04.2026 / nach HRB)

**Erzeugt:** 2026-04-20 (Aktionsplan-Option A)
**Ziel-Push:** `nachbar-io` HEAD `cd543f0` (24 lokale Commits seit `5de2a58`) auf origin/master.
**Ausloeser:** Theobase GmbH im Handelsregister eingetragen + beide AVV signiert (Anthropic + Mistral).
**Nicht fruehzeitig pushen!** Rote Zone — jeder Schritt braucht Founder-Go.

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
Erwartung: **24 Commits** (9 Welle-C-feature-Commits + 7 Codex-Fix-/STT-/C7-/C6c-Commits + 6 Doku-Commits + 2 Aktionsplan/Handoff = 24). Abweichung = STOP + melden.

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
               __tests__/hooks/useTtsPlayback.test.ts \
               __tests__/hooks/useOnboardingTurn.test.ts \
               __tests__/hooks/useSpeechInput.test.ts \
               __tests__/components/onboarding/

# Voll-Suite (optional, bei Zeitdruck skippable)
npm run test
```
Erwartung Welle-C-Smoke: **158/158 gruen**. Voll-Suite darf die bekannten 4 Pre-Existing-Failures haben (sos-detail, billing-checkout, hilfe/tasks × 2), nicht mehr.

### 4. Type-Check sauber
```bash
npx tsc --noEmit
```
Erwartung: **clean** ausser den 8 preexistenten Skip-Liste-Errors (`device-fingerprint.test.ts:267`, `quartier-info-vorlesen.test.tsx:170`, `x01-checkin-heartbeat.spec.ts:134-136`, `x19-postfach-thread.spec.ts:428-429`, `s12-neighbor-request-chat.spec.ts:92`).

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

- C8 Caregiver-Scope (Architektur-Entscheidung 1b+2a+3a vorliegend — 2-3h)
- C9 Deploy-Konsolidierung + Monitoring-Alerts fuer Anthropic-Rate-Limits
- Founder-Aufbau des Bad-Saeckingen-Pilot (5-10 Familien)
- F7 cache_control-Rename (Codex NACHBESSERN, separat)

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
