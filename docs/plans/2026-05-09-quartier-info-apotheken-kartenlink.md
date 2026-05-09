# Quartier-Info Apotheken-Kartenlink 2026-05-09

## Anlass

Nach der Link-Diagnose war klar: Apotheken hatten in der Quartier-Info nur einen
Telefonlink. Fuer Nutzer sah das wie "keine Links" aus, obwohl Name und Adresse
vorhanden sind.

## Umsetzung

- Apotheken in `/quartier-info` erhalten jetzt neben dem Telefonbutton einen
  Kartenbutton.
- Der Kartenbutton nutzt den bestehenden `ExternalLink`-Hinweisdialog und rendert
  einen echten `href`.
- Die Karten-URL wird aus vorhandenem Namen + Adresse als OpenStreetMap-Suche
  gebaut. Dadurch ist kein Prod-DB-Write und kein neues Datenfeld noetig.
- `ExternalLink` akzeptiert jetzt normale Anchor-Attribute wie `aria-label`.

## Grenze

Das ist ein sicherer Fallback aus den vorhandenen Daten. Exakte Koordinaten,
Apotheken-Websites oder dauerhafte `maps_url`-/`url`-Felder waeren ein eigener
OSM-/Datenmodell-Schritt.

## Verifikation

- TDD RED: `npx vitest run __tests__/pages/quartier-info-vorlesen.test.tsx`
- GREEN: `npx vitest run __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/components/ExternalLink.test.tsx`
- Affected: `npx vitest run __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/components/ExternalLink.test.tsx __tests__/api/quartier-info-route.test.ts __tests__/lib/quartier-info.service.test.ts __tests__/modules/info-hub/osm-pharmacy-sync.test.ts __tests__/modules/info-hub/normalize-response.test.ts`
- `npx eslint "app/(app)/quartier-info/page.tsx" components/ExternalLink.tsx __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/components/ExternalLink.test.tsx`
- `npx tsc --noEmit`
- `npm run lint`
- `git diff --check`
- `npm run build`
