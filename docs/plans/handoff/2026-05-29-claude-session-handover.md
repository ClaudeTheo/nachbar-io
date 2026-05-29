# Session-Übergabe — 2026-05-29 (nachbar-io)

**Autor:** Claude (Opus)
**Zweck:** Sauberer Startpunkt für die nächste Session. **Ab jetzt nur noch nachbar-io** (Nachbarschafts-App). Die AVS/Ferienwohnung-Arbeit war ein Detour und ist geparkt (siehe unten) — hier **nicht** fortsetzen.

---

## Git-Stand (verifiziert)

- `nachbar-io` `origin/master` = lokaler `master` = **`511d90c`** (Merge PR #25). Working Tree **clean**, synchron.
- **Heute 6 PRs gemerged (#20–#25)**, alle mit grünem CI (Smoke S7 + Multi-Agent S1-S6), kein Prod-Deploy (Deploy = `workflow_dispatch`, Merge triggert nicht → Live-Code unverändert).

### Was heute auf master kam
| PR | Commit | Inhalt |
|---|---|---|
| #20 | `ece01b5` | Mein-Quartier-Hub: `/quartier` = schlanker statischer Hub (`QuartierHub.tsx`, 12 Kacheln), `/quartier-info` = 1 Kachel, B-5-Redirect + `legacy_quartier_hub`-Flag raus, `QuartierHubLegacy.tsx` gelöscht |
| #21 | `371047a` | 2 vorbestehende rote Tests gefixt: AF1.2-Nav-Label (`Gesundheit`→`Mein Tag`) + echter `useMapStatuses`-Bug (households-Fetch ohne `quarterId`) |
| #22 | `f414a08` | `/my-day` ruhigeres 55+-Layout (density aus `ui_mode`, comfort→calm/senior→simple) |
| #23 | `0f2f647` | `/profile` ("Ich") ruhigeres 55+-Layout (gleiche Density-Logik; Consent/Konto-Löschung/Auth unverändert) |
| #24 | `ebdfc21` | FAB-Overlap-Fix: `(app)`-Wrapper `pb-20`→`pb-36` (Voice-/Bug-FAB überdeckt letzte Zeile nicht mehr; live gemessen) |
| #25 | `511d90c` | `@supabase/supabase-js` 2.99.3→2.106.2 + AuditDb-Typfix + npm10-Lockfile-Fix |

**Density-Serie ist damit konsistent durchgezogen:** Dashboard → /my-day → /profile.

---

## Wichtige Lehren (durable)

1. **npm-Lockfile-Toolchain (PR #25):** Lokales **npm 11** (Node 24) schreibt ein Lockfile, das CI-**npm 10** (Node 22) als inkonsistent ablehnt (`Missing type-fest@4.41.0`). → Bei Dependency-Änderungen Lockfile mit **`npx npm@10 install`** regenerieren + mit **`npm@10 ci`** validieren, bevor pushen.
2. **Windows-Falle:** `npm ci` schlägt mit EPERM fehl, wenn `npm run dev` läuft (File-Locks). Erst Dev-Server stoppen (Stop-Process auf Port-3000-PID), dann `npm ci`.
3. **Pre-Check zahlt sich aus:** Welle 4 (/my-day) war zu ~80% durch PR #16 schon gebaut, Welle 5 ("Ich") zu ~95% — jeweils nur die echte Lücke (Density) gebaut, nichts dupliziert.

---

## Offen für nachbar-io (priorisiert, kein Zwang)

**Code (niedrige Prio):**
- 4 Dependabot-Bumps **#8–#11** (Capacitor, shadcn-CLI, supabase-CLI). Clean, aber CI testet sie nicht (Mobile-Wrapper/CLI). Einzeln durchziehen, wenn gewünscht. **Warnung:** wie #25 das Lockfile mit npm 10 regenerieren.
- App-Struktur Welle 1/2 (NavConfig-Feinschliff, Dashboard-Entschlackung) — falls noch nicht vollständig; vorher Pre-Check (vieles ist schon da).

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
git status --short --branch     # erwartet: master, clean, = 511d90c
git log --oneline -3
gh pr list --state open         # erwartet: nur Dependabot #8-11
```
