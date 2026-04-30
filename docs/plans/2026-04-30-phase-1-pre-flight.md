# Phase-1-Pre-Flight - Pilot-Familien Bad Saeckingen

Stand: 2026-04-30 Abend
Zielgruppe: Founder am Tag X
Scope: 5-10 echte Pilot-Familien in Bad Saeckingen, Phase 1 mit minimalem Risiko

Diese Checkliste ist ein Schalter-Runbook. Sie ersetzt keine Rechtsberatung.
Sie gibt keinen Freifahrtschein fuer Push, Deploy, Prod-DB-Schreibaktionen,
Vercel-Env-Aenderungen oder Provider-Live-Aktionen. Jeder Schritt mit Daten-,
Geld- oder Provider-Risiko bleibt **Founder-Hand / Rote Zone**.

---

## 1. Vorbedingungen (Hard-Gates)

Wenn ein Hard-Gate nicht erfuellt ist: **STOP**. Keine echten Familien
onboarden, keine Invite-Codes ausgeben, keine personenbezogenen Pilotdaten
verarbeiten.

| Gate | Was | Wie pruefen | Wer |
|---|---|---|---|
| HR-Eintragung | Theobase GmbH beim AG Freiburg eingetragen | HR-Auszug / Notar-Mitteilung pruefen, HR-Nummer dokumentieren | Founder-Hand |
| Stammkapital | 25.000 EUR Bankbestaetigung liegt vor | Bankbestaetigung vorhanden und an Notar Stadler uebermittelt | Founder-Hand |
| Datenschutz | Datenschutzerklaerung nennt GmbH, nicht nur GmbH i.G. | Live-Seite / finale Vorlage gegenlesen | Founder-Hand |
| Beta-Bedingungen | Pilot-AGB/Beta-Hinweis kostenlos, Widerruf/Ausstieg, Funktionsgrenzen | Rueckseite aus `firmen-gedaechtnis/08_Marketing/Pilot-Familien-Anschreiben-Bad-Saeckingen.md` gegen Live-Text pruefen | Founder-Hand |
| KI-AVV | Anthropic oder Mistral AVV unterzeichnet | Vault: `firmen-gedaechtnis/01_Firma/GmbH-Provider-Vertraege-AVV-Uebersicht.md` | Founder-Hand |
| Twilio-AVV | nur noetig, wenn SMS/Telefonie in Phase 1 genutzt wird | Vault-AVV-Uebersicht pruefen | Founder-Hand |

KI-Regel:

- Wenn Anthropic-AVV unterzeichnet ist: `AI_PROVIDER_CLAUDE` darf spaeter in Phase 2b an.
- Wenn Mistral-AVV unterzeichnet ist: `AI_PROVIDER_MISTRAL` darf spaeter in Phase 2b an.
- Wenn weder Anthropic noch Mistral unterzeichnet ist: KI bleibt aus:
  `AI_PROVIDER_OFF=true`, `AI_PROVIDER_CLAUDE=false`,
  `AI_PROVIDER_MISTRAL=false`.

**OFFEN - Founder-Vorbereitung noetig:** Vor Tag X muss bestaetigt sein,
dass die finalen Datenschutz-/Beta-Texte den GmbH-Stand abbilden.

---

## 2. Test-User-Cleanup

Vor echten Pilot-Familien muessen KI-Test-User und Pilot-Onboarding-Test-User
aus Prod entfernt oder bewusst ausgenommen sein. Jede Prod-Loeschung ist
**Founder-Hand / Rote Zone**.

| Schritt | Was | Wie | Wer |
|---|---|---|---|
| 2.1 | Dry-Run ausfuehren | `npx tsx lib/admin/ai-test-users-cleanup-dry-run.ts` | KI-Hand fuer Dry-Run, nur wenn Prod-Kontext geklaert |
| 2.2 | Zaehl-Liste reviewen | Counts pro Tabelle pruefen, Ausnahmen markieren | Founder-Hand |
| 2.3 | Execute-Pfad klaeren | Pruefen, ob Execute-Skript existiert oder noch TDD-sicher gebaut werden muss | Founder-Hand + ggf. Codex-Auftrag |
| 2.4 | Prod-Cleanup ausfuehren | Kein spontanes SQL im Chat; nur freigegebener Execute-Pfad | Founder-Hand / Rote Zone |
| 2.5 | Cleanup dokumentieren | `firmen-gedaechtnis/01_Firma/Test-User-Cleanup-Bericht-DATUM.md` | Founder-Hand |

Nach Cleanup im Bericht festhalten:

- Zeitpunkt
- Tabellen-Counts vorher/nachher
- bewusst ausgenommene Testkonten
- wer den Execute-Schritt freigegeben hat

**STOP**, wenn Test-User nicht sauber entfernt oder bewusst dokumentiert
ausgenommen sind.

---

## 3. Migrationen-Apply auf Prod

Die Migrationen existieren lokal als Files. Sie sind nicht automatisch auf Prod
appliziert. Prod-Apply ist **Founder-Hand / Rote Zone**.

Vor Phase 1 muss auf Prod appliziert sein:

- **Mig 176** `feature_flags_audit_log`
  - Tabelle `public.feature_flags_audit_log`
  - Spalte `feature_flags.last_change_reason`
  - Trigger `feature_flags_audit_log_trigger`
  - RLS fuer Admin-Read
  - ohne diese ist der Audit-Log-Reader leer; der Robustness-Fix zeigt zwar
    "Audit-Log noch nicht verfuegbar", aber es entsteht kein Audit-Trail
- **Mig 177** `pilot_phase_flags`
  - `BILLING_ENABLED=false`
  - `TWILIO_ENABLED=false`
  - `CHECKIN_MESSAGES_ENABLED=false`

Nicht vorab applizieren:

- **Mig 178** `pilot_phase_1_defaults`
  - wartet auf den eigentlichen Phase-1-Schalter
  - wird erst am Tag X appliziert, wenn die Phase-1-Aktivierung wirklich
    stattfindet

Apply-Reihenfolge:

| Schritt | Was | Wie | Wer |
|---|---|---|---|
| 3.1 | Preview-Branch-Test | Supabase-Preview-Branch nutzen, Kostenhinweis: ca. 0,01344 EUR/h; Mig 176 + 177 anwenden, Smoke pruefen | Founder-Hand / Rote Zone wegen Kosten + DB-Apply |
| 3.2 | Prod-Apply 176 | MCP `apply_migration` mit Mig 176, nur nach Preview-Erfolg | Founder-Hand / Rote Zone |
| 3.3 | Prod-Apply 177 | MCP `apply_migration` mit Mig 177 | Founder-Hand / Rote Zone |
| 3.4 | schema_migrations pruefen | Read-only Query auf Versionen 176/177 | Founder-Hand oder KI-Hand read-only |
| 3.5 | Prod-Smoke | Tabelle existiert, Trigger feuert bei Toggle | Founder-Hand, Toggle bewusst |
| 3.6 | Mig 178 | erst direkt am Phase-1-Schalter | Founder-Hand / Rote Zone |

**STOP**, wenn Mig 176 oder Mig 177 nicht auf Prod steht.

---

## 4. Vercel + Env

Vor Live-Schritten den Deploy-Kontext bewusst pruefen. Keine Env-Aenderung
ohne **Founder-Hand / Rote Zone**.

| Punkt | Was | Wie | Wer |
|---|---|---|---|
| 4.1 | Production-Pilot-Mode | `NEXT_PUBLIC_PILOT_MODE=true` in Vercel Production bestaetigen | Founder-Hand / Vercel UI oder CLI read-only |
| 4.2 | Preview-Pilot-Mode | `NEXT_PUBLIC_PILOT_MODE=true` in Vercel Preview setzen/pruefen; offen seit CLI-Quirk 2026-04-29 | Founder-Hand / Rote Zone bei Aenderung |
| 4.3 | Workflow-Cron | Schedule-Cron deaktiviert, nur `workflow_dispatch` | KI-Hand read-only, bereits am 2026-04-30 geprueft |
| 4.4 | Branch-Stand | kein Force-Push, kein direkter Push ohne Go, sauberer master-Stand | Founder-Hand fuer Push-Go |
| 4.5 | Deploy-SHA | Vercel-Deployment muss aktuellen master-SHA enthalten | KI-Hand nach Push/Deploy |

Pruefkommando:

```bash
vercel env ls production | grep NEXT_PUBLIC_PILOT_MODE
```

Wenn CLI/Projekt-Kontext unklar ist: Vercel-UI nutzen, nicht raten.

---

## 5. Phase-1-Schalter am Tag X

Konkrete Reihenfolge. Nicht parallelisieren.

| # | Was | Wie | Wer |
|---|---|---|---|
| 1 | Pilot-Familien-Liste finalisieren | `firmen-gedaechtnis/08_Marketing/Pilot-Familien-Kontakt-Liste.md` | Founder-Hand |
| 2 | Test-User-Cleanup fertig | Abschnitt 2 abgeschlossen + Bericht geschrieben | Founder-Hand / Rote Zone |
| 3 | Mig 176 + 177 auf Prod | Abschnitt 3, Preview zuerst, dann Prod | Founder-Hand / Rote Zone |
| 4 | Vercel-Env final | Abschnitt 4 abgeschlossen | Founder-Hand / Rote Zone bei Aenderung |
| 5 | Push origin master | `git push origin master` nur mit bewusstem Go | Founder-Hand / Rote Zone |
| 6 | Vercel-Deploy | aktueller master-SHA deployed; Deploy selbst KI-Hand, aber bewusst ausloesen | KI-Hand nach Founder-Go |
| 7 | Post-Deploy-Smoke | Login als Founder-Test-User, Admin/Audit/Toggle pruefen | KI-Hand + Founder-Sicht |
| 8 | Mig 178 applizieren | Phase-1-Defaults setzen | Founder-Hand / Rote Zone |
| 9 | Admin-Preset Phase 1 | Admin-Dashboard -> Feature-Flags -> Preset Phase 1 -> `PHASE_1` tippen | Founder-Hand |
| 10 | Audit-Log pruefen | ca. 25 Eintraege mit `reason="phase-preset:phase_1"` | Founder-Hand / KI-Hand read-only |
| 11 | Erste Familie einladen | manueller Invite-Link via Pilot-Onboarding-Flow | Founder-Hand |
| 12 | Erst danach skalieren | nach erstem echten Onboarding erneut Admin/Logs pruefen | Founder-Hand |

Phase-1-Preset setzt nach `lib/feature-flags-presets.ts`:

- ON: `PILOT_MODE`, NINA, DWD, UBA, LGL, OSM, DELFI, BKG,
  `AI_PROVIDER_OFF`, `CARE_ACCESS_FAMILY`, `CARE_ACCESS_EMERGENCY`
- OFF: KI-Provider live, Care-Detail, Marketplace, Events, Push, `NEWS_AI`,
  Video-Calls, Billing, Twilio, Check-in-Messages und weitere riskante Flags

**STOP**, wenn nach dem Preset kein Audit-Log-Eintrag mit
`phase-preset:phase_1` sichtbar ist.

---

## 6. Phase-2-Sub-Schalter

Jede Sub-Phase einzeln entscheiden, einzeln dokumentieren, einzeln im
Audit-Log pruefen. Keine Sammelfreigabe.

| Phase | Voraussetzung | Schalter | Wer |
|---|---|---|---|
| Phase 2a | HR abgeschlossen, Stripe-Konto live, AGB final, Stripe-Webhook-Secret in Vercel-Env | `BILLING_ENABLED`, `DOCTORS_ENABLED`, `BOARD_ENABLED`, `EVENTS`, `MARKETPLACE`, `LOST_FOUND`, `PUSH_NOTIFICATIONS`, `QUARTER_PROGRESS`, `INVITATIONS`, `BUSINESSES`, `REFERRAL_REWARDS` | Founder-Hand / Rote Zone fuer Stripe/Vercel-Env |
| Phase 2b | Anthropic oder Mistral AVV unterzeichnet | genau einen KI-Provider aktivieren, `AI_PROVIDER_OFF` ausschalten, `NEWS_AI` pruefen | Founder-Hand / Rote Zone |
| Phase 2c | Twilio-AVV unterzeichnet | `TWILIO_ENABLED` | Founder-Hand / Rote Zone |
| Phase 2d | Care-AVV + DSFA fuer sensitive Care-Daten | `CARE_MODULE`, `MEDICATIONS_ENABLED`, `CHECKIN_MESSAGES_ENABLED`, `HEARTBEAT_ENABLED`, Pflege-Zugriffsflags | Founder-Hand / Rote Zone |
| Phase 2e | Sprechstunde.online + Arzt-Vertrag | `APPOINTMENTS_ENABLED`, `VIDEO_CONSULTATION`, `GDT_ENABLED`, Video-Call-Flags | Founder-Hand / Rote Zone |

Pro Sub-Phase pruefen:

- Audit-Log-Eintrag mit `reason="phase-preset:phase_2a"` usw.
- nur die geplanten Flags geaendert
- Smoke-Test fuer genau den freigeschalteten Funktionsbereich
- Vault-Notiz mit Datum, Voraussetzung und Ergebnis

**OFFEN - Founder-Vorbereitung noetig:** Stripe-Live-Prozess, Twilio-AVV,
Care-AVV/DSFA und Arzt-/Sprechstunde-Vertraege sind vor der jeweiligen
Sub-Phase separat zu klaeren.

---

## 7. Rollback-Plan

Wenn in Phase 1 etwas schief geht: zuerst weitere Familien stoppen, dann
kleinste sichere Massnahme waehlen.

| Option | Wann | Wie | Wer |
|---|---|---|---|
| Vercel-Rollback | App-Regression nach Deploy | Vercel-UI: vorheriges Production-Deployment wieder aktivieren | Founder-Hand / Rote Zone |
| Phase-0-Preset | Feature-Flag-Zustand falsch | Admin-Dashboard -> Preset Phase 0 -> `PHASE_0` bestaetigen | Founder-Hand |
| Einzel-Flag aus | ein konkretes Feature ist unsicher | Toggle aus, Reason eintragen, Audit-Log pruefen | Founder-Hand |
| Migration-Rollback | Schema-Migration verursacht Schaden | Mig 176/177 `.down.sql` via MCP `apply_migration`, nur nach bewusster Entscheidung | Founder-Hand / Rote Zone |
| PITR-Restore | Cleanup-Fehler oder Datenverlust vermutet | Supabase Dashboard, Point-in-Time-Restore pruefen | Founder-Hand / Rote Zone |

Hinweis: Phase-0-Preset setzt viele Flags wieder auf den Closed-Pilot-Stand.
Das ist kein Datenschutz-Fix fuer echte Familien, sondern ein technischer
Stabilisierungshebel. Wenn personenbezogene Daten betroffen sind: stoppen,
dokumentieren, rechtlich klaeren.

---

## 8. Konkrete Verifikations-Befehle

Diese Befehle sind kurze Checks. Read-only SQL ist erlaubt, Schreibaktionen
bleiben Rote Zone.

```bash
# Lokaler Repo-Stand sauber?
git status --short --untracked-files=all

# Finaler Code-Check vor Push/Deploy
npm run lint
npx tsc --noEmit
npx vitest run

# Migrations-Files vorhanden?
ls supabase/migrations/176_* supabase/migrations/177_* supabase/migrations/178_*

# NEXT_PUBLIC_PILOT_MODE in Vercel Production?
vercel env ls production | grep NEXT_PUBLIC_PILOT_MODE
```

Read-only SQL-Pruefungen via MCP/Supabase-Konsole:

```sql
-- Mig 176/177 auf Prod?
select version, name
from supabase_migrations.schema_migrations
where version in ('176', '177')
order by version;

-- Audit-Log-Tabelle existiert?
select count(*)
from public.feature_flags_audit_log;

-- Test-User-Count?
select count(*)
from public.users
where settings->>'is_test_user' = 'true';

-- Phase-1-Schutzflags?
select key, enabled
from public.feature_flags
where key in (
  'AI_PROVIDER_OFF',
  'AI_PROVIDER_CLAUDE',
  'AI_PROVIDER_MISTRAL',
  'BILLING_ENABLED',
  'TWILIO_ENABLED',
  'CHECKIN_MESSAGES_ENABLED'
)
order by key;
```

Wenn ein Befehl Projekt-/Env-Kontext verlangt und der Kontext unklar ist:
nicht raten, sondern UI oder Founder-Entscheidung nutzen.

---

## 9. Was nach Phase 1 weiter Rote Zone bleibt

Auch nach HR und Phase-1-Start bleiben diese Punkte bewusst einzeln zu
entscheiden:

- `git push origin master`
- Force-Push auf irgendeinen geteilten Branch
- Migration-Apply auf Prod
- Vercel-Env-Aenderungen
- Vercel-Production-Rollback
- Stripe-Live-Mode, Stripe-Webhook-Secret, Zahlungsfluss
- Twilio-Live-Aktionen
- Provider-Live-Aktionen ohne AVV
- Prod-Delete/Restore/PITR
- Verarbeitung echter personenbezogener Daten durch KI

Bei Unsicherheit: Feature aus lassen, dokumentieren, spaeter freigeben.

---

## 10. Notizen fuer naechste Sessions

Diese Checkliste ist nicht in Stein gemeisselt. Wenn neue Lerneffekte kommen,
z.B. Pilot-Familie meldet einen UX-Bug, Audit-Log zeigt ein unerwartetes Flag
oder ein Provider-Vertrag aendert den Ablauf:

- diese Datei aktualisieren
- Versionsnotiz im `Stand` oder in einem kurzen Abschnitt ergaenzen
- INBOX-Zeile anlegen
- lokal committen
- nicht ins Memory duplizieren, sondern auf diese Datei verweisen

Quellen:

- `docs/plans/2026-04-30-pilot-feature-gating-plan.md`
- `docs/plans/2026-04-30-audit-log-smoke-test-bericht.md`
- `docs/plans/2026-04-30-codex-c-welle-review-checkliste.md`
- `docs/runbooks/twilio-token-rotation.md`
- `supabase/migrations/176_feature_flags_audit_log.sql`
- `supabase/migrations/177_pilot_phase_flags.sql`
- `supabase/migrations/178_pilot_phase_1_defaults.sql`
- `lib/feature-flags-presets.ts`

