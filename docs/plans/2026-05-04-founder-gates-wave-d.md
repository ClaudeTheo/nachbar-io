# Founder-Gates Welle D - Entscheidungspaket

Stand: 2026-05-04

## Ziel

Alles vorbereiten, was Thomas spaeter bewusst freigeben muss, ohne die roten
Aktionen selbst auszufuehren: Push/Deploy, Vercel-Env, Prod-Migrationen,
AI-Test-User-Cleanup und Provider-/AVV-Schalter.

Dieses Dokument entscheidet nichts. Es ist ein Arbeitszettel fuer den Moment,
in dem der lokale Stand in Richtung echter Pilot-Familien gehen soll.

## Aktueller Repo-Stand

- Lokaler Branch: `master`
- Lokaler Stand: 11 Commits vor `origin/master` vor Start dieser Welle.
- `origin/master`: `8341cd9 fix(pilot): allow health check in closed pilot`
- Production laut Session-Handover: `dpl_5S4hJ2fuWwYSUxL4tdd6dT8SAvUY` mit
  Alias `https://nachbar-io.vercel.app`
- Diese Session hat lokal zusaetzlich vorbereitet:
  - Welle C Register-Polish
  - F-2 KI-Routen Per-User-Rate-Limit
  - F-4 Speed-Dial userId Server-Gate
  - Welle C Senior-Touch-Targets Guard
  - Welle C Senior-Mobile-Screenshot-Smoke

## Harte Stopps

Nicht in einem Rutsch ausfuehren:

- Prod-DB-Schreibaktionen
- Prod-Migrationen
- Vercel-Env-Aenderungen
- Secrets lesen, drucken, kopieren oder rotieren
- Provider-Live-Schalter
- echte Pilotdaten durch KI verarbeiten
- `git push origin master` ohne ausdrueckliches Push-Go

Wenn einer dieser Punkte notwendig wird: stoppen, Entscheidung benennen,
naechsten kleinsten sicheren Schritt vorschlagen.

## 1. Push-/Deploy-Go Paket

Ziel: Entscheiden, ob die 11+ lokalen Commits Richtung GitHub/Production duerfen.

Vor Push lokal pruefen:

```powershell
git status --short --branch
git log --oneline --decorate -n 14
npx vitest run __tests__/app/register-pilot-role.test.tsx __tests__/app/register-ai-consent.test.tsx __tests__/lib/ai-rate-limit.test.ts __tests__/api/companion/chat.test.ts app/api/ai/onboarding/turn/__tests__/route.test.ts __tests__/api/speed-dial.test.ts __tests__/integration/speed-dial-sos.test.ts __tests__/app/senior/touch-targets.test.tsx
npx eslint app/api/companion/chat/route.ts app/api/ai/onboarding/turn/route.ts app/api/speed-dial/route.ts app/senior/layout.tsx "app/(senior)/kreis-start/page.tsx" "app/(auth)/register/components/RegisterStepPilotRole.tsx" "app/(auth)/register/components/RegisterStepAiConsent.tsx" --no-warn-ignored
npx tsc --noEmit
npm run build
```

Pass-Kriterien:

- tracked Worktree sauber
- nur bekannte alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid`
  bleiben unberuehrt
- Vitest/ESLint/tsc/build gruen
- Build zeigt hoechstens die bekannte lokale Stripe-Warnung
- keine Migration wird im Push vorausgesetzt, die auf Prod fehlen wuerde
- `NEXT_PUBLIC_PILOT_MODE` bleibt fuer Production bewusst `true`

Founder-Entscheidung:

| Entscheidung | Bedeutung |
|---|---|
| `PUSH-GO master` | Lokale Commits duerfen nach `origin/master`. |
| `NO-PUSH` | Lokaler Stand bleibt nur lokal; weiter vorbereiten. |
| `SPLIT` | Commits erst in kleinere Push-Wellen sortieren. |

Nach Push:

- GitHub Actions abwarten.
- Wenn CI gruen und Deploy beabsichtigt: Production-Deployment dem Push-SHA
  zuordnen.
- Wenn CI rot: kein Deploy, Fehler lokal reproduzieren.

## 2. Vercel-Env Sicherheitscheck

Ziel: Nur Namen und Status pruefen, keine Werte lesen.

Read-only Check:

```powershell
vercel env ls production
vercel env ls preview
```

Nicht ausfuehren in dieser Welle:

- `vercel env pull`
- `vercel env add`
- `vercel env rm`
- `vercel env edit`
- Ausgabe von Secret-Werten

Pass-Kriterien fuer Phase 1:

| Env | Production | Preview | Warum |
|---|---|---|---|
| `NEXT_PUBLIC_PILOT_MODE` | gesetzt auf `true` | gesetzt auf `true` oder bewusst offen dokumentiert | Closed-Pilot muss an bleiben. |
| `E2E_TEST_SECRET` | nicht gesetzt | nicht gesetzt | Prod/Preview duerfen keinen Test-Login-Bypass haben. |
| `SECURITY_E2E_BYPASS` | nicht gesetzt | nicht gesetzt | Harte Security-Regel aus S-5. |
| KI Provider Secrets | duerfen gesetzt sein, aber Provider-Flags bleiben aus | duerfen gesetzt sein, aber Provider-Flags bleiben aus | Kein KI-Live ohne AVV. |
| Stripe/Twilio Secrets | duerfen gesetzt sein, aber Feature-Flags bleiben aus | duerfen gesetzt sein, aber Feature-Flags bleiben aus | Keine Kosten-/Provider-Aktion in Phase 1. |

Founder-Entscheidung:

| Entscheidung | Bedeutung |
|---|---|
| `ENV-READONLY-PASS` | Env-Namen sehen plausibel aus, keine Aenderung. |
| `ENV-FIX-NEEDED` | Thomas nimmt Vercel-UI/CLI bewusst in die Hand. |
| `STOP` | Kein Push/Deploy, bis Env-Konflikt geklaert ist. |

## 3. Migrationen 176 / 177 / 178

Ziel: Klar trennen zwischen Vorbereitung und Apply.

Lokale Files:

- `supabase/migrations/176_feature_flags_audit_log.sql`
- `supabase/migrations/176_feature_flags_audit_log.down.sql`
- `supabase/migrations/177_pilot_phase_flags.sql`
- `supabase/migrations/177_pilot_phase_flags.down.sql`
- `supabase/migrations/178_pilot_phase_1_defaults.sql`
- `supabase/migrations/178_pilot_phase_1_defaults.down.sql`

Was die Migrationen tun:

| Migration | Zweck | Apply-Zeitpunkt |
|---|---|---|
| 176 | `feature_flags_audit_log`, `feature_flags.last_change_reason`, Trigger und RLS fuer Admin-Read | Vor Tag X, nach Preview-/Branch-Test, bewusstes Founder-Go |
| 177 | Schutzflags `BILLING_ENABLED`, `TWILIO_ENABLED`, `CHECKIN_MESSAGES_ENABLED` default `false` | Vor Tag X, nach 176 |
| 178 | Phase-1-Defaults fuer riskante Flags auf `false` | Erst am Phase-1-Schalter, nicht vorab |

Read-only SQL nach Apply:

```sql
select version, name
from supabase_migrations.schema_migrations
where version in ('176', '177', '178')
order by version;
```

Smoke nach 176:

```sql
select count(*)
from public.feature_flags_audit_log;
```

Smoke nach 177:

```sql
select key, enabled
from public.feature_flags
where key in (
  'BILLING_ENABLED',
  'TWILIO_ENABLED',
  'CHECKIN_MESSAGES_ENABLED'
)
order by key;
```

Pass-Kriterien:

- 176 und 177 stehen vor Tag X in `schema_migrations`.
- `feature_flags_audit_log` ist lesbar fuer Admin.
- Schutzflags aus 177 sind vorhanden und `false`.
- 178 wird nicht vor dem Phase-1-Schalter angewendet.

Founder-Entscheidung:

| Entscheidung | Bedeutung |
|---|---|
| `MIGRATION-PREVIEW-GO` | 176/177 duerfen zuerst auf Preview-/Branch-DB getestet werden. |
| `MIGRATION-PROD-GO-176-177` | Nach Test duerfen 176 und 177 auf Prod. |
| `MIGRATION-PROD-GO-178` | Erst am Phase-1-Schalter. |
| `NO-MIGRATION` | Kein Apply, App bleibt im bisherigen Prod-Schema. |

## 4. AI-Test-User-Cleanup

Ziel: Testkonten vor echten Familien sauber entfernen oder bewusst ausnehmen.

Aktueller Code-Stand:

- Dry-Run existiert:
  `lib/admin/ai-test-users-cleanup-dry-run.ts`
- Execute-Pfad existiert inzwischen:
  `lib/admin/ai-test-users-cleanup-execute.ts`
- CLI-Wrapper existiert:
  `scripts/ai-test-users-cleanup-execute.ts`
- Tests existieren:
  `__tests__/scripts/ai-test-users-cleanup-dry-run.test.ts`
  und `__tests__/scripts/ai-test-users-cleanup-execute.test.ts`

Wichtige Safety-Gates im Execute-Code:

- `AI_TEST_CLEANUP_MODE` muss exakt `execute` sein.
- Unsichere Namens-Treffer ohne `settings.is_test_user=true` stoppen Execute.
- Jeder Loeschkandidat braucht `must_delete_before_pilot=true`.
- Manuelle Bestaetigung muss exakt
  `AI-TESTNUTZER LOESCHEN:<count>` lauten.
- Report pseudonymisiert geloeschte User-Refs per Hash.

Vorbereitung ohne Prod-Schreiben:

```powershell
npx vitest run __tests__/scripts/ai-test-users-cleanup-dry-run.test.ts __tests__/scripts/ai-test-users-cleanup-execute.test.ts
```

Rote Zone, nur mit Founder-Go:

```powershell
$env:AI_TEST_CLEANUP_MODE="execute"
$env:AI_TEST_CLEANUP_OUTPUT="file"
npx tsx scripts/ai-test-users-cleanup-execute.ts
```

Pass-Kriterien fuer echten Cleanup:

- Dry-Run-Report wurde vorab gespeichert und von Thomas gelesen.
- Anzahl Kandidaten passt zur Erwartung.
- Keine `unsafeNameOnlyMatches`.
- Keine Admin-Nutzer ausser explizit markierte Admin-Testnutzer.
- Execute-Confirmation passt zur Kandidatenzahl.
- Execute-Report liegt als Datei vor und wird im Vault referenziert.

Founder-Entscheidung:

| Entscheidung | Bedeutung |
|---|---|
| `CLEANUP-DRYRUN-GO` | Nur Report erzeugen, keine Deletes. |
| `CLEANUP-EXECUTE-GO` | Rote Zone: markierte AI-Testnutzer loeschen. |
| `CLEANUP-HOLD` | Keine Deletes; Testkonten bleiben dokumentiert. |

## 5. AVV-/Provider-Status

Ziel: Keine Provider-Live-Funktion ohne Vertrag und bewusstes Phase-Go.

Phase-1-Preset in `lib/feature-flags-presets.ts`:

- ON:
  - `PILOT_MODE`
  - externe Warn-/Infoquellen: NINA, DWD, UBA, LGL, OSM, DELFI, BKG
  - `AI_PROVIDER_OFF`
  - `CARE_ACCESS_FAMILY`
  - `CARE_ACCESS_EMERGENCY`
- OFF:
  - `AI_PROVIDER_CLAUDE`
  - `AI_PROVIDER_MISTRAL`
  - `BILLING_ENABLED`
  - `TWILIO_ENABLED`
  - `CHECKIN_MESSAGES_ENABLED`
  - Care-/Medikations-/Heartbeat-Details
  - Marketplace, Events, Board, Lost&Found, Push, Video, GDT, weitere
    riskante Module

Provider-Gates:

| Bereich | Feature-/Env-Risiko | Voraussetzung | Phase |
|---|---|---|---|
| KI Anthropic/Mistral | echte Nutzertexte an Provider | AVV/DPA + DSFA-Addendum + genau ein Provider aktiv | 2b |
| Stripe | Zahlungen, Webhooks, Kosten | HR, AGB, Stripe-Live, Webhook-Secret bewusst gesetzt | 2a |
| Twilio | SMS/Telefonie, personenbezogene Kontakte | Twilio-AVV + Telefonnummern-Policy | 2c |
| Care sensitiv | Medikamente, Check-in-Nachrichten | Care-AVV/DSFA, Verschluesselungspruefung, Zugriffspfad-Smoke | 2d |
| Video/Arzt | medizinische Kommunikation | Sprechstunde-/Arzt-Vertrag, GDT-/Video-Regeln | 2e |

Founder-Entscheidung:

| Entscheidung | Bedeutung |
|---|---|
| `PHASE-1-ONLY` | Provider bleiben aus, nur geschlossener Pilot mit Basisfunktionen. |
| `PHASE-2A-GO` | Nach HR/Stripe-Voraussetzungen einzelne nicht-KI Provider/Features an. |
| `PHASE-2B-GO` | KI nach AVV und DSFA-Addendum. |
| `PHASE-2C-GO` | Twilio nach AVV. |
| `PHASE-2D-GO` | Sensitive Care-Daten nach DSFA/AVV. |
| `PHASE-2E-GO` | Arzt-/Video-Pfade nach Vertrag. |

## 6. Tag-X Reihenfolge

Nicht parallelisieren:

1. HR-/Rechtsformstatus und Pilottexte final pruefen.
2. Env-Namen read-only pruefen, keine Werte lesen.
3. Lokale Verifikation des aktuellen `master`.
4. Thomas gibt `PUSH-GO master` oder stoppt.
5. Push nach `origin/master`.
6. GitHub CI abwarten.
7. Production-Deployment dem Push-SHA zuordnen.
8. Read-only Production-Smoke: `/`, `/login`, `/register`, `/api/health`.
9. Migration 176/177 nur nach separatem Go.
10. AI-Test-User-Cleanup nur nach separatem Dry-Run und Execute-Go.
11. Migration 178 erst direkt am Phase-1-Schalter.
12. Admin-Preset `phase_1` nur wenn Audit-Trail vorhanden ist.
13. Erst eine Familie einladen, dann stoppen und Logs/Feedback pruefen.
14. Danach erst weitere Familien.

## 7. Rollback-Zettel

Schnellste sichere Reaktionen:

| Problem | Erste Reaktion | Danach |
|---|---|---|
| UI-/Runtime-Regression nach Deploy | Vercel-Rollback auf vorheriges Deployment | Ursache lokal reproduzieren |
| Falsche Feature-Flags | Phase-0-Preset oder einzelnes Flag aus | Audit-Log pruefen |
| Migration 176/177 verursacht Schaden | Keine weiteren Toggles | Down-Migration nur mit Founder-Go |
| Cleanup loescht zu viel | Sofort stoppen | PITR/Restore-Entscheidung mit Supabase |
| KI/Provider unerwartet aktiv | Feature-Flag aus, Env nicht anfassen | Audit und Provider-Logs pruefen |
| echte Familie meldet Problem | keine weiteren Invites | Bug klassifizieren, Fix lokal, dann neue Freigabe |

## 8. Offene Founder-Hand

Nicht von Codex aufloesbar:

- HR-Eintragung / Bank / Stammkapital
- finale Rechtsform in Datenschutz, Impressum, AGB und Pilotanschreiben
- AVV/DPA-Status je Provider
- ob Senior-Mini-PC in Phase 1 aktiv versprochen wird
- echte Pilot-Familien-Liste
- Zeitpunkt fuer Push/Deploy
- Zeitpunkt fuer Prod-Migrationen
- Zeitpunkt fuer Cleanup-Execute

## 9. Quellen

- `AGENTS.md`
- `docs/plans/2026-04-30-phase-1-pre-flight.md`
- `docs/plans/2026-05-01-phase-1-founder-hard-gates-audit.md`
- `docs/plans/2026-05-02-next-larger-steps.md`
- `docs/plans/2026-05-04-ai-route-rate-limit-f2.md`
- `docs/plans/2026-05-04-speed-dial-userid-gate-f4.md`
- `lib/feature-flags-presets.ts`
- `lib/admin/ai-test-users-cleanup-dry-run.ts`
- `lib/admin/ai-test-users-cleanup-execute.ts`
- `scripts/ai-test-users-cleanup-execute.ts`
- `supabase/migrations/176_feature_flags_audit_log.sql`
- `supabase/migrations/177_pilot_phase_flags.sql`
- `supabase/migrations/178_pilot_phase_1_defaults.sql`
