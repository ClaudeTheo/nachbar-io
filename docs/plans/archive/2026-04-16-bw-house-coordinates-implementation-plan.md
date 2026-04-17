# BW-Hauskoordinaten — Implementierungsplan

**Datum:** 2026-04-16
**Autor:** Claude (Plan, kein Code)
**Basis:** `docs/plans/2026-04-16-bw-house-coordinates-map-strategy.md` (Strategie) + `docs/plans/2026-04-16-codex-claude-handoff.md` (Handoff)
**Scope:** Datenmodell + Backend-Flow + erster vertikaler Slice
**Status:** Draft zur Review — **kein Code, kein Push, kein Deploy**
**Nicht committen:** `.playwright-cli/`, `output/`

---

## 1. Ist-Analyse (verifiziert im Repo)

### 1.1 Relevante Dateien

| Pfad | Rolle |
|------|-------|
| `app/(app)/profile/map-position/page.tsx` | Manuelle SVG-Pflege (x/y in Pixelkoordinaten) |
| `components/LeafletKarte.tsx` | Leaflet-Wrapper, lädt via `useMapStatuses` |
| `components/LeafletMapInner.tsx` | CircleMarker-Rendering, `center=[lat,lng]` |
| `lib/map-houses.ts` | Typen + `loadGeoQuarterHouses()` (liest `households.lat/lng`) |
| `lib/hooks/useMapStatuses.ts` | Status-Aggregation pro Haus |

### 1.2 Relevante DB-Tabellen (Stand Migration 155)

**`households`**
- `id`, `street_name`, `house_number`, `quarter_id`
- `lat double precision`, `lng double precision` ← **faktische Quelle der Leaflet-Marker**
- Keine Metadaten über Herkunft/Qualität der Koordinaten

**`map_houses`** (Legacy SVG-System)
- `id`, `house_number`, `street_code`, `x`, `y`, `default_color`
- `lat`, `lng`, `quarter_id` (aus Mig. 035, teils befüllt)
- `household_id`

### 1.3 Gefundene Schwachstellen

1. **Metadaten fehlen vollständig.** `households.lat/lng` hat keine Info über `source`, `accuracy`, `verified`.
2. **SVG-Pfad pflegt falsche Welt.** `map-position/page.tsx` schreibt nur `map_houses.x/y` (Pixel) — hat keinen Einfluss auf Leaflet.
3. **Kein BW-Lookup.** Es gibt keinen LGL-BW-Adapter, auch keinen expliziten Geocoder-Aufruf mit Accuracy-Filter.
4. **Adresserfassung mischt Logik.** `households.street_name` + `house_number` sind vorhanden, aber es gibt keine strukturierte Pipeline (PLZ, Ort separat).
5. **Re-Geocoding nicht explizit unterbunden.** Da kein `verified`-Flag existiert, gibt es keine Garantie, dass einmal bestätigte Punkte stabil bleiben.

---

## 2. Datenmodell

### 2.1 Entscheidung: Position-Metadaten auf `households` erweitern

Begründung: `households.lat/lng` ist bereits die de-facto Quelle für Leaflet (`loadGeoQuarterHouses`). Es wäre Doppelpflege, eine zweite Koordinaten-Tabelle einzuführen. Stattdessen:

- `households` bekommt Metadaten-Spalten direkt beim Koordinatenpaar.
- `map_houses.x/y` bleibt als SVG-Legacy bestehen (nicht verändern in diesem Slice — getrennter Refactor).

### 2.2 Neue Spalten auf `households`

Migration `156_household_position_metadata.sql` (Vorschlag):

```sql
-- Strukturierte Adressteile (falls noch nicht vollständig)
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

-- Positions-Metadaten
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS position_source TEXT
    CHECK (position_source IN (
      'lgl_bw_house_coordinate',
      'lgl_bw_address_match',
      'geocoder_rooftop',
      'geocoder_interpolated',
      'geocoder_street',
      'geocoder_approximate',
      'manual_svg_legacy',
      'manual_pin_confirmation',
      'unknown'
    )),
  ADD COLUMN IF NOT EXISTS position_accuracy TEXT
    CHECK (position_accuracy IN (
      'building',      -- amtlich, Hausmitte
      'rooftop',       -- Geocoder rooftop
      'interpolated',  -- address-range-interpoliert
      'street',        -- Straßenmitte
      'approximate',   -- PLZ-/Ortsnähe
      'unknown'
    )),
  ADD COLUMN IF NOT EXISTS position_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS position_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS position_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS position_raw_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_households_position_verified
  ON households(position_verified);
```

**Semantik der Felder:**
- `position_source` — woher kam die Koordinate (endliche Liste).
- `position_accuracy` — wie gut ist sie (endliche Liste, vgl. Google/Here/Nominatim).
- `position_verified` — `true` genau dann, wenn entweder (a) amtlicher BW-Match mit `accuracy='building'` oder (b) Nutzer hat Pin bestätigt.
- `position_manual_override` — `true`, wenn Nutzer Position händisch verschoben hat (Schutz vor erneuter Geocoder-Überschreibung).
- `position_raw_payload` — rohes Provider-Ergebnis (JSONB) für spätere Re-Prüfung/Audit, nicht für Anzeige.

### 2.3 Abgrenzung zu `map_houses.x/y`

Nicht Teil dieses Slice. Die SVG-Pixelkoordinaten bleiben, werden in Phase 2 migriert: aus verifizierten `households.lat/lng` rechnen wir `x/y` automatisch per Quartier-Transformation ab, falls SVG-Karten noch benötigt werden.

### 2.4 Neue Tabelle: Audit-Log für Positionsänderungen (optional Slice 2)

```sql
-- Nicht in Slice 1 — für spätere Nachvollziehbarkeit
CREATE TABLE IF NOT EXISTS household_position_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_lat DOUBLE PRECISION, old_lng DOUBLE PRECISION, old_source TEXT,
  new_lat DOUBLE PRECISION, new_lng DOUBLE PRECISION, new_source TEXT,
  reason TEXT
);
```

---

## 3. Backend-Flow

### 3.1 Neuer Service: `lib/geocoding/`

Kapselt die gesamte Koordinaten-Logik. Heilig: **kein Client darf Geocoder direkt aufrufen** — immer über API-Route.

```
lib/geocoding/
  types.ts              — StructuredAddress, ResolvedPosition, PositionSource, PositionAccuracy
  lgl-bw.ts             — BW-Lookup: WFS-Abfrage, ETRS89/UTM → WGS84
  fallback.ts           — Nominatim/Maptiler mit Accuracy-Filter (wir nutzen schon MapTiler als Tile)
  resolve.ts            — Orchestrator: BW zuerst, dann Fallback, dann "unresolved"
  persist.ts            — Upsert auf households inkl. Metadaten
```

### 3.2 BW-Adapter (Slice 1 Kern)

**Endpunkt:** WFS `WFS_INSP_BW_Adr_Hauskoord_ALKIS` (aus Strategiedokument).

**Abfrage-Shape:** GetFeature mit Filter auf `strasse`, `hausnummer`, `postleitzahl` (PLZ zur Disambiguierung).

**Projektion:** Antwort kommt in ETRS89/UTM (EPSG:25832). Transformation nach WGS84 via `proj4` (npm package, ~30 KB).

**Rückgabe:**
```ts
type BwResult = {
  match: 'building_exact' | 'building_fuzzy' | 'no_match';
  lat?: number;
  lng?: number;
  normalizedAddress?: StructuredAddress;
  raw: unknown;
};
```

**Regel:** Nur `building_exact` wird automatisch akzeptiert. `building_fuzzy` (mehrere Treffer, Normalisierung der Hausnummer abweichend) → weitergereicht an UI zur Bestätigung.

**BW-Only:** Adapter prüft vor Call ob `postal_code` BW ist (7xxxx/8xxxx in BW-Teilbereich, oder `city` in BW). Sonst `no_match` sofort → Fallback.

### 3.3 Fallback-Geocoder

- Nur wenn BW `no_match`.
- MapTiler Geocoding API (wir nutzen bereits MapTiler-Tiles) oder Nominatim mit User-Agent.
- **Niemals automatisch speichern.** Alle Fallback-Treffer gehen durch die Pin-Bestätigung (3.5).

### 3.4 Orchestrator `resolveAddress()`

```
Input:  { street_name, house_number, postal_code, city }
Flow:
  1. Normalisierung (trim, Straßen-Abkürzungen, PLZ 5-stellig)
  2. BW-Adapter aufrufen
     → building_exact: { source: 'lgl_bw_house_coordinate', accuracy: 'building', verified: true }
     → building_fuzzy: { source: 'lgl_bw_address_match', accuracy: 'building', verified: false, candidates: [...] }
  3. Sonst Fallback
     → { source: 'geocoder_*', accuracy: <aus Provider>, verified: false }
  4. Wenn nichts: return { source: 'unknown', accuracy: 'unknown', verified: false }
Output: ResolvedPosition
```

### 3.5 API-Routen (neu)

| Route | Methode | Zweck |
|-------|---------|-------|
| `/api/geocoding/resolve` | POST | Adresse → ResolvedPosition (ohne Persistenz). Nutzt Rate-Limit. |
| `/api/household/position` | PUT | Speichert bestätigte Position (auth required, RLS auf eigenen Haushalt). |
| `/api/household/position/confirm` | POST | Markiert `position_verified=true` nach Pin-Bestätigung. |

**Security-Regeln:**
- Alle drei Routen hinter Auth.
- `/api/household/position*` nur für verifizierte Mitglieder des jeweiligen Haushalts (`household_members.verified_at IS NOT NULL`).
- Rate-Limit auf `/api/geocoding/resolve` (5/min/user), damit LGL-WFS nicht missbraucht wird.

### 3.6 Caching

- **BW-Treffer:** In-Memory LRU im Server (z.B. `lru-cache`, TTL 24h) keyed auf normalisierte Adresse. BW-Koordinaten sind statisch.
- **Fallback-Treffer:** nicht cachen (kurzlebig, ohnehin unbestätigt).

---

## 4. Frontend-Flow

### 4.1 Neue Profil-Seite: `profile/adresse` (strukturiert)

Ersetzt langfristig die reine SVG-Pflege. In Slice 1 bauen wir sie **neben** `profile/map-position`:

- 4 Eingabefelder: Straße, Hausnummer, PLZ, Ort.
- PLZ/Ort können vorausgefüllt werden (Quartier-Default).
- Submit → `/api/geocoding/resolve`.

### 4.2 Ergebnis-Behandlung im Client

```
ResolvedPosition.verified === true (BW building_exact)
  → direkt PUT /api/household/position + kurze Bestätigung
  → kein Pin-Schritt

ResolvedPosition.verified === false
  → Leaflet-Karte einblenden mit Punkt an aktuellem Lat/Lng
  → Nutzer darf Pin verschieben
  → "Position bestätigen" → POST /confirm mit final lat/lng
  → position_source bleibt, aber position_verified=true, position_manual_override=true bei Verschiebung
```

### 4.3 Karten-Rendering (`LeafletKarte.tsx`)

Keine Änderung am Rendering-Kern. `loadGeoQuarterHouses()` in `lib/map-houses.ts` wird erweitert:

```ts
// NEU: nur verifizierte Positionen in der Quartierkarte anzeigen
.eq('quarter_id', quarterId)
.eq('position_verified', true)   // <-- NEU
.not('lat', 'is', null)
```

Unverifizierte Haushalte sehen ihren eigenen Punkt nur im Profil bis zur Bestätigung.

### 4.4 Verhalten `profile/map-position` (SVG) in Slice 1

**Unverändert lassen.** Wird in Slice 2 auf "amtlich zuerst, manuell nur bei Bedarf" umgebaut. In Slice 1 betreffen die Änderungen ausschließlich den Leaflet-Pfad.

---

## 5. Erster vertikaler Slice (konkret, lieferfertig)

### 5.1 Ziel

Ein Bad-Säckinger-Pilot-Haushalt kann seine Adresse strukturiert erfassen, das System holt amtliche BW-Koordinaten, speichert sie mit `source='lgl_bw_house_coordinate'` + `accuracy='building'` + `verified=true`, und die Quartier-Karte zeigt den grünen Punkt exakt auf dem Haus.

### 5.2 Scope

**In:**
- Migration 156 (Metadaten-Spalten + strukturierte Adressfelder).
- `lib/geocoding/lgl-bw.ts` + `resolve.ts` (nur BW-Pfad, Fallback = Stub, der "not_implemented" zurückgibt).
- `/api/geocoding/resolve` + `/api/household/position` (PUT).
- Neue Seite `app/(app)/profile/adresse/page.tsx` mit 4-Feld-Formular, bei BW-Hit direkt Save.
- Update `loadGeoQuarterHouses` auf `position_verified=true`.
- 1 Vitest für `lgl-bw.ts` (Mock WFS-Response), 1 für `resolve.ts`.
- 1 E2E (Playwright) happy-path: Adresse eingeben → BW-Hit → Quartierkarte zeigt Punkt.

**Out (folgt in Slice 2/3):**
- Fallback-Geocoder real.
- Pin-Bestätigungs-UI für unverifizierte Treffer.
- Migration der bestehenden `households.lat/lng` (Backfill-Script mit Re-Check gegen BW).
- Refactor `profile/map-position` auf neue Welt.
- Gebäudeumringe (Hausumringe-WMS).
- Audit-Log-Tabelle.

### 5.3 Arbeitsreihenfolge (strikt sequenziell)

1. **Migration schreiben + lokal anwenden** (MCP-Migration gegen lokale Supabase, nicht Cloud).
2. **Typen + Service-Skeletton** (`lib/geocoding/types.ts`, `resolve.ts` leer, `lgl-bw.ts` mit Interface).
3. **BW-Adapter minimal:** ein WFS-Call mit hardkodierter Testadresse (Purkersdorfer Straße 11, Bad Säckingen). Test: erwartet Lat/Lng im bekannten Bereich (47.55, 7.96 ±0.01).
4. **proj4-Transformation** ETRS89/UTM → WGS84, Test mit bekanntem Punkt.
5. **API-Route `/api/geocoding/resolve`** — ruft Adapter, kein Persist.
6. **API-Route `/api/household/position` PUT** — prüft Auth, verifizierte Mitgliedschaft, schreibt Koordinaten + Metadaten.
7. **UI `profile/adresse`** — Formular, Submit, Success-Toast bei BW-Hit.
8. **`loadGeoQuarterHouses` Filter** auf `position_verified`.
9. **E2E-Test cross-portal** nach Muster `x19-postfach-thread.spec.ts`.
10. **Manuelle Verifikation** mit echtem Pilot-Haushalt (Thomas' Adresse in Purkersdorfer Str.).

### 5.4 Abbruchkriterien / Gates

- **Gate 1 (nach Schritt 4):** proj4-Transformation liefert für 3 BW-Testpunkte Werte, die maximal 2m von OpenStreetMap-Referenzen abweichen. Sonst Rollback + Strategie überdenken.
- **Gate 2 (nach Schritt 6):** `verified=false`-Fall ist bewusst nicht implementiert, aber API verweigert Save ohne Confirm-Endpoint. Kein Pfad führt zu stillem Speichern ungenauer Koordinaten.
- **Gate 3 (nach Schritt 10):** Pilot-Haushalt erscheint auf Quartierkarte binnen 200m vom Soll. Sonst kein Merge.

### 5.5 Risiken & Gegenmaßnahmen

| Risiko | Wahrscheinlichkeit | Gegenmaßnahme |
|--------|-------------------|---------------|
| LGL-WFS hat Rate-Limit oder verlangt Anmeldung | Mittel | Vorab mit 2-3 Testabfragen prüfen (vor Code) |
| `proj4` Transformation falsch konfiguriert (EPSG-Fehler) | Mittel | Unit-Test mit 3 bekannten Referenzpunkten |
| Existing `households` haben bereits `lat/lng` ohne Metadaten | Hoch | Migration setzt `position_source='unknown'`, `position_verified=false` als Default — Karten-Filter versteckt sie automatisch |
| Bestandshaushalte verschwinden nach Filter-Änderung von der Karte | Hoch (wenn 3.) | Backfill-Script separat planen (Slice 2), bis dahin Feature-Flag `NEXT_PUBLIC_POSITION_VERIFIED_FILTER=0` |
| LGL-Hausnummer-Format abweicht (z.B. "11a" vs. "11 a") | Mittel | Normalisierung mit Regex + zweitem Versuch ohne Suffix |

### 5.6 Feature-Flag

```
NEXT_PUBLIC_POSITION_VERIFIED_FILTER=0   # default während Rollout
```

Setzt `loadGeoQuarterHouses` Filter bedingt. Erlaubt schrittweises Einschalten ohne Daten-Verlust-Risiko.

---

## 6. Tests

### 6.1 Unit (Vitest)

- `lgl-bw.test.ts` — Mock-WFS-Response → erwartete Koordinaten.
- `resolve.test.ts` — BW-Hit, BW-Miss+Fallback-Stub, komplette Fehlerpfade.
- `persist.test.ts` — korrekte Metadaten beim Save, RLS-Rejection für fremde Haushalte.

### 6.2 E2E (Playwright, cross-portal)

Neuer Spec `tests/e2e/cross-portal/m01-bw-house-coordinates.spec.ts`:
- Resident loggt ein.
- Ruft `/profile/adresse` auf.
- Gibt Purkersdorfer Str. 11, 79713 Bad Säckingen ein.
- Erwartet: Success-Toast, Redirect oder Anzeige "Verifiziert".
- Wechselt zu `/quartier` (Leaflet-Karte).
- Erwartet: mindestens 1 grüner CircleMarker mit korrekten Lat/Lng (±0.0005°, ~50m).

**Ausführung:** `E2E_LIVE=1` gegen laufenden Dev-Server, nach Muster `x01`/`x19`.

### 6.3 Manueller Rauchtest

- Bad-Säckinger Adresse des Founders eingeben.
- Karte prüfen — Punkt sitzt exakt auf dem Haus.
- Adresse einer Nicht-BW-Stadt eingeben (z.B. Köln) → erwartete Fehlermeldung "Außerhalb Baden-Württemberg noch nicht unterstützt".

---

## 7. Rollout

1. **Lokale Verifikation komplett grün** (Unit + E2E + Rauchtest).
2. **Commit auf `master`, noch nicht pushen.**
3. **Founder-Freigabe einholen** (Plan + Code-Diff zeigen).
4. **Push**, GitHub Actions deployt nachbar-io-Stage.
5. **Migration 156 auf Cloud-Supabase via MCP anwenden** nach Founder-Go.
6. **Feature-Flag `POSITION_VERIFIED_FILTER=0`** lassen, bis Backfill läuft (Slice 2).

---

## 8. Offene Fragen an Founder

1. **LGL-BW-Zugang:** Ist der WFS-Endpunkt ohne Auth nutzbar, oder braucht es eine Registrierung beim Geoportal? (**Muss vor Code geklärt sein.**)
2. **PLZ-Normalisierung:** Sollen wir bei BW-Hit die `city`/`postal_code` aus LGL-Response überschreiben (Datenqualität), oder Nutzereingabe Vorrang lassen?
3. **Hausnummer-Suffixe:** Genaue Konvention für "11a" vs. "11 a" vs. "11/1" in Bad Säckingen?
4. **Fallback-Provider:** MapTiler Geocoding (konsistent mit Tiles) oder Nominatim (kostenlos, aber Rate-Limit)?
5. **Slice-2-Priorität:** Nach BW-Happy-Path — erst Fallback-Geocoder-UI oder erst Backfill existierender Haushalte?

---

## 9. Nicht-Ziele dieses Slice

- Keine Änderung an SVG-Karten-Pfad (`map_houses.x/y`).
- Keine Migration auf neue Welt für Bestandsdaten.
- Keine Hausumringe.
- Keine Multi-Quartier-Generalisierung (Rheinfelden/Laufenburg/Köln → folgt nach BW-Beweis).
- Kein Cross-Portal (civic/pflege/arzt) Konsum der neuen Felder.

---

## 10. Entscheidungspunkte für Review

Bitte Founder-Entscheidung auf folgende Punkte vor Code-Start:

- [ ] **Datenmodell okay** — Metadaten direkt auf `households` statt eigene Tabelle?
- [ ] **Migration 156 Schema** wie beschrieben?
- [ ] **BW-Only Slice 1** — Nicht-BW-Adressen werden erstmal abgelehnt?
- [ ] **Feature-Flag-Default** `POSITION_VERIFIED_FILTER=0` — also alter Zustand bleibt aktiv?
- [ ] **Antworten auf §8** (mindestens Frage 1 blockiert den Start)

Danach kann Slice 1 gestartet werden.
