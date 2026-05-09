# Rathaus-/Apotheken-Link-Diagnose 2026-05-09

## Anlass

Founder-Meldung: In der lokal geoeffneten App funktionieren Links rund um Rathaus
und Apotheken nicht verlaesslich.

## Befund

- Prod-Daten in `municipal_config.service_links` enthalten fuer Bad Saeckingen
  noch alte Kurzpfade wie `/buergerbuero`, `/fundbuero` und `/formulare`.
  Diese Ziele liefern extern 404.
- Die Codebasis hat bereits eine Bad-Saeckingen-Normalisierung in
  `lib/municipal/bad-saeckingen-links.ts`, die diese alten URLs auf aktuelle
  Rathauspfade mappt. Diese Absicherung ist getestet.
- `components/ExternalLink.tsx` renderte externe Ziele als `<button>`.
  Das erschwert Browser-Fallbacks, Link-Kontextmenues, Accessibility-Erwartungen
  und automatisierte Pruefung, obwohl ein externer Ziel-URL vorhanden ist.
- Apotheken-Eintraege enthalten aktuell nur `name`, `address`, `phone` und
  `openingHours`. Es gibt derzeit keine Apotheke-Website- oder Maps-URL im
  Datenmodell/JSON. Die sichtbaren Apotheken-Aktionen sind deshalb Telefonlinks
  plus separater Notdienst-Link, wenn `notdienst_url` gesetzt ist.

## Umsetzung

- `ExternalLink` rendert externe Ziele wieder als echte `<a href target="_blank">`.
- Der Klick wird weiterhin abgefangen und ueber den vorhandenen Hinweisdialog im
  `ExternalLinkProvider` gefuehrt.
- Ohne Provider gibt es nun einen sicheren Fallback per `window.open`, statt
  dass Klicks wirkungslos bleiben.
- Tests wurden auf echte href-Links aktualisiert und ein eigener
  `ExternalLink`-Komponententest deckt href + Hinweisdialog ab.

## Grenze

Diese Aenderung schreibt keine Prod-Daten und fuegt keine neuen Apotheken-URLs
hinzu. Fuer echte Apotheken-Webseiten oder Kartenlinks braucht es einen separaten
kleinen Daten-/OSM-Sync-Schritt mit Feldern wie `url` oder `maps_url`.

## Verifikation

- `npx vitest run __tests__/components/ExternalLink.test.tsx`
- `npx vitest run __tests__/components/ExternalLink.test.tsx __tests__/app/city-services/page.test.tsx __tests__/pages/quartier-info-vorlesen.test.tsx __tests__/lib/municipal/bad-saeckingen-links.test.ts __tests__/lib/quartier-info.service.test.ts __tests__/api/quartier-info-route.test.ts`
- `npx eslint components/ExternalLink.tsx components/ExternalLinkProvider.tsx __tests__/components/ExternalLink.test.tsx __tests__/app/city-services/page.test.tsx`
- `npx tsc --noEmit`
- `npm run lint`
- `git diff --check`
- `npm run build`
