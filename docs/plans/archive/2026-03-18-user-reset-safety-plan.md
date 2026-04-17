# User-Reset Safety Plan — QuartierApp

**Datum:** 2026-03-18
**Verifiziert gegen:** Live-DB (Supabase uylszchlyhbpbmslcnka) + Repo-Schema
**Geltungsbereich:** Pilotbetrieb Bad Säckingen

---

## Kurzfazit

- **Supabase-Dashboard:** Komplett unabhängig von `auth.users`. Aussperren unmöglich.
- **App-Admin:** Einziger Admin ist `thomasth@gmx.de` (`is_admin = true`). Wenn dieser gelöscht wird, ist kein App-Admin mehr vorhanden. Recovery per SQL im Dashboard jederzeit möglich.
- **Empfehlung:** Nur Test-User löschen, Admin-Account beibehalten.

---

## Trennung der Ebenen

| Ebene | Beschreibung | Betroffen bei User-Reset? |
|-------|-------------|--------------------------|
| **Supabase-Projektzugang** | Login auf supabase.com (ClaudeTheo-Account). Eigene Credentials, eigene Session. | **NEIN** |
| **App-User** (`auth.users`) | Registrierte QuartierApp-Nutzer. Authentifizierung via OTP/Magic Link. | **JA** — wird gelöscht |
| **App-Admin** (`public.users.is_admin`) | Boolean-Flag in der `users`-Tabelle. Einziger Schutzmechanismus für Admin-Panel und Admin-API-Routen. | **JA** — wird mit-gelöscht (CASCADE von `auth.users` → `public.users`) |

**Wichtig:** `public.users.id` = `auth.users.id` (gleiche UUID). Wenn ein `auth.users`-Eintrag gelöscht wird, kaskadiert das auf `public.users` und alle abhängigen Tabellen.

---

## CASCADE-Abhängigkeiten (verifiziert)

Beim Löschen eines Users aus `auth.users` werden folgende Daten **unwiderruflich** gelöscht:

| Tabelle | Lösch-Regel | Datentyp |
|---------|------------|----------|
| `public.users` (Profil) | CASCADE | Profildaten |
| `household_members` | CASCADE | Wohn-Zuordnung |
| `heartbeats` | CASCADE | Lebenszeichen |
| `caregiver_links` | CASCADE | Familien-Verbindungen |
| `care_profiles` | CASCADE | Care-Daten |
| `care_subscriptions` | CASCADE | Abo-Status |
| `escalation_events` | CASCADE | Notfall-Verlauf |
| `notifications` | CASCADE | Benachrichtigungen |
| `push_subscriptions` | CASCADE | Push-Registrierungen |
| `marketplace_items` | CASCADE | Marktplatz |
| `senior_checkins` | CASCADE | Check-in-Historie |
| `video_calls` | CASCADE | Anruf-Historie |

**Erhalten bleiben:** `households`, `quarters`, `news_items`, Invite-Codes, Storage-Dateien.

**Tabellen mit `NO ACTION` / `SET NULL`:** `alerts`, `care_medications`, `care_appointments`, `appointments`, `organizations` — diese blockieren das Löschen oder setzen den FK auf NULL.

---

## Verifizierter Bootstrap-Weg

### Voraussetzung

Der Trigger `enforce_user_defaults` (Migration 014) erzwingt bei **INSERT** auf `public.users`:
- `trust_level := 'new'`
- `is_admin := false`

Der Trigger feuert **nicht** bei UPDATE. Daher: Admin-Rechte können nur per SQL-UPDATE vergeben werden (nicht über die App).

### Finales Bootstrap-SQL

Im Supabase Dashboard → SQL Editor ausführen:

```sql
-- Schritt 1: Neuen User normal registrieren (ueber /register + Invite-Code)
-- Schritt 2: Admin-Rechte per SQL setzen:

UPDATE public.users
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'thomasth@gmx.de'
)
AND id IS NOT NULL;

-- Verifizieren:
SELECT id, display_name, is_admin, role
FROM public.users
WHERE is_admin = true;
```

**Warum dieser Weg korrekt ist:**
- JOIN über `auth.users.email` (nicht `email_hash` — das Feld ist leer `""` in allen Einträgen)
- `UPDATE` umgeht den Insert-Trigger (feuert nur bei INSERT)
- SQL Editor nutzt `service_role` → kein RLS-Problem
- Keine Hardcoded-IDs nötig — funktioniert mit jeder E-Mail-Adresse

---

## Sicherer Ablauf

### Vor dem Reset

```
1. [ ] CI/Deploy ist gruen
2. [ ] Manueller Test Flow 1 (Registrierung) bestanden
3. [ ] Manueller Test Flow 2 (Login) bestanden
4. [ ] Bootstrap-SQL verifiziert (siehe oben)
5. [ ] Entscheidung: Welche User loeschen?
       → Test-User: test@test.tt, test@test.de, hu@gmn.de, hans@gmx.de,
         pilot-test@nachbar.io, testuser-e2e@nachbar-test.de
       → Klaeren: nedjo1984@hotmail.com, tobias.gebler@web.de (echt oder Test?)
       → NICHT LOESCHEN: thomasth@gmx.de (einziger Admin!)
```

### Reset durchführen

```
6. [ ] Admin-Login verifizieren (thomasth@gmx.de → /admin erreichbar)
7. [ ] Backup bestaetigen (Supabase Dashboard → Database → Backups)
8. [ ] Test-User loeschen (Supabase Dashboard → Authentication → User loeschen)
       REIHENFOLGE: Test-User zuerst, Admin NIEMALS
9. [ ] Admin-Login erneut verifizieren
10. [ ] App-Funktionen testen (Dashboard, Admin-Panel, Quartierskarte)
```

### Falls Admin versehentlich gelöscht wurde

```
1. Neuen User registrieren (ueber /register + Invite-Code)
2. Bootstrap-SQL im Supabase Dashboard ausfuehren (siehe oben)
3. Admin-Dashboard verifizieren
```

---

## Empfehlung

### Nur Test-User löschen (Standard)

- Admin-Account (`thomasth@gmx.de`) beibehalten
- Nur eindeutige Test-Accounts löschen
- Unklare Accounts (Nedi, Tobias) vorher klären

### Vollständiger Reset (Ausnahme)

Nur vertretbar wenn:
- Bewusst ein kompletter Neustart gewünscht ist
- Keine produktiven Daten existieren (Pilot noch nicht gestartet)
- Bootstrap-SQL vorbereitet und getestet ist

---

## Go / No-Go

**Kein User-Reset bevor:**
- [ ] CI/Deploy grün
- [ ] Manueller Test Flow 1 + 2 bestanden
- [ ] Bootstrap-SQL verifiziert

**GO für Test-User-Reset** — sobald alle drei Bedingungen erfüllt.
**NO-GO für vollständigen Reset** — nicht nötig, Admin-Account beibehalten.
