# Codex Handover - Prod-Deploy + E2E-Bypass-Cleanup 2026-05-01

**Stand:** 2026-05-01 abends  
**Scope:** nachbar-io Production-Deploy von `41aaf9b` und Sicherheitsbereinigung der E2E-Bypass-ENV.

## Ergebnis

- `41aaf9b fix(e2e): normalize local supabase smoke env` ist auf `origin/master`.
- Aktives Production-Deployment: `dpl_Fnfv64SuzKht2FKoByYRZ6RdvvF4`
- Live-URL: `https://nachbar-io.vercel.app`
- Smoke nach Remote-Build:
  - `/` -> 200
  - `/login` -> 200
  - `/register` -> 200
  - `/dashboard` ohne Session -> 307 Redirect
  - `/admin` ohne Session -> 307 Redirect
  - `/api/test/login` mit Test-Header -> 503 `closed_pilot`, kein Auth-Bypass
  - `vercel logs dpl_Fnfv64SuzKht2FKoByYRZ6RdvvF4 --no-follow --status-code 500 --limit 20 --expand` -> keine Logs gefunden

## Deployment-Lehre

Lokaler Windows-Prebuild ist fuer Production nicht tauglich.

Fehlversuch:

```bash
vercel build --prod
vercel deploy --prebuilt --prod
vercel deploy --prebuilt --prod --archive=tgz
```

Der normale Upload scheiterte an Windows-Symlinks in `.vercel/output`. Der archivierte Upload wurde zwar `READY`, erzeugte aber HTTP 500 auf `/`, `/login` und `/register`.

Root Cause aus Vercel Runtime-Logs:

```text
Failed to load external module require-in-the-middle-2ca7b9c2766f317e
```

Lokaler Befund:

- Next/Turbopack erzeugte `.next/node_modules/require-in-the-middle-2ca7b9c2766f317e` als Windows-Junction auf `node_modules/require-in-the-middle`.
- Das Vercel Output enthielt diese hashed externals nicht.
- Sentry/OpenTelemetry-Instrumentation konnte zur Laufzeit nicht laden.

**Regel ab jetzt:** Auf Windows kein `vercel build --prod` + `vercel deploy --prebuilt --prod` fuer Production. Sicher sind Linux-Builds:

1. GitHub Actions `deploy.yml`, sobald `gh` lokal authentifiziert ist oder der Run im Browser gestartet wird.
2. Fallback: `vercel deploy --prod` ohne `--prebuilt` (Remote-Build auf Vercel/Linux).

## Rollback und Recovery

Das kaputte Deployment wurde sofort zurueckgerollt auf:

```text
dpl_H67Z5cR6FDEhWj94PKfazjyXPP9F
```

Danach war Production wieder 200/200/200 fuer `/`, `/login`, `/register`.

Anschliessend wurde `vercel deploy --prod` ohne `--prebuilt` ausgefuehrt. Das neue Deployment wurde `READY`, hing aber zunaechst nur auf den Projekt-Aliasen. Nach dem Rollback musste es explizit promoted werden:

```bash
vercel promote https://nachbar-oizxdyl5z-thomasth1977s-projects.vercel.app --yes
```

Danach zeigte `https://nachbar-io.vercel.app` auf `dpl_Fnfv64SuzKht2FKoByYRZ6RdvvF4`.

## Sicherheitsbefund E2E-Bypass

Vor der Bereinigung waren in Vercel Production gesetzt:

- `SECURITY_E2E_BYPASS`
- `E2E_TEST_SECRET`

Claude hat beide mit Founder-Go aus Production geloescht. Codex hat danach unabhaengig verifiziert:

```bash
vercel env ls production | Select-String -Pattern 'SECURITY_E2E_BYPASS|E2E_TEST_SECRET'
vercel env ls preview | Select-String -Pattern 'SECURITY_E2E_BYPASS|E2E_TEST_SECRET'
vercel env ls production | Select-String -Pattern 'TEST|BYPASS|DEBUG|MOCK|FAKE|LOCAL'
```

Alle drei Checks lieferten keine Treffer.

**Regel:** `SECURITY_E2E_BYPASS` und `E2E_TEST_SECRET` duerfen nie in Production oder Preview gesetzt sein. Development/lokale E2E-Kontexte sind separat zu halten.

## Offene Folgepunkte

- `gh auth status` ist lokal rot: `You are not logged into any GitHub hosts.`
- Deshalb konnte `gh workflow run deploy.yml` nicht gestartet werden.
- Founder-Browser-Smoke als eingeloggter Founder ist noch sinnvoll: `/admin` muss Feature-Flag-Manager und Audit-Log-Reader zeigen. Ohne Founder-Session wurde nur der unauthentifizierte Redirect geprueft.
- Keine Mig 176/177, kein Phase-Preset, kein KI-/Stripe-/Twilio-Live-Schalter ohne neues Founder-Go.
