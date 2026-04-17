# Raspberry Pi 5 Senioren-Terminal — Design-Dokument

**Datum:** 2026-03-13
**Status:** Freigegeben
**Ersetzt:** ESP32 E-Paper Companion Device (nachbar-companion)

---

## Ziel

Ein wandmontiertes 10" Touchscreen-Terminal fuer Senioren im Quartier, basierend auf Raspberry Pi 5. Ersetzt das limitierte ESP32 E-Paper Geraet durch ein vollwertiges interaktives Terminal mit Telemedizin-Faehigkeiten, Medikamenten-Management und Familien-Anbindung.

## Hardware

| Komponente | Spezifikation |
|------------|---------------|
| Computer | Raspberry Pi 5 (4GB/8GB RAM) |
| Display | 10" IPS Touchscreen, 1280x800, kapazitiv |
| Kamera | USB-Webcam (fuer Sprechstunde, spaeter) |
| Mikrofon | USB oder integriert in Webcam |
| Lautsprecher | 3.5mm oder USB |
| GPIO | Buzzer (Alarm), LED (Status), optional Sensoren |
| Netzwerk | WiFi 2.4/5GHz oder Ethernet |
| Stromversorgung | 12V/2A (Display) + 5V/5A USB-C (Pi) |

## Architektur

```
Raspberry Pi 5 + 10" Touchscreen
├── Chromium Kiosk (Fullscreen)
│   └── https://nachbar-io.vercel.app/terminal/{device-token}
├── GPIO-Bridge (Python, localhost:8765 WebSocket)
│   ├── Buzzer → Medikamenten-Alarm, Notruf-Bestaetigung
│   ├── LED → Heartbeat (gruen), Alert (rot blinken)
│   ├── Display-Helligkeit → Nachtmodus dimmen
│   └── Watchdog → Neustart bei Crash
└── USB-Webcam + Mikrofon (Telemedizin)
         |
    WiFi / Ethernet
         |
Supabase (EU Frankfurt)
├── Auth + Device Tokens
├── Realtime (WebSocket fuer Live-Updates)
├── Care-Modul (Check-in, Medikamente, SOS)
├── Audit-Log (DSGVO + MDR-Readiness)
└── E2E-Verschluesselung (AES-256-GCM)
```

### Zwei Prozesse auf dem Pi

1. **Chromium Kiosk** — Zeigt /terminal/ Route, auto-start beim Boot
2. **GPIO-Bridge** — Python-Service fuer Hardware (Buzzer, LED, Helligkeit)

Web-App kommuniziert mit GPIO-Bridge via WebSocket (localhost:8765).

## Terminal-UI Layout

Optimiert fuer 10" Touch (1280x800), Senioren-UX (80px Buttons, 4.5:1 Kontrast):

```
┌─────────────────────────────────────────────────────┬──────────┐
│  Wetter · Datum · Uhrzeit (Header)                  │          │
├─────────────────────────────────────────────────────┤  Check   │
│                                                     │   -in    │
│  ┌────────────────┐  ┌────────────────┐             ├──────────┤
│  │  Begruessung   │  │  Aktive Alerts │             │          │
│  │  + Check-in    │  │  mit Details   │             │  NOT-    │
│  │  Status        │  │               │             │  RUF     │
│  └────────────────┘  └────────────────┘             │  (ROT)   │
│                                                     ├──────────┤
│  ┌────────────────┐  ┌────────────────┐             │          │
│  │  Medikamente   │  │  Quartiers-    │             │  Medi    │
│  │  + Erinnerung  │  │  News          │             │          │
│  │  + Bestaetigung│  │               │             ├──────────┤
│  └────────────────┘  └────────────────┘             │          │
│                                                     │  Arzt    │
│  ┌────────────────┐  ┌────────────────┐             │  (Video) │
│  │  Events /      │  │  Naechste      │             ├──────────┤
│  │  Kalender      │  │  Sprechstunde  │             │          │
│  └────────────────┘  └────────────────┘             │  News    │
│                                                     │          │
└─────────────────────────────────────────────────────┴──────────┘
```

### Hauptbereich (~85% Breite)
- **Header:** Wetter, Datum, Uhrzeit — immer sichtbar
- **6 grosse Kacheln** im 2x3 Grid mit Live-Daten
- Jede Kachel antippbar → oeffnet Detail-Ansicht im Hauptbereich

### Rechte Seitenleiste (~15% Breite, immer sichtbar)
- **Check-in** — taeglich "Alles gut" bestaetigen
- **NOTRUF** — ROT, immer erreichbar, 112 + SOS an Kontakte
- **Medikamente** — Erinnerungen + Bestaetigung
- **Sprechstunde** — Video-Call starten/annehmen
- **News** — Quartiers-Nachrichten

## 6 Hauptscreens

| Screen | Inhalt | Interaktion |
|--------|--------|-------------|
| Home | Uhrzeit, Wetter, Begruessung, naechste Medikamente, Alert-Vorschau | Tap auf Kacheln → Detail |
| Check-in | "Mir geht es gut" Button + Stimmungs-Auswahl | 1-Tap Bestaetigung |
| Notfall | ROTER Vollbild-Screen, 112 anrufen, SOS an Kontakte | Grosser SOS-Button |
| Medikamente | Erinnerungen mit Foto, Bestaetigung | Tap "Eingenommen" |
| Sprechstunde | Video-Call mit Arzt/Pflegekraft (WebRTC) | Annehmen / Auflegen |
| Nachrichten | Quartiers-News, Events, Alerts | Wischen / Tippen |

## Raspberry Pi Setup

| Komponente | Wahl |
|------------|------|
| OS | Raspberry Pi OS Lite (64-bit, kein Desktop) |
| Display-Server | Cage (minimaler Wayland-Compositor) |
| Browser | Chromium Kiosk (--kiosk --noerrdialogs) |
| Auto-Start | systemd Service beim Boot |
| Bildschirmschoner | Dimmen nach 5 Min, Touch weckt auf |
| Updates | Web-App automatisch, Pi-OS via unattended-upgrades |
| Fernwartung | SSH + optional VNC |
| Watchdog | Hardware-Watchdog des Pi5, Neustart bei Freeze |

## Telemedizin / Online-Sprechstunde

| Aspekt | Loesung |
|--------|---------|
| Video/Audio | WebRTC (browser-nativ, P2P) |
| Signaling | Supabase Realtime Channels |
| Verschluesselung | SRTP (WebRTC-Standard) + TLS |
| Kamera | USB-Webcam (Plug & Play in Chromium) |
| Aufzeichnung | Keine — DSGVO-konform |
| Audit-Trail | Start/Ende/Dauer in Supabase geloggt |
| MDR-Readiness | Kein Medizinprodukt, aber: Audit-Log, E2E-Crypto, Datensparsamkeit |

## Medizin-Readiness Features

Softwareseitig vorbereitet fuer zukuenftige MDR-Konformitaet:

- **Audit-Trail**: Jede Aktion geloggt (Check-in, Medikament bestaetigt, SOS, Sprechstunde)
- **AES-256-GCM**: Gesundheitsdaten verschluesselt (lib/care/field-encryption.ts)
- **Vitaldaten-Schnittstelle**: Web Bluetooth API fuer BT-Geraete (Phase 2)
- **Medikamenten-Erinnerung**: Exakte Zeiten, visuell + akustisch, Bestaetigungs-Pflicht
- **Sturzerkennung**: Vorbereitet fuer USB-Sensor (Phase 2)
- **Consent-Management**: Einwilligung fuer Telemedizin, Datenweitergabe

## Familien-Dashboard (Phase 1 Extra)

Neue Route `/family/{token}` fuer Angehoerige die nicht im Quartier wohnen:

- Sehen ob Check-in gemacht wurde (gruen/gelb/rot Status)
- Push-Benachrichtigung wenn Check-in ausbleibt
- Koennen Sprechstunde mit Senior starten
- Sehen Medikamenten-Compliance (% eingenommen)
- Koennen Termine/Erinnerungen eintragen

**Token-basierter Zugang:** Kein eigener Account noetig, Link teilen reicht.

## Ambient-Nachtmodus (Phase 1 Extra)

Zwischen 22:00 und 07:00 Uhr:
- Display gedimmt auf 10% Helligkeit
- Nur: grosse Uhr + Datum + Notruf-Button
- Optional: Raumtemperatur (wenn Sensor vorhanden)
- Touch auf beliebige Stelle → volle Helligkeit fuer 30 Sek
- Dezentes Nachtlicht-Feeling statt schwarzem Bildschirm

## Phasen-Roadmap

### Phase 1 (MVP)
- Pi OS Setup + Chromium Kiosk
- /terminal/ Route mit 6 Screens
- GPIO-Bridge (Buzzer + LED)
- Familien-Dashboard
- Nachtmodus
- Device-Token Auth (bestehend)

### Phase 2
- Telemedizin (WebRTC Sprechstunde)
- Vitaldaten via Bluetooth
- Sprachsteuerung (Web Speech API)
- Foto-Rahmen Screensaver

### Phase 3
- KI-Assistent (Claude Haiku)
- Tuerklingel-Integration
- Sturzerkennung
- Mehrsprachigkeit

## Backend-Integration

Bestehende APIs werden wiederverwendet:
- `GET /api/device/status` — Wetter, Alerts, Check-in, News
- `POST /api/device/checkin` — Check-in bestaetigen
- `POST /api/device/alert-ack` — Alert als gesehen markieren
- `lib/device/auth.ts` — Token-Authentifizierung (SHA-256)
- `lib/device/weather.ts` — Open-Meteo Wetter-API

Neue APIs fuer Terminal:
- `GET /api/terminal/medications` — Medikamenten-Plan + Status
- `POST /api/terminal/medication-confirm` — Einnahme bestaetigen
- `WS /api/terminal/realtime` — Supabase Realtime fuer Live-Updates
- `GET /api/family/{token}` — Familien-Dashboard Daten
- `POST /api/terminal/video/signal` — WebRTC Signaling

## Design-Prinzipien

1. **NOTFALL-BANNER**: Bei fire/medical/crime IMMER 112/110 zuerst
2. **80px Touch-Targets**: Minimum, besser 100px+ auf 10" Display
3. **4.5:1 Kontrast**: WCAG AA, besser AAA (7:1)
4. **Max 2 Taps**: Jede wichtige Aktion in max 2 Taps erreichbar
5. **Siezen**: Ruhig, sachlich, respektvoll
6. **Offline-Fallback**: Letzter bekannter Stand bei Netzausfall
7. **DSGVO**: Keine Daten auf dem Pi gespeichert, alles in Supabase EU
