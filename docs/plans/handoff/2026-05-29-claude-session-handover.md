# Session-Übergabe — 2026-05-29 (nachbar-io)

**Autor:** Claude (Opus)
**Zweck:** Sauberer Startpunkt für die nächste Session. **Ab jetzt nur noch nachbar-io** (Nachbarschafts-App). Die AVS/Ferienwohnung-Arbeit war ein Detour und ist geparkt (siehe unten) — hier **nicht** fortsetzen.

> **Update 2026-05-29 nachmittag:** PR #27 (`tmp`-Override gegen das einzige HIGH Advisory) wurde nach Founder-Go gemerged. Dieser Handover wurde danach auf den neuen Stand gezogen. Git-Stand, Tabelle und Offen-Liste unten sind aktuell.

---

## Git-Stand (verifiziert)

- `nachbar-io` `origin/master` = **`9b2bcca`** (Merge PR #27). Lokaler `master` = **`9b2bcca`** → **0 ahead / 0 behind**. Working Tree **clean**.
- **Heute 8 PRs gemerged (#20–#27)**, alle mit grünem CI (Smoke S7 + Multi-Agent S1-S6), kein Prod-Deploy (Deploy = `workflow_dispatch`, Merge triggert nicht → Live-Code unverändert).
- **0 offene PRs.** Die 4 Dependabot-PRs #8–#11 sind durch #26 ersetzt und geschlossen; das einzige HIGH `tmp`-Advisory ist durch #27 geschlossen.

### Was heute auf master kam
| PR | Commit | Inhalt |
|---|---|---|
| #20 | `ece01b5` | Mein-Quartier-Hub: `/quartier` = schlanker statischer Hub (`QuartierHub.tsx`, 12 Kacheln), `/quartier-info` = 1 Kachel, B-5-Redirect + `legacy_quartier_hub`-Flag raus, `QuartierHubLegacy.tsx` gelöscht |
| #21 | `371047a` | 2 vorbestehende rote Tests gefixt: AF1.2-Nav-Label (`Gesundheit`→`Mein Tag`) + echter `useMapStatuses`-Bug (households-Fetch ohne `quarterId`) |
| #22 | `f414a08` | `/my-day` ruhigeres 55+-Layout (density aus `ui_mode`, comfort→calm/senior→simple) |
| #23 | `0f2f647` | `/profile` ("Ich") ruhigeres 55+-Layout (gleiche Density-Logik; Consent/Konto-Löschung/Auth unverändert) |
| #24 | `ebdfc21` | FAB-Overlap-Fix: `(app)`-Wrapper `pb-20`→`pb-36` (Voice-/Bug-FAB überdeckt letzte Zeile nicht mehr; live gemessen) |
| #25 | `511d90c` | `@supabase/supabase-js` 2.99.3→2.106.2 + AuditDb-Typfix + npm10-Lockfile-Fix |
| #26 | `f1962fc` | Dependabot-Bundle #8–#11: @capacitor/android ^8.3.0 (→8.3.4), @capacitor/geolocation ^8.2.0, shadcn ^4.6.0 (→4.8.3), supabase ^2.88.1 (→2.102.0). Lockfile mit npm 10 regeneriert |
| #27 | `9b2bcca` | Security-Dependency-Fix: Top-Level-Override `tmp` `^0.2.6` (resolved `0.2.7`) schließt das einzige HIGH Advisory GHSA-ph9p-34f9-6g65 via `exceljs`; übrige Audit-Befunde sind low/moderate Build-/Dev-Tooling |

**Density-Serie ist damit konsistent durchgezogen:** Dashboard → /my-day → /profile.

---

## Wichtige Lehren (durable)

1. **npm-Lockfile-Toolchain (PR #25 + #26):** Lokales **npm 11** (Node 24) schreibt ein Lockfile, das CI-**npm 10** (Node 22) als inkonsistent ablehnt (`Missing type-fest@4.41.0`). → Bei Dependency-Änderungen Lockfile mit **`npx npm@10 install`** regenerieren + mit **`npm@10 ci`** validieren, bevor pushen.
2. **Windows-Falle:** `npm ci` schlägt mit EPERM fehl, wenn `npm run dev` läuft (File-Locks). Erst Dev-Server stoppen (Stop-Process auf Port-3000-PID), dann `npm ci`.
3. **Pre-Check zahlt sich aus:** Welle 4 (/my-day) war zu ~80% durch PR #16 schon gebaut, Welle 5 ("Ich") zu ~95% — jeweils nur die echte Lücke (Density) gebaut, nichts dupliziert.
4. **Stale-Dependabot-Branches (PR #26):** Die 4 Dependabot-Branches lagen 559–1063 Commits hinter master, ihr CI lief gegen veralteten Code (Stale-Failures, irreführend). Sauberer Weg: nicht die alten Branches rebasen, sondern die Bumps **frisch von master** in einem Bündel-PR neu aufsetzen. Caret-Range (`^`) löst dabei auf die neueste Version im selben Major auf (z.B. shadcn 4.6.0→4.8.3) — semver-kompatibel, aber neuer als Dependabots Ziel; das ist ok für reines Tooling, sollte bei Runtime-Deps aber bewusst entschieden werden.
5. **npm audit (2026-05-29):** PR #27 schließt das einzige HIGH Advisory (`tmp` via `exceljs`). Stand danach: 12 verbleibende Vulnerabilities (5 low / 7 moderate), **alle in Build-/Dev-/Test-Tooling** (storybook, eslint, glob, postcss-via-next), **nicht** im ausgelieferten Runtime-Bundle. `npm audit fix` bleibt breit/ungeeignet; echte Fixes hängen an Major-Bumps von Storybook/ESLint. Bewusste Entscheidung: **kein Force-Fix jetzt** (real ~0 Risiko, 0 Nutzer; passt zu „Pentest erst MRR > 2k"). Befund ist im DSGVO-Nachweis (TOMs Abschnitt 5) als Art.-32-Prüfbeleg dokumentiert.

---

## Offen für nachbar-io (priorisiert, kein Zwang)

**Code (niedrige Prio):**
- ~~4 Dependabot-Bumps #8–#11~~ → **erledigt durch PR #26.**
- ~~HIGH `tmp`-Advisory~~ → **erledigt durch PR #27.**
- App-Struktur Welle 1/2 (NavConfig-Feinschliff, Dashboard-Entschlackung) — falls noch nicht vollständig; vorher Pre-Check (vieles ist schon da).
- Wiederkehrenden `npm audit`-Cron einrichten (steht als TODO in den TOMs / DSGVO-Nachweis).

**Founder-Hand (kein Code):**
- §5 Provider-AVV/DPA-Versand · 5-10 Pilot-Familien Bad Säckingen · §10/§11/§18 (Mig 196 Apply, Pilot-Brief, Municipal-Imports) · §27 Cron-Health ab 2026-06-01.

---

## ⛔ Geparkt — NICHT in nachbar-io fortsetzen

Heute gab es einen Detour ins **Ferienwohnung-Projekt** (anderes Repo, eigene Session):
- Repo: `C:\Users\thoma\Neuer Ordner\Ferienwohnung`
- Branch **`claude/avs-webservice-schema-prep`** (`5339a2f`, **nicht gepusht**): AVS-Meldeschein-Webservice-Schema-Fund (öffentliches MIT-Repo `omniboost/go-avs-meldeschein`) + schema-genauer `lib/avs/webservice-builder.ts` + 8 Tests + Analyse-Doc `docs/plans/2026-05-29-avs-webservice-schema-found.md`.
- Das Ferienwohnung-Arbeitsverzeichnis wurde auf `feature/inquiry-form-mvp` zurückgestellt (wie vorgefunden).
- **Gehört in die Ferienwohnung-Session** — hier ignorieren. Engram-Memory: Projekt `ferienwohnung`, Topic `avs/webservice-schema`.

---

## Rote Zonen (unverändert)
- `git push origin master` / Merge nach master → Founder-Go
- Prod-DB-Schreiben, Prod-Migrationen, Deploys, Secrets/Billing/Auth, neue laufende Kosten

## Session-Start-Befehle
```bash
cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"
git status --short --branch     # erwartet: master, clean, 0 ahead / 0 behind
git log --oneline -3            # erwartet HEAD: 9b2bcca (Merge #27), darunter 11302ef
gh pr list --state open         # erwartet: leer (0 offene PRs)
```
