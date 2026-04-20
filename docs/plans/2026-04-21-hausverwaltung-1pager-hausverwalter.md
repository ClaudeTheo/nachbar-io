# 1-Pager fuer Hausverwalter-Email — Bewohner-Kanal QuartierApp

**Zweck:** Schriftliche Validation des Hausverwaltungs-Moduls bei Founder-Kontakt in Bad Saeckingen.
**Workflow:** Founder kopiert den Email-Text unten, fuegt zwei Mock-Screenshots an (Beschreibung am Ende), schickt ab. Antworten zaehlen als Tor zur Code-Phase.

---

## EMAIL-TEXT (zum Kopieren)

> **Betreff:** Bewohner-Kanal fuer Ihre Senior-Mieter — kurze Frage
>
> Sehr geehrte Frau / sehr geehrter Herr [Name],
>
> wir bauen mit der QuartierApp einen schmalen Bewohner-Kanal fuer
> Hausverwaltungen — gedacht fuer die Senior-Mieter, die heute eher zum
> Telefon greifen als zur Casavi-App. Bevor wir den Modul fertig stellen,
> wuerden wir gern wissen, ob das fuer Sie ueberhaupt Sinn ergibt.
>
> **Was es ist:** Eine Bewohner-App fuer Ihre Mieter, optional verknuepft
> mit Ihrer Hausverwaltung. Vier Funktionen im Mieter-zu-Hausverwaltung-
> Kanal:
>
> 1. **Mangelmeldung** — Mieter tippt eine Kategorie an (Heizung, Wasser,
>    Aufzug, Laerm, Elektrik, Allgemeines), nimmt ein Foto auf, diktiert
>    eine kurze Beschreibung. Bei Ihnen kommt das mit Status, Foto und
>    Sprachtranskript an.
> 2. **Mitteilungen** — Sie schicken eine Information ans Haus
>    (Wasserabsperrung Dienstag 9-12 Uhr). Mieter sehen es im App-
>    Posteingang, koennen sich es vorlesen lassen, Sie sehen
>    Eingangsbestaetigungen.
> 3. **Postfach fuer Briefe** — Sie laden ein PDF hoch (Nebenkosten,
>    Hausordnung), Mieter findet es in seinem Briefe-Bereich, kann es
>    vorlesen lassen.
> 4. **Termine** — Sie schlagen einen Handwerker-Termin vor, Mieter
>    bestaetigt oder verschiebt; eine Stunde vorher Erinnerung.
>
> **Senior-Modus:** Grosse Schrift, grosse Knoepfe, weniger Schritte. Kein
> Tippen-Pflicht, sondern Auswahl plus Sprache plus Foto.
>
> **Was es nicht ist:** Keine Buchhaltung, keine Nebenkostenabrechnung,
> kein Beschluss-System. Keine Konkurrenz zu Casavi, etg24 oder
> Immoware24 — eher ein schmaler Bewohner-Kanal, den die Senior-Mieter
> auch ohne Schulung verstehen.
>
> Beigefuegt sind zwei Skizzen (Senior-Ansicht und Ihre Cockpit-Ansicht).
>
> Drei Fragen, kurze Antworten reichen uns:
>
> 1. Waeren Sie bereit, drei bis fuenf Ihrer Mieter — idealerweise
>    Senioren — vier Wochen lang testen zu lassen, gegen 49 EUR im Monat
>    pauschal?
> 2. Welches der vier Themen wuerden Sie zuerst sehen wollen, wenn Sie
>    nur eines haben koennten — Mangel, Mitteilung, Postfach oder
>    Termin?
> 3. Ist die Dokumentation der Mangelanzeigen (Eingangsbestaetigung mit
>    Zeitstempel) fuer Sie ein Punkt, der heute in Ihrem Alltag fehlt?
>
> Wir warten mit dem Bau, bis wir Ihre Antwort haben — sonst bauen wir
> aneinander vorbei.
>
> Beste Gruesse
> Thomas Theobald
> QuartierApp / Theobase GmbH (i.Gr.)

---

## ANHANG-SKIZZE 1 — Mieter-Sicht (Senior-Modus)

**Bildbeschreibung fuer den Founder zum Selber-Mocken oder fuer einen Mock-Tool-Auftrag:**

- **Format:** Smartphone-Hochformat, helles Senior-Layout (anthrazit + gruen).
- **Top:** Grosser Titel "Hausverwaltung", darunter Name der HV ("Hausverwaltung Mueller & Sohn").
- **4 grosse Kacheln (jeweils min. 80 px Touch-Target):**
  1. Rote Kachel "Mangel melden" — grosses Werkzeug-Icon
  2. Blaue Kachel "Mitteilungen" — Glocken-Icon, kleiner roter Punkt mit "1"
  3. Lila Kachel "Briefe" — Brief-Icon
  4. Gruene Kachel "Termine" — Kalender-Icon, kleiner Text "Heute 14:00 Klempner"
- **Unten:** Kleiner Hinweis "Fuer Sie eingerichtet von Hausverwaltung Mueller & Sohn"

## ANHANG-SKIZZE 2 — Cockpit-Sicht (Hausverwalter, Browser)

- **Format:** Desktop-Browser, Web-Cockpit (Adaption von app/(app)/org/).
- **Linke Sidebar:** Logo + Menue ["Uebersicht", "Maengelmeldungen (3)", "Mitteilungen", "Briefe", "Termine", "Bewohner"]
- **Hauptbereich Maengelmeldungen:** Tabelle mit 5 Eintraegen
  - Spalte "Mieter" (anonymisiert, z.B. "M. P., Hauptstr. 12 / Whg 4")
  - Spalte "Kategorie" (Heizung / Wasser / Aufzug)
  - Spalte "Datum"
  - Spalte "Status" (Offen / In Arbeit / Erledigt) als farbiger Badge
  - Spalte "Anhaenge" (Foto-Symbol + Mikrofon-Symbol)
  - Klick auf eine Zeile -> Detailansicht mit Foto, abspielbarem Sprachtranskript, Status-Aenderung
- **Top-rechts:** Logo "QuartierApp Hausverwaltung", Hausverwaltungs-Name, Logout

---

## Ja/Nein-Auswertung (interner Plan nach Antwort)

| Antwort | Folge |
|---|---|
| **3x JA, klares Top-Thema, Doku-Schmerz bestaetigt** | GO. V2-Brief an Codex schicken, dann Design-Plan + Code-Phase nach Welle-C-Push. |
| **JA, aber Top-Thema unerwartet** (z.B. Termine statt Maengel) | Funktionsumfang-Reihenfolge im Design-Plan anpassen, sonst weiter. |
| **JA, aber kein Doku-Schmerz** | "Beweisstaerker"-Argument abschwaechen, USP nur Senior-Modus + Vereinfachung. V2-Brief leicht anpassen. |
| **NEIN auf Frage 1 (49 EUR)** | Preis-Modell hinterfragen — entweder Founder-Pivot zu Free-Kanal mit anderem Geschaeftsmodell, oder Modul ganz verwerfen. |
| **NEIN durchgehend / kein Schmerz** | Modul wird nicht gebaut. Memory-Update, Hausverwaltungs-Idee zur Akte. |
