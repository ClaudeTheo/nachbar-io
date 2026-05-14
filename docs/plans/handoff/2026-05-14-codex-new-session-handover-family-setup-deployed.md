# Codex New-Session Handover: Family Setup deployed

Datum: 2026-05-14
Autor: Codex
Ziel-Session: Neue Codex-Session nach Umsetzung, Prod-Migration 197, Merge, Push und Production-Deploy des Family-/QR-Setup-Blocks.

## Kurzstatus

Nachbar.io ist auf `master` sauber, gepusht und deployed.

Live:

- Production: `https://nachbar-io.vercel.app`
- Production Deploy Run: `https://github.com/ClaudeTheo/nachbar-io/actions/runs/25870954103`
- Deployment-Commit: `3a8787089903c82415a876e162ef1833c3a44d3d`
- Branch: `master`
- Remote: `https://github.com/ClaudeTheo/nachbar-io.git`

Arbeitsbaum beim Schreiben dieses Handoffs:

```text
## master...origin/master
```

## Was umgesetzt wurde

Der Family-Setup-/QR-Code-Block ist lokal umgesetzt, gemerged, gepusht und deployed.

Kernfunktionen:

- Eltern koennen Kinderzugang vorbereiten.
- Direkte Kinderkonten sind auf 5 begrenzt; mehr Kinder brauchen Admin-/Review-Pfad.
- Kinder koennen sich nicht ohne Elternpfad registrieren.
- Kind-zu-Kind-Freundeinladung braucht Elternfreigabe des einladenden Kindes.
- Elternhinweis fuer Freundeinladungen betont Vertraulichkeit und echtes Vertrauensverhaeltnis.
- Senior-/Angehoerigen-Setup ueber QR/Token verknuepft automatisch den Angehoerigen.
- Angehoerige bekommen einen Managementbereich fuer verknuepfte Senioren.
- Setup-Claim-API ist durch den Closed-Pilot-Gate gezielt erreichbar.
- Local UI Preview Routes bleiben in Production absichtlich deaktiviert.

Wichtige Grenzen bleiben:

- Kein Zahlungssystem.
- Keine Wallets, Guthaben, Coins, IBAN, Payment-Links oder Auszahlungen.
- Kein Job-Marktplatz.
- U13 keine Aufgabenannahme.
- U18 nur kostenlos/niedrig-riskant/mit Elternfreigabe.

## Relevante Commits

Letzte Commits auf `master`:

```text
3a87870 fix(family): type setup services for production build
eed40ab [codex] Family QR setup tokens
586a33d fix(family): expose setup claim API in closed pilot
5bd03f7 fix(family): allow setup claim pages through proxy
cd0cc4c fix(family): align setup services with supabase client types
02ac2da feat(care): add linked senior management
d2ebf5d feat(youth): require guardian approval for friend invites
3a9c4bf feat(onboarding): suggest family setup paths
```

PR:

- `https://github.com/ClaudeTheo/nachbar-io/pull/14`
- Merge commit: `eed40ab495d19c83f3dedb8d5469003d885c4fed`

Post-merge CI-fix:

- `3a87870 fix(family): type setup services for production build`
- Grund: erster Deploy-Workflow stoppte im CI-Lint/Next-Typecheck wegen `any`/zu tiefer Supabase-Typ-Expansion in Family-Setup-Services.

## Prod-Migration

Migration 197 wurde nach explizitem Founder-Go live angewendet.

- Datei: `supabase/migrations/197_family_setup_invitations.sql`
- Supabase-Projekt: `uylszchlyhbpbmslcnka`
- Schema-Migrations-Eintrag wurde auf lokale Nummernkonvention korrigiert: `version='197'`, `name='197_family_setup_invitations'`.
- Verifiziert: Tabellen, RLS, Policies, Indexe, Caregiver-Link-Spalten/Defaults, Constraints, Privileges.
- RLS-Prod-Probe lief rollback-only; keine Probe-Daten blieben zurueck.
- Kein weiterer Prod-Migration-Apply ist aus diesem Block offen.

## Verifikation

Lokal vor Push/Deploy:

```text
npx eslint --max-warnings 200
npx tsc --noEmit
npm run test
npm run build
```

Ergebnisse:

- ESLint: gruen.
- TypeScript: gruen.
- Vitest komplett: 653 Testdateien, 4731 Tests passed, 1 skipped.
- Build: gruen.
- Family-Setup gezielt: 11 Testdateien, 32 Tests passed.

GitHub:

- Deploy Workflow `25870954103`: success.
- E2E Multi-Agent Tests `25870953219`: success.
- CodeQL Security Analysis `25870953357`: success.

Prod-Smoke nach Deploy:

- `/api/health`: 200.
- `/api/family-setup/bad-token`: 410 mit generischer Setup-Code-Fehlermeldung.
- `/`: 200, Closed-Pilot-Seite.
- `/login`: 200.
- `/register`: 200.
- `/setup/bad-token`: 200, generische Setup-Code-Fehlerseite.
- `/jugend`: 200 nach Closed-Pilot-Redirect auf `/`, fuer unauthentifizierte Production-Nutzer erwartbar.

Hinweis:

- `/jugend-ui-preview` ist in Production absichtlich 404, weil `isLocalUiPreviewEnabled()` bei `NODE_ENV=production` false liefert.
- GitHub Actions meldet fuer `actions/upload-artifact@v4` eine Node-20-Deprecation. Das ist aktuell eine CI-Wartungswarnung, kein App-/Deploy-Fehler und kein Pilot-Blocker. Spaeter bei Workflow-Pflege auf Node-24-kompatible Actions/Config achten.

## Wichtige Dateien

Technischer Einstieg:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/plans/handoff/2026-05-14-codex-new-session-handover-family-setup-deployed.md`
- `supabase/migrations/197_family_setup_invitations.sql`
- `lib/family-setup/`
- `app/api/family-setup/`
- `app/setup/[token]/`
- `modules/onboarding/`
- `modules/youth/`
- `app/(app)/care/meine-senioren/`

Strategischer/Vault-Pointer:

- `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\06_KI-Zusammenarbeit\Uebergabe-an-naechste-Codex-Session-2026-05-14-Nachbar-io-Family-Setup-Deploy.md`
- `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\06_KI-Zusammenarbeit\Handoff-Codex-an-Opus.md`

## Offene naechste Schritte

Empfohlene naechste Codex-Session:

1. Reale Pilot-Code-Operationalisierung planen: Hausnummern, Code-Kontingente, Ersatzcodes, Admin-Ansicht, Druck-/Exportformat.
2. Login-Schleife/Session-Problem mit Founder-Account reproduzieren, falls Thomas es nach Deploy weiterhin sieht. Nicht raten: Browser- und Supabase-Session-Flow pruefen.
3. Admin-Dashboard auf Family-Setup-Stand nachziehen: Nutzerverwaltung, Setup-Codes, Haushalt/Adresse, eingeladene Bewohner, Kinder-/Senior-Verknuepfungen.
4. Onboarding fuer 4 UI-Modi weiter vereinfachen und echte Pilot-Erklaerung einbauen.
5. CI-Wartungsaufgabe spaeter: Node-20-Warnung der GitHub Actions beseitigen.

## Rote Zone fuer neue Session

Nicht ohne ausdrueckliches Founder-Go:

- `git push origin master`
- Prod-DB-Schreibvorgaenge
- Prod-Migration-Apply
- Vercel-Env/Secrets/Billing/Provider-Live-Aktion
- Deploy
- echte Zahlungen oder Zahlungssysteme
- Wallets, Guthaben, Coins, Zahlungsstatus, IBAN, Payment-Links, Auszahlung

## Startbefehle fuer neue Session

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status --short --branch
git log --oneline -8
gh run list --branch master --limit 5 --json databaseId,workflowName,status,conclusion,headSha,createdAt,url
```
