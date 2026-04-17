# Externe APIs fuer Nachbar.io — Recherche + Session-Uebergabe

**Datum:** 2026-04-16
**Autor:** Claude (reine Recherche, kein Code)
**Zielrepo:** `C:/Users/thoma/Documents/New project/nachbar-io`
**Ausgangs-HEAD:** `441ae77` (`Handle BW candidate confirmation flow`), lokal 5 Commits vor `origin/master`, **nichts gepusht, nichts deployed**
**Migration 156 auf Cloud:** angewendet und verifiziert (57/57 Haushalte `position_verified=true`)

---

## 0 · Architektur-Prinzip fuer alle neuen APIs (nicht verhandelbar)

Alle externen APIs, die hier bewertet werden, muessen **einheitlich** hinter der bestehenden Feature-Flag-Infrastruktur stehen:

- Tabelle: `feature_flags` (Migration 086)
- Felder: `key`, `enabled`, `required_roles`, `required_plans`, `enabled_quarters`, `admin_override`
- Admin-UI existiert bereits. Kein Hardcoding, kein `.env`-Flag, kein Code-Fork pro API.

**Vorschlag fuer neue Flag-Keys in dieser Welle:**

| Flag-Key | Deckt | Default |
|---|---|---|
| `NINA_WARNINGS_ENABLED` | NINA-Katastrophenwarnungen | `false` |
| `DWD_WEATHER_WARNINGS_ENABLED` | DWD-Unwetter/Hitze/Pollen | `false` |
| `UBA_AIR_QUALITY_ENABLED` | Umweltbundesamt Luftqualitaet | `false` |
| `DELFI_OEPNV_ENABLED` | DELFI-Abfahrten | `false` |
| `LGL_BW_BUILDING_OUTLINES_ENABLED` | Hausumringe-Layer | `false` |
| `OSM_POI_LAYER_ENABLED` | POIs in Quartierkarte | `false` |
| `BKG_GEOCODER_FALLBACK_ENABLED` | amtlicher Nicht-BW-Geocoder | `false` |
| `BFARM_DRUGS_ENABLED` | BfArM-Medikamenten-Lookup | `false` |
| `DIGA_REGISTRY_ENABLED` | DiGA-Verzeichnis | `false` |
| `GKV_CARE_REGISTRY_ENABLED` | GKV-Pflegedienst-Verzeichnis | `false` |

Jeder Flag-Key wird mit `enabled_quarters=[]` geseedet — erlaubt schrittweisen Rollout pro Quartier.

**Aufrufmuster (einheitlich, zwingend):**

```ts
// Server-seitig
const canUseNina = await checkFeatureAccess("NINA_WARNINGS_ENABLED", user);
if (!canUseNina) { /* 404 oder fallback */ }
```

Kein Code ausserhalb dieses Musters. Wenn ein Integrator das nicht respektiert, wird die PR abgewiesen.

---

## A · Warnungen & Sicherheit

### A1 · NINA (BBK — Bundesamt fuer Bevoelkerungsschutz)

| Kriterium | Wert |
|---|---|
| Endpunkt | `https://warnung.bund.de/api31/dashboard/{ARS}.json` (Amtl. Regional-Schluessel) |
| Backup-Endpunkt | `https://warnung.bund.de/api31/mapData.json`, `/api31/warnings/{id}.json` |
| Auth | keine |
| Rate-Limit | nicht dokumentiert, konservativ: 1 Request/Minute pro Quartier |
| Format | JSON, MoWaS/DWD/LHP als Sub-Provider |
| Kosten | kostenlos |
| DSGVO | trivial — nur Lesezugriff auf oeffentliche Warnungen, keine Nutzerdaten |
| Rechtliches | **Nutzungsbedingungen zu pruefen**: BBK erlaubt kommerzielle Nutzung unter Branding-Einschraenkungen. Quelle "Bundesamt fuer Bevoelkerungsschutz und Katastrophenhilfe (BBK)" muss erkennbar sein. Kein eigenes "Notfall"-Branding ueber NINA-Daten. |
| Integrationspunkt | Notfall-Banner + KI-News + Heartbeat-Eskalationskette |
| Empfehlung | **GO — niedriges Risiko, hoher Nutzen, trivial einbindbar** |

**Konkreter Fit:** Bad Saeckingen ARS = `08337007`. Fuer jedes Quartier einmal ARS auf `quarters` persistieren, Cronjob alle 10 Min pro aktivem Quartier abfragen, Treffer mit `severity >= Minor` in UI einblenden.

**Rechts-Flag:** Impressum/Datenschutz muss "Quelle: BBK NINA" nennen. Kein Schwarzlistungsrisiko erkennbar.

### A2 · DWD OpenData

| Kriterium | Wert |
|---|---|
| Endpunkt | `https://opendata.dwd.de/weather/alerts/cap/` (CAP-XML) |
| Alternative | `https://maps.dwd.de/geoserver/ows?...` (WMS/WFS) |
| Auth | keine |
| Rate-Limit | nicht dokumentiert, Kachel-Download; fairer Use-Pattern: Pull alle 5-10 Min |
| Format | CAP 1.2 XML, GeoJSON optional |
| Kosten | kostenlos |
| DSGVO | trivial |
| Rechtliches | **GeoNutzV** (Geodatenzugangsgesetz, BGBl. I 2013 S. 362). Quellenangabe Pflicht: "Deutscher Wetterdienst". Kommerzielle Nutzung ausdruecklich erlaubt. **Keine Kosten, keine Anwaltsprufung noetig** bei Quellenangabe. |
| Integrationspunkt | Hitzewarnung → Caregiver-Alert bei Seniorenstatus `red/yellow`; Pollen → KI-News Tags |
| Empfehlung | **GO — amtlich, kostenlos, rechtlich solide** |

**Senior-spezifisches Killer-Feature:** Hitzewarnung direkt an Heartbeat-Eskalation koppeln. Bei Hitze + kein Check-in seit 6h → Alert an Angehoerige. Das ist genau die Datenkombination, die bisher niemand macht.

### A3 · Umweltbundesamt Luftqualitaet

| Kriterium | Wert |
|---|---|
| Endpunkt | `https://www.umweltbundesamt.de/api/air_data/v2/` |
| Auth | keine |
| Rate-Limit | nicht dokumentiert, ~60 Req/h empfohlen |
| Format | JSON |
| Kosten | kostenlos |
| DSGVO | trivial |
| Rechtliches | Daten lizenziert unter **Datenlizenz Deutschland 2.0** (dl-de/by-2-0). Quelle "Umweltbundesamt" nennen. Kommerzielle Nutzung erlaubt. |
| Integrationspunkt | Zusatz-Card im Dashboard bei schlechter Luftqualitaet („Heute lieber drinnen spazieren") |
| Empfehlung | **SOFT GO** — nett, kein Killer-Feature. Nach NINA/DWD nachziehen. |

**Fazit A:** NINA + DWD sind **zwei sofort starten**. UBA nachreichen.

---

## B · OePNV

### B1 · DELFI (Durchgaengige Elektronische Fahrgastinformation)

| Kriterium | Wert |
|---|---|
| Endpunkt | `https://api.opendata.delfi.de/...` (REST) + GTFS-Dumps unter `https://gtfs.de/de/feeds/de_full/` |
| Auth | **Registrierung beim DELFI-Datenverbund noetig** (kostenlos, aber Nutzungsvertrag) |
| Rate-Limit | pro Vertrag individuell festgelegt |
| Format | GTFS, GTFS-Realtime, Trias |
| Kosten | grundsaetzlich kostenlos. **Aber:** NVBW Realtime-Feed im BW-Raum teils kostenpflichtig, je nach Anbieter |
| DSGVO | trivial fuer Abfragen ohne Nutzerkontext |
| Rechtliches | **Nutzungsvertrag pro Verbund**. Ein Vertrag mit DELFI reicht, aber einzelne Verkehrsverbuende (SBG/RVL/Badisch/VRN) haben zusaetzliche AGB. Anwalts-Check ratsam (~200-500 EUR Einmalpruefung fuer die Standard-AGB). |
| Integrationspunkt | Neue Komponente `TransitDepartureCard` in Quartierkarte, triggert pro Haltestelle |
| Empfehlung | **GO, aber erst nach NINA/DWD** — Vertragsaufwand, nicht trivial |

**Senior-Fit:** "Naechster Bus in 4 Min, Gleis 2" direkt auf Startseite ist einer der hochwertigsten Alltagswerte. Ersetzt bei vielen Senioren eine separate DB-Navigator-Nutzung.

**Alternative mit weniger Reibung:**

### B2 · marudor.de / db-rest

| Kriterium | Wert |
|---|---|
| Endpunkt | `https://v6.db.rest/`, `https://bahn.expert/api/...` |
| Auth | keine |
| Rate-Limit | best-effort |
| Kosten | kostenlos (privates Hobby-Projekt, kein SLA) |
| Rechtliches | **RISKANT** — scraped DB-Daten ohne offiziellen Vertrag. Fuer Produkt mit Zahlungsflow ist das nicht tragfaehig. |
| Empfehlung | **NO GO fuer Produktion** — nur fuer lokale Prototypen. |

**Fazit B:** DELFI-Vertragspfad ist die einzige saubere Loesung. Rechtsrisiko moderat (~500 EUR Pruefung). In aktueller Phase **zurueckstellen**, da 0 Pilotnutzer das Feature derzeit nicht rechtfertigen.

---

## C · Geodaten-Ausbau

### C1 · LGL-BW Hausumringe (WMS)

| Kriterium | Wert |
|---|---|
| Endpunkt | `https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_LGL-BW_ALKIS_Hausumringe?SERVICE=WMS&REQUEST=GetCapabilities` |
| Auth | keine |
| Rate-Limit | nicht dokumentiert, WMS-Tile-Raten empfohlen: ~10 Req/s client-side |
| Format | PNG-Tiles (WMS) oder GML (WFS) |
| Kosten | kostenlos fuer **nicht-kommerzielle** + gewerblich mit Nutzungsvereinbarung |
| DSGVO | trivial |
| Rechtliches | **GeobasisdatenNutzungsVO Baden-Wuerttemberg (GeoNutzV-BW)**. §4 regelt kommerzielle Nutzung. **Fuer Nachbar Plus (8,90 EUR/Monat) ist das kommerziell** und braucht **Anzeige beim LGL**. Kein Lizenzentgelt, aber Formular-Einreichung. Rechtlich safe, ~1 Tag Admin-Aufwand. |
| Integrationspunkt | Erweiterung von `LeafletMapInner.tsx` — zusaetzliches `TileLayer` ueber Basiskarte |
| Empfehlung | **GO** — perfekter Anschluss an heutigen Commit. Visueller Sprung + kein Rechtsgeld. |

### C2 · OSM Overpass API (POIs)

| Kriterium | Wert |
|---|---|
| Endpunkt | `https://overpass-api.de/api/interpreter` (oder Self-Host) |
| Auth | keine |
| Rate-Limit | **strikt**: max 2-3 parallele Queries pro IP, sonst 429. Public-Instanz **nicht** produktiv geeignet. |
| Format | XML/JSON |
| Kosten | kostenlos |
| DSGVO | trivial |
| Rechtliches | **ODbL 1.0 (Open Database License)**. Attribution-Pflicht "© OpenStreetMap contributors". **Copyleft** — wenn man OSM-Daten in eine eigene Datenbank uebernimmt und veroeffentlicht, muss diese Datenbank ebenfalls ODbL sein. **In-Memory-Cache + Einbettung in UI ist erlaubt**, aber: **POI-Datenexport an Dritte (z.B. CSV-Export im Pro-Portal) waere ODbL-problematisch.** |
| Integrationspunkt | Prefetch von Apotheken/Aerzten im Quartier, als JSON in `quarters.pois` persistieren (Snapshot) |
| Empfehlung | **GO mit Caveat** — Nur In-App-Nutzung, **keine Exporte** mit OSM-Daten. Public-Overpass meiden, stattdessen `overpass.kumi.systems` oder Self-Host. |

**Wichtig:** Die heutige Karte hat potenziell schon ein Compliance-Risiko, wenn OSM-Daten ueber `TileLayer` gecached werden und per CSV exportiert werden. Dieser Punkt sollte ohnehin geklaert werden, unabhaengig von Overpass.

### C3 · BKG Geocoder (amtlich, deutschlandweit)

| Kriterium | Wert |
|---|---|
| Endpunkt | `https://sg.geodatenzentrum.de/gdz_ortssuche__<UUID>` (UUID per Registrierung) |
| Auth | **UUID-Schluessel nach Registrierung** (kostenlos fuer "oeffentliche Nutzung", kostenpflichtig fuer kommerziell) |
| Rate-Limit | 5 Req/s, 10.000 Req/Tag fuer Basislizenz |
| Format | JSON |
| Kosten | **kommerzielle Lizenz: ab ~400 EUR/Jahr** (Staffelung nach Volumen) |
| DSGVO | trivial |
| Rechtliches | BKG-AGB + Geodatenzugangsgesetz. Vertrag mit BKG. |
| Integrationspunkt | Fallback fuer nicht-BW-Adressen in `lib/geocoding/` |
| Empfehlung | **WARTEN** — ~400 EUR/Jahr fuer 0 Nicht-BW-Nutzer ist nicht sinnvoll. Erst wenn Rheinfelden/Laufenburg-Pilot echte Nutzer hat. |

**Alternative fuer ausserhalb BW (kurzfristig):**

### C4 · Nominatim (OSM-basierter Geocoder)

| Kriterium | Wert |
|---|---|
| Endpunkt | `https://nominatim.openstreetmap.org/search` |
| Auth | keine |
| Rate-Limit | **1 Req/s max**, `User-Agent`-Pflicht |
| Kosten | kostenlos |
| Rechtliches | ODbL (siehe oben). **Kein Volumen-SLA**, Production-Einsatz nur mit Self-Host oder Kommerzanbieter (Maptiler). |
| Empfehlung | **SOFT GO fuer Pilot** — bis Nutzerzahl > 100 akzeptabel, dann auf Maptiler Geocoding wechseln (konsistent mit unseren Tiles). |

**Fazit C:** LGL-BW Hausumringe + OSM Overpass (mit Exportverbot) **jetzt starten**. BKG warten. Nominatim als Nicht-BW-Fallback einbauen, aber nur bis Pilot-Ende.

---

## D · Gesundheit/Pflege

### D1 · BfArM AMIce (Arzneimittel-Informationssystem)

| Kriterium | Wert |
|---|---|
| Endpunkt | `https://www.bfarm.de/SharedDocs/Downloads/DE/Arzneimittel/Pharmakovigilanz/IAM-AMIce.html` (Bulk-Download) + `https://amice.bfarm.de/` (Web-UI, kein offizielles REST) |
| Auth | keine |
| Rate-Limit | fuer Bulk-Downloads kein Limit. **Kein offizielles REST — Scraping-Risiko**. |
| Format | CSV/XML |
| Kosten | kostenlos |
| DSGVO | trivial |
| Rechtliches | Offene Gesundheitsdaten. Quellenangabe BfArM Pflicht. **Kein offizieller REST-Endpunkt** — wir muessten Bulk herunterladen und selbst indexieren. |
| Integrationspunkt | Lookup fuer Medikamentenplan (Arzt-Portal + Care-Modul) |
| Empfehlung | **SOFT GO** — sinnvoll, aber ETL-Aufwand (~2-3 Tage fuer Import-Pipeline), kein Killer-Feature ohne Interaktions-Checker. |

### D2 · DiGA-Verzeichnis (GKV-Spitzenverband)

| Kriterium | Wert |
|---|---|
| Endpunkt | `https://diga.bfarm.de/de/exports` (XML-Export) + `diga.bfarm.de/api/v1/diga` (inoffiziell) |
| Auth | keine |
| Rate-Limit | keiner bei Bulk |
| Format | XML/JSON |
| Kosten | kostenlos |
| DSGVO | trivial |
| Rechtliches | Amtlich, freie Nutzung. |
| Integrationspunkt | Arzt-Portal: Aerzte koennen DiGA per ID empfehlen |
| Empfehlung | **WARTEN** — 0 Aerzte im System. Erst wenn Pro Medical > 5 Aerzte hat. |

### D3 · GKV-Spitzenverband Pflegedienste

| Kriterium | Wert |
|---|---|
| Endpunkt | `https://www.pflegenavigator.de/bu/plugins/Pflegenavigator/api/search/...` (inoffiziell) oder Datentransparenzverfahren ueber GKV |
| Auth | fuer offiziellen Zugang: Vertrag mit GKV-Spitzenverband |
| Rate-Limit | inoffiziell strikt, offiziell pro Vertrag |
| Format | JSON (inoffiziell) |
| Kosten | offiziell kostenlos, aber **Vertrag** noetig |
| Rechtliches | **HIGH** — Pflegenavigator ist nicht als API zitierbar. Ohne Vertrag = Scraping-Risiko. |
| Integrationspunkt | Pflegedienst-Verzeichnis im Civic/Pro-Community-Portal |
| Empfehlung | **NO GO ohne Vertrag** — Scraping rechtlich gefaehrlich. |

### D4 · FHIR R4 / ePA-Standards

| Kriterium | Wert |
|---|---|
| Endpunkt | je nach Praxis-Verwaltungs-System (PVS) bzw. Gematik TI |
| Auth | SMC-B-Karte, TI-Konnektor, HBA |
| Kosten | **hoch** — TI-Zulassung ~10-30k EUR + laufend |
| Rechtliches | MDR, IEC 62304 Klasse B, DIGA-Schwelle |
| Empfehlung | **NO GO ohne Anwalt ADR-007** — bleibt im bestehenden Plan. Nicht Teil dieser Welle. |

**Fazit D:** Alle Gesundheitspfade **warten**. 0 Aerzte im System und ADR-007 blockiert Phase B. In dieser Welle nicht angehen.

---

## Rechtsrisiko-Matrix (Zusammenfassung)

| API | Lizenz/Vertrag | Einmalkosten | Laufende Kosten | Anwaltsbedarf |
|---|---|---|---|---|
| NINA | NutzBed BBK | 0 | 0 | keiner, Attribution reicht |
| DWD OpenData | GeoNutzV | 0 | 0 | keiner |
| UBA Luft | dl-de/by-2-0 | 0 | 0 | keiner |
| DELFI | Verbund-AGB | ~500 EUR Pruefung | 0 | ja, AGB-Check |
| LGL-BW Hausumringe | GeoNutzV-BW | 0 (Anzeige LGL) | 0 | optional, 200 EUR |
| OSM Overpass | ODbL | 0 | Self-Host ~10 EUR/Mo | **ja, Export-Frage klaeren** |
| BKG Geocoder | BKG-AGB | 0 | **~400 EUR/Jahr** | leicht |
| Nominatim | ODbL | 0 | 0 (self-host empf.) | siehe OSM |
| BfArM AMIce | offen | 0 | 0 | keiner |
| DiGA | offen | 0 | 0 | keiner |
| GKV Pflege | Vertrag | unklar | unklar | **ja, hoch** |
| FHIR/TI | MDR/TI | **10-30k EUR** | laufend | **zwingend (ADR-007)** |

**Gesamte Rechtskosten fuer die 3 GO-Kandidaten dieser Welle (NINA + DWD + LGL-Hausumringe):**
- Einmalig: ~0-200 EUR (optionale Pruefung OSM-Export + LGL-Anzeige)
- Laufend: 0 EUR
- Anwaltsaufwand: klein, nur Attribution-Prueflauf

Das ist der leichteste rechtliche Einstieg ueberhaupt. **Kein Grund, diese drei zu verzoegern.**

---

## Empfehlung: Welle 1 (jetzt umsetzbar, minimal rechtlich belastet)

| # | API | Flag | Nutzen | Aufwand |
|---|---|---|---|---|
| 1 | NINA | `NINA_WARNINGS_ENABLED` | hoch | 2-3 Tage |
| 2 | DWD Warnungen | `DWD_WEATHER_WARNINGS_ENABLED` | sehr hoch (Hitze+Senior) | 2-3 Tage |
| 3 | LGL-BW Hausumringe | `LGL_BW_BUILDING_OUTLINES_ENABLED` | mittel (Karten-Sprung) | 1 Tag |
| 4 | UBA Luftqualitaet | `UBA_AIR_QUALITY_ENABLED` | gering-mittel | 1 Tag |

**Welle 2 (nach Welle-1-Go-Live, 2. Session):**
- OSM Overpass POIs (mit Export-Rechts-Check)
- Nominatim Fallback-Geocoder

**Welle 3 (wartet auf Nutzerzahlen/Organisation):**
- DELFI OePNV (DELFI-Vertrag)
- BKG Geocoder (Kostenrechnung bei Nicht-BW-Skalierung)

**Nicht anfassen in diesem Halbjahr:**
- FHIR/TI/ePA (ADR-007-Block)
- GKV-Pflegedienst-API (Vertragsrisiko)
- DiGA (keine Aerzte)

---

## Claude vs. Codex — Wer macht was am besten?

### Tatsaechliche Agenten-Kombination in diesem Setup

| Agent | CLI | Modell-Variante |
|---|---|---|
| Claude | Claude Code | **Opus 4.6 (1M Context)** |
| Codex | `codex` Terminal-CLI | **GPT-5.4 xhigh reasoning** (hat GPT-5.3-Codex absorbiert) |

**Wichtig:** GPT-5.4 xhigh ist **nicht** GPT-5.3-Codex. GPT-5.4 hat Codex-5.3-Faehigkeiten in die Mainline integriert und ist bei xhigh reasoning **der persistenteste Agent fuer Multi-Step-Tool-Use**, den OpenAI bisher ausgeliefert hat. Deutlich staerker als die Codex-5.3-CLI, die in aelteren Vergleichen auftaucht.

### Benchmark-Stand April 2026 (fuer diese konkrete Kombination)

| Disziplin | Claude Opus 4.6 | GPT-5.4 xhigh | Gewinner |
|---|---|---|---|
| SWE-Bench Verified (Standard) | **80.8%** | ~80% | ≈ Gleichstand |
| SWE-Bench Pro (haerter, Multi-File) | ~45% | **57.7%** | **GPT-5.4 +12 Pkt** |
| Terminal-Bench (agentic coding) | 50% | **~60%** | **GPT-5.4 +10 Pkt** |
| OSWorld (Computer-Use) | — | **75%** (>Mensch-Baseline 72.4%) | **GPT-5.4** |
| GDPval (Knowledge Work) | 83%+ | **83%** | ≈ Gleichstand |
| Long-Context Retrieval (1M) | **76%** | ~65% | **Claude** |
| Multi-Step-Tool-Persistenz | hoch | **sehr hoch** („most persistent to date") | **GPT-5.4** |
| First-Pass-Accuracy (unabh.) | **95%** | ~88% | **Claude** |
| Latenz pro Task bei xhigh reasoning | mittel | **~1053s (hoch!)** | **Claude schneller** |
| Token-Effizienz pro Task | Basis | **guenstiger, aber xhigh reasoning hebt Kosten stark** | gemischt |

Quellen: Artificial Analysis GPT-5.4 vs Opus 4.6 · OpenAI GPT-5.4 Release · DataCamp Agentic-Vergleich · Portkey Vergleich · MindStudio · NxCode.

### Was das konkret verschiebt ggue. GPT-5.3 Codex

- **Codex ist jetzt staerker bei harten Multi-File-Tasks** (SWE-Bench Pro +12 Pkt ueber Claude). Frueher hatte Claude hier klaren Vorsprung — jetzt Gleichstand bis leichter Vorsprung Codex, wenn Codex wirklich xhigh-Modus nutzt.
- **Codex ist persistenter bei Multi-Step-Tool-Use** — kann also laengere Implementierungsketten ohne Zwischenfragen durchhalten.
- **Aber: xhigh-Modus ist teuer und langsam** (1053s/Task). Fuer Parser/Route-Boilerplate ist das Overkill.
- **Claude behaelt Vorsprung bei Long-Context Review** (76% vs ~65%) — relevant, wenn das gesamte Repo (3032+ Tests, 155+ Migrationen, 10 Portale) im Blick sein muss.

**Praktische Interpretation fuer diesen Handoff:**
- **Claude** bleibt erste Wahl fuer: Long-Context-Review, Rechts-/Architektur-Diskussion, Cross-Portal-Konsistenz, First-Pass-Code-Quality.
- **Codex GPT-5.4 xhigh** wird bevorzugt fuer: zusammenhaengende Multi-File-Implementation (weil Persistenz hoch), Terminal-lastige Tasks, komplexe Parser-Ketten mit WFS+CAP.
- **Nicht mehr gelten:** „Codex nur fuer Boilerplate" — xhigh kann auch anspruchsvolle Ketten.
- **Kostenwarnung:** Jedes xhigh-Task kostet merklich mehr als Claude-Sonnet-Task. Fuer triviale Einzel-Aenderungen `reasoning_effort` reduzieren (`high` statt `xhigh`).

### Task-fuer-Task-Zuordnung fuer Welle 1 (aktualisiert fuer GPT-5.4 xhigh)

| # | Task | Agent | Warum (Benchmarks + bisherige Session) |
|---|------|-------|------------------------------------------|
| 1 | Migration `157_external_api_flags.sql` (10 Flags + `quarters.bbk_ars`/`bw_ars`) | **Claude** | RLS-Policy-Design + Konsistenz mit Migration-Muster 086; First-Pass-Quality (95%) wichtig, weil Migration nicht revertierbar. Long-Context ueber alle 155 Migrationen. |
| 2 | Migration Datenmodell `external_warning_cache` + RLS | **Claude** | Architectural intent — Snapshots-Tabelle muss zu caregiver/org_admin/resident-Pattern passen. Long-Context-Review (Claude +11 Pkt). |
| 3 | Plan-Dokument `2026-04-17-nina-dwd-integration.md` | **Claude** | Strategische Schichtung (Vertical Slice, Gates, Risiken). Kein Code. |
| 4 | `lib/integrations/nina/client.ts` — REST-Client + Types | **Codex (xhigh)** | REST-Client mit Typen. xhigh-Persistenz + Terminal-Bench-Vorsprung (+10 Pkt) rechtfertigen Codex. |
| 5 | `lib/integrations/nina/cap-parser.ts` — CAP-XML-Parser | **Codex (xhigh)** | Parser-Ketten + Multi-Step-Tool-Use. xhigh ist „most persistent model to date". |
| 6 | `lib/integrations/dwd/client.ts` + `cap-parser.ts` | **Codex (xhigh)** | Identisches Muster zu NINA — xhigh kann NINA + DWD in einer Kette abarbeiten (Persistenz-Vorteil). |
| 7 | `lib/integrations/lgl-bw-outlines/` — WMS-TileLayer-Hook | **Codex (xhigh)** **verschoben von Claude** | Aendert ggue. alter Zuordnung: xhigh hat +12 Pkt auf SWE-Bench Pro (Multi-File), und LGL-WFS ist ein eng gekoppeltes Muster, das Codex in diesem Repo bereits via Commit `6cb319d` gezeigt hat. Claude reviewt danach. |
| 8 | API-Routen `/api/warnings/nina/`, `/api/warnings/dwd/`, `/api/warnings/uba/` | **Codex (xhigh, reasoning=high reicht)** | Route-Boilerplate mit `checkFeatureAccess`-Wrapper. xhigh waere Overkill, `high` reasoning reicht. |
| 9 | Cronjob-Config `vercel.json` + Scheduled-Task-Handler | **Codex (xhigh)** | Terminal-Bench-Domaene. Vercel-Cron-Syntax + Batch-Fetcher-Logik. |
| 10 | Vitest fuer Parser (beide) + Client-Mocks | **Codex (reasoning=medium/high)** | Test-Boilerplate. xhigh ist hier verschwendet. |
| 11 | UBA-Luftqualitaet Client + Route | **Codex (high)** | Kleinste Integration, Boilerplate. |
| 12 | Frontend: Hitze+Heartbeat-Eskalations-Trigger | **Claude** | Cross-Modul-Denken (DWD × Heartbeat × Caregiver-Alert × 2-stufige Eskalation aus Migration 154). Repo-weite Architektur — Claude Long-Context-Vorsprung. |
| 13 | Frontend: Warnbanner-Komponente + Attribution-Footer | **Codex (high)** | Standard React-Komponente, klar gekapselt. |
| 14 | Admin-UI: Toggle fuer 10 neue Flags in `nachbar-admin` | **Codex (xhigh)** **verschoben von Claude** | Aendert ggue. alter Zuordnung: nachbar-admin ist eigenstaendig (pattern match zu existing admin pages), Codex-Persistenz reicht. Claude reviewt danach. |
| 15 | Integration-Review aller neuen Routen (RLS + `checkFeatureAccess` + Attribution) | **Claude** | 95% First-Pass + Long-Context = weniger Security-Miss. Kritischer Schritt, nicht an xhigh delegieren — xhigh ist persistent, aber First-Pass-Quality-Gap (7 Pkt) ist bei Security real. |
| 16 | Rechts-Pruefung: NINA-Attribution-Formulierung, LGL-Anzeige-Formular | **Claude** | Deutsche Rechtstexte, Long-Context 76% vs 65%. |
| 17 | Manuelle Verifikation Bad Saeckingen + Founder-Review | **Mensch** | — |

**Aktualisierte Verteilung (GPT-5.4 xhigh macht mehr Code):**
- **Claude**: 1, 2, 3, 12, 15, 16 (**6 Tasks** — reine Architektur/Plan/Review/Recht)
- **Codex GPT-5.4 xhigh**: 4, 5, 6, 7, 8, 9, 10, 11, 13, 14 (**10 Tasks** — Clients/Parser/Routes/UI)
- **Mensch**: 17

**Gegenueber GPT-5.3-Codex-Annahme zwei Tasks verschoben:** Task 7 (LGL-Outlines) und Task 14 (Admin-UI). Grund: xhigh-Persistenz + SWE-Bench-Pro-Vorsprung.

**Reasoning-Effort-Empfehlung pro Task:**
- `xhigh`: Tasks 4-7, 9, 14 (zusammenhaengende Multi-File-Ketten)
- `high`: Tasks 8, 11, 13 (Boilerplate)
- `medium`: Task 10 (Tests)

### Arbeitsreihenfolge mit Agent-Wechsel (GPT-5.4 xhigh)

```
Phase A (Claude, sequentiell):         Tasks 1 → 2 → 3
   └─ Plan + Migrations-Entwuerfe + Datenmodell. Founder-Go abwarten.

Phase B (Codex xhigh, lange Implementierungskette):
   Tasks 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 13 → 14
   └─ xhigh-Persistenz ausnutzen: Codex arbeitet die gesamte
      NINA/DWD/UBA/LGL-Outlines/Admin-UI-Kette in einer oder
      zwei langen Sessions durch. Reasoning-Effort pro Task
      anpassen (xhigh vs high vs medium — siehe Empfehlung).

Phase C (Claude, sequentiell):         Task 12
   └─ Cross-Modul-Trigger (DWD × Heartbeat × Caregiver).
      Kritisch, nicht delegieren.

Phase D (Claude, sequentiell):         Tasks 15 → 16
   └─ Integration-Review + Rechts-Check. 95%-First-Pass-Vorteil
      ist hier entscheidend.

Phase E (Mensch):                      Task 17
   └─ Manuelle Verifikation + Founder-Freigabe.
```

**Wann welche Agenten-CLI starten:**
- **Claude Code**: Phase A (3 Tasks), Phase C (1 Task), Phase D (2 Tasks)
- **Codex CLI (`codex` Terminal)**: Phase B (10 Tasks)
- Schaetzung: Phase B laeuft fuer Codex als 1-2 lange xhigh-Sessions, Claude-Phasen jeweils kurz.

**Faustregel fuer Quality-Gate:**
Codex GPT-5.4 xhigh bringt den Code hin, Claude reviewt. Auch wenn xhigh persistent ist: **First-Pass-Accuracy ist 88% vs Claudes 95%** — bei Security-Code (RLS, `checkFeatureAccess`-Wrapper, Attribution-Pflicht) ist das eine real spuerbare Luecke. Kein Merge nach Master ohne Claude-Review mit Skill `superpowers:receiving-code-review`.

**Kostenwarnung:**
Codex xhigh kostet pro Task signifikant mehr als Claude-Sonnet. Fuer Tasks 8, 10, 11, 13 ist `reasoning_effort=high` (oder `medium` bei Tests) voellig ausreichend. xhigh nur fuer lange Ketten (4-7, 9, 14).

---

## Session-Uebergabe an die naechste Session

**Zielrepo:** `C:/Users/thoma/Documents/New project/nachbar-io`
**Branch:** `master`
**HEAD:** `441ae77` (lokal 5 Commits vor `origin/master`, **nicht gepusht**)

**Bereits abgeschlossen in dieser Session:**
- Migration 156 (`household_position_metadata`) auf Cloud-Supabase `uylszchlyhbpbmslcnka` angewendet + verifiziert.
- Backfill 57 Bestandshaushalte auf `position_source='manual_svg_legacy'`, `verified=true`.
- Resolve-Candidate-Flow (Commit `441ae77`): `findNearestLglBwAddress()` + Candidate-Response + UI-Confirm-Branch, 10/10 Tests gruen.
- Dieses Recherche-Dokument angelegt.

**Noch offen im Worktree (nicht committed):**
- `docs/plans/2026-04-15-session-handoff.md` (Codex-UserEdit)
- `docs/plans/2026-04-16-bw-house-coordinates-implementation-plan.md` (heute angelegt)
- `docs/plans/2026-04-16-codex-claude-handoff.md` (von dir gestellt)
- `docs/plans/2026-04-16-external-apis-research-handoff.md` (dieses Dokument)

**Nicht committen:** `.playwright-cli/`, `output/`

---

### Arbeitsreihenfolge fuer die naechste Session (Welle 1)

Detaillierte Task-Aufteilung siehe Abschnitt „Task-fuer-Task-Zuordnung" oben.
Hier nur die Phasen-Uebersicht:

| Phase | Agent | Tasks | Kurzbeschreibung |
|-------|-------|-------|------------------|
| A | **Claude** | 1, 2, 3 | Migration-Entwuerfe + Plan-Dokument `2026-04-17-nina-dwd-integration.md`. **Founder-Go abwarten** bevor Phase B startet. |
| B | **Codex GPT-5.4 xhigh** | 4, 5, 6, 7, 8, 9, 10, 11, 13, 14 | Gesamte Implementation: NINA + DWD + UBA + LGL-Outlines + Routes + Cron + Tests + Warnbanner + Admin-UI. Persistenz-Vorteil nutzen, in 1-2 langen Sessions. Reasoning-Effort pro Task (xhigh vs high vs medium). |
| C | **Claude** | 12 | Hitze-×-Heartbeat-Eskalations-Trigger (Cross-Modul). |
| D | **Claude** | 15, 16 | Integration-Review + Rechts-Pruefung. |
| E | **Mensch** | 17 | Manuelle Verifikation Bad Saeckingen + Commit, **nicht pushen**. |

---

### Offene Founder-Fragen vor Code-Start

1. **LGL-BW-Anzeige:** Wer schreibt das Nutzungsanzeige-Formular an LGL (kein Geld, aber 1 Tag Admin)? Thomas oder Anwalt?
2. **NINA-Attribution:** Darf "Quelle: BBK" klein in Fusszeile stehen oder braucht es eigenen Legal-Bereich?
3. **Cronjob-Budget:** Pro Quartier alle 10 Min = 144 Req/Tag. Bei 50 Quartieren = 7.200 Req/Tag = innerhalb Vercel Hobby. Aber DWD nutzt 3 Endpunkte → x3. Fuer > 100 Quartiere braucht es Batch-Fetcher. Jetzt schon bauen oder spaeter?
4. **OSM-Exportfrage** (Welle 2): darf der Marktplatz-CSV-Export POIs-Daten enthalten, die aus OSM kommen? **Anwalt ratsam**. Fuer Welle 1 irrelevant.
5. **Welle 2/3-Priorisierung:** erst OSM POIs oder erst DELFI OePNV? Hangt an Pilot-Feedback.

---

## STARTSATZ fuer die naechste Session

### Wenn du mit Claude startest (Phase A — Plan + Migration + Review):

> Arbeite in `C:/Users/thoma/Documents/New project/nachbar-io` auf `master` weiter. HEAD ist `441ae77`, lokal 5 Commits vor `origin/master`, nichts gepusht oder deployed. Lies `docs/plans/2026-04-16-external-apis-research-handoff.md` als massgebliche Uebergabe. Fuehre **Phase A** aus: Migration `157_external_api_flags.sql` entwerfen, Datenmodell `external_warning_cache` entwerfen, Plan-Dokument `docs/plans/2026-04-17-nina-dwd-integration.md` schreiben. Keine Migration anwenden, kein Code fuer Codex-Tasks. Nach Phase A halte an und berichte. `.playwright-cli/` und `output/` nicht committen.

### Wenn du nach Phase-A-Go zu Codex (GPT-5.4 xhigh) wechselst (Phase B — komplette Implementation):

> Arbeite in `C:/Users/thoma/Documents/New project/nachbar-io` auf `master` weiter. Lies `docs/plans/2026-04-16-external-apis-research-handoff.md` und `docs/plans/2026-04-17-nina-dwd-integration.md`. Setze **Phase B komplett um**: Tasks 4, 5, 6, 7, 8, 9, 10, 11, 13, 14 aus der Task-Tabelle. Konkret: `lib/integrations/nina/` + `lib/integrations/dwd/` + `lib/integrations/lgl-bw-outlines/` (Clients + Parser + Leaflet-Hook + Vitest), `/api/warnings/{nina,dwd,uba}/` Routen mit `checkFeatureAccess`-Wrapper, UBA-Client, Vercel-Cronjob-Config, Warnbanner-Komponente, Admin-UI-Toggles fuer die 10 neuen Flags in `nachbar-admin`. Reasoning-Effort pro Task variieren: xhigh fuer 4-7, 9, 14; high fuer 8, 11, 13; medium fuer 10. Tasks 12, 15, 16 NICHT anfassen — die macht Claude. Nichts pushen. `.playwright-cli/` und `output/` nicht committen.

### Kurzsatz-Alternative (wenn du Agent frei waehlen willst):

> Lies `docs/plans/2026-04-16-external-apis-research-handoff.md`, Abschnitt „Task-fuer-Task-Zuordnung" und „Arbeitsreihenfolge". Fuehre deine zugewiesenen Tasks fuer Welle 1 aus. Nichts pushen, keine fremden Tasks anfassen.

---

## Anhang: Kosten-/Rechtsampel auf einen Blick

```
GO        (kein Blocker, geringes Risiko)
SOFT GO   (sinnvoll, aber warten auf Nutzerbase)
WARTEN    (Vertrag/Kosten rechtfertigen sich erst bei Skalierung)
NO GO     (Rechtsrisiko zu hoch ohne Vertrag)

GO       NINA                       (A1)
GO       DWD OpenData               (A2)
GO       UBA Luftqualitaet          (A3)
WARTEN   DELFI OePNV                (B1) — DELFI-Vertrag + 500 EUR Anwalt
NO GO    marudor.de                 (B2) — Scraping
GO       LGL-BW Hausumringe         (C1)
GO*      OSM Overpass POIs          (C2) — mit Export-Verbot
WARTEN   BKG Geocoder               (C3) — 400 EUR/Jahr
SOFT GO  Nominatim Fallback         (C4) — nur Pilot
SOFT GO  BfArM AMIce                (D1) — kein REST, ETL-Aufwand
WARTEN   DiGA-Verzeichnis           (D2) — 0 Aerzte
NO GO    GKV Pflegedienst-API       (D3) — Vertragsrisiko
NO GO    FHIR/TI/ePA                (D4) — ADR-007-Block
```
