"""
GPIO-Bridge fuer Nachbar.io Senioren-Terminal
WebSocket-Server auf localhost:8765
Steuert: Buzzer, LED, Display-Helligkeit

Gestartet als systemd-Service auf dem Raspberry Pi 5.
Kommuniziert mit der Terminal-Web-App via WebSocket.
"""
import asyncio
import json
import logging
from datetime import datetime

try:
    from gpiozero import Buzzer, LED
    GPIO_AVAILABLE = True
except ImportError:
    GPIO_AVAILABLE = False
    logging.warning("gpiozero nicht verfuegbar — GPIO deaktiviert (Desktop-Modus)")

import websockets

# GPIO Pins (kompatibel mit ESP32 Companion Konfiguration)
BUZZER_PIN = 45
LED_PIN = 6

buzzer = Buzzer(BUZZER_PIN) if GPIO_AVAILABLE else None
led = LED(LED_PIN) if GPIO_AVAILABLE else None

# Buzzer-Muster: Liste von (on_sekunden, off_sekunden)
PATTERNS = {
    "medication": [(0.2, 0.1)] * 3,     # 3x kurz piepen — Medikamenten-Erinnerung
    "checkin": [(0.5, 0.0)],             # 1x lang — Check-in Bestaetigung
    "emergency": [(0.1, 0.1)] * 10,      # 10x schnell — Notruf / SOS
    "alert": [(0.3, 0.2)] * 2,           # 2x mittel — Neue Meldung
    "notification": [(0.15, 0.1)] * 2,   # 2x kurz — Allgemeine Benachrichtigung
}


async def play_buzzer(pattern_name: str):
    """Buzzer-Muster abspielen"""
    if not buzzer:
        logging.debug(f"Buzzer-Muster '{pattern_name}' (simuliert — kein GPIO)")
        return
    pattern = PATTERNS.get(pattern_name, PATTERNS["alert"])
    for on_time, off_time in pattern:
        buzzer.on()
        await asyncio.sleep(on_time)
        buzzer.off()
        if off_time > 0:
            await asyncio.sleep(off_time)
    logging.info(f"Buzzer-Muster '{pattern_name}' abgespielt")


async def set_led(mode: str):
    """LED-Modus setzen: on, off, blink"""
    if not led:
        logging.debug(f"LED-Modus '{mode}' (simuliert — kein GPIO)")
        return
    if mode == "on":
        led.on()
    elif mode == "off":
        led.off()
    elif mode == "blink":
        led.blink(on_time=0.5, off_time=2.5)
    logging.info(f"LED-Modus: {mode}")


async def set_brightness(level: int):
    """Display-Helligkeit setzen (0-255), Minimum 10 fuer Nachtmodus"""
    clamped = max(10, min(255, level))
    try:
        with open("/sys/class/backlight/rpi_backlight/brightness", "w") as f:
            f.write(str(clamped))
        logging.info(f"Display-Helligkeit: {clamped}/255")
    except FileNotFoundError:
        # Alternative Pfade fuer verschiedene Display-Treiber
        alt_paths = [
            "/sys/class/backlight/10-0045/brightness",
            "/sys/class/backlight/backlight/brightness",
        ]
        for path in alt_paths:
            try:
                with open(path, "w") as f:
                    f.write(str(clamped))
                logging.info(f"Display-Helligkeit via {path}: {clamped}/255")
                return
            except FileNotFoundError:
                continue
        logging.warning("Kein Backlight-Interface gefunden — Helligkeit nicht steuerbar")


async def handle_message(websocket):
    """WebSocket-Nachrichten verarbeiten"""
    logging.info(f"Client verbunden: {websocket.remote_address}")
    try:
        async for message in websocket:
            try:
                cmd = json.loads(message)
                action = cmd.get("action")
                logging.debug(f"Befehl empfangen: {action}")

                if action == "buzzer":
                    await play_buzzer(cmd.get("pattern", "alert"))
                    await websocket.send(json.dumps({"ok": True, "action": "buzzer"}))

                elif action == "led":
                    await set_led(cmd.get("mode", "off"))
                    await websocket.send(json.dumps({"ok": True, "action": "led"}))

                elif action == "brightness":
                    await set_brightness(cmd.get("level", 255))
                    await websocket.send(json.dumps({"ok": True, "action": "brightness"}))

                elif action == "ping":
                    await websocket.send(json.dumps({
                        "ok": True,
                        "action": "pong",
                        "time": datetime.now().isoformat(),
                        "gpio": GPIO_AVAILABLE,
                    }))

                elif action == "status":
                    await websocket.send(json.dumps({
                        "ok": True,
                        "gpio": GPIO_AVAILABLE,
                        "buzzer_patterns": list(PATTERNS.keys()),
                        "led_modes": ["on", "off", "blink"],
                    }))

                else:
                    await websocket.send(json.dumps({
                        "ok": False,
                        "error": f"Unbekannte Aktion: {action}",
                    }))

            except json.JSONDecodeError:
                await websocket.send(json.dumps({"ok": False, "error": "Ungueltiges JSON"}))
    except websockets.exceptions.ConnectionClosed:
        logging.info("Client getrennt")


async def heartbeat_led():
    """LED blinkt als Heartbeat — zeigt dass der Service laeuft"""
    if not led:
        return
    while True:
        led.on()
        await asyncio.sleep(0.1)
        led.off()
        await asyncio.sleep(2.9)


async def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [GPIO-Bridge] %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    logging.info("=== Nachbar.io GPIO-Bridge gestartet ===")
    logging.info(f"GPIO verfuegbar: {GPIO_AVAILABLE}")
    logging.info("WebSocket-Server: ws://localhost:8765")

    # Heartbeat-LED im Hintergrund starten
    asyncio.create_task(heartbeat_led())

    # WebSocket-Server starten
    async with websockets.serve(handle_message, "localhost", 8765):
        logging.info("Warte auf Verbindungen...")
        await asyncio.Future()  # Laeuft endlos


if __name__ == "__main__":
    asyncio.run(main())
