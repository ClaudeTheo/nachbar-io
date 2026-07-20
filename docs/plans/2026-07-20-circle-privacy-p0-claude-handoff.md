# Claude-Handoff: Migration 203 Circle Privacy P0

Stand: 2026-07-20

Owner: Codex (Build) -> Claude (Review)

Basis: `origin/master` / `08b2f83`

Branch: `codex/circle-privacy-p0`
Gate: `docs/plans/2026-07-20-kreis-plan-claude-gate-welle0.md`

## Ergebnis

Migration 203 schliesst beide P0-Rohdatenlecks:

- `vacation_modes` ist fuer authentifizierte Nutzer owner-only lesbar.
- `notify_neighbors` hat Default `false`; vorhandene `true`-Werte werden auf
  `false` korrigiert.
- `household_members` zeigt nur die eigene Zeile oder Mitglieder eines Haushalts,
  in dem der aktuelle Nutzer selbst verifiziertes Mitglied ist.
- Ein Kontakt-Link erweitert den direkten Tabellenzugriff ausdruecklich nicht.
- Der bestehende Admin-Pfad `hm_admin` bleibt unangetastet.

Der rekursionsfreie Helper `is_my_verified_household(uuid)` ist `STABLE`,
`SECURITY DEFINER`, hat einen festen `search_path` und ist nur fuer
`authenticated` (sowie den bestehenden Supabase-Service-Role-Mechanismus)
ausfuehrbar.

## Diff

### Datenbank

- `supabase/migrations/203_circle_privacy_p0.sql`
  - owner-only `vacation_modes`-SELECT
  - Default- und Datenkorrektur fuer `notify_neighbors=false`
  - eigener/verifizierter Haushalt fuer `household_members`-SELECT
  - gehaerteter, rekursionsfreier Helper
- `supabase/rollbacks/203_circle_privacy_p0.down.sql`
  - stellt die beiden historischen Lesepolicies und Default `true` wieder her
  - setzt Daten bewusst nicht pauschal auf `true` zurueck, weil fruehere Opt-outs
    nicht von durch Migration 203 korrigierten Altwerten unterscheidbar sind
- `tests/sql/203_circle_privacy_p0.sql`
  - echter lokaler RLS-Verhaltenstest innerhalb einer Rollback-Transaktion

### Consumer-Haertung

- `lib/care/resident-household.service.ts`
  - bindet den Service-Role-Lookup untrennbar an einen aktiven, nicht widerrufenen
    Caregiver-Link
- `app/api/care/household/route.ts`
  - delegiert den autorisierten Lookup an den Service; kein neuer direkter
    Admin-Import in der Route
- `lib/services/vouching.service.ts`
  - beendet eine RLS-leere Fremdmitgliedersuche vor nachgelagerten `.in([])`-
    Abfragen

### Regressionstests

- Migration/Rollback-Vertrag
- HouseInfoPanel mit leeren Mitgliedern sowie leeren Urlaubsdaten
- Care-Haushalt-Lookup inklusive fail-closed Link-Pruefung
- Map-Status mit RLS-leeren Mitgliedern
- Caregiver-Pending-Check-ins mit RLS-leeren Mitgliedern
- Vouching-Service und Vouching-UI mit leerer Fremdmitgliedersicht

## R1: Sweep aller Leser

| Lesergruppe | Wirkung von Migration 203 | Absicherung |
|---|---|---|
| `HouseInfoPanel` | Fremder Haushalt liefert keine Mitglieder; eigener Haushalt liefert erlaubte Mitglieder, Urlaub nur fuer den eigenen Nutzer | Neue UI-Tests: Empty-State, kein Dauer-Skeleton, kein Fehler/Toast, keine Urlaubsnotiz |
| `useMapStatuses` | Bewohnerzahlen und Urlaubslampen werden auf sichtbare eigene Haushaltsdaten reduziert; R4 entfernt fremde Urlaubslampen bis W6 | Neuer Hook-Test: Defaultstatus, leere Counts, Laden endet, keine Urlaubsfolgeabfrage bei leerer Mitgliedersicht |
| Profil Urlaub | Query ist bereits auf die eigene `user_id` begrenzt | Policy bleibt kompatibel; bestehender Owner-Pfad |
| Profil/Quartier/Household-Service/Leistungen/Alert-Ownership | Lesen die eigene Mitgliedschaft oder Mitglieder des eigenen Haushalts | Durch SQL-Test fuer eigene Zeile und eigenes verifiziertes Haus sowie bestehende Unit-Tests abgedeckt |
| `whohas`, Pakete, Laerm | Fremde User->Haushalt-Positionsmaps fallen weg; Inhalte laden weiter und unbekannte Distanz wird ohne Crash behandelt | Codepfade verwenden `data ?? []`; kein membership-abhaengiger Skeleton oder Fehlerzustand |
| Vouching | Rohdatenbasierte Liste fremder unverifizierter Bewohner wird privacy-by-default leer | Neuer Service-Early-Return plus neuer UI-Empty-State-Test |
| Caregiver-Pending-Map | Fremde Mitgliedersuche kann leer werden | Neuer Empty-Set-Test; kein Crash |
| `/api/care/household` | Direkter Caregiver-Read waere leer geworden | Neuer Service prueft zuerst aktiven Link, erst danach serverseitiger Lookup; Route- und Authz-Ratchet-Tests |
| Quartier-Residents und Anfrage | Benoetigen fremde Zuordnungen fuer opake Hash-Discovery | Bestehende Routen authentifizieren den Nutzer und verwenden danach Admin-Client mit Quarter-Scope; bestehende API-Tests bleiben gruen |
| Family-Setup | Membership-Leser/Schreiber erhalten bereits den autorisierten Admin-Client | Relevante Child-/Senior-Service-Tests bleiben gruen |
| Admin, Cron, Analytics, Welcome-Pack, Device-Serverpfade | Erhalten Admin-/Service-Clients oder pruefen die eigene Mitgliedschaft | Keine neue RLS-Leerwirkung; vollstaendige Suite bleibt gruen |
| Notification-Beziehungscheck | Eigenes Haus bleibt lesbar; Kontakte werden ueber `contact_links` geprueft; der alte beliebige Same-Quarter-Fallback sieht keine fremde Zuordnung mehr | Fail-closed, ohne Daten-/UI-Crash |
| DSGVO-Registry | Tabellen werden nur als Registry-Eintraege fuer user-gefilterte Serverexporte referenziert | Kein direkter Browser-Reader |

## TDD-Evidenz

### RED

1. Gezielter Ausgangslauf: 7 Fehler / 3 gruen.
   - sechs Migration-/Rollback-Vertraege rot, weil Datei 203 noch fehlte
   - Care-Lookup erwartete 200, bekam mit leerem User-Read 404
2. Echter lokaler SQL-Test vor Migration 203:
   - `Cross-quarter household_members leak: expected 0, got 1`
3. Vouching-Leerfall vor Fix:
   - erwartet zwei Tabellenzugriffe, erhielt vier Folgezugriffe
4. Erster Gesamtlauf entdeckte den Authz-Ratchet:
   - 70 direkte Admin-Routen statt Baseline 69
   - daraufhin RLS-Bypass und Ownership-Check gemeinsam in den Care-Service verlagert

### GRUEN

- Frischer lokaler Supabase-Replay: alle Migrationen inklusive Version `203`
  erfolgreich.
- SQL-RLS-Test:
  - Cross-Quartier-Mitgliedschaft: 0
  - unverknuepfter Nutzer im selben Quartier: 0
  - akzeptierter Kontakt in fremdem Haushalt: 0
  - eigene Zeile: 1
  - weiteres Mitglied des eigenen verifizierten Haushalts: 1
  - gesamter eigener Haushalt: 2
  - fremde Urlaube: 0
  - eigener Urlaub: 1
  - Default `notify_neighbors`: `false`
- Vorbestehende Testzeile `notify_neighbors=true` nach Reapply: `true=0`,
  `false=1`.
- Migration erneut angewendet: PASS.
- Rollback angewendet und historische Policies/Default verifiziert: PASS.
- Migration nach Rollback wieder angewendet und SQL-Test erneut: PASS.
- Relevanter Satz: 13 Testdateien, 55 Tests bestanden.
- Authz-Ratchet nach Service-Verlagerung: PASS (Baseline bleibt 69).
- Vollstaendiger Vitest-Lauf: 764 Testdateien, 5.320 Tests bestanden,
  1 bestehender Skip.
- `tsc --noEmit`: PASS.
- ESLint fuer alle beruehrten TS-/TSX-Dateien: PASS.
- `git diff --check`: PASS.

## Security-Mini-Audit

- **RLS/IDOR:** Echte SQL-Tests decken Cross-Quartier, unverknuepftes
  Same-Quarter und Kontakt-Link ab. Alle liefern 0 Fremdzeilen.
- **Privilege-Eskalation:** Keine Rollen-, Consent- oder Ownership-Spalten werden
  beschreibbar gemacht. Bestehende INSERT/UPDATE/DELETE-Policies bleiben
  unangetastet.
- **SECURITY DEFINER:** Fester `search_path`; PUBLIC/anon entzogen;
  `authenticated` explizit erlaubt.
- **Service Role:** Neuer Care-Lookup liegt im Service, nicht in der Route, und
  prueft vor dem Bypass den aktiven, nicht widerrufenen Caregiver-Link.
- **Audit/Rate-Limit:** Reine Lese- und RLS-Aenderung; kein neuer externer
  Schreibendpunkt, daher keine neue Rate-Limit- oder Audit-Log-Pflicht.
- **DSGVO:** Keine Adressdaten im Client-State hinzugefuegt; Care-Antwort bleibt
  bei der bestehenden `household_id`.
- **Notfallregel:** 112/110-Pfade und Banner unveraendert.
- **Externe Quellen:** Keine neue Quelle, Lizenz oder laufende Administration.

Security-Findings: 0 offen (HIGH/CRITICAL: 0).

## Bewusste Auswirkungen und Risiken

1. Fremde Urlaubslampen verschwinden bis zur W6-Kreisprojektion. Das ist R4 und
   Founder-gewollt.
2. Die alte Vouching-Liste fremder unverifizierter Bewohner ist leer, solange
   kein spaeterer privacy-sicherer Discovery-Pfad existiert. Die UI endet sauber
   im bestehenden Empty-State.
3. HouseInfoPanel zeigt fuer fremde Haushalte den bestehenden generischen
   Empty-State. Der inhaltliche Umbau bleibt planmaessig Welle 3.
4. Rollback stellt Policies und Default wieder her, reaktiviert aber absichtlich
   keine zuvor korrigierten Freigaben.

## Rote Restschritte

1. Claude-Review dieses lokalen Commits und des Security-Mini-Audits.
2. Kein Push, PR oder Merge ohne separates Founder-Go fuer diese Code-/RLS-Welle.
3. Kein Production-Apply von Migration 203 ohne separates, konkretes Founder-Go.
4. Kein Deploy in diesem Handoff.

In dieser Umsetzung wurden keine Production-DB-Schreiboperation, kein Deploy,
keine ENV-/Secret-Aenderung und kein Remote-Push ausgefuehrt.
