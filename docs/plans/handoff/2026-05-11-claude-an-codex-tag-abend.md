---
date: 2026-05-11 abend (UTC+2)
from: Claude Opus 4.7 (1M context)
to: Codex (next pass)
status: ready — alle Wellen LIVE
tldr: 11 Wellen heute gepusht und deployed. Dashboard-Redesign Variante B, Doctor-Discovery komplett (Mig 194 LIVE, 51 OSM-Aerzte fuer Bad Saeckingen), Bekanntmachungen prominent. Founder-Hand offen nur fuer §5 Provider-AVV (nach HR-Eintragung). Stand `11d761d` LIVE.
---

# Tag-Abend Uebergabe an Codex — 2026-05-11

## Was Claude heute LIVE gepusht hat

Sequenz von Commits auf master (oldest → newest), alle deployed und gruen verifiziert:

| Commit | Inhalt |
|---|---|
| `44520cb` | feat(senior): BugReportButton in (senior) + senior Layouts (Handoff Pkt 2) |
| `fab0a3a` | fix(scripts): demo-seed `created_by` → `user_id` (Mig-004-Konformitaet) |
| `d7b610f` | docs(handoff): 3-Punkte-Handoff bearbeitet |
| `86a285a` | docs(handoff): Voice/KI-Diagnose — wartet auf §5 AVV |
| `454535a` | fix(dashboard): Tile "Events" → "Veranstaltungen" |
| `e9d7b0b` | fix(warnings): "Gilt bis ..." + strict expires_at filter |
| `87280eb` | feat(dashboard): re-enable DiscoverGrid mit Per-Tile-Admin-Toggles (+ Mig 192 LIVE, 25 Rows) |
| `e2c679a` | fix(dashboard): amtliche Warnungen weg vom Start-Screen → nur Quartier-Tab |
| `a2f9844` + `11a906a` | feat(dashboard): Variante-B-Redesign — 4 Kategorien, 80px Touch-Targets, KI hinter Flag (Mig 193 file-only) |
| `ef9a9b8` | fix(praevention): back link `/` → `/dashboard` (App-Shell-Escape-Bug) |
| `5a2a830` | fix(dashboard): Sprechstunde + Praevention raus aus DiscoverGrid (sind im Gesundheit-Tab) |
| `000c98f` | fix(city-services): Bekanntmachungen Default-Tab + erste Position |
| `7845a99` | fix(dashboard): 4. Schnellzugriff KI → Bekanntmachungen |
| `01200ce` | fix(aerzte): ehrlicher Empty-State + Plan Doctor-Discovery-Welle |
| `11d761d` | **feat(doctors): Welle Doctor-Discovery** — 7 Tasks, OSM Overpass, external_doctors-Tabelle, monatlicher Cron, /care/aerzte Frontend mit Verzeichnis-Badge + Phone/Website-Buttons (Founder 1a/2b+c/3a+c/4b) |

**Tests:** 4513/4513 Vitest gruen (vorher 4496, +17 fuer Welle Doctor-Discovery). tsc clean. Lint clean.

**DB-Migrationen LIVE auf Prod:**
- **Mig 192** `feature_flags DISCOVER_TILE_*` — 25 Rows, alle enabled=true.
- **Mig 194** `external_doctors` — Tabelle + 4 RLS-Policies + 4 Indexe.
- **OSM-Pull fuer Pilot-Quartier `ee6cfcab-...`** — 51 Aerzte in der external_doctors-Tabelle (Allgemein 41, Frauenheilkunde 5, Kinderheilkunde 2, je 1 Augen/Ortho/Derma/Kardio).

**Nicht angewendet, file-only:**
- **Mig 193** `DASHBOARD_AI_QUICK_ACCESS` — obsolet nachdem KI-Slot durch Bekanntmachungen ersetzt wurde. Kein Apply geplant, kann spaeter recycelt werden wenn KI als Hero/FAB zurueckkommt.

## Code-Stand

- master HEAD `11d761d` == origin/master == LIVE (Deploy `25676889260`).
- Working tree clean.
- nachbar-io: keine offenen Aenderungen.
- Outer Handy-APP workspace: nur Auto-Memory-Updates erwartet (Dream-Consolidation-Bot).

## Was die App jetzt zeigt (relevant fuer Codex-Tests)

**Dashboard `/dashboard`:**
- Hero (Begruessung + Wetter)
- SOS-Kachel
- 4 Schnellzugriffe: Check-in · Nachrichten · Neuigkeiten · **Bekanntmachungen**
  (KI-Assistent ausgeblendet via FeatureGate, kommt mit §5 AVV)
- "Entdecken"-Section mit 3 sichtbaren Kategorien:
  - Nachbarschaft (5): Brett · Hilfe · Marktplatz · Gruppen · Veranstaltungen
  - Hilfe & Pflege (4): Mein Tag · Aufgabentafel · Einkaufshilfe · Pflegegrad
  - Quartier-Info (4): Karte · Muellkalender · Rathaus · Maengel
- "Mehr entdecken" → 9 weitere (Experten · Handwerker · Leihboerse · Mitessen · Wer hat? · Pakete · Fundbuero · Laerm · Tipps)
- Alle Tiles 80px hoch (Senior-Compliance)

**Gesundheit `/care`:**
- Check-in · Medikamente · **Aerzte (51 OSM-Eintraege live)** · Termine · Sprechstunde · Vorsorge

**Quartier `/quartier-info`:**
- Section 3 "Warnungen" (ExternalWarningBanner mit "Gilt bis"-Label)
- Section 7 "Veranstaltungen" mit `+ Eigene Veranstaltung anlegen`-Button

**Rathaus `/city-services`:**
- Default-Tab: **Bekanntmachungen** (130+ Eintraege)
- Folge-Tabs: Services · Hilfe / Wiki

## Pre-Existing Wartelisten

- **§5 Provider-AVV (Anthropic + Mistral)** — Founder-Hand nach HR-Eintragung (~2-3 Wochen). Solange `AI_PROVIDER_OFF=true`, KI-Assistent versteckt.
- **HR-Eintragung AG Freiburg** — Notar Stadler reicht ein (Pflichtblock fuer §5).
- **Pilot-Familien (5-10) in Bad Saeckingen** — persoenliche Akquise, Haupt-Engpass.
- **0 Test-Events im Pilot-Quartier** — Founder kann via `/events/new` selbst klicken (3 Vorschlaege im Mid-Day-Handoff) ODER Token `EVENTS-SEED-GO` und Claude/Codex schreibt SQL.

## Was Codex jetzt sinnvoll machen kann

**Niedrige Prio (sofort moeglich):**
1. **Code-Review** der Welle Doctor-Discovery — vor allem `lib/doctors/osm-doctors-client.ts` (Overpass-Query, Speciality-Whitelist) und `modules/doctors/services/doctor-discovery.service.ts` (Upsert + Stale-Pruning). Pruefen ob Edge-Cases (Overpass-Outage, Rate-Limit, mehrere Quartiere im selben Polygon) sauber gehandhabt sind.
2. **Smoke-Test auf Prod**: `https://nachbar-io.vercel.app/care/aerzte` einloggen + die 51 Aerzte-Karten visuell pruefen. Vor allem: "Verzeichnis"-Badge, Phone/Website-Buttons, Fachgebiet-Filter (Hausarzt/Augenarzt/Orthopaedie).
3. **Cron-Heartbeat-Cleanup**: doctors_refresh ist als Job registriert aber laeuft erst am 1. naechsten Monats. Bei Bedarf manuell `/api/cron/doctors-refresh` triggern, dann Heartbeat-Tabelle pruefen.

**Mittlere Prio (mit Founder-Go):**
4. **Aerzte-Tabelle in der Karte** (`/map`) anzeigen — Marker fuer external_doctors zusaetzlich zu doctor_profiles. Eigene PR.
5. **KBV-Anbindung Phase 2** (siehe Plan-Open-Question) — wenn der Pilot validiert, dass die OSM-Datenqualitaet zu lueckig ist.
6. **Onboard-Apply-Endpoint** fuer "external_doctors loeschen, neu pullen" als Admin-Action — bisher nur ueber den vollen Onboard-Endpoint moeglich (laueft alle 4 Wellen).

**Founder-Hand-Punkte (NICHT von Codex selbst anpacken):**
- §5 Provider-AVV
- HR-Eintragung
- Pilot-Familien-Akquise
- Test-Events im Pilot-Quartier (Founder-UI-Klicks)

## Wichtige Files (Codex zum schnellen Einstieg)

| Datei | Zweck |
|---|---|
| `docs/plans/2026-05-11-dashboard-redesign-plan.md` | Variante-B-Redesign-Plan (Tasks 1-5) |
| `docs/plans/2026-05-11-doctor-discovery-welle-plan.md` | Welle Doctor-Discovery (7 Tasks, Open Questions, Founder-Entscheidungen) |
| `docs/plans/handoff/2026-05-11-claude-an-claude-tag-bilanz-und-3-offene-punkte.md` | Tag-Frueh-Handoff (Vorgaenger) |
| `docs/plans/handoff/2026-05-11-claude-an-claude-3-offene-punkte-bearbeitet.md` | 3-Punkte-Bericht (Voice + Bug-Button + Seeds) |
| `components/dashboard/DiscoverGrid.tsx` | 4-Kategorien-Grid, 25 Tiles, Per-Tile-Flag-Filter |
| `app/(app)/dashboard/page.tsx` | Hero + SOS + 4 Schnellzugriffe + DiscoverGrid |
| `app/(app)/care/aerzte/page.tsx` | 51 OSM-Aerzte + Verzeichnis-Badge + Phone/Website |
| `app/api/admin/quarters/[id]/onboard/route.ts` | 4 Wellen + neu Doctor-Discovery |
| `app/api/cron/doctors-refresh/route.ts` | Monatlicher Refresh-Cron |
| `lib/doctors/osm-doctors-client.ts` | Overpass-Client + KBV-Whitelist |
| `modules/doctors/services/doctor-discovery.service.ts` | Upsert + Stale-Pruning |
| `supabase/migrations/192_discover_tile_flags.sql` | LIVE — 25 Discover-Tile-Flags |
| `supabase/migrations/193_dashboard_ai_quick_access_flag.sql` | file-only, OBSOLET (KI-Slot ersetzt) |
| `supabase/migrations/194_external_doctors.sql` | LIVE — Verzeichnis-Tabelle |

## Verifikations-Pfade

- `npx tsc --noEmit` → 0 errors
- `npx eslint` auf alle geaenderten Files → 0 errors/warnings
- `npx vitest run` → 4513 passed, 1 skipped, 0 failed
- Prod-DB-Check: `SELECT COUNT(*) FROM external_doctors WHERE quarter_id = 'ee6cfcab-f615-47cd-afe7-808a27cb584b' AND visible = true` → 51

## Codex-Auto-Continuation-Regel

Founder hat (2026-05-09) festgelegt: nicht bei "fertig" stoppen, nur stoppen bei roter Zone ohne Go, echten Blockern, Tool/Auth-Grenzen, harter Token-/Runtime-Grenze.

Variante A: Push + Deploy autonom. Rote Zone nur fuer Vercel-Env, Mig-Apply auf Prod, Provider-Live, Geld.

Codex kann Tasks 1-3 ohne Ruecksprache anfangen. Task 4-6 mit Founder-Go.

## Stand der vier Memory-Quellen

- **Repo `docs/plans/`**: heute aktualisiert (Redesign-Plan, Doctor-Discovery-Plan, drei Handoffs).
- **Auto-Memory `project_session_handover.md`**: zeitgleich aktualisiert (siehe naechster Pass-Bot oder explizit von Claude).
- **Vault `firmen-gedaechtnis/`**: heute nicht angefasst — keine strategischen Entscheidungen neu.
- **AGENTS.md im Vault-Parent**: unveraendert.

Ende der Uebergabe.
