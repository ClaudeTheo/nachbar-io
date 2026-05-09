# Handoff Codex an Claude — Linkfix Rathaus/Apotheken + Live-Status

Datum: 2026-05-09 nachmittag
Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
Branch: `master`

## Kontext

Thomas meldete im In-App-Browser:

- Live `https://nachbar-io.vercel.app/`: Anmeldung war nicht auffindbar.
- Danach: Rathaus-/Apotheken-Links funktionieren nicht bzw. wirken kaputt.

Vorheriger Live-Deploy wurde bereits nach Founder-Go gemacht:

- Prod alias: `https://nachbar-io.vercel.app`
- Deploy ID: `dpl_D5RHBE1GbotAVNVoemp6S2Snyyp7`
- Stand nach Deploy: Startseite hat `/login`, `/login` ist erreichbar, `/api/health` 200.

## Lokaler Git-Stand

`master` ist aktuell 2 Commits vor `origin/master`:

```text
cc3b5b6 feat(info): add pharmacy map links
f0e2fe3 fix(links): render external links with href
```

Nicht gepusht, nicht deployed.

Bekannte alte untracked Dateien weiterhin nicht anfassen:

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

## Was gemacht wurde

### 1. `f0e2fe3 fix(links): render external links with href`

Befund:

- Prod-DB enthaelt fuer Bad Saeckingen noch alte Rathaus-Shortlinks wie `/buergerbuero`, `/fundbuero`, `/formulare`; diese externen Ziele liefern 404.
- Code hat bereits Mapping/Normalisierung in `lib/municipal/bad-saeckingen-links.ts`.
- Problem zusaetzlich: `components/ExternalLink.tsx` renderte externe Ziele als `<button>` statt als echte Links. Das ist fuer Browser-Fallbacks, Kontextmenues, Accessibility und Tests unguenstig.

Umsetzung:

- `components/ExternalLink.tsx` rendert externe Links als `<a href target="_blank" rel="noopener noreferrer">`.
- Klick wird weiterhin abgefangen und durch `ExternalLinkProvider` mit Hinweisdialog gefuehrt.
- Ohne Provider gibt es jetzt sicheren `window.open`-Fallback.
- Tests angepasst/ergaenzt.

Wichtige Dateien:

- `components/ExternalLink.tsx`
- `components/ExternalLinkProvider.tsx`
- `__tests__/components/ExternalLink.test.tsx`
- `__tests__/app/city-services/page.test.tsx`
- `docs/plans/2026-05-09-rathaus-apotheken-link-diagnose.md`

### 2. `cc3b5b6 feat(info): add pharmacy map links`

Befund:

- Apotheken hatten in `/quartier-info` nur Telefonlinks.
- In den vorhandenen Daten gibt es `name`, `address`, `phone`, `openingHours`, aber keine Website-/Maps-URL.

Umsetzung:

- Apotheken in `/quartier-info` haben nun neben Telefon einen Kartenbutton.
- Kartenlink wird aus Name + Adresse als OpenStreetMap-Suche gebaut.
- Kein Prod-DB-Write, keine Migration, kein neues Datenfeld.
- Touch targets fuer Karte/Telefon: 48px.
- `ExternalLink` akzeptiert jetzt normale Anchor-Attribute wie `aria-label`.

Wichtige Dateien:

- `app/(app)/quartier-info/page.tsx`
- `components/ExternalLink.tsx`
- `__tests__/pages/quartier-info-vorlesen.test.tsx`
- `docs/plans/2026-05-09-quartier-info-apotheken-kartenlink.md`

## Verifikation

Gruen gelaufen:

```bash
npx vitest run __tests__/components/ExternalLink.test.tsx __tests__/app/city-services/page.test.tsx __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/lib/municipal/bad-saeckingen-links.test.ts __tests__/lib/quartier-info.service.test.ts __tests__/api/quartier-info-route.test.ts
npx vitest run __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/components/ExternalLink.test.tsx __tests__/api/quartier-info-route.test.ts __tests__/lib/quartier-info.service.test.ts __tests__/modules/info-hub/osm-pharmacy-sync.test.ts __tests__/modules/info-hub/normalize-response.test.ts
npx eslint components/ExternalLink.tsx components/ExternalLinkProvider.tsx __tests__/components/ExternalLink.test.tsx __tests__/app/city-services/page.test.tsx
npx eslint "app/(app)/quartier-info/page.tsx" components/ExternalLink.tsx __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/components/ExternalLink.test.tsx
npx tsc --noEmit
npm run lint
git diff --check
npm run build
```

Build ist gruen. Meldung `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert` kam wie bekannt im lokalen Build, kein Blocker fuer diesen Linkfix.

## Aktueller Zustand fuer Thomas

- Lokal sind die Linkfixes fertig und committed.
- Live hat diese 2 Commits noch nicht.
- Thomas bat jetzt: Claude soll weiter machen.

## Naechster sinnvoller sicherer Schritt fuer Claude

1. Zuerst `git status --short --branch` pruefen.
2. Wenn Thomas Founder-Go fuer Live gibt: `git push origin master`; danach GitHub/Vercel-Deploy beobachten oder vorhandenen Deploy-Pfad nutzen.
3. Danach Live-Smokes:
   - `https://nachbar-io.vercel.app/` zeigt Login-Link.
   - `https://nachbar-io.vercel.app/login` 200.
   - Authentifizierter Test fuer `/quartier-info`, falls Test-User/Session vorhanden.
4. Ohne Live-Go: lokal weiter verfeinern. Sinnvoll waere als naechstes eine echte OSM-Datenanreicherung fuer Apotheken-URLs/Koordinaten, aber das ist ein separater kleiner Datenmodell-/Sync-Schritt und braucht wegen Prod-Daten/Sync klare Gates.

## Gates

Kein Push/Deploy/Prod-DB/Vercel-Env/Secrets/Billing ohne passendes Founder-Go.

