# Review-Checkliste — Codex C1-C6-Welle (Pilot-Feature-Gating)

**Stand:** 2026-04-30
**Autor:** Claude (zur eigenen Vorbereitung auf Code-Review nach Codex-Endreport)
**Spec:** `docs/plans/2026-04-30-pilot-feature-gating-plan.md`

---

## Zweck

Diese Checkliste hilft mir nach Codex' Endreport schnell und systematisch zu
verifizieren, ob die 6 Bloecke (C1-C6) sauber und planungsgemaess umgesetzt
wurden. Pro Block: was im Diff besonders pruefen, welche Edge-Cases, welche
Verifikations-Befehle. Am Ende: Cross-Cutting-Checks und Memory-Updates,
die ich danach machen muss.

---

## C1 — PILOT_MODE-Server-Bypass entfernen

**Erwarteter Commit:** `refactor(feature-flags): remove PILOT_MODE bypass for consistency`

**Diff-Pruefung:**

- [ ] In `lib/feature-flags-server.ts`: genau die `if (process.env.NEXT_PUBLIC_PILOT_MODE === "true") return true;`-Zeile entfernt, sonst nichts beruehrt.
- [ ] In `lib/feature-flags.ts`: die Bypass-Zeilen 110-112 entfernt (Bypass NACH dem `enabled`-Check, der nur Rolle/Plan/Quartier ueberspringt).
- [ ] **NEXT_PUBLIC_PILOT_MODE NICHT global entfernt** — UI-Banner / Closed-Pilot-Visuals duerfen den Wert weiter lesen.
  - Pruefe: `Grep -rn "NEXT_PUBLIC_PILOT_MODE" components/ app/ --glob "!*.test.*"` — sollte noch Treffer zeigen, aber NUR fuer UI-Logik, nicht fuer Feature-Flag-Logik.

**Test-Anpassungen:**

- [ ] Alte Tests, die "in PILOT_MODE wird Rolle/Plan/Quartier-Check umgangen" verifizieren, sind angepasst oder entfernt.
- [ ] Neuer RED-Test ist GREEN nach Implementation: "PILOT_MODE-Bypass hat keinen Effekt mehr auf `enabled=false`-Flags".
- [ ] Tests in `__tests__/lib/feature-flags.test.ts`, `feature-flags-audit.test.ts`, `municipal/feature-flag.test.ts`, `lib/leistungen/__tests__/feature-flag.test.ts` alle gruen.

**Edge-Cases:**

- [ ] Suche in App-Code nach Annahmen "in PILOT_MODE laeuft alles" — falls gefunden, ist das ein Codex-Hinweis (sollte er auch sehen) oder ein latenter Bug.
- [ ] `lib/feature-flags-middleware-cache.ts` enthaelt keinen Bypass — pruefen ob ggf. doch.
- [ ] Server-side Route-Handler, die `isFeatureEnabledServer` aufrufen, bekommen jetzt mehr `false`-Antworten als vorher (war ja alles bypassed). Funktioniert die UX im Closed-Pilot weiter?

**Verifikation:**

```bash
npx vitest run __tests__/lib/feature-flags.test.ts \
               __tests__/lib/feature-flags-audit.test.ts \
               __tests__/lib/municipal/feature-flag.test.ts \
               lib/leistungen/__tests__/feature-flag.test.ts
npx eslint --max-warnings 200
npx tsc --noEmit
```

---

## C2 — Audit-Log + UI-Reason-Feld

**Erwarteter Commit:** `feat(feature-flags): add audit log for toggle actions`

**Migration 176 Pruefung:**

- [ ] Datei `supabase/migrations/176_feature_flags_audit_log.sql` existiert + `.down.sql`.
- [ ] Schema: `id bigserial`, `flag_key text not null`, `action text check (action in (...))`, `enabled_before/after boolean`, `changed_by uuid`, `reason text`, `metadata jsonb`, `created_at timestamptz`.
- [ ] Index auf `(flag_key)` und `(created_at desc)`.
- [ ] RLS aktiviert + Policy "Admin reads audit log".
- [ ] Funktion `log_feature_flag_change()` als `security definer`.
- [ ] Trigger `feature_flags_audit_log_trigger` AFTER INSERT/UPDATE/DELETE.
- [ ] Idempotenz: `CREATE TABLE IF NOT EXISTS`, Policy in `DO`-Block, `CREATE OR REPLACE FUNCTION`, `CREATE TRIGGER` mit Drop-Ueberlauf-Check.
- [ ] Neue Spalte `feature_flags.last_change_reason text` korrekt mit `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- [ ] **NICHT auf Prod angewendet** — `git log --oneline supabase/migrations/176*` zeigt File, aber Prod-`schema_migrations` hat keinen 176-Eintrag (wenn Codex disziplin geblieben ist).

**Down-Migration Pruefung:**

- [ ] `176_feature_flags_audit_log.down.sql` droppt: Trigger, Function, Index, Policy, Tabelle, Spalte. In dieser Reihenfolge.

**Test-Coverage:**

- [ ] `__tests__/lib/feature-flags-audit-log.test.ts` enthaelt 4 Tests:
  - INSERT erzeugt Eintrag mit `action='insert'`, `enabled_before=null`, `enabled_after=...`
  - UPDATE schreibt `enabled_before` und `enabled_after` korrekt
  - DELETE schreibt `action='delete'`, `enabled_before=...`, `enabled_after=null`
  - Reason-Feld wird durchgereicht (`last_change_reason` → Audit-Log `reason`-Spalte)

**UI-Pruefung in `FeatureFlagManager.tsx`:**

- [ ] Optionales `<Textarea>` "Grund (optional)" oberhalb des Switches gerendert.
- [ ] Default-Wert leer, kein Pflichtfeld.
- [ ] Beim Toggle: UPDATE-Statement schreibt `enabled` UND `last_change_reason` in einer SQL-Operation.
- [ ] `invalidateFlagCache()` wird nach erfolgreichem Toggle aufgerufen (war schon vorher der Fall).
- [ ] Kein Visual-Regression: Switch sieht gleich aus, Reason ist daneben/darunter, nicht stoerend.

**Database-Types:**

- [ ] `lib/supabase/database.types.ts` regeneriert oder Codex hat den Schritt dokumentiert.

---

## C3 — Neue Flags BILLING / TWILIO / CHECKIN_MESSAGES

**Erwarteter Commit:** `feat(feature-flags): gate billing, twilio, checkin-messages routes`

**Migration 177 Pruefung:**

- [ ] Datei `supabase/migrations/177_pilot_phase_flags.sql` existiert + `.down.sql`.
- [ ] 3 INSERTs: BILLING_ENABLED, TWILIO_ENABLED, CHECKIN_MESSAGES_ENABLED — alle mit `enabled=false` als Default, `required_plans=array[]::text[]`, klarer Description.
- [ ] `ON CONFLICT (key) DO NOTHING` (idempotent).
- [ ] **NICHT auf Prod angewendet**.

**Code-Gates Pruefung:**

- [ ] `app/api/billing/*`: jede Route hat `isFeatureEnabledServer(supabase, "BILLING_ENABLED")` am Anfang, returnt 503 mit JSON-Body bei `false`.
- [ ] `app/api/checkout/*`: gleiches Muster.
- [ ] `app/api/stripe/webhook/route.ts` SPEZIALFALL:
  - [ ] **Returnt 200 + leerer Body** bei `BILLING_ENABLED=false`, NICHT 503.
  - [ ] Log-Eintrag `billing_disabled_webhook_received` (irgendwo im Code).
  - [ ] Stripe-Signature-Verifikation laeuft trotzdem (sonst Sicherheitsluecke), falls vorhanden.
- [ ] `app/api/twilio/*`: gleiches Muster wie Billing (503).
- [ ] `app/api/care/*`: nur die SCHREIB-Endpoints fuer Check-in-Nachrichten gegateet, keine Doppel-Gates auf bereits via `canUsePersonalAi` oder `MEDICATIONS_ENABLED` gegateten Routen.

**UI-Pruefung in `FeatureFlagManager.tsx`:**

- [ ] `FLAG_DESCRIPTIONS` enthaelt 3 neue Eintraege.
- [ ] `FLAG_GROUPS` hat neue Gruppe "Billing & Externe Provider" mit Pattern `/^(BILLING|TWILIO|CHECKIN_MESSAGES)/`.
- [ ] Gruppen-Reihenfolge sinnvoll (vermutlich vor "Externe APIs").

**Tests:**

- [ ] Pro Route ein 503-Test (Billing/Checkout/Twilio).
- [ ] Stripe-Webhook-Test: 200 + Log-Eintrag bei Flag false.
- [ ] Tests gruen.

**Edge-Cases:**

- [ ] Care-Routen: hat Codex die richtigen identifiziert? Existing-Stufe-1-Gating ueber `users.settings.ai_help_enabled` darf nicht doppelt sein.
- [ ] Stripe-Webhook: Signature-Verifikation durfte NICHT entfernt werden.
- [ ] Frontend-UI fuer Billing/Stripe: zeigt sie ggf. Buttons "Jetzt buchen", die ins Leere klicken? — bewusst akzeptiert, Pilot ist closed.

---

## C4 — Phase-Preset-API + Admin-UI-Buttons

**Erwarteter Commit:** `feat(admin): add phase preset buttons for feature flags`

**Konstanten Pruefung in `lib/feature-flags-presets.ts`:**

- [ ] `PHASE_0_PRESET`: alle bekannten Flags auf true.
- [ ] `PHASE_1_PRESET`:
  - ON-Liste exakt aus Plan Abschnitt 4.3 (11 Flags).
  - OFF-Liste enthaelt mindestens: AI_PROVIDER_CLAUDE/MISTRAL, MEDICATIONS_ENABLED, DOCTORS_ENABLED, APPOINTMENTS_ENABLED, VIDEO_CONSULTATION, HEARTBEAT_ENABLED, GDT_ENABLED, CARE_ACCESS_INDIVIDUAL_CAREGIVER/CARE_COMPANY, MARKETPLACE, EVENTS, BOARD_ENABLED, LOST_FOUND, KOMMUNAL_MODULE, MODERATION_ENABLED, ORG_DASHBOARD, QUARTER_STATS, PUSH_NOTIFICATIONS, NEWS_AI, VIDEO_CALL_PLUS, VIDEO_CALL_MEDICAL, BILLING_ENABLED, TWILIO_ENABLED, CHECKIN_MESSAGES_ENABLED.
- [ ] `PHASE_2_PRESET`: stub oder kommentiert.

**API-Endpoint Pruefung:**

- [ ] `app/api/admin/feature-flags/preset/route.ts` POST.
- [ ] Admin-Check ueber Session/Role (analog zu anderen `/api/admin/`-Routen).
- [ ] Validierung `confirm`-Wort matcht `phase`-Suffix.
- [ ] Transaktion: alle UPDATEs in einer `BEGIN/COMMIT`-Transaktion, `last_change_reason="phase-preset:<phase>"`.
- [ ] `invalidateFlagCache()` einmal NACH Commit aufgerufen, NICHT pro Flag.
- [ ] 400 bei confirm-Mismatch, 403 bei Nicht-Admin, 200 bei Erfolg.
- [ ] Audit-Log entsteht automatisch via Trigger aus C2 — pruefen ob Test das verifiziert.

**Admin-UI Pruefung:**

- [ ] 3 Buttons oben in `FeatureFlagManager`.
- [ ] Phase 2 disabled (`disabled` prop oder analog).
- [ ] Klick auf Phase-0/1-Button oeffnet `Dialog` von shadcn/ui.
- [ ] Dialog-Header und -Subtext wie im Plan beschrieben.
- [ ] Input-Feld + Bestaetigen-Button (disabled bis Eingabe matched).
- [ ] Toast bei Erfolg, Loading-State waehrend des Calls.

**Tests:**

- [ ] `__tests__/api/admin/feature-flags-preset.test.ts` enthaelt:
  - POST mit confirm-Match setzt Flags + Audit-Log
  - POST mit confirm-Mismatch returnt 400
  - POST von Nicht-Admin returnt 403
  - Cache wird genau einmal invalidiert (Mock-Spy auf `invalidateFlagCache`)
- [ ] Tests gruen.

**Edge-Cases:**

- [ ] Was passiert, wenn ein Flag in `PHASE_1_PRESET` referenziert wird, der nicht in der DB existiert? (UPDATE matched 0 Rows, Audit-Log leer fuer den Flag — sollte nicht crashen).
- [ ] Was passiert, wenn `last_change_reason`-Spalte aus C2 fehlt? (Dann bricht UPDATE — Test mit Mock muss das abfangen oder Migration-Reihenfolge muss klar sein).
- [ ] Concurrency: zwei Founder klicken gleichzeitig — Transaktion + invalidateCache sollten konsistent sein.

---

## C5 — Phase-1-Default-Korrektur (Migration 178, NICHT applyen)

**Erwarteter Commit:** `chore(migrations): add phase-1 default migration (apply later)`

**Migration 178 Pruefung:**

- [ ] Datei `supabase/migrations/178_pilot_phase_1_defaults.sql` existiert + `.down.sql`.
- [ ] Header enthaelt `-- DO NOT APPLY TO PROD UNTIL FOUNDER-GO FOR PHASE-1 SWITCH`.
- [ ] Idempotent: `WHERE enabled IS DISTINCT FROM false` in jedem UPDATE.
- [ ] UPDATE-Statements decken alle OFF-Flags aus PHASE_1_PRESET ab (siehe C4 OFF-Liste).
- [ ] BILLING_ENABLED / TWILIO_ENABLED / CHECKIN_MESSAGES_ENABLED **NICHT** in 178 (sind via 177 schon enabled=false).

**Anwendung:**

- [ ] **NICHT** auf Prod angewendet — Pruefung via Memory oder schema_migrations-Lookup.
- [ ] **NICHT** auf Local-Stack angewendet (oder dokumentiert, falls fuer Test-Zwecke).
- [ ] **KEIN** schema_migrations-INSERT.

**Edge-Cases:**

- [ ] Was wenn ein Flag schon enabled=false ist? → idempotent dank `IS DISTINCT FROM`. Kein Audit-Log-Eintrag (gut).
- [ ] Trigger aus C2 schreibt Audit-Log fuer JEDE UPDATE — ist das gewollt? Ja: dokumentiert die Phase-1-Aktivierung.

---

## C6 — INBOX-Sweep

**Erwarteter Commit:** `docs(handoff): close pilot feature gating block c1-c5`

**INBOX-Pruefung:**

- [ ] Alle 5 Bloecke C1-C5 als `done` markiert.
- [ ] Files-Spalte korrekt befuellt.
- [ ] Last-Update-Spalte mit aktuellem Datum.
- [ ] Eine zusammenfassende Zeile "Pilot-Feature-Gating C1-C5 done in Commits <hashes>".
- [ ] Keine andere Datei in diesem Commit.

---

## Cross-Cutting-Checks (am Ende der gesamten Welle)

**Verifikations-Befehle:**

```bash
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"

# Test-Suite vollstaendig
npx vitest run                    # exit 0, ~3858 + neue Tests, 1 skipped

# Lint
npx eslint --max-warnings 200     # exit 0

# Typecheck
npx tsc --noEmit                  # exit 0

# Migrations als Files
ls -la supabase/migrations/176_* supabase/migrations/177_* supabase/migrations/178_*
# Erwartet: 6 Files (3 sql + 3 down.sql)

# Migrations NICHT auf Prod (per Memory/MCP-Read)
# select version, name from supabase_migrations.schema_migrations
#   where version in ('176','177','178');
# Erwartet: 0 Zeilen.

# Working-Tree clean
git status --short --untracked-files=all
# Erwartet: nur die 13 untracked Founder-Hand-Handover-Plaene

# Kein Push
git log origin/master..HEAD --oneline | wc -l
# Erwartet: ~73 + 6 = ~79 Commits ahead von origin/master

# Keine Secrets in Logs
git log --since="2026-04-30" -p | grep -iE "sk_live|sbp_|AC[0-9a-f]{32}|sk-ant-|vercel_token"
# Erwartet: 0 Treffer
```

**Plan-Konsistenz:**

- [ ] Alle 6 Bloecke abgeschlossen, ein Commit pro Block (+ ggf. Pre-Block-Commit fuer INBOX-Status, das ist okay).
- [ ] Migrations-Nummern wie geplant (176/177/178).
- [ ] Kein Block geblockt oder uebersprungen.
- [ ] Keine Open-Question-Antworten anders als im Plan.

**Compliance / Rote Zone:**

- [ ] Kein `git push origin master` gelaufen.
- [ ] Kein `vercel deploy` gelaufen.
- [ ] Kein `apply_migration` auf Prod.
- [ ] Keine `execute_sql`-Schreibaktion auf Prod.
- [ ] Keine `.env`-Werte gelesen oder geloggt.
- [ ] Keine Secrets in Commits, Logs, Antworten.

---

## Memory-Updates nach Welle (Claude-Aufgabe)

Sobald Codex Endreport gemeldet hat und ich verifiziert habe:

1. **`MEMORY.md` Top-Header:**
   - Master-HEAD aktualisieren (von `dc1b8e3` auf neuen Hash)
   - Welle-3-Eintrag hinzufuegen ("Pilot-Feature-Gating C1-C6 done")
   - Migrations-Status: 176/177/178 als "Files lokal, NICHT auf Prod"

2. **`project_session_handover.md`:**
   - Working-Tree-Reste-Sektion bleibt unveraendert (Codex haelt sich an den Plan)
   - Migrations-Status-Tabelle erweitern um 176/177/178
   - Naechster Schritt: "Phase-1-Schalter ist Founder-Hand, wartet auf echte Pilot-Familien"

3. **Topic-File `topics/pilot-feature-gating.md` (neu, oder Pointer in topics/architecture.md):**
   - Nicht zu lang, Pointer auf Plan-File und auf wichtige Code-Stellen
   - Erwaehnt PHASE_0/1/2 Konzept
   - Beschreibt Audit-Log-Tabelle

4. **`feedback_*`-Files:**
   - Keine neuen Feedback-Files noetig (es ist Plan-Umsetzung, keine neue Arbeitsregel)
   - Eventuell `feedback_existing_infrastructure_check.md` mit weiterem Beispiel ergaenzen
     (wir haben Welle-C-C1+C4-Lehre erfolgreich angewendet)

5. **INBOX-Sicht:**
   - Codex hat in C6 done markiert. Ich pruefe nur, dass alle Eintraege konsistent sind.

---

## Wenn etwas nicht passt — Eskalations-Hierarchie

| Befund | Reaktion |
|---|---|
| Block-Commit fehlt | INBOX pruefen, ob als blocked markiert. Wenn nicht, Codex fragen. |
| Test rot | Welche Tests, welcher Block? Diff lesen. Codex hat ggf. einen Edge-Case uebersehen. |
| Migration auf Prod gelandet | ROT — sofort melden. Pruefen ob Rollback noetig. Memory-Update mit Lehre. |
| Push gelaufen | ROT — sofort melden. Reality-Check: war das ein versehentlicher push? |
| Secret in Commit | ROT — sofort melden. Rotation-Pflicht. |
| Plan-Abweichung | Codex haette in INBOX als blocked dokumentieren sollen. Pruefen ob Begruendung sinnvoll. |
| Adapter-Hinweis im Pre-Check uebersehen | Code-Review zeigt Duplikat. Refactor-Folge-Auftrag noetig. |

---

## Geschaetzte Review-Zeit

- C1: 5-10 Min (kleiner Diff)
- C2: 15-25 Min (Migration + Trigger + Tests + UI)
- C3: 15-20 Min (mehrere Routen + Migration + UI)
- C4: 15-25 Min (API + Modal + Tests)
- C5: 5-10 Min (nur Migration)
- C6: 2 Min (INBOX-Diff)
- Cross-Cutting: 10 Min
- Memory-Updates: 15-20 Min

**Total geschaetzt: 90-120 Min** fuer komplette Verifikation + Memory-Update nach Codex' Endreport.

---

*Checklisten-Ende. Bereit fuer Codex' Endreport.*
