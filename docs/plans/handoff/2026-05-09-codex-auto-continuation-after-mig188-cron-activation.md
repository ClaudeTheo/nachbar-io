# Codex Auto-Continuation: Mig188 + Quartier-Info-Crons live

Datum: 2026-05-09 vormittag
Owner: Codex

## Aktuelles Ziel

Nachbar.io weiter autonom voranbringen, ohne bei erledigten Bloecken unnoetig
anzuhalten. Qualitaet bleibt wichtiger als Geschwindigkeit.

Neue Arbeitsregel von Thomas:

- Nicht mehr bei "fertig" stoppen.
- Nur stoppen bei roter Zone ohne Go, echten Blockern, Tool/Auth-Grenzen oder
  harter Token-/Runtime-Grenze.
- Bei langer Session automatisch kompakte Uebergabe schreiben und dann weiter.

## Git-Stand

Zuletzt gepusht und deployed:

```text
55be09c feat(info): schedule quartier auto sync crons
b54c7ff docs(db): record prod migration 188 apply
```

`master` und `origin/master` waren nach Push synchron.

Bekannte untracked Altdateien bleiben bewusst unangetastet:

```text
.codex-welle-d-3001.pid
docs/plans/2026-05-04-quartier-info-skalierung-auto-first.md
docs/plans/handoff/2026-05-03-claude-an-codex-due-diligence-review.md
docs/plans/handoff/2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md
docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md
docs/plans/handoff/2026-05-03-claude-an-codex-vollgas-bis-100-dann-sicherheit.md
docs/plans/handoff/2026-05-03-codex-an-claude-due-diligence-review.md
docs/plans/handoff/2026-05-04-claude-an-codex-owasp-audit-5-neue-findings.md
docs/plans/handoff/2026-05-04-claude-an-codex-quittung-phase4-findings.md
docs/plans/handoff/2026-05-04-claude-an-codex-security-zweitmeinung.md
docs/plans/handoff/2026-05-04-codex-new-session-handover-security-ci-health-deploy.md
```

## Erledigt

### Mig 188 Production

Founder-Go lag exakt vor:

```text
MIGRATION-PROD-GO-188
```

Mig 188 wurde zuerst sinnvoll geprueft, dann angewendet:

```powershell
npx supabase db query --linked --file "supabase\migrations\188_municipal_config_sync_meta.sql"
npx supabase migration repair --linked --status applied 188
```

Verify:

- `schema_migrations`: Version `188`, Name `municipal_config_sync_meta`, 2 Statements.
- `municipal_config.sync_meta`: `jsonb`, `NOT NULL`, Default `'{}'::jsonb`.
- 5 bestehende `municipal_config`-Rows, 0 NULLs.
- Prod Realnutzer-Preflight: `users.is_tester`, 0 Nicht-Testnutzer.

Doku:

- `docs/plans/2026-05-09-prod-migration-188-apply.md`
- `docs/plans/handoff/INBOX.md`

### Production Deploy nach Mig 188

GitHub CLI war lokal nicht authentifiziert, daher wurde der erlaubte Fallback
genutzt:

```powershell
npx vercel deploy --prod --yes
```

Deploy:

```text
dpl_2JQvpqFhidKNBU9LUeYJiScbKQMQ
https://nachbar-io.vercel.app
```

Live-Smoke:

- `/api/health`: 200 `{"status":"ok"}`
- `/`: 200

### Quartier-Info Auto-Sync-Crons aktiviert

Nach Mig188-Apply und Thomas' Go fuer sinnvolle Folgeaktion:

- `/api/cron/osm-poi-sync`: `0 3 * * 0`
- `/api/cron/quartier-events-sync`: `0 6 * * *`

Dateien:

- `vercel.json`
- `app/api/cron/osm-poi-sync/route.ts`
- `app/api/cron/quartier-events-sync/route.ts`
- `__tests__/config/vercel-crons.test.ts`
- `docs/plans/2026-05-09-quartier-info-auto-sync-crons.md`
- `docs/plans/handoff/INBOX.md`

TDD:

- RED: `__tests__/config/vercel-crons.test.ts` scheiterte, weil beide
  Eintraege fehlten.
- GREEN: beide Cron-Eintraege gesetzt; Routendoku aktualisiert.

Verify:

- Gezielt: 5 Testdateien, 16 Tests gruen.
- Gezieltes ESLint gruen fuer TS/Route/Test-Dateien; `vercel.json` wird von
  ESLint ignoriert.
- `npx tsc --noEmit`: gruen.
- `npm run build`: gruen.
- `npm run lint`: gruen.

Commit:

```text
55be09c feat(info): schedule quartier auto sync crons
```

Deploy:

```text
dpl_3T5CzNAtaZsT9FXhZMzbidNNeatG
https://nachbar-io.vercel.app
```

Live-Smoke:

- `/api/health`: 200 `{"status":"ok"}`
- `/api/cron/osm-poi-sync` ohne Secret: 403 durch Vercel/Production-Schutz,
  kein Sync.
- `/api/cron/quartier-events-sync` ohne Secret: 403 durch Vercel/Production-Schutz,
  kein Sync.
- `sync_meta` war vor Cron-Lauf weiterhin leer.

## Offene Risiken / rote Gates

Weiterhin nicht ohne explizites Founder-Go:

- Vercel-Env-/Secret-Aenderungen.
- Billing/Stripe-Live-Setup; bleibt bis GmbH wartend.
- Neue Provider-Live-Schaltungen ohne AVV/DPA.
- Neue laufende Kosten.
- Prod-DB-Schreibaktionen ausserhalb bereits freigegebener Migrations-/Smoke-Schritte.

Hinweis: Die neuen Vercel-Crons verursachen planmaessige Cron-Ausfuehrungen.
Sie nutzen vorhandene Vercel-Infrastruktur und geschuetzte Routen; keine Secrets
wurden gelesen oder geaendert.

## Naechste 3 sinnvolle Schritte

1. Nach erstem geplanten Cron-Lauf `municipal_config.sync_meta.apotheken/events`
   read-only pruefen und ggf. Ergebnis dokumentieren.
2. Falls sofortiger Funktionstest noetig: nur mit sicherem Secret-Weg triggern,
   ohne Secret im Chat/Logs auszugeben.
3. Weiter mit kleiner Normalizer-Haertung nur bei echtem RED-Test, oder mit
   Info-Hub Admin-/Status-Anzeige fuer `sync_meta`, falls Founder-Sichtbarkeit
   gewuenscht ist.

## Nicht tun

- Keine bekannten untracked Altdateien anfassen.
- Kein Stripe/Billing.
- Keine Secret-Ausgabe.
- Keine manuelle Prod-Datenmutation ausser klar freigegebenem Wartungs-/Verify-Schritt.
