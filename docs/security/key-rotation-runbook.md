# Runbook: Rotation des Care-Verschlüsselungsschlüssels

**Stand:** 2026-07-04 (eingeführt mit Key-Versionierung, Architektur-Review Befund R6)
**Gilt für:** `CARE_ENCRYPTION_KEY*` (AES-256-GCM-Feldverschlüsselung: Medikamente, SOS-/Check-in-Notizen, Versichertennummer, Notfallkontakt-Telefon u. a. — Feldliste in `modules/care/services/field-encryption.ts`).

## Wie die Versionierung funktioniert

- `CARE_ENCRYPTION_KEY` = **Version 1** (Bestand, unverändert).
- `CARE_ENCRYPTION_KEY_V2`, `_V3`, … = Rotations-Keys (je 64-stelliger Hex-String = 32 Bytes).
- **Verschlüsselt** wird immer mit der höchsten konfigurierten Version.
- **Entschlüsselt** wird jede Version: alte Payloads bleiben ohne Re-Encrypt lesbar.
- Payload-Formate: `aes256gcm:v1:iv:tag:ct` (Key 1, byte-kompatibel zum Bestand) bzw. `aes256gcm:v2:<keyId>:iv:tag:ct` (ab Key 2).

## ⚠️ Cross-App-Regel (WICHTIG, zuerst lesen)

`nachbar-arzt`, `nachbar-pflege` und `nachbar-admin` besitzen **Kopien** von `crypto.ts` und lesen dieselben DB-Payloads. Ein v2-Payload erscheint erst, wenn ein Rotations-Key konfiguriert wird — **vorher** müssen die Kopien in allen drei Apps auf den versionsfähigen Stand gebracht werden (Datei 1:1 übernehmen), sonst können sie neue Datensätze nicht mehr entschlüsseln. (Grundproblem „kopierte Crypto in 4 Apps" ist Architektur-Befund R3; Ziel: shared Package.)

## Rotations-Ablauf (geplant, kein Notfall)

1. **Kopien angleichen:** versionsfähige `crypto.ts` in arzt/pflege/admin ausrollen (deployen). Verhalten ändert sich dadurch noch NICHT.
2. **Neuen Key erzeugen:** `openssl rand -hex 32` (NICHT im Chat/Commit/Log ablegen).
3. **Key setzen:** `CARE_ENCRYPTION_KEY_V2` in Vercel-Env ALLER vier Apps setzen (rote Zone: Founder). Alten Key NICHT entfernen.
4. **Deploy + Smoke:** neue Schreibvorgänge erzeugen `v2:2:`-Payloads; alte bleiben lesbar. Test: ein Care-Feld schreiben + lesen, ein Bestandsfeld lesen.
5. **Optional, Hintergrund-Re-Encrypt:** Batch-Job liest v1-Payloads und schreibt sie neu (dann v2). Erst wenn 0 v1-Payloads übrig sind UND alle Backups außerhalb der Aufbewahrungsfrist sind, darf `CARE_ENCRYPTION_KEY` entfernt werden. Vorher NIE.

## Notfall-Ablauf (Key-Kompromittierung)

Wie oben, aber: Schritt 3 sofort (neuer Key stoppt die Ausbreitung für NEUE Daten), danach Re-Encrypt (Schritt 5) mit Priorität statt „optional", plus Incident-Doku nach `feedback_security_incident_response` (Fix-then-Retest) und DSGVO-Bewertung (Meldepflicht-Prüfung Art. 33/34).

## Bekannte Grenzen / Follow-ups

- **Backups:** PITR-/Backup-Snapshots enthalten v1-Payloads — der alte Key muss so lange sicher verwahrt bleiben, wie Backups existieren, die ihn brauchen.
- **`lib/civic/encryption.ts`** (CIVIC_ENCRYPTION_KEY, Civic-Postfach) hat eine eigene, NICHT versionierte Implementierung (Prefix `civic:`) — gleiche Rotations-Lücke, eigener Follow-up (Backlog, vor Civic-Go-Live).
- Re-Encrypt-Batch-Job existiert noch nicht (erst nötig, wenn tatsächlich rotiert wird).
