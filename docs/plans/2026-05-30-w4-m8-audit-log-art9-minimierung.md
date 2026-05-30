# W4/M8 — Art.-9-Klartext aus dem care_audit_log entfernen

**Datum:** 2026-05-30
**Repo:** `nachbar-io`
**Status:** Code fertig + verifiziert. **Lokaler Commit, kein Push** (Founder-Go offen).
**Finding:** W4 (`docs/plans/2026-05-29-dsgvo-pilot-readiness-audit.md`) = M8 (`docs/plans/2026-05-29-security-tiefenaudit.md`), Block A.

---

## Befund

Art.-9-Gesundheitsdaten standen im **Klartext** im `care_audit_log.metadata` (freies jsonb), **obwohl die Quellspalten AES-verschlüsselt sind** (`field-encryption.ts`). Das Audit-Log unterlief damit die Verschlüsselung. Verstoß gegen Art. 9, Art. 32 und Datenminimierung (Art. 5 Abs. 1 lit. c).

**Klartext-Schreibstellen (Pre-Check, codebase-weit):**
| Stelle | Sensibles Feld |
|---|---|
| `cron-medications.service.ts:240` | `medicationName` (Medikamentenname) |
| `medications.service.ts:163` | `name` (Medikamentenname) |
| `sos.service.ts:461` | `notes` (SOS-Notiz, frei) |
| `tasks.service.ts:206` + `:426` | `title` (Care-Task-Titel, frei) |

**Consumer-Check (entscheidend, damit Minimierung nichts bricht):**
- Report-Generator (`reports/generator.ts:120`) liest aus `care_audit_log` nur `created_at, event_type, actor_id` — **kein metadata**.
- `useAuditLog`/`AuditLogViewer.tsx:129` zeigt metadata nur generisch als `JSON.stringify`-Dump → nach Minimierung einfach weniger Felder, **kein Crash**, und das Klartext-Leck im Viewer ist mit weg.
- Niemand referenziert die entfernten Felder gezielt.

---

## Lösung (Datenminimierung + Defense-in-Depth)

**1. Zentrale Sanitization in `audit.ts`** — neue `sanitizeAuditMetadata()` mit Denylist (`SENSITIVE_METADATA_KEYS`: name, medicationname, notes, note, title, message, content, text, description, body, summary; case-insensitiv). `writeAuditLog()` ruft sie vor dem Insert. → Auch künftige versehentliche PII-Felder werden zentral abgefangen.

**2. 5 Call-Sites bereinigt** — Freitext-PII direkt aus dem metadata entfernt; **IDs, Status, Kategorien, Aktionen bleiben** (für Nachvollziehbarkeit). Die sensiblen Werte bleiben verschlüsselt in den Quelltabellen; `reference_id` zeigt darauf.

### TDD
RED zuerst (4 Tests scheiterten, `name` kam ungefiltert durch) → nach Sanitization **4/4 grün** (`audit.test.ts`).

---

## Mini-Audit W4/M8 (2026-05-30)

```
Mini-Audit W4/M8 (2026-05-30):
- RLS/Trigger geprueft: care_audit_log (append-only, UPDATE/DELETE per Trigger blockiert) — KEIN
  Schema-/RLS-Change, nur Inhalt (weniger PII) geaendert.
- Findings: W4/M8 (Art.-9-Klartext im Audit-Log) -> GESCHLOSSEN via zentrale Metadata-Sanitization
  + Call-Site-Minimierung. 0 neue Findings.
- Audit-Trail: unveraendert funktional (event_type/actor/reference_id/timestamp bleiben; nur
  Freitext-PII raus). Rate-Limit: nicht einschlaegig.
```

Kein CRITICAL/HIGH neu → kein STOP.

---

## Verifikation (lokal)
- `npx tsc --noEmit` → **OK** (keine unused-vars: `name`/`schedule`/`notes`/`title` werden weiter beim verschlüsselten Speichern genutzt).
- `npx vitest run care` → **1033/1033 grün** (117 Dateien, inkl. 4 neue audit-Tests).
- `eslint` (6 Dateien) → **clean**.

---

## Offen / nächste Schritte
- **Rote Zone (Founder-Go):** Commit pushen + Deploy.
- **Verwandt (W3):** TOMs §7 behauptet „Encryption auf ALLEN Care-Feldern" — freie jsonb-metadata-Felder waren die Lücke; mit dieser Welle strukturell adressiert. TOMs-Text ggf. präzisieren.
- **Block A Rest:** B1/W6/W7 (AVV-Register an realen Code), H2 Teil 2 (nachbar-admin residents/* Quarter-Scoping), invite_code-REVOKE.
