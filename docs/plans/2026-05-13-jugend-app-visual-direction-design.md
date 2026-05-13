# Jugend-App Visual Direction — Junges Quartier

**Datum:** 2026-05-13  
**Status:** Founder-Richtung ausgewaehlt, Asset lokal gesichert, noch nicht in `/jugend` verdrahtet  
**Scope:** Designrichtung und Hero-Asset fuer den Jugendmodus `youth`

## Founder-Entscheidung

Die Jugend-App soll nicht wie eine Pflege- oder Senior-App aussehen. Sie soll frisch, sozial und modern wirken und die Moeglichkeiten der App zeigen:

- sich mit anderen verabreden
- zusammen lernen
- kleine Spiele/Sport/Treffpunkte finden
- Nachbarschaftshilfe leisten
- einfache Hilfen wie Einkaufen, Rasenmaehen, kleine Aufgaben im Quartier
- Punkte/Badges als Motivation, aber nicht als reines Game

Die Richtung ist eine stilisierte soziale Quartier-Szene: mehrere kleine Aktivitaeten sind ueber leuchtende Wege/Marker verbunden. Keine exakten Adressen, keine Gesundheits- oder Pflegedetails, keine medizinische Wirkung.

## Gewaehltes Asset

Basisordner:

```text
public/brand/generation-modes/
```

Master und Varianten:

```text
youth-social-neighborhood-hero.png
youth-social-neighborhood-hero.webp
youth-social-neighborhood-hero-wide.png
youth-social-neighborhood-hero-wide.webp
youth-social-neighborhood-hero-app-header.png
youth-social-neighborhood-hero-app-header.webp
youth-social-neighborhood-hero-mobile-header.png
youth-social-neighborhood-hero-mobile-header.webp
```

Generator-Quelle bleibt unveraendert erhalten unter:

```text
C:\Users\thoma\.codex\generated_images\019e2150-f6dd-7db2-b4ff-e04d27eadd28\ig_0995f203581fc8ce016a04971c9efc8191bc381b25138d2ff3.png
```

## Visual Thesis

**Jugendmodus = soziale Mission-Map im Quartier.**  
Die Oberflaeche fuehlt sich dunkel-modern, lebendig und vertrauenswuerdig an: Anthrazit als Grund, Rheinblau fuer Wege/Verbindungen, Gruen fuer sichere Aktionen, Amber fuer warme Treffpunkte.

## Inhaltsprinzip

Der erste Screen soll sofort zeigen:

1. Oben: Karte/Hero als sozialer Quartiersanker.
2. Direkt darunter: "Was geht heute?" mit sicheren Aufgaben in der Naehe.
3. Punkte/Badges sichtbar, aber nicht dominierend.
4. Treffpunkte und Lernen als gleichwertige Nutzung neben Hilfe.
5. Keine Pflegegrad-, Diagnose-, Medikamenten- oder Check-in-Details.

## Sicherheitsgrenzen

- Jugendliche sehen keine sensiblen Senior-/Care-Daten.
- Aufgaben fuer Jugendliche sind anonymisiert und altersgerecht.
- Keine vollstaendigen Adressen im Jugend-Feed.
- Kontakt und Chat bleiben durch bestehende `YouthGuard`-/Consent-/Moderationslogik geschuetzt.
- Das Bild darf in der App Atmosphaere geben, aber keine reale Standortgenauigkeit vortaeuschen.

## Technische Integrationsempfehlung

Bestehende Route nutzen, nicht neu bauen:

```text
app/(app)/jugend/page.tsx
modules/youth/*
```

Erster Umsetzungsschritt:

- Jugend-Dashboard visuell modernisieren.
- Header/Hero oben mit `youth-social-neighborhood-hero-app-header.webp`.
- Mobile bei Bedarf `youth-social-neighborhood-hero-mobile-header.webp`.
- Bestehende Komponenten `AccessLevelBanner`, `PointsDisplay`, `TaskBoard` weiterverwenden, aber in eine eigene Jugend-Shell legen.
- Keine Aenderung an Komfort/50+ Visual-Polish.

## Akzeptanzkriterien

- `/jugend` wirkt klar anders als Aktiv/Komfort/Senior.
- Die App zeigt Jugend-Nutzen: Treffen, Lernen, Spielen/Sport, Helfen.
- Karte/Hero bleibt oben als visuelles Prinzip.
- Datenschutz- und Jugendschutzlogik bleibt unveraendert.
- Keine Design-Aenderung an der bestaetigten Komfort-/50+-Oberflaeche.
