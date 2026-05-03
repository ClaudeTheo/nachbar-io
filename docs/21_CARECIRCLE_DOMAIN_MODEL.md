# CareCircle Domain-Modell

Stand: 2026-05-03

## Zweck

CareCircle ist der Produktkern fuer Angehoerige, Senior:innen und spaetere
Interfaces wie Alexa, Senior-App, Windows-Wrapper oder Partner-Portale.
Alexa ist nur ein optionaler Kanal. Die fachliche Wahrheit fuer Beziehungen
liegt nicht in einem Geraet oder Provider.

## Master-Begriffe

| Begriff | Master | Bedeutung |
|---|---|---|
| CareCircle | `caregiver_links` | Persoenlicher Kreis eines Bewohners: Angehoerige, Freunde, Ehrenamtliche |
| Bewohner / Senior | `users.id` als `caregiver_links.resident_id` | Person, deren Care-Daten sichtbar oder betreut werden |
| Angehoerige / Caregiver | `users.id` als `caregiver_links.caregiver_id` | Person mit aktiver Beziehung zum Bewohner |
| Quartier / Adresse | `households`, `household_members`, `users.household_id` | Verifikation, Nachbarschaft, lokale Inhalte; kein CareCircle-Master |
| Care-Helfer Legacy/B2B | `care_helpers` | Aelteres Rollenmodell fuer verifizierte Helfer und B2B-/Care-Service-Kontexte |
| Circle-Events | `circle_events` | Abgeleiteter Aktivitaetsstream auf Basis von `caregiver_links` |

## Harte Regeln

- `caregiver_links` ist der Master fuer den persoenlichen CareCircle.
- Ein aktiver CareCircle-Link ist `revoked_at is null`.
- `care_helpers` bleibt bestehen, wird aber nicht zum Master fuer Familienlogik.
- `households` beantworten "wo gehoert jemand im Quartier hin?", nicht "wer darf Care-Daten sehen?".
- `circle_events` schreibt/liest Ereignisse, definiert aber keine Beziehung.
- Consent bleibt separat: Ein CareCircle-Link ersetzt keine Einwilligung fuer
  medizinische Daten, KI, Memory oder Provider-Verarbeitung.
- RLS ist autoritativ. App-Services duerfen keine Beziehung erlauben, die RLS
  nicht ebenfalls abbildet.

## Rollen-Mapping

`caregiver_links.relationship_type` wird fuer alte Care-Rollen wie folgt
abgebildet:

| `relationship_type` | Care-Rolle | Begruendung |
|---|---|---|
| `partner` | `relative` | Familien-/Vertrauensperson |
| `child` | `relative` | Familien-/Vertrauensperson |
| `grandchild` | `relative` | Familien-/Vertrauensperson |
| `friend` | `relative` | Im CareCircle bewusst vertraut, nicht oeffentlicher Helfer |
| `other` | `relative` | Bewohner hat Beziehung aktiv eingeladen |
| `volunteer` | `neighbor` | Ehrenamt/Pate, weniger weit als Familienrolle |

Dieses Mapping ist bereits app-seitig in
`modules/care/services/permissions.ts` und datenbankseitig ab Migration
`186_carecircle_rls_bridge.sql` gespiegelt.

## Zugriffsschichten

### App-Service

Bestehende Services nutzen heute vor allem:

- `modules/care/services/caregiver/links.service.ts`
- `modules/care/services/permissions.ts`
- `modules/care/services/caregiver/*`

Neue CareCircle-Logik soll diese Services erweitern oder adaptieren, nicht ein
zweites paralleles Beziehungsmodell aufbauen.

### Datenbank / RLS

Migration `186_carecircle_rls_bridge.sql` erweitert die zentralen Legacy-
Funktionen:

- `is_care_helper_for(uuid)`
- `care_helper_role(uuid)`

Dadurch koennen bestehende Care-RLS-Policies aktive `caregiver_links`
mitverstehen, ohne jede Policy zu duplizieren.

Prod-Hinweis: Die Migration ist Datei-first vorbereitet. Production wird erst
nach Founder-Go fuer `apply_migration` angepasst.

## Service-Skizze fuer spaetere Adapter

Falls ein expliziter CareCircle-Service noetig wird, dann als Adapter ueber
bestehende Infrastruktur:

```ts
// Konzeptskizze, keine aktuelle API
getCareCircleForResident(residentId): caregiver_links[]
getResidentsForCaregiver(caregiverId): caregiver_links[]
assertActiveCareCircleLink(residentId, caregiverId): void
mapRelationshipToCareRole(relationshipType): "relative" | "neighbor"
```

Der passende Ort ist derzeit eher
`modules/care/services/caregiver/links.service.ts` oder
`modules/care/services/permissions.ts`, nicht ein neues Top-Level-Modul.

## Nicht tun

- Kein Alexa-spezifisches Beziehungsschema.
- Kein zweiter `care_circle_members`-Table ohne harte Migrationsentscheidung.
- Keine App-Only-Berechtigung ohne RLS-Gegenstueck.
- Keine Volltext-Doppelung in Vault und Repo; Vault darf auf dieses Dokument
  verweisen.
- Keine Vermischung von Quartier-Verifikation (`households`) mit Care-Daten-
  Zugriff (`caregiver_links` + Consent).
