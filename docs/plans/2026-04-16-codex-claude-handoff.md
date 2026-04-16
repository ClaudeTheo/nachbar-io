# Übergabe an Codex oder Claude Code

**Datum:** 2026-04-16  
**Repo:** `C:/Users/thoma/Documents/New project/nachbar-io`  
**Branch:** `master`  
**Aktueller lokaler HEAD:** `6231864` (`Add household position confirmation flow`)  
**Vorheriger lokaler Commit:** `6cb319d` (`Add BW house coordinate sync via LGL`)  
**Letzter live deployter Commit:** `6f98cb6` (`Polish map mobile help and controls`)  
**Status zu `origin/master`:** `master` ist lokal **4 Commits voraus**

## Gilt für die nächste Session

- Nichts wurde gepusht oder deployed.
- `.playwright-cli/` und `output/` nicht committen.
- Im Worktree sind aktuell nur die bestehenden Plan-/Handoff-Dokumente uncommitted.
- `S12`, `X01` und `X19` sind lokal weiterhin als zuvor grün dokumentiert; dieser Block wurde heute nicht erneut breit aufgerollt.
- Für lokale Cross-Portal-Läufe gegen einen schon laufenden Dev-Server weiter `E2E_LIVE=1` nutzen.

## Was heute konkret umgesetzt wurde

### 1. BW-LGL-Happy-Path

Commit: `6cb319d`

- Neuer LGL-BW-Resolver:
  - [lib/geocoding/lgl-bw.ts](C:/Users/thoma/Documents/New project/nachbar-io/lib/geocoding/lgl-bw.ts)
- Neue BW-Resolve-Route:
  - [app/api/household/position/resolve-bw/route.ts](C:/Users/thoma/Documents/New project/nachbar-io/app/api/household/position/resolve-bw/route.ts)
- Profilseite erweitert:
  - [app/(app)/profile/map-position/page.tsx](C:/Users/thoma/Documents/New project/nachbar-io/app/(app)/profile/map-position/page.tsx)
- Vorbereitete Migration:
  - [supabase/migrations/156_household_position_metadata.sql](C:/Users/thoma/Documents/New project/nachbar-io/supabase/migrations/156_household_position_metadata.sql)
- Unit-Test für den Resolver:
  - [lib/geocoding/__tests__/lgl-bw.test.ts](C:/Users/thoma/Documents/New project/nachbar-io/lib/geocoding/__tests__/lgl-bw.test.ts)

Wichtige Erkenntnisse:

- Der LGL-BW-WFS ist live erreichbar.
- `Purkersdorfer Straße 35, 79713 Bad Säckingen` wird amtlich auf `47.562469, 7.947937` aufgelöst.
- Der Happy-Path schreibt `households.lat/lng` sofort.
- Metadaten werden nur dann mitgeschrieben, wenn Migration `156` auf der Ziel-DB vorhanden ist.

### 2. Confirm-Flow und abgesicherter Leaflet-Filter

Commit: `6231864`

- Neue Confirm-Route:
  - [app/api/household/position/confirm/route.ts](C:/Users/thoma/Documents/New project/nachbar-io/app/api/household/position/confirm/route.ts)
- Gemeinsame Metadaten-/Fallback-Helfer:
  - [lib/household-position-metadata.ts](C:/Users/thoma/Documents/New project/nachbar-io/lib/household-position-metadata.ts)
- Profilseite hat jetzt zusätzlich:
  - Leaflet-Karte mit verschiebbarem Marker
  - expliziten Bestätigen-Button
  - Reset auf den gespeicherten Punkt
- Leaflet-Datenpfad:
  - [lib/map-houses.ts](C:/Users/thoma/Documents/New project/nachbar-io/lib/map-houses.ts)
  - nutzt `position_verified=true`, aber nur wenn die Spalte existiert
  - fällt vor Migration automatisch auf den alten `lat/lng`-Pfad zurück
- Leerer Leaflet-Stand zeigt klaren UI-Hinweis:
  - [components/LeafletKarte.tsx](C:/Users/thoma/Documents/New project/nachbar-io/components/LeafletKarte.tsx)
- Enger Route-Test:
  - [__tests__/api/household-position-confirm.test.ts](C:/Users/thoma/Documents/New project/nachbar-io/__tests__/api/household-position-confirm.test.ts)

## Echter externer Blocker

Migration `156` ist **auf der angebundenen Ziel-DB noch nicht angewendet**.

Verifiziert:

- Das Repo läuft gegen `https://uylszchlyhbpbmslcnka.supabase.co`.
- Eine direkte API-Abfrage auf `households.position_verified` liefert aktuell:

```json
{
  "code": "42703",
  "message": "column households.position_verified does not exist"
}
```

- `supabase link` ist lokal nicht eingerichtet.
- Im Repo liegt weder ein DB-Connection-String noch ein Supabase-Access-Token.
- Die direkten SQL-Endpunkte sind im Projekt nicht nutzbar:
  - `/pg-meta/default/query` → ungültiger Pfad
  - `rpc/exec_sql` → Funktion existiert nicht

Konsequenz:

- Der Code ist so gebaut, dass der neue Flow **jetzt schon funktioniert**.
- Der harte `position_verified`-Filter schaltet **erst nach Migration 156** wirklich auf den neuen Modus um.

## Enge Verifikation heute

Grün:

- `npx vitest run lib/geocoding/__tests__/lgl-bw.test.ts`
- `npx eslint "app/api/household/position/resolve-bw/route.ts" "app/api/household/position/confirm/route.ts" "app/(app)/profile/map-position/page.tsx" "lib/map-houses.ts" "lib/household-position-metadata.ts" "components/LeafletKarte.tsx"`

Noch offen, aber nicht von diesem Slice verursacht:

- `npx tsc --noEmit --pretty false`
  - bestehende Altfehler in:
    - `__tests__/lib/security/device-fingerprint.test.ts`
    - `__tests__/pages/quartier-info-vorlesen.test.tsx`
    - `tests/e2e/cross-portal/x01-checkin-heartbeat.spec.ts`
    - `tests/e2e/cross-portal/x19-postfach-thread.spec.ts`
    - `tests/e2e/scenarios/s12-neighbor-request-chat.spec.ts`

## Direkt relevante Dateien

- [docs/plans/2026-04-16-bw-house-coordinates-map-strategy.md](C:/Users/thoma/Documents/New project/nachbar-io/docs/plans/2026-04-16-bw-house-coordinates-map-strategy.md)
- [docs/plans/2026-04-16-bw-house-coordinates-implementation-plan.md](C:/Users/thoma/Documents/New project/nachbar-io/docs/plans/2026-04-16-bw-house-coordinates-implementation-plan.md)
- [supabase/migrations/156_household_position_metadata.sql](C:/Users/thoma/Documents/New project/nachbar-io/supabase/migrations/156_household_position_metadata.sql)
- [app/api/household/position/resolve-bw/route.ts](C:/Users/thoma/Documents/New project/nachbar-io/app/api/household/position/resolve-bw/route.ts)
- [app/api/household/position/confirm/route.ts](C:/Users/thoma/Documents/New project/nachbar-io/app/api/household/position/confirm/route.ts)
- [app/(app)/profile/map-position/page.tsx](C:/Users/thoma/Documents/New project/nachbar-io/app/(app)/profile/map-position/page.tsx)
- [lib/geocoding/lgl-bw.ts](C:/Users/thoma/Documents/New project/nachbar-io/lib/geocoding/lgl-bw.ts)
- [lib/map-houses.ts](C:/Users/thoma/Documents/New project/nachbar-io/lib/map-houses.ts)
- [lib/household-position-metadata.ts](C:/Users/thoma/Documents/New project/nachbar-io/lib/household-position-metadata.ts)
- [components/LeafletKarte.tsx](C:/Users/thoma/Documents/New project/nachbar-io/components/LeafletKarte.tsx)
- [__tests__/api/household-position-confirm.test.ts](C:/Users/thoma/Documents/New project/nachbar-io/__tests__/api/household-position-confirm.test.ts)

## Nächster sinnvoller Block

Nicht zurück in allgemeine Grundsatzplanung oder breites Smoke-Testing gehen.

Die direkte nächste Arbeit ist:

1. Migration `156_household_position_metadata.sql` sicher gegen die richtige DB anwenden.
2. Danach den Status gegen die echte Ziel-DB verifizieren.
3. Erst dann prüfen, ob im Resolve-Pfad noch ein kleiner Nicht-Exact-/Confirm-Follow-up fehlt.

## Startprompt für die nächste Session

Arbeite in `C:/Users/thoma/Documents/New project/nachbar-io` auf `master` weiter. Nutze `docs/plans/2026-04-16-codex-claude-handoff.md` als maßgebliche Übergabe. Ausgangspunkt ist `HEAD` `6231864` (`Add household position confirmation flow`). Der erste BW-LGL-Happy-Path und der Confirm-Flow sind bereits implementiert. Echter Blocker: Migration `156_household_position_metadata.sql` ist auf der angebundenen Ziel-DB `uylszchlyhbpbmslcnka` noch nicht angewendet; eine API-Abfrage auf `households.position_verified` liefert aktuell `42703 column does not exist`. Bitte nicht zurück in breite Planung oder Smoke-Tests gehen. Wende zuerst Migration `156` sicher auf die richtige DB an, verifiziere den DB-Stand und arbeite danach nur den nächsten echten BW-Follow-up ab. Nichts pushen oder deployen. `.playwright-cli/` und `output/` nicht committen.
