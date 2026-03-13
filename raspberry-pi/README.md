# Nachbar.io Senioren-Terminal — Raspberry Pi 5

## Hardware

- Raspberry Pi 5 (4GB oder 8GB)
- 10" IPS Touchscreen (1280x800)
- USB-C Netzteil 5V/5A (Pi) + 12V/2A (Display)
- Optional: USB-Webcam + Mikrofon (fuer Sprechstunde)

## Setup

### 1. Raspberry Pi OS flashen

1. Raspberry Pi Imager oeffnen
2. Modell: **Raspberry Pi 5**
3. OS: **Raspberry Pi OS Lite (64-bit)**
4. Speicher: SD-Karte auswaehlen
5. Einstellungen:
   - Hostname: `nachbar-terminal`
   - SSH aktivieren
   - WiFi konfigurieren
   - Benutzer: `pi` / Passwort setzen
6. Schreiben

### 2. Erster Boot + Setup

```bash
# Per SSH verbinden
ssh pi@nachbar-terminal.local

# Repository klonen oder Dateien kopieren
scp -r raspberry-pi/ pi@nachbar-terminal.local:~/setup/

# Setup ausfuehren mit Device-Token
sudo bash ~/setup/setup.sh DEIN_DEVICE_TOKEN_HIER

# Neustarten
sudo reboot
```

### 3. Pruefen

Nach dem Neustart sollte:
- Chromium im Vollbild die Terminal-UI anzeigen
- Die GPIO-Bridge auf ws://localhost:8765 laufen
- Die LED als Heartbeat blinken

## Logs

```bash
# Kiosk-Logs
journalctl -u nachbar-kiosk -f

# GPIO-Bridge-Logs
journalctl -u gpio-bridge -f
```

## Fernwartung

```bash
# SSH
ssh pi@nachbar-terminal.local

# VNC (optional installieren)
sudo apt install realvnc-vnc-server
```

## Troubleshooting

| Problem | Loesung |
|---------|---------|
| Schwarzer Bildschirm | `journalctl -u nachbar-kiosk` pruefen |
| Kein Touch | Display-Kabel pruefen, evtl. Touch-Treiber |
| Kein Netzwerk | `nmcli` oder `/etc/wpa_supplicant/wpa_supplicant.conf` |
| GPIO nicht verfuegbar | `pip3 install gpiozero` und Service neustarten |
