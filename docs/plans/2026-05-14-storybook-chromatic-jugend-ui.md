# Storybook + Chromatic fuer Jugend-UI

Stand: 2026-05-14

## Ziel

Die Jugend-UI bekommt eine sichere visuelle Review-Strecke:

- Storybook lokal fuer isolierte Komponenten- und Screen-Zustaende
- Chromatic vorbereitet fuer spaetere Screenshot-Reviews
- Kein Chromatic-Upload, kein Token und kein CI/Provider-Live-Schritt ohne Founder-Go

## Lokale Befehle

```bash
npm run storybook
npm run build-storybook
npm run chromatic:dry-run
```

`npm run chromatic:dry-run` baut/prueft lokal ohne Veroeffentlichung.
Ohne `CHROMATIC_PROJECT_TOKEN` beendet der Sicherheits-Wrapper den Befehl
freundlich ohne Upload.

## Rote Zone

Diese Schritte bleiben Founder-Go-pflichtig:

- `CHROMATIC_PROJECT_TOKEN` setzen oder als GitHub/Vercel Secret speichern
- `npm run chromatic:ci` ausfuehren (Wrapper blockt ohne `CHROMATIC_FOUNDER_GO=YES`)
- GitHub Action fuer Chromatic aktivieren
- Chromatic-Plan, Billing oder Snapshot-Kontingente aendern

## Erste Storys

- `Jugend/Start`
- `Jugend/Missionen`
- `Jugend/Tauschen und Verschenken`
- `Jugend/Gruppen`
- `Karte/Activity Pins`

## Chromatic-Projekt

Project-ID aus Thomas' Setup-Link:

```text
Project:6a0574a2b87b16b2f8b38a4f
```

Der Project-Token ist ein Secret und wird nicht im Repo gespeichert.
