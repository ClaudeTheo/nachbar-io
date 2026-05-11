# Quartier-Info-Skalierungs-Plan: Auto-First

**Datum:** 2026-05-04
**Ausloeser:** Quartier-Info-Seite zeigt Empty-States bei Apotheken/Veranstaltungen/Rathaus fuer Bad Saeckingen. Founder will Skalierung auf andere Staedte, **so weit wie moeglich automatisiert**.
**Pre-Check abgeschlossen:** Infrastruktur existiert groesstenteils schon (siehe Sektion 1).

## 1. Was bereits da ist

| Komponente | Pfad | Status |
|---|---|---|
| `municipal_config` Tabelle (JSONB-Felder pro Quartier) | Mig in Baseline | ✅ Schema existiert |
| `quartier_info_cache` (Wetter/Pollen/NINA-Cache) | `supabase/migrations/118_quartier_info_hub.sql` | ✅ |
| `quartier-info.service.ts` (liest aus `municipal_config`) | `lib/services/quartier-info.service.ts` | ✅ Funktioniert |
| Bad-Saeckingen-Link-Normalisierung | `lib/municipal.ts` `normalizeBadSaeckingenLinks()` | ✅ |
| Wetter-Sync (Open-Meteo) | `modules/info-hub/services/weather-client.ts` | ✅ Skaliert auto |
| Pollen-Sync | `modules/info-hub/services/pollen-client.ts` | ✅ Skaliert auto |
| NINA-Sync (Bevoelkerungsschutz) | `app/api/cron/nina-sync/route.ts` | ✅ Skaliert auto |
| DWD-Wetterwarnungen | `app/api/cron/external-warnings/route.ts` | ✅ Skaliert auto |
| UBA-Luftqualitaet | `app/api/cron/external-warnings/route.ts` | ✅ Skaliert auto |
| OEPNV-Sync (DELFI) | `modules/info-hub/services/oepnv-client.ts` | ✅ Skaliert auto |
| Amtsblatt-Sync | `app/api/cron/amtsblatt-sync/route.ts` | ✅ existiert |
| OSM Overpass-API-Anbindung | `lib/map-geo.ts:70` `OVERPASS_URL` | ✅ Adapter da, nicht fuer POIs genutzt |
| `quartier-info-sync` Cron (Stuendlich) | `app/api/cron/quartier-info-sync/route.ts` | ✅ Wetter + Pollen |

## 2. Was fehlt fuer Multi-Stadt-Skalierung

| Datentyp | Aktueller Stand | Lueckenanalyse |
|---|---|---|
| **Apotheken** | `municipal_config.apotheken` JSONB-Feld leer | Kein Auto-Sync. Overpass-API existiert aber wird nicht fuer `amenity=pharmacy` genutzt |
| **Veranstaltungen** | `municipal_config.events` JSONB-Feld leer | `amtsblatt-sync` schreibt ins Civic-Portal-Modul, nicht in `municipal_config.events`. Kein zentraler Events-Aggregator pro Quartier |
| **Rathaus & Services** | `municipal_config.service_links` leer (ausser Bad Saeckingen) | Kein Auto-Generator aus Gemeinde-Stammdaten. Manuell pro Stadt |
| **Notdienst-Apotheken** | `municipal_config.notdienst_url` leer | Kein Auto-Lookup pro PLZ aus Apothekerverband-API |
| **Multi-Quartier in einer Stadt** | Pro `quarter_id` eine `municipal_config`-Zeile | Funktioniert, aber 3 Quartiere in Bad Saeckingen = 3x dieselbe Stadt-Info pflegen → Redundanz |

## 3. Auto-First-Tier-Modell

Drei Tiers, von hoechster zu niedrigster Automatisierung:

### Tier 0 — 100% Auto (kein Mensch noetig)

| Daten | Quelle | Refresh |
|---|---|---|
| Wetter | Open-Meteo (free) | stuendlich (existiert) |
| Pollen | DWD/Stiftung Pollen | taeglich (existiert) |
| NINA-Warnungen | Bevoelkerungsschutz-API | 5-Minuten (existiert) |
| DWD-Unwetter | DWD-API | 15-Minuten (existiert) |
| UBA-Luftqualitaet | UBA-API | stuendlich (existiert) |
| OEPNV-Abfahrten | DELFI/Mentz | live (existiert) |
| **Apotheken** | **OSM Overpass `amenity=pharmacy` im Quartier-Polygon** | **woechentlich (NEU)** |
| **Aerzte/Krankenhaus** | **OSM Overpass `amenity=doctors\|hospital`** | **woechentlich (NEU, optional)** |
| **Notdienst-Apotheken** | **apotheken.de API ueber PLZ** | **stuendlich (NEU)** |

### Tier 1 — Halb-Auto (Crawler + Validierung)

| Daten | Quelle | Refresh |
|---|---|---|
| **Veranstaltungen** | **Stadt-RSS / iCal-Kalender automatisch suchen, Standard-URLs probieren (`/veranstaltungen.rss`, `/events.ics`, `/termine`)** | **taeglich (NEU)** |
| **Rathaus-Links Default-Set** | **Auto-Generator aus PLZ + Gemeindename: Buergerbuero, Standesamt, Muellabfuhr, KSK, Tourismus, Stadtwebsite. Pattern: `https://www.{stadt}.de/buergerbuero` etc.** | **einmalig beim Stadt-Onboarding (NEU)** |
| Amtsblatt | Existiert, in `civic_amtsblatt_entries` | woechentlich |

### Tier 2 — Manueller Override (Founder/Admin via UI)

| Daten | Wer | Wann |
|---|---|---|
| Falsche OSM-Daten korrigieren | Admin via `/admin/quartiere/[id]` | Bei Bedarf |
| Auto-generierte Rathaus-Links anpassen falls Stadt-URL anders ist | Admin | Bei Stadt-Onboarding falls Default daneben liegt |
| Spezielle lokale Veranstaltungen | Admin oder Stadt-Vertreter (Pro-Community-Rolle) | Bei Bedarf |

## 4. Onboarding-Flow neue Stadt: von 0 auf 80% in 30 Minuten

**Eingabe vom Founder/Admin:** PLZ + Stadtname + Quartier-Polygon (z.B. via Karten-Tool gezeichnet, oder PLZ-Bezirk als Default).

**Auto-Schritte (alle in einem Cron-Job `onboard-quartier`):**

1. **Quartier-Datensatz anlegen** (`quarters`-Tabelle) mit `geo_boundary` (PostGIS-Polygon)
2. **Gemeinde-Stammdaten holen** aus oeffentlicher Quelle (z.B. `openplzapi.org` — kostenlos, Bundes-DB):
   - Gemeindename, Buergermeister-Name, Stadt-Domain (z.B. `bad-saeckingen.de`)
3. **`municipal_config`-Zeile anlegen** mit Default-Templates:
   - `service_links` = Default-Set fuer "deutsche Stadt": `https://www.{domain}/buergerbuero`, `/standesamt`, `/muellabfuhr` etc.
   - Falls 404 → Skip-Liste, Admin korrigiert spaeter
4. **OSM-Apotheken-Sync** triggern fuer das Polygon → fuellt `municipal_config.apotheken`
5. **OSM-Aerzte-Sync** triggern (optional) → `municipal_config.aerzte`
6. **Stadt-Events-Crawler** versucht Standard-URLs:
   - `https://www.{domain}/veranstaltungen.rss`, `/events.ics`, `/termine.rss`
   - Falls Treffer → in `municipal_config.events_calendar_url` speichern
7. **Notdienst-Apotheken-API** mit PLZ initialisieren → speichert URL
8. **OEPNV-Stops-Vorschlag** aus DELFI im Quartier-Polygon → top 5 Haltestellen vorgeschlagen
9. **Wetter/Pollen/NINA/UBA** laufen automatisch (Cron sieht neues Quartier)

**Ergebnis nach 30 Minuten:** Quartier ist mit ~80% Daten gefuellt. Was uebrig bleibt:
- Falsche/nicht-existente URLs aus Default-Set → Admin loescht oder korrigiert (5-10 Min)
- Spezifische lokale Events die nicht im RSS sind → Admin pflegt manuell oder bleibt leer

## 5. DB-Schema-Erweiterungen (minimal)

**Neue Migration `188_quartier_data_sources.sql`** (file-first, Founder-Go fuer Apply):

```sql
-- 1. Erweitere municipal_config um Auto-Sync-Metadaten
alter table public.municipal_config
  add column if not exists auto_sync_status jsonb default '{}'::jsonb,
  add column if not exists last_synced_at jsonb default '{}'::jsonb,
  add column if not exists data_source jsonb default '{}'::jsonb;

-- auto_sync_status: { "apotheken": "ok", "events": "ok", "rathaus": "manual" }
-- last_synced_at: { "apotheken": "2026-05-04T10:00:00Z", ... }
-- data_source: { "apotheken": "osm-overpass", "events": "rss", "rathaus": "default-template" }

-- 2. Stadt-Onboarding-Log (fuer Admin-UI + Debug)
create table if not exists public.quartier_onboarding_log (
  id              bigserial primary key,
  quarter_id      uuid not null references public.quarters(id) on delete cascade,
  step            text not null,
  status          text not null check (status in ('ok', 'partial', 'failed', 'manual')),
  details         jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists quartier_onboarding_log_quarter_idx
  on public.quartier_onboarding_log (quarter_id, created_at desc);

alter table public.quartier_onboarding_log enable row level security;

create policy "Admin reads onboarding log"
  on public.quartier_onboarding_log for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and is_admin = true
    )
  );
```

**Keine Aenderung an `quartier_info_cache`** — das funktioniert wie es ist.
**Keine Aenderung an `municipal_config.apotheken|events|service_links` JSONB-Schema** — Service liest die schon korrekt.

## 6. Cron-Architektur (Erweiterung bestehender Cron)

**Neue Cron-Routen:**

| Route | Frequenz | Zweck |
|---|---|---|
| `/api/cron/osm-poi-sync` | woechentlich (Sonntag 03:00) | Apotheken/Aerzte aus Overpass fuer alle aktiven Quartiere |
| `/api/cron/quartier-events-sync` | taeglich (06:00) | RSS/iCal-Crawler fuer Quartier-Events |
| `/api/cron/notdienst-apotheken-sync` | stuendlich | Notdienst-Apotheken pro PLZ |

**Erweiterung bestehender Cron:**

`/api/cron/quartier-info-sync` (existiert) bekommt zusaetzlich:
- Onboarding neuer Quartiere automatisch erkennen (`auto_sync_status` leer + `quarters.is_active=true`) → triggert Onboarding-Pipeline

**Alle neuen Cron nutzen** `Bearer ${CRON_SECRET}`-Pattern aus existierender Infrastruktur. Keine neuen Secrets.

## 7. Codex-Wellen-Plan

| Welle | Inhalt | Aufwand |
|---|---|---|
| **W1** | OSM-POI-Sync (Apotheken + optional Aerzte) — `/api/cron/osm-poi-sync` + Service in `modules/info-hub/services/osm-poi-client.ts` | ~3-4 h, TDD-first |
| **W2** | Stadt-Events-Crawler — RSS/iCal-Probe, Standard-URLs, Fallback-Liste — `/api/cron/quartier-events-sync` | ~4-6 h, TDD-first |
| **W3** | Default-Rathaus-Generator — `lib/municipal-defaults.ts` mit Pattern-Generator + `openplzapi.org`-Adapter | ~3-4 h, TDD-first |
| **W4** | Stadt-Onboarding-Pipeline — `/api/admin/quartiere/onboard` API + Admin-UI | ~6-8 h, TDD-first |
| **W5** | Mig 188 + Auto-Sync-Status + Admin-Dashboard fuer Datenpflege-Status | ~3-4 h |
| **W6 (optional)** | Notdienst-Apotheken-Sync via apotheken.de API | ~2-3 h |

**Gesamt:** ~21-29 h Codex-Arbeit. Bei einer Codex-Welle pro Tag = 1 Woche.

**Reihenfolge:** W1 zuerst (groesster Pilot-Mehrwert: Bad Saeckingen sieht Apotheken auto), dann W3 (Rathaus-Defaults), dann W2 (Events), dann W4+W5 (Onboarding-Pipeline + Admin-Dashboard), dann W6 (Notdienst).

## 8. Skalierungs-Math

| Stadt-Anzahl | Onboarding-Aufwand pro Stadt nach W1-W4 | DB-Storage | Cron-Last |
|---|---|---|---|
| 1 (Bad Saeckingen) | 30 Min Founder + 0 Min Auto | ~1 KB pro Quartier | vernachlaessigbar |
| 10 | ~5 Min Admin pro Stadt + Auto | ~10 KB | <1% Cron-Quota |
| 100 | ~5 Min Admin pro Stadt + Auto | ~100 KB | ~5% Vercel-Cron-Quota (Hobby), oder Self-Hosted-Cron |
| 1000 | ~5 Min Admin pro Stadt + Auto | ~1 MB | Vercel Pro Cron noetig oder Worker-Queue |

**Bottleneck bei 100+ Staedten:** Vercel-Cron hat Limits. Loesung: Worker-Queue (z.B. Inngest oder Trigger.dev) oder Self-Hosted-Cron auf billigem VPS. Nicht im aktuellen Scope.

## 9. Was Founder-Hand bleibt (immer)

Auch nach voller Auto-Sync-Implementierung bleibt manuelles Admin-Eingreifen fuer:

1. **Stadt aktivieren** (Admin entscheidet ob neue Stadt gestartet wird)
2. **Quartier-Polygon korrigieren** falls Auto-Detect aus PLZ daneben liegt
3. **Default-Rathaus-Links pruefen** falls Stadt-Domain anders als `www.{stadt}.de` ist
4. **Lokale Events kuratieren** die nicht im RSS sind (Pro-Community-Rolle uebernimmt das idealerweise pro Stadt)
5. **Falsche OSM-Eintraege loeschen** (selten, aber kommt vor — z.B. eine "Apotheke" die in Wirklichkeit ein Geschaeft ist)

## 10. Empfehlung an Founder

**Heute kein Code-Touch noetig.** Wir koennen zwei Varianten machen:

### Variante A: Schnell-Pflaster fuer Pilot (1 Stunde Codex)

Codex schreibt einen Seed-Skript der die `municipal_config`-Zeile fuer Bad Saeckingen mit den ~5 Apotheken, ~5 Rathaus-Links und 0-3 manuell eingegebenen Events fuellt. **Sofort sichtbar, aber nicht skalierbar.**

### Variante B: Skalierbare Pipeline bauen (1 Woche Codex)

W1-W5 in der Reihenfolge oben. Nach W1 ist Bad Saeckingen automatisch mit Apotheken gefuellt. Nach W3 mit Rathaus-Links. Nach W4 koennen wir eine zweite Stadt in 30 Min onboarden.

**Empfehlung:** Variante A NICHT machen. Direkt B starten. Begruendung:
- Variante A ist 1 h Wegwerf-Arbeit
- Variante B liefert nach 4 h (W1) bereits den gleichen sichtbaren Effekt fuer Bad Saeckingen
- Plus skalierbar fuer Stadt 2/3/4

## 11. Risiken / typische Stolperfallen

1. **OSM-Daten-Qualitaet schwankt** — auf dem Land sind manchmal Apotheken nicht in OSM. Loesung: Admin kann manuell Apotheken nachpflegen, Auto-Sync ueberschreibt manuelle Eintraege NICHT (Quelle-Markierung in `data_source`-JSONB).
2. **Stadt-Domains sind nicht standardisiert** — Bad Saeckingen ist `www.bad-saeckingen.de`, manche Staedte haben `gemeinde-xy.de` oder `www.xy-rhein.de`. Default-Generator wird haeufig 404 liefern. Loesung: Admin-UI zeigt klare Liste "11 Default-Links generiert, 3 davon 404 — bitte korrigieren".
3. **Datenschutz bei OEPNV/Notdienst-Apotheken** — externe APIs muessen geprueft werden ob sie DSGVO-konform sind. DELFI ist deutsche Behoerde → OK. apotheken.de ist Verband → vermutlich OK, aber AVV pruefen.
4. **Cron-Last bei 100+ Staedten** — siehe Sektion 8. Vor Skalierung Worker-Queue evaluieren.

## 12. Naechster konkreter Schritt

Founder entscheidet: Variante A (Pflaster) oder B (Pipeline)?

Bei B: Codex startet mit W1 (OSM-POI-Sync) sobald Founder-Go fuer "neue Welle starten" gegeben.

**Pre-Check vor Codex-Welle pflicht:** `grep -rEn "osm|overpass|amenity=pharmacy" lib/ modules/ app/` — gegen Duplikat zu `lib/map-geo.ts:70` absichern.
