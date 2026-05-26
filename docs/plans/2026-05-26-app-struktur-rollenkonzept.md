# Nachbar.io App-Struktur und Rollen-Konzept

Datum: 2026-05-26
Status: Produktvorschlag, noch nicht implementiert

## Ziel

Nachbar.io soll sich wie eine echte Handy-App anfuehlen: schnell mit dem Finger bedienbar, ruhig, vertraut und nicht wie eine KI-Demo. Die App soll nicht zeigen, wie viele Funktionen sie hat. Sie soll im Alltag helfen.

Die beste Grundidee ist deshalb:

- eine App-Struktur fuer alle
- vier feste Tabs unten
- pro Altersmodus andere Dichte, Sprache und Prioritaet
- keine Funktionsverluste bei Aktiv 55+
- Senior bleibt eine eigene Einfach-Oberflaeche mit Notruf-Logik

## Hauptnavigation

Die Grundnavigation fuer Erwachsene und Aktiv 55+:

| Tab | Zweck | Leitfrage |
| --- | --- | --- |
| Start | Ruhiger Einstieg, heute wichtig, naechster Schritt | Was ist jetzt wichtig? |
| Mein Quartier | Alles Oeffentliche vor Ort | Was passiert hier bei uns? |
| Mein Tag | Alles Zeitliche und Persoenliche fuer heute | Was steht heute an? |
| Ich | Profil, Haushalt, Schutz, Einstellungen, Recht | Was gehoert zu mir? |

Empfehlung fuer sichtbare Labels:

- Erwachsene: `Start`, `Quartier`, `Mein Tag`, `Ich`
- Aktiv 55+: `Start`, `Mein Quartier`, `Mein Tag`, `Ich`
- Senior Einfach: keine normale Tab-Bar, sondern vier grosse Kacheln plus Notrufleiste
- Jugend: eigene Logik mit `Start`, `Karte`, `Tauschen`, `Gruppen`

## Rollen und Modi

### Jugend

Startziel: `/jugend`

Die Jugend-App soll nicht wie eine kleine Erwachsenen-App wirken. Sie braucht Bewegung, Karte und Gemeinschaft, aber mit Schutzregeln.

Hauptbereiche:

- Start: Missionen, sichere Gruppen, naechstes Treffen
- Karte: Orte, Aufgaben, Treffpunkte, Aktivitaeten
- Tauschen: Dinge geben, suchen, teilen
- Gruppen: Sport, Lernen, Hilfe, Projekte

Nicht auf die Jugend-Startseite:

- lange Rathaus-Texte
- KI-Erklaerungen
- Pflege, Gesundheit, Notruf als Dauerthema
- Profileinstellungen ausserhalb von `Ich`/Freigabe

Produktidee:

- "Heute im Quartier" als kleine Kartenleiste
- "Mitmachen" statt "Aufgaben"
- Badges nur als Motivation, nicht als Druck
- Jugend bleibt eingeschraenkt, wenn keine passende Freigabe existiert

### Erwachsene

Startziel: `/dashboard`

Die Erwachsenen-App soll minimalistisch, erwachsen und alltagstauglich sein. Sie darf modern wirken, aber nicht verspielt und nicht wie ein KI-Tool.

Start:

- obere Lagekarte: Wetter/Warnung/Quartierstatus nur wenn relevant
- eine Hauptaktion: "Mein Quartier ansehen" oder "Heute erledigen"
- drei Schnellaktionen:
  - Gemeinschaft
  - Mein Tag
  - Hilfe anbieten/suchen
- keine langen Erklaertexte

Mein Quartier:

- Veranstaltungen: `/events`
- Rathaus und kommunale Infos: `/city-services`
- Quartier-Info-Hub: `/quartier-info`
- Karte: `/map`
- Gruppen: `/gruppen`
- Brett: `/board`
- News: `/news`
- Abstimmungen: `/polls`
- Maengel/Laerm/Meldungen: `/noise`, spaeter sauber buendeln
- Orte und Anlaufstellen: Aerzte, Apotheken, Handwerker, Hilfe, Experten

Mein Tag:

- Heute: Termine, Muell, Erinnerungen, Aufgaben
- Route-Basis: `/my-day`
- Pflege/Alltag nur dann prominent, wenn Nutzer es aktiviert
- Einkauf, Medikamente, Termine, Praevention als Unterpunkte

Ich:

- Profil: `/profile`
- Haushalt und Kontakte
- Benachrichtigungen
- Datenschutz, AGB, Barrierefreiheit, Impressum
- KI-Einstellungen und Einwilligungen
- App-Modus wechseln, soweit erlaubt

### Aktiv 55+

Startziel: `/dashboard`

Aktiv 55+ bekommt dieselben Funktionen wie Erwachsene. Der Unterschied ist nur Darstellung und Prioritaet.

Unterschiede zu Erwachsene:

- groessere Touch-Ziele
- mehr Abstand
- weniger Kacheln gleichzeitig
- klarere Worte
- Gemeinschaft bleibt vorne
- Pflege wird nicht wie ein Stempel auf die Startseite gelegt

Start:

- Begruessung kurz und ruhig
- erste Schnellaktion: `Mein Tag`
- zweite Schnellaktion: `Gemeinschaft`
- dritte Schnellaktion: `Mein Quartier`
- vierte Schnellaktion: `Hilfe`

Mein Quartier:

- identisch zu Erwachsene
- aber ruhiger sortiert:
  - Aktuelles vom Rathaus
  - Veranstaltungen
  - Menschen und Gruppen
  - Orte in der Naehe
  - Hilfe im Quartier

Mein Tag:

- Termine
- Erinnerungen
- Muell
- Medikamentenhinweise nur wenn aktiviert
- Check-in nur freiwillig und nicht dauernd im Gesicht

Ich:

- Profil
- Vertrauenskontakte
- Darstellung
- Familie verbinden
- Rechtliches

### Senior Einfach

Startziel: `/kreis-start`

Senior ist nicht "Aktiv 55+ mit groesserer Schrift". Senior ist eine eigene einfache Bedienung.

Start:

- Notrufleiste bleibt immer intakt
- vier grosse Kacheln
- maximal vier Taps pro Aktion
- keine normale Informationsflut

Kacheln:

- Mein Kreis
- Hilfe
- Sprechen/Schreiben
- Mein Tag

Regel:

- Bei fire/medical/crime immer 112/110 zuerst
- keine Experimente mit Animationen, die Sicherheit oder Lesbarkeit verschlechtern

## Beste Produktidee

Die App sollte sich anfuehlen wie:

"Ich oeffne sie morgens kurz, sehe was heute wichtig ist, kann mein Quartier verstehen und finde Menschen oder Hilfe ohne suchen zu muessen."

Dafuer ist diese Struktur am staerksten:

1. Start ist minimal.
2. Quartier traegt alles Oeffentliche.
3. Mein Tag traegt alles Zeitliche.
4. Ich traegt alles Persoenliche, Rechtliche und Schutzbezogene.

Das ist besser als viele einzelne Tabs wie Karte, Hilfe, Gesundheit, Markt, Nachrichten, Rathaus. Diese Einzelmodule bleiben vorhanden, aber sie liegen unter den vier grossen Bereichen.

## Link-Struktur Zielbild

### Start

- `/dashboard`
- `/jugend`
- `/kreis-start`

### Mein Quartier

- `/quartier-info`
- `/events`
- `/city-services`
- `/map`
- `/gruppen`
- `/board`
- `/news`
- `/polls`
- `/handwerker`
- `/experts`
- `/arzt`
- `/lost-found`
- `/waste-calendar`

### Mein Tag

- `/my-day`
- `/care`
- `/care/status`
- `/care/medications`
- `/care/termine`
- `/care/shopping`
- `/praevention`
- `/was-steht-uns-zu`
- `/pflegegrad-navigator`

### Ich

- `/profile`
- `/einstellungen`
- `/notifications`
- `/family`
- `/invitations`
- `/datenschutz`
- `/agb`
- `/barrierefreiheit`
- `/impressum`
- `/konto-loeschen`

## Design-Richtung 2026

Nicht:

- bunte KI-Kartenwand
- zu viele Verlaeufe
- erklaerende Marketingtexte in der App
- dauernd "KI" sagen
- alles gleichzeitig auf Start

Ja:

- helle, echte App-Flaechen
- klare Typografie
- 4 Tabs unten
- grosse Finger-Ziele
- wenige, gute Bewegungen
- sichere Effekte: leichte Uebergaenge, sanftes Feedback, keine sicherheitskritischen Animationen
- Karten und Listen so bauen, dass man sie mit einem Daumen bedienen kann

## Umsetzungsvorschlag

Welle 1: Navigation entscheiden

- `components/nav/NavConfig.ts` auf Zielstruktur pruefen
- Erwachsene und Aktiv 55+ auf dieselben vier Tabs bringen
- Jugend separat lassen
- Senior separat lassen

Welle 2: Dashboard umbauen

- Startseite entschlacken
- keine Nachrichten-Doppelung
- Gemeinschaft und Mein Tag sichtbar
- Pflege nur rollen-/modusabhaengig prominent

Welle 3: Mein Quartier als Hub

- Rathaus, Veranstaltungen, News, Karte, Gruppen, Orte buendeln
- Bad Saeckingen Pilot-Inhalte sichtbar machen
- Oeffentliche Informationen klar von persoenlichen Daten trennen

Welle 4: Mein Tag als Alltagshub

- Termine, Muell, Erinnerungen, Aufgaben
- Care-Funktionen nur passend und freiwillig
- Aktiv 55+ ruhigere Darstellung

Welle 5: Ich als Schutzraum

- Profil, Haushalt, Familie, Einwilligungen
- Rechtliches auffindbar, aber nicht auf Start
- KI-Consent und App-Modus sauber erklaeren

## Offene Entscheidungen

- Soll der Erwachsene-Tab sichtbar `Quartier` oder `Mein Quartier` heissen?
- Soll `Hilfe` eine eigene Start-Schnellaktion bleiben oder komplett unter `Mein Quartier` liegen?
- Soll Aktiv 55+ die erste Schnellaktion `Mein Tag` oder `Gemeinschaft` bekommen?
- Soll `Care` intern weiter Route `/care` bleiben, aber sichtbar konsequent `Mein Tag` heissen?

## Empfehlung

Meine Empfehlung:

- Erwachsene: `Start`, `Quartier`, `Mein Tag`, `Ich`
- Aktiv 55+: `Start`, `Mein Quartier`, `Mein Tag`, `Ich`
- Jugend: bestehende Jugendnavigation behalten
- Senior: `/kreis-start` als eigene Welt behalten
- Startseiten nicht mit Funktionen vollpacken
- Quartier und Mein Tag werden die beiden starken Produkt-Hubs

Damit wirkt Nachbar.io nicht wie "eine KI-App", sondern wie eine echte Quartier-App fuer Menschen.
