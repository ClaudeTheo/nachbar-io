# Doctor-Discovery-Welle — Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Beim Anlegen eines neuen Quartiers automatisch Aerzte in der Umgebung suchen und in `doctor_profiles` (oder neuer `external_doctors`-Tabelle) speichern — analog zur bestehenden Onboarding-Pipeline fuer Stadt-Domain, Amtsblatt, OEPNV-Stops und Events.

**Architecture:** Neue Welle "Doctor-Discovery" in der Onboarding-Pipeline ([app/api/admin/quarters/[id]/onboard/route.ts](../../app/api/admin/quarters/[id]/onboard/route.ts)). Datenquelle: OpenStreetMap Overpass-API mit Tag-Filter `amenity=doctors` im Quartier-Bounding-Box. Ergebnis: gecrawlte Aerzte landen in einer separaten Tabelle (Konflikt-arm mit registrierten `doctor_profiles`-Eintraegen), die `/care/aerzte` zusaetzlich anzeigt.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres, Overpass-API (OSM), bestehende Crawler-Patterns aus `modules/events/services/`.

---

## Hintergrund (was schon da ist)

**Onboarding-Pipeline `POST /api/admin/quarters/[id]/onboard`** orchestriert seit Welle W4 (mini):
1. **Welle K1** — `resolveCityDomain(quartier.city)` — Auto-Discovery der Stadt-Domain
2. **Welle J** — `probeFeedUrls(domain)` — RSS/iCal-Discovery
3. **Welle H** — `discoverOepnvStopsForQuarter` — EFA-BW-Stop-Vorschlaege
4. **Welle W10** — `crawlEventFeeds` — initialer Event-Pull
5. **Welle K2** — `AmtsblattReprocess` Admin-UI fuer manuellen Re-Trigger

**Tabellen-Layout aktuell:**
- `doctor_profiles` (registrierte Aerzte mit `user_id`) — leer im Pilot
- `municipal_config.events` — Stadt-Events JSONB (read-only)
- `quartier_info_cache source='oepnv'` — Fahrplandaten

Die `doctor_profiles`-Tabelle hat **keine `org_id IS NULL`-Variante** fuer external/crawled-Eintraege. Daher: separater Speicher.

---

## Datenquellen-Optionen

| Quelle | Vorteile | Nachteile |
|---|---|---|
| **OpenStreetMap Overpass** (`amenity=doctors`, `amenity=hospital`, `healthcare=doctor`) | EU-Recht, kostenlos, Koordinaten, Fachgebiete teilweise gemappt; deckt Bad Saeckingen recht gut ab | Datenqualitaet variiert je Region, Fachgebiet-Tags nicht standardisiert |
| **KBV Arztsuche** (https://arztsuche.kbv.de) | Offiziell, vollstaendig, Fachgebiete sauber | Keine API, Scraping = AVV-Frage; ToS unklar |
| **BKG / KassenAerztliche Vereinigungen** | Offiziell, regional | Pro Bundesland anderes Format |

**Empfehlung Welle 1: OpenStreetMap.** Schnell anbindbar, kostenlos, kein AVV. Spaeter erweiterbar um KBV wenn Pilot-Validierung positiv.

---

## Schema-Vorschlag

Neue Tabelle `external_doctors`:

```sql
CREATE TABLE external_doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('osm', 'kbv', 'manual')),
  source_ref TEXT NOT NULL,  -- OSM node ID, KBV-ID etc.
  name TEXT NOT NULL,
  specialization TEXT[],     -- Fachgebiete normalisiert auf KBV-Liste
  address TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  distance_km DOUBLE PRECISION,   -- vom Quartier-Zentrum berechnet
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visible BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(quarter_id, source, source_ref)
);

CREATE INDEX idx_external_doctors_quarter ON external_doctors(quarter_id) WHERE visible = true;
CREATE INDEX idx_external_doctors_specialization ON external_doctors USING gin(specialization);

ALTER TABLE external_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY external_doctors_select ON external_doctors
  FOR SELECT USING (true);

CREATE POLICY external_doctors_insert_service ON external_doctors
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY external_doctors_update_service ON external_doctors
  FOR UPDATE USING (auth.role() = 'service_role');
```

---

## Implementation Tasks

### Task 1: Migration 194 — `external_doctors`-Tabelle

**Files:** `supabase/migrations/194_external_doctors.sql`

File-only; Apply auf Prod ist Rote Zone (Founder-Go).

### Task 2: OSM-Overpass-Client

**Files:**
- Create: `lib/doctors/osm-doctors-client.ts`
- Test: `lib/doctors/__tests__/osm-doctors-client.test.ts`

```ts
export async function fetchDoctorsFromOSM(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): Promise<OsmDoctorCandidate[]> {
  // Overpass-Query: amenity=doctors|hospital|clinic|healthcare im Bounding-Box
  // Parsing: Tags `name`, `addr:*`, `phone`, `website`, `healthcare:speciality`
  // Distance via lib/geo/haversine.ts
  // Rate-Limit: 1 req/sec (Overpass-Convention)
}
```

Tests: Mock Overpass-Response, validiere Parser + Distance.

### Task 3: Apply-Service — schreibt in `external_doctors`

**Files:**
- Create: `modules/doctors/services/doctor-discovery.service.ts`
- Test: `modules/doctors/__tests__/doctor-discovery.test.ts`

```ts
export async function discoverDoctorsForQuarter(
  adminDb: SupabaseClient,
  quarterId: string,
  centerLat: number,
  centerLng: number,
): Promise<DoctorDiscoveryReport> {
  // 1. OSM-Fetch via osm-doctors-client
  // 2. Normalisierung Fachgebiete (OSM-Tag → KBV-Begriffe)
  // 3. Upsert in external_doctors (per source+source_ref)
  // 4. last_seen_at aktualisieren bei bestehenden Eintraegen
  // 5. visible=false fuer Eintraege deren last_seen_at > 30 Tage alt
  // 6. Report: { inserted, updated, hidden, total }
}
```

### Task 4: Onboard-Route erweitern

**Files:** `app/api/admin/quarters/[id]/onboard/route.ts`

Schritt nach Welle W10 / vor Response:

```ts
const doctorReport = await discoverDoctorsForQuarter(
  adminDb,
  id,
  quarter.center_lat,
  quarter.center_lng,
);
report.doctors = doctorReport;
```

### Task 5: `/api/doctors`-Route auf external_doctors umstellen

**Files:** `app/api/doctors/route.ts`

Aktuell liest nur aus `doctor_profiles`. Ergaenzen: zusaetzlich `external_doctors` joinen + Datenquelle markieren.

Alternative: Frontend ruft `/api/doctors` UND `/api/external-doctors` und zeigt beide.

### Task 6: Frontend `/care/aerzte` — registrierte + external Aerzte zeigen

**Files:** `app/(app)/care/aerzte/page.tsx`

Anzeigelogik: Wenn `external=true`, Karte mit "Verzeichnis-Eintrag (OSM)"-Label, Termin-Buttons nur fuer registrierte Aerzte.

### Task 7: Cron-Refresh

**Files:**
- Create: `app/api/cron/doctors-refresh/route.ts`
- Add to `vercel.json` cron schedule (weekly)

Refresh aller Quartiere woechentlich. `last_seen_at` aktualisieren, alte als `visible=false` markieren.

### Task 8: Admin-UI — Manual-Refresh-Button (analog AmtsblattReprocess)

**Files:** `app/(app)/admin/components/DoctorsRefresh.tsx` + Tab-Integration in `admin/page.tsx`.

---

## Founder-Hand / Rote Zone

- Migration 194 Apply (Token: `MIG-194-APPLY-GO`)
- Cron-Schedule erweitern (`vercel.json` aendern → wirkt erst nach Deploy)
- OSM-Overpass-AVV pruefen (kein Personenbezug, aber ToS bestaetigen)

---

## Founder-Entscheidungen 2026-05-11

1. **Fachgebiet-Normalisierung: Whitelist (1a).** Mapping der 8 KBV-Begriffe auf bekannte OSM-Tags. Aerzte ohne erkennbares Fachgebiet werden zu "Allgemein" gemappt (Default-Bucket, sichtbar). Spaeter Admin-UI fuer manuelle Zuordnung.
2. **Termin-Buchung externer Aerzte: Telefon + Website (2b+c).** Senior sieht auf externen Karten `📞 Anrufen` (tel:-Link) und `🌐 Website`-Buttons. Termin-Buchung-Pfad nur fuer registrierte Aerzte sichtbar.
3. **Refresh-Intervall: beim Onboarding + monatlich (3a+c).** Sofortiger Pull bei Quartier-Erstellung, dann Cron 1x pro Monat. Vermeidet OSM-API-Stress, deckt Aenderungen ab.
4. **Sichtbarkeit: Badge oben rechts (4b).** "Verzeichnis"-Badge auf der Karte. Klein, klar, kein Senior-Stress.

---

## Out-of-Scope (separate Wellen)

- Termine-Buchung externer Aerzte
- Aerzte-Bewertungen aus externen Quellen
- KBV-Anbindung (Phase 2 nach Pilot-Validierung)
- Apotheken (separate Welle, analog `apotheken`-Feld in `municipal_config`)
