# Claude an Codex: Deps-Bundle PR #76 + CI-Fix PR #77 — Review, Merge, EIN Deploy

> **UPDATE (2026-07-03 nacht): Zusätzlich PR #77** (`chore/ci-npm-11`, `3750c42`, workflow-only): pinnt `npm 11` via `npm install -g npm@11` in allen vier `npm ci`-Jobs (e2e S7 + S1-S6, deploy Lint&Test, audit-ai-test-cleanup). Grund: Node-22-npm-10 lehnt Dependabot-regenerierte Lockfiles ab (der type-fest-Befund unten) — mit npm 11 in der CI gehen künftige Dependabot-PRs wieder einzeln grün, das manuelle Bundeln entfällt. Kein Konflikt mit #76 (disjunkte Dateien), Merge-Reihenfolge egal, beide squash-mergen, danach EIN Deploy; dort im Log den „Use npm 11"-Step gegenprüfen. Der PR-eigene e2e-Lauf validiert den npm-11-Pfad gegen den aktuellen Lockfile.

**Datum:** 2026-07-03 (spätabend) · **Autor:** Claude (Fable 5) · **Basis:** master `913c28c` (Block A komplett live) · **PR-Stand:** `cdbee91` (2 Commits)

## Auftrag an dich

1. **Review PR #76** (`chore/deps-dependabot-57-61`, HEAD `cdbee91`) mit gpt-5.5/xhigh.
2. **CI-Gate prüfen:** S7 **und** S1-S6 auf `cdbee91` müssen grün sein (`gh pr checks 76`). Der Lauf war beim Schreiben dieses Briefs noch offen. Hinweis: Der erste Lauf (auf `197754f`) hatte S7 grün / S1-S6 rot — Ursache war der supabase-CLI-Bump, der in `cdbee91` wieder entfernt ist (Details unten).
3. **Nach deiner Review + Founder-Go:** `gh pr merge 76 --squash --delete-branch`.
4. **Dependabot #57/#58/#60/#61:** schließen sich nach dem Merge automatisch. Falls nach ~10 min noch offen: manuell schließen mit Kommentar „Superseded by #76". **#59 (supabase) bleibt bewusst OFFEN** — nicht schließen, Blocker-Kommentar steht dort.
5. **EIN gebündelter Deploy** (workflow_dispatch auf deploy.yml) + Live-Smoke (Homepage + `/api/health`).
6. Kurzer Abschlussrapport (KI-Inbox), wie bei W8.

**STOP bei:** CI nicht grün · CRITICAL/HIGH-Finding in deiner Review · irgendetwas, das Prod-Mig/Env/Provider/Kosten berührt (nichts davon ist hier erwartet).

## Was in PR #76 steckt (Stand cdbee91)

| Paket | Von | Nach | Einordnung |
|---|---|---|---|
| stripe | 20.4.1 | 22.3.0 | Doppel-Major, siehe Risiko-Review unten |
| eslint-config-next | 16.2.1 | 16.2.10 | Patch-Linie, passt zu next ^16.2.4; voller Lint grün |
| @capacitor/status-bar | ^8.0.1 | ^8.0.2 | Nur Range-Floor; 8.0.2 war im Lockfile schon aufgelöst |
| @capacitor/android | ^8.3.0 | ^8.4.1 | Nur Range-Floor; 8.4.1 war im Lockfile schon aufgelöst |

Lockfile-Diff exakt gescopet: stripe + eslint-config-next + `@storybook/nextjs/node_modules/type-fest`-Entry (gleiche Version 4.41.0, nur Position). supabase bleibt 2.102.0, jose bleibt 6.2.2.

## Bewusst NICHT enthalten: supabase CLI 2.109 (#59) — Befund

- Erster Commit `197754f` enthielt den Bump testweise → **S1-S6 rot** (Run 28676017110, Job-Timeout nach 30 min).
- Root-Cause: CLI 2.109 zieht neuere Stack-Images (u. a. postgres 17.6.1.140), in denen `service_role` **keine Rechte auf `public.users`** hat → E2E-Seeding scheitert mit `42501 permission denied for table users` (Hint: `GRANT SELECT, INSERT, UPDATE ON public.users TO service_role`), alle 8 [auth]-Setups laufen je 3× in 60s-Timeouts.
- Auf CLI 2.102 (master, grüne Läufe 16:25Z/16:54Z) existiert der Fehler nicht. S7 war auch mit 2.109 grün (Smoke loggt anders ein).
- **Follow-up (eigene Welle, nicht du heute):** CLI-Bump + expliziter GRANT-Fix für den lokalen Stack; Privilege-Thema → Mini-Audit-Pflicht. Dokumentiert als Kommentar auf #59.

## Warum EIN Bundle-PR statt Einzel-Merges (wichtig für deine Bewertung)

- Alle 5 Dependabot-PRs waren doppelt rot: erst stale (Basis 22.06.), nach meinem `@dependabot rebase` (heute 17:32Z) **erneut** rot mit identischem Fehler: `npm ci` EUSAGE `Missing: type-fest@4.41.0 from lock file`.
- Root-Cause: Dependabots Lockfile-Regenerierung entfernt den nested Eintrag `node_modules/@storybook/nextjs/node_modules/type-fest`. CI (Node 22 / npm 10) braucht ihn zwingend; npm 11 (lokal) nicht — deshalb lokal unsichtbar. **Empirisch reproduziert:** `npx npm@10 ci --dry-run` schlägt auf jedem Dependabot-Branch exakt wie CI fehl; auf PR #76 läuft er sauber durch.
- Konsequenz: Einzeln mergen kann nie funktionieren — nach jedem Merge rebased Dependabot die restlichen Branches und erzeugt denselben kaputten Lockfile erneut.

## Risiko-Review stripe 20 → 22 (mein Ergebnis)

- Genutzte API-Fläche (via Grep-Inventar): `checkout.sessions.create` (3×), `subscriptions.update` (3×), `webhooks.constructEvent` (3×), `customers.create` (2×), `customers.list`, `invoices.create`, `invoiceItems.create`. Kein Decimal-Feld, keine Callbacks, bereits `new Stripe()`-Konstruktor.
- Kein `apiVersion`-Pin in `lib/stripe.ts` / `modules/hilfe/services/stripe.ts` → SDK-Default-API-Version wandert mit dem Major. Vertretbar: Stripe ist Test-Mode, 0 echte Nutzer, 0 Umsatz; Webhook-Payload-Version steuert ohnehin das Dashboard-Endpoint-Setting.
- Empirisch: tsc grün, alle Stripe-/Billing-/Webhook-Tests grün (`stripe-checkout.test.ts`, `stripe-config.test.ts`, `webhooks.test.ts`, hilfe `stripe.test.ts`).
- **Optionaler Folge-Punkt (nicht dieser PR):** `apiVersion` explizit pinnen, wenn Billing live geht.

## Gates (lokal, Worktree `C:/Users/thoma/AppData/Local/Temp/nb-deptest`, Stand cdbee91)

- `npx npm@10 ci --dry-run`: sauber (CI-Blocker nachweislich behoben)
- `npx tsc --noEmit`: grün
- `npm run test`: **5236 passed / 1 skipped** (743 Files) — identisch zur master-Baseline nach W8
- `npm run lint` (voll): grün
- Mini-Audit: **kein Trigger** (keine Migration, keine Auth-/RLS-/Admin-Surface, kein neuer Token-Pfad/Fetch; reine Dep-Bumps ohne Code-Änderung)

## Aufräumen

- Temp-Worktree `C:/Users/thoma/AppData/Local/Temp/nb-deptest` entferne ich (Claude) am Session-Ende selbst (`git worktree remove`).
- Nach Merge+Deploy: nächster Arbeitspunkt laut Session-Übergabe ist die **NINA-Cleanup-Welle** (Task-Chip bei Thomas).
