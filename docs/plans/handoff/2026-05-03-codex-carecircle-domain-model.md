# Codex Handover — CareCircle-Domain-Modell

Stand: 2026-05-03 abend
Branch: `master`
Scope: T-14 CareCircle-Begriff/Rollen-Master als Doku + Service-Skizze

## Harte Linien

- Keine Code-Aenderung.
- Keine Migration.
- Keine Prod-Aktion.
- Keine neue Infrastruktur.

## Pre-Check

Durchgefuehrt:

```powershell
rg -n "CareCircle|care circle|getCareCircle|caregiver_links|care_helpers|relationship_type|mapCaregiverRelationshipToRole|AssignedSeniors|assigned seniors|meine-senioren|Caregiver" app modules lib __tests__ docs -g '!node_modules'
```

Gefunden:

- `modules/care/services/caregiver/links.service.ts` ist die bestehende
  Link-Listen-/Update-Infrastruktur.
- `modules/care/services/permissions.ts` enthaelt bereits
  `mapCaregiverRelationshipToRole()`.
- `caregiver_links` ist in Memory, Device, Chat, Prevention, Status und
  Dashboard-Pfaden bereits als Familien-/Caregiver-Beziehung etabliert.

Entscheidung:

- Kein neues `modules/care-circle`.
- Kein neues paralleles Beziehungsschema.
- Doku legt Master-Begriffe fest und verweist auf bestehende Services als
  Erweiterungspunkt.

## Geaendert

- `docs/21_CARECIRCLE_DOMAIN_MODEL.md`
  - `caregiver_links` als CareCircle-Master.
  - `care_helpers` als Legacy/B2B-Helferrolle.
  - `households` als Quartier-/Adresskontext.
  - `circle_events` als abgeleiteter Stream.
  - Rollenmapping dokumentiert:
    `volunteer -> neighbor`, alle anderen Caregiver-Beziehungen -> `relative`.
  - Service-Skizze fuer spaetere Adapter.

## Verifikation

```powershell
Get-Content -LiteralPath 'docs\21_CARECIRCLE_DOMAIN_MODEL.md'
```

Ergebnis: Datei lesbar, Inhalt vollstaendig.

## Anschluss

Naechster sinnvoller Code-Block waere kein neues Modul, sondern ein gezieltes
Erweitern bestehender Link-/Permission-Services, sobald ein konkreter Caller
das braucht.
