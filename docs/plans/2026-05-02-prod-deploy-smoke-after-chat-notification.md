# Handover 2026-05-02 — Prod-Deploy + Smoke nach Chat-Notification-Fix

Stand: 2026-05-02 nach Push, CI, Production-Deploy und rein lesendem Smoke fuer Commit `37b3bb5`.

## Harte Linien

- Kein Prod-DB-Write.
- Keine Prod-Migration.
- Keine Vercel-Env-Aenderung.
- Keine Secrets gelesen, kopiert oder geaendert.
- Keine echten Pflege-/Medizin-/Personendaten verarbeitet.
- Prod-Smoke war rein lesend und ohne Login.

## Git / CI

- Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
- Branch: `master`
- Push: `master -> origin/master`
- Head: `37b3bb5 docs(handoff): record production deploy smoke`
- Vorheriger App-Fix-Deploy: `a85c8c4 docs(handoff): record chat notification hygiene`
- Enthalten: `630fe9e fix(chat): allow contact notification delivery`

GitHub Actions fuer `a85c8c4`:

- `CodeQL Security Analysis`: success
- `E2E Multi-Agent Tests`: success
  - `Smoke Tests (S7)`: success
  - `Multi-Agent Tests (S1-S6)`: success

GitHub Actions fuer `37b3bb5`:

- `E2E Multi-Agent Tests`: success
  - `Smoke Tests (S7)`: success
  - `Multi-Agent Tests (S1-S6)`: success

## Vercel Production

Auto-Deploy war nicht aktiv fuer den Push. Die Vercel-Liste zeigte zunaechst noch ein aelteres Production-Deployment vom 2026-05-01.

Ausgefuehrt wurde danach ein einzelner sicherer Production-Remote-Build:

```bash
vercel deploy --prod --yes
```

Wichtig: Es wurde **kein** Windows-Prebuild verwendet.

Erstes Deployment nach dem App-Fix:

- ID: `dpl_Ene48io7RaZv6hDuc1vwZykVf4nr`
- URL: `https://nachbar-ka2337i73-thomasth1977s-projects.vercel.app`
- Alias: `https://nachbar-io.vercel.app`
- State: `READY`
- Target: `production`
- Vercel-Meta: `githubCommitSha=a85c8c49c9c1a79c4b3d42b9254f0a1fdcc0c1fa`

Nach dem Doku-Handoff-Push wurde Production einmalig auf den aktuellen Remote-Head nachgezogen:

- ID: `dpl_u2ihJmeERAmoWW4wFTLkwwbxrcQV`
- URL: `https://nachbar-nbowt2yp8-thomasth1977s-projects.vercel.app`
- Alias: `https://nachbar-io.vercel.app`
- State: `READY`
- Target: `production`
- Region: `fra1`
- Vercel-Meta: `githubCommitSha=37b3bb5a659eb66731f9b491188a0026062a513a`

## Prod-Smoke

HTTP-Smoke:

| URL | Ergebnis |
| --- | --- |
| `/` | 200 |
| `/login` | 200 |
| `/register` | 200 |
| `/api/health` | 503 `closed_pilot` |
| `/api/admin/env-status` | 503 `closed_pilot` |

Die 503-Antworten waren kein Runtime-Crash. Body:

```json
{"error":"Der Nachbar.io-Pilot ist geschlossen und nimmt aktuell keine Anmeldungen oder personenbezogenen Daten an.","status":"closed_pilot"}
```

Browser-Smoke ohne Login:

- `/`: 200, keine Console-Issues, keine failed Requests, keine 403/406/5xx-Responses.
- `/login`: 200, keine Console-Issues, keine 403/406/5xx-Responses. Ein RSC-Request auf `/onboarding-anleitung` wurde mit `net::ERR_ABORTED` abgebrochen; das war kein 4xx/5xx und nicht blockierend.
- `/register`: 200, keine Console-Issues, keine failed Requests, keine 403/406/5xx-Responses.
- `/messages`: unauthentifiziert auf `/` zurueckgefuehrt, keine Console-Issues, keine failed Requests, keine 403/406/5xx-Responses.

Finaler Kurz-Smoke nach Deploy `dpl_u2ihJmeERAmoWW4wFTLkwwbxrcQV`:

| URL | Ergebnis |
| --- | --- |
| `/` | 200 |
| `/login` | 200 |
| `/register` | 200 |
| `/api/health` | 503 `closed_pilot` |

## Ergebnis

Push, CI, Production-Deploy und rein lesender Smoke sind fuer `37b3bb5` abgeschlossen.

Der urspruengliche S12-Chat-Notification-Fix ist damit live deployed. Ein authentifizierter Prod-Test des Chat-Flows wurde bewusst nicht ausgefuehrt, weil dafuer Login/Testdaten/Datenschreibungen noetig waeren.
