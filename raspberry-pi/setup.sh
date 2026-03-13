#!/bin/bash
# =============================================================================
# Nachbar.io Senioren-Terminal — Raspberry Pi 5 Setup
# =============================================================================
#
# Ausfuehren nach erstem Boot mit:
#   sudo bash setup.sh <DEVICE_TOKEN>
#
# Voraussetzungen:
#   - Raspberry Pi 5 mit 10" Touchscreen
#   - Raspberry Pi OS Lite (64-bit) geflasht
#   - WiFi oder Ethernet verbunden
#   - SSH aktiviert
# =============================================================================

set -euo pipefail

DEVICE_TOKEN="${1:?Fehler: Bitte Device-Token als erstes Argument uebergeben.}"
TERMINAL_URL="https://nachbar-io.vercel.app/terminal/${DEVICE_TOKEN}"
INSTALL_DIR="/home/pi/nachbar-terminal"

echo "============================================="
echo "  Nachbar.io Senioren-Terminal Setup"
echo "============================================="
echo "Token:  ${DEVICE_TOKEN:0:8}..."
echo "URL:    ${TERMINAL_URL}"
echo "Ziel:   ${INSTALL_DIR}"
echo "============================================="
echo ""

# 1. System aktualisieren
echo ">>> [1/10] System aktualisieren..."
apt-get update -qq
apt-get upgrade -y -qq

# 2. Pakete installieren
echo ">>> [2/10] Pakete installieren..."
apt-get install -y -qq \
  cage \
  chromium-browser \
  python3-pip \
  python3-gpiozero \
  python3-websockets \
  unattended-upgrades \
  openssh-server

# 3. Terminal-Verzeichnis erstellen
echo ">>> [3/10] Verzeichnisse erstellen..."
mkdir -p "${INSTALL_DIR}/gpio-bridge"

# 4. GPIO-Bridge kopieren
echo ">>> [4/10] GPIO-Bridge installieren..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "${SCRIPT_DIR}/gpio-bridge/bridge.py" "${INSTALL_DIR}/gpio-bridge/"
cp "${SCRIPT_DIR}/gpio-bridge/requirements.txt" "${INSTALL_DIR}/gpio-bridge/"
chown -R pi:pi "${INSTALL_DIR}"

# 5. Kiosk-Startskript erstellen
echo ">>> [5/10] Kiosk-Startskript erstellen..."
cat > "${INSTALL_DIR}/start-kiosk.sh" << KIOSK
#!/bin/bash
# Nachbar.io Terminal Kiosk — automatisch gestartet via systemd
# Warte auf Netzwerk
sleep 5

exec cage -- chromium-browser \\
  --kiosk \\
  --noerrdialogs \\
  --disable-infobars \\
  --disable-session-crashed-bubble \\
  --disable-translate \\
  --no-first-run \\
  --start-fullscreen \\
  --autoplay-policy=no-user-gesture-required \\
  --use-fake-ui-for-media-stream \\
  --enable-features=WebRTCPipeWireCapturer \\
  --check-for-update-interval=86400 \\
  "${TERMINAL_URL}"
KIOSK
chmod +x "${INSTALL_DIR}/start-kiosk.sh"

# 6. Systemd Service: Kiosk
echo ">>> [6/10] Kiosk-Service installieren..."
cat > /etc/systemd/system/nachbar-kiosk.service << SERVICE
[Unit]
Description=Nachbar.io Kiosk Terminal
After=graphical.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
Environment=XDG_RUNTIME_DIR=/run/user/1000
ExecStart=${INSTALL_DIR}/start-kiosk.sh
Restart=always
RestartSec=10

[Install]
WantedBy=graphical.target
SERVICE

# 7. Systemd Service: GPIO-Bridge
echo ">>> [7/10] GPIO-Bridge Service installieren..."
cp "${SCRIPT_DIR}/gpio-bridge/gpio-bridge.service" /etc/systemd/system/

# 8. Services aktivieren
echo ">>> [8/10] Services aktivieren..."
systemctl daemon-reload
systemctl enable nachbar-kiosk.service
systemctl enable gpio-bridge.service

# 9. Hardware-Watchdog aktivieren
echo ">>> [9/10] Watchdog konfigurieren..."
if ! grep -q "RuntimeWatchdogSec" /etc/systemd/system.conf; then
  echo "RuntimeWatchdogSec=30" >> /etc/systemd/system.conf
  echo "  Watchdog aktiviert (30s Timeout)"
else
  echo "  Watchdog bereits konfiguriert"
fi

# 10. Auto-Login fuer User pi
echo ">>> [10/10] Auto-Login konfigurieren..."
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << AUTO
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I \$TERM
AUTO

echo ""
echo "============================================="
echo "  Setup abgeschlossen!"
echo "============================================="
echo ""
echo "  Terminal-URL: ${TERMINAL_URL}"
echo "  GPIO-Bridge:  ws://localhost:8765"
echo ""
echo "  Neustart mit:  sudo reboot"
echo "  Das Terminal startet automatisch."
echo ""
echo "  Fernwartung:   ssh pi@$(hostname -I | awk '{print $1}')"
echo "  Logs Kiosk:    journalctl -u nachbar-kiosk -f"
echo "  Logs GPIO:     journalctl -u gpio-bridge -f"
echo "============================================="
