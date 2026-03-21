# Google Play Store — Grafische Assets

## Feature Graphic (Pflicht)

| Feld | Wert |
|------|------|
| Groesse | 1024 x 500 px |
| Format | PNG oder JPEG |
| Inhalt | QuartierApp Logo + Tagline + Quartier-Foto |
| Text | "QuartierApp — Ihre Nachbarschaft. Sicher vernetzt." |
| Farben | Hintergrund #FDF8F3 (Warmweiss), Text #2D3142 (Anthrazit), Akzent #4CAF87 (Gruen) |

**Hinweis:** Manuell in Figma/Canva erstellen. Kein Screenshot, sondern Marketing-Grafik.

---

## Screenshots (min. 2, empfohlen 5)

Format: 16:9 oder 9:16, min 320px, max 3.840px pro Seite.
Empfohlen: 1080 x 1920 px (9:16, Phone Portrait)

### Vorgeschlagene Screens

| Nr | Screen | Beschreibung | Route |
|----|--------|-------------|-------|
| 1 | Startseite | Quartier-Feed mit aktuellen Beitraegen | `/dashboard` |
| 2 | Notfall-System | 112/110 Banner + GPS-Standort | `/alerts/new` (Kategorie fire) |
| 3 | Marktplatz | Anzeigen-Uebersicht mit Fotos | `/marketplace` |
| 4 | Quartierskarte | Leaflet-Karte mit Pins | `/map` |
| 5 | Check-in | Tages-Statusmeldung (gut/geht so/schlecht) | `/care/checkin` |

### Konsistenz mit Apple App Store

Gleiche 5 Screens wie fuer Apple — nur im Android-Rahmen.

### Erstellung

- Auf echtem Samsung-Geraet oder Android Emulator
- Alternative: Chrome DevTools Device Mode (Galaxy S21, 1080x2400)
- Keine Debug-Elemente sichtbar
- Demo-Quartier mit realistischen Testdaten (Seed-Script: `npx tsx scripts/seed-demo-quarter.ts`)

---

## App-Icon

Bereits vorhanden in:
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`

Google Play Store Icon: 512 x 512 px (hochladen in Play Console)
