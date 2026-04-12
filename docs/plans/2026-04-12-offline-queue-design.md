# J-5: Offline Check-in & Heartbeat Queue

**Datum:** 2026-04-12
**Problem:** Wenn ein Senior offline ist, gehen Heartbeat-POSTs verloren. Nach 48h ohne Heartbeat wird ein falscher SOS-Alarm an die Familie geschickt.
**Ziel:** Fehlgeschlagene POSTs zwischenspeichern und bei Reconnect automatisch nachsenden.

## Ansatz: IndexedDB Queue + Online-Event

Background Sync API ist keine Option (kein iOS-Support vor 18.4+, Zielgruppe 65+ mit aelteren Geraeten). Stattdessen: generische Offline-Queue mit IndexedDB und `online`-Event.

## Architektur

```
POST fehlschlaegt (fetch error / !navigator.onLine)
       |
       v
  offlineQueue.enqueue(url, body)
       |
       v
  IndexedDB "offline_queue" store
       |
       v
  online-Event / App-Mount / Heartbeat-Tick
       |
       v
  offlineQueue.flush() --> POST nachsenden --> bei Erfolg loeschen
```

## Komponenten

### 1. `lib/offline-queue.ts` — Generische Queue

- **Store:** IndexedDB Datenbank `nachbar_offline`, Object Store `queue`
- **Schema:** `{ id: auto, url: string, body: string, createdAt: number }`
- **enqueue(url, body):** Speichert Request. Max 50 Eintraege, aelteste werden verworfen.
- **flush():** Iteriert Queue FIFO, sendet POST. Bei Erfolg (2xx): Eintrag loeschen. Bei Fehler: stoppen (immer noch offline).
- **count():** Anzahl Eintraege (fuer UI/Debugging).
- **Deduplizierung:** Beim Enqueue pruefen ob bereits ein Heartbeat-Eintrag < 60s alt existiert. Wenn ja, ueberspringen.
- **TTL:** Eintraege aelter als 72h beim Flush verwerfen (wuerde Eskalation nicht mehr verhindern).

### 2. `public/sw.js` Erweiterung

Nicht im Service Worker — die Queue laeuft im Main Thread. Gruende:
- IndexedDB im SW ist umstaendlich mit Message-Passing
- `useHeartbeat` Hook hat bereits den Lifecycle
- Einfacher zu testen

### 3. `modules/care/hooks/useHeartbeat.ts` Erweiterung

- Bei fehlgeschlagenem `fetch`: `offlineQueue.enqueue("/api/heartbeat", body)`
- Bei Mount und bei `online`-Event: `offlineQueue.flush()`
- Bestehende Rate-Limiting bleibt (1x pro 60s)

### 4. Check-in UI Erweiterung

- `DailyCheckinButton.tsx`: Bei Offline-Fehler → `offlineQueue.enqueue()`
- UI-Feedback: "Wird gesendet sobald Sie wieder online sind" statt "Verbindungsfehler"
- Bei `flush()` Erfolg: Status aktualisieren

## Testplan

- **Unit:** `lib/offline-queue.ts` mit fake-indexeddb
- **Unit:** `useHeartbeat` — Mock offline, pruefen dass enqueue aufgerufen wird
- **Unit:** `useHeartbeat` — Mock online-Event, pruefen dass flush aufgerufen wird
- **Unit:** DailyCheckinButton — Offline-Feedback statt Fehlermeldung
- **Unit:** TTL — Eintraege > 72h werden beim Flush verworfen
- **Unit:** Deduplizierung — kein doppelter Heartbeat < 60s
- **Unit:** Max 50 Eintraege — aelteste werden bei Overflow verworfen

## Nicht im Scope

- Background Sync API (kein iOS-Support)
- Service Worker POST-Interception (zu komplex fuer den Gewinn)
- Offline-Indikator-Banner (separater Task, nice-to-have)
