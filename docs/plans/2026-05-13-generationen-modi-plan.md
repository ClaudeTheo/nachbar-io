# Nachbar.io Generationen-Modi - Produkt- und Umsetzungsplan

Datum: 2026-05-13
Status: Plan, noch keine Code-Aenderung
Owner: Codex / Founder

## Ziel

Nachbar.io soll nicht wie eine App "fuer Alte" wirken, sondern wie ein Quartier-System fuer alle Generationen. Jede Person bekommt beim Einstieg eine passende Oberflaeche, aber alle bleiben im selben Quartier, mit denselben Sicherheits- und Datenschutzregeln.

Wichtig: Die App soll Nutzer nicht hart nach Alter einsortieren. Besser ist eine selbstbestimmte Auswahl nach Nutzungssituation:

> Wie moechten Sie Nachbar.io nutzen?

## Vorgeschlagene Modi

| Produktname | Interne Idee | Grobe Zielgruppe | Ton und Design | Startfokus |
|---|---|---:|---|---|
| Junges Quartier | `youth` | ca. 14-21 | frisch, motivierend, aber sicher | Aufgaben, Punkte, Events, Mithelfen |
| Aktiv | `active` | ca. 21-50 | schnell, modern, alltagstauglich | Dashboard, Karte, Gruppen, Marktplatz |
| Komfort | `comfort` | ca. 50-70 | ruhiger, klarer, weniger dicht | Uebersicht, Rathaus, Gesundheit, Sicherheit |
| Einfach | bestehend `senior` | Senioren / Unterstuetzungsbedarf | grosse Schrift, grosse Buttons, max. 4 Aktionen | Check-in, SOS, Nachrichten, Termine, Medikamente |

UI-Labels sollten nicht "50+" oder "Best Ager" sagen. "Komfort" ist neutraler und wertiger. Der bestehende Seniorenmodus kann nach aussen als "Einfacher Modus" erscheinen, intern aber zunaechst `senior` bleiben.

## Pre-Check 2026-05-13

Der Code hat bereits Infrastruktur, die nicht dupliziert werden darf:

| Bereich | Bestand | Konsequenz |
|---|---|---|
| UI-Modus-Typ | `lib/supabase/types.ts` definiert `UserUiMode = "active" | "senior"` | Erweitern statt neues Feld erfinden |
| Login-Dispatch | `lib/auth/post-login-redirect.ts` leitet `senior -> /kreis-start`, sonst `/dashboard` | Zentrale Regel erweitern |
| Admin-Umschalter | `app/(app)/admin/components/UserManagement.tsx` kann nur Normal/Senior | Modusauswahl dort mit Registry ersetzen |
| Senior-Oberflaeche | `app/(senior)/*`, `app/senior/*`, Senior-CSS-Klassen | Bestehenden Einfach-Modus weiterverwenden |
| Jugend-Modul | `modules/youth/*`, `app/api/admin/youth/*`, `YouthGuard`, Punkte/Badges/Consent | Jugend nicht neu bauen, sondern als Modus andocken |
| Onboarding | `modules/onboarding/components/OnboardingFlow.tsx` | Modusauswahl als fruehe Onboarding-Slide |

## Datenschutz- und Sicherheitsprinzip

Jugendliche und allgemeine Nutzer duerfen Hilfebedarf im Quartier sehen, aber nicht automatisch sensible Details.

Erlaubt im offenen Quartier-Feed:

- "Einkaufshilfe gesucht, Naehe Purkersdorfer Strasse, ca. 30 Minuten"
- "Begleitung zum Rathaus gesucht"
- "Bank vor Haus X freischaufeln / tragen / kleine Hilfe"

Nicht erlaubt ohne Freigabe:

- Diagnose, Medikamente, Pflegegrad
- volle Adresse im Feed
- Telefonnummern
- Check-in-Status
- Name und Alter der hilfesuchenden Person

Details werden erst nach passender Berechtigung sichtbar: Annahme durch verifizierten Helfer, caregiver_link, Admin-Freigabe oder explizite Freigabe des Hilfesuchenden. Fuer Minderjaehrige bleibt das bestehende Youth-Consent-System massgeblich.

## MVP-Funktionsschnitt je Modus

### Junges Quartier

Startseite:

- Aufgaben im Quartier
- Punkte/Badges
- Veranstaltungen
- Gruppen / Jugendbereich
- Hilfe anbieten

Regeln:

- Unter 18: Guardian-Consent und YouthGuard respektieren.
- Keine privaten Gesundheitsdaten.
- Aufgaben muessen altersgerecht, moderiert und versichert/haftungsarm formuliert sein.
- Keine Direktkontakt-Freigabe ohne Schutzschicht.

### Aktiv

Startseite:

- Schnellzugriffe: Check-in/Nachrichten/Neuigkeiten/Bekanntmachungen je nach Pilotstand
- Nachbar-Karte
- Hilfe suchen/anbieten
- Gruppen, Marktplatz, Veranstaltungen
- Rathaus und lokale Infos

Das ist der heutige Hauptmodus und sollte nicht ueberladen werden.

### Komfort

Startseite:

- gleiche Datenbasis wie Aktiv, aber ruhiger
- groessere Tap-Ziele als Aktiv, kleiner als Einfach
- weniger Kacheln auf einmal
- Gesundheit, Rathaus, Warnungen, Termine und Karte prominenter
- Nachbarschaft bleibt sichtbar, aber nicht spielerisch

Technisch kann Komfort zuerst als mode-aware Dashboard-Variante starten, ohne eigene Route.

### Einfach

Startseite:

- 4-Kachel-Prinzip beibehalten
- Check-in
- SOS / Hilfe
- Nachrichten / Kreis
- Medikamente / Termine

Regeln:

- 80 px Touch-Targets
- sehr klare Sprache
- keine dekorative Ablenkung
- max. 4 Taps pro Aktion

## Technischer Zielzustand

Nicht vier Apps bauen. Eine App, ein Datenmodell, ein Berechtigungssystem.

Empfohlene interne Registry:

```ts
type UserUiMode = "youth" | "active" | "comfort" | "senior";
```

Zentrale Konfiguration statt verstreuter if-Statements:

```ts
const USER_MODE_CONFIG = {
  youth: {
    label: "Junges Quartier",
    postLoginPath: "/jugend",
    dashboardDensity: "playful",
  },
  active: {
    label: "Aktiv",
    postLoginPath: "/dashboard",
    dashboardDensity: "standard",
  },
  comfort: {
    label: "Komfort",
    postLoginPath: "/dashboard",
    dashboardDensity: "calm",
  },
  senior: {
    label: "Einfach",
    postLoginPath: "/kreis-start",
    dashboardDensity: "simple",
  },
} as const;
```

Vor einer Migration muss geprueft werden, ob `users.ui_mode` in Supabase per CHECK-Constraint begrenzt ist. Falls ja: Migration file-first, Rollback dazu, kein Prod-Apply ohne Founder-Go.

## Umsetzungswellen

### Welle G1 - Mode-Registry und Tests

- `lib/user-modes.ts` oder `lib/auth/user-modes.ts`
- Labels, Beschreibung, erlaubte Werte, Post-Login-Pfade
- `resolvePostLoginPath` auf Registry umstellen
- Tests fuer alle Modi

Keine UI-Aenderung noetig.

### Welle G2 - Datenmodell vorbereiten

- `UserUiMode` in `lib/supabase/types.ts` erweitern
- Admin-Service/Create-User-Flow auf Registry umstellen
- Migrations-Precheck fuer `users.ui_mode`
- Falls DB-Constraint existiert: Migration fuer `youth` und `comfort` vorbereiten, nicht automatisch Prod-applyen

### Welle G3 - Onboarding-Modusauswahl

Neue fruehe Onboarding-Slide:

> Wie moechten Sie Nachbar.io nutzen?

Karten:

- Junges Quartier - "Mithelfen, Punkte sammeln, Events entdecken"
- Aktiv - "Nachbarschaft, Alltag und lokale Infos"
- Komfort - "Ruhige Uebersicht mit mehr Klarheit"
- Einfach - "Grosse Buttons und einfache Wege"

Hinweis: "Sie koennen das spaeter in Ihrem Profil aendern."

### Welle G4 - Admin- und Profil-Umschalter

- Admin: vier Modi statt Normal/Senior
- Profil: Modus selbst aenderbar, aber Jugendmodus mit Schutzlogik
- Bei Wechsel auf `senior`: Hinweis, dass die einfache Oberflaeche geladen wird
- Bei Wechsel auf `youth`: ggf. Youth-Profile/Consent pruefen

### Welle G5 - Komfort-Dashboard

Kein neues Komplett-Dashboard. Erst `dashboardDensity = "calm"`:

- weniger Kacheln initial sichtbar
- groessere Abstaende und 60-72 px Kacheln
- Rathaus, Karte, Gesundheit, Sicherheit sichtbarer
- Marktplatz/Gruppen unter "Mehr entdecken"

### Welle G6 - Jugend-Start

Bestehendes Jugendmodul als Startpunkt fuer `youth`:

- Post-login zu `/jugend`
- YouthGuard / AccessLevel weiterverwenden
- Quartier-Hilfen als altersgerechte Aufgaben anzeigen
- Moderation und Guardian-Consent nicht umgehen

### Welle G7 - Cross-Generation-Hilfe

Ein gemeinsamer "Hilfe gebraucht"-Feed, aber mit rollenabhaengiger Detailtiefe:

- Jugendliche: anonymisierte, einfache Aufgaben
- Aktiv/Komfort: normale Hilfeangebote/-gesuche
- Caregiver: zusaetzlich berechtigte Pflege-/Check-in-Kontexte
- Senior/Einfach: nur eigene Hilfe ausloesen und Rueckmeldungen sehen

## Akzeptanzkriterien

- Nutzer kann beim Einstieg einen Modus waehlen.
- Login leitet je nach Modus an die richtige Startseite.
- Bestehende Senior-Routen bleiben unveraendert funktionsfaehig.
- Bestehendes Jugendmodul wird genutzt, nicht dupliziert.
- Jugendliche sehen keine sensiblen Senior-/Care-Daten.
- Komfortmodus ist ruhiger als Aktiv, aber nicht "Senior".
- Admin kann jeden Nutzer einem Modus zuordnen.
- Moduswechsel ist spaeter im Profil moeglich.

## Empfehlung fuer den Pilot

Nicht alle vier Modi gleichzeitig komplett bauen.

Reihenfolge:

1. Registry + `comfort` als ruhige Dashboard-Variante.
2. Onboarding-Auswahl mit allen vier Labels, aber `youth` zuerst als vorhandenes Jugendmodul andocken.
3. Cross-Generation-Hilfe nur mit anonymisierten Aufgaben live nehmen.
4. Erst nach Pilotfeedback eigene Jugend-Optik und Komfort-Feinschliff ausbauen.

So bleibt das System gross gedacht, aber der MVP bleibt kontrollierbar.
