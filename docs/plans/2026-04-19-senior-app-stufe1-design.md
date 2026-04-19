# Senior App — Stufe 1 Design (Pilot Ship-Fast)

**Datum:** 2026-04-19
**Status:** Design abgestimmt (Thomas/Claude), nicht in Code
**Folge-Dokument:** Implementation Plan via `superpowers:writing-plans` Skill
**Referenzen:**
- Reality-Check Audit (diese Session) — 70 % schon gebaut
- `project_senior_memory_layer.md` — existierender Memory-Plan (wird hier übernommen)
- `docs/plans/archive/2026-03-31-senior-memory-layer-design.md` (589 Z.)
- `docs/plans/archive/2026-03-31-senior-memory-layer-implementation.md` (2042 Z.)

---

## Ziel

Die „Senior App" auf **Windows** (AWOW Mini-PC zu Hause), **Android** (Google Play) und **iOS** (App Store) ausliefern — **eine Web-Codebase**, drei dünne Wrapper. Erstinstallation leicht machen (QR-Pairing), KI-geführtes Onboarding, Care-Access für Angehörige/Pflege per QR-Scan, Notfall-Karte ohne Login.

**Scope (X = Ship-Fast, ~3 Wochen):**
- Windows/Android/iOS Wrapper gehen live
- QR-Onboarding + Long-Lived-Refresh-Token funktionieren
- KI-Onboarding-Dialog (Claude Haiku) + Senior-Memory UI + Angehörigen-Edit
- Care-Access Familie (A) live; B, C, Pflegeheim als Feature-Flags, OFF
- Notfall-Karte (E) nutzt existierende `emergency_profiles`, QR-Scan-Einstieg neu gebaut

**Out of Scope Stufe 1:** Pflegerin-Portal (B), Pflegefirma/Heim (C), Abrechnung, Vitaldaten-Zeitreihen, Pflegeheim-Zulassung.

---

## Sektion 1 — Technische Architektur

**Eine Web-Codebase, drei Wrapper:**

```
         nachbar-io  (Next.js 16, App Router)
                │
         app/(senior)/*   ← Web-Content (8 Seiten, 20 px/80 px Senior-UX)
                │
    ┌───────────┴────────────┐
    ▼                         ▼
Tauri 2.x Windows        Capacitor 8.2
  (für AWOW)           ├── Android (Play Store)
                       └── iOS (App Store)
```

### Wrapper-Aufgaben

| Plattform | Technik | Funktion des Wrappers |
|---|---|---|
| Windows | Tauri 2.x | Lädt `https://nachbar-io.vercel.app/senior/home` im Vollbild, registriert Device-ID, stellt Kamera + Push bereit |
| Android | Capacitor 8.2 (existiert) | wie oben + native Kamera-/Push-Plugins + App-Icon-Store |
| iOS | Capacitor 8.2 (existiert) | wie oben + Apple Intelligence-Hook (später, Stufe 2) |

### Was gelöscht wird
- `nachbar-kiosk/` (Pi 5 / Ubuntu, 12 000 Z. Rust + lokales HTML) → **komplett gelöscht**, weil obsolet. Konzepte wie Piper-TTS können später (Stufe 2) reaktiviert werden.

### Offline-Strategie (Stufe 1 minimal)
- Service Worker cached letzte Check-ins, Medis, Memory-Übersicht — 24 h.
- Kein voller Offline-Mode. AWOW hat WLAN, Tablets fast immer auch.

---

## Sektion 2 — Onboarding: QR-Pairing + Long-Lived-Token

**Problem:** Senior scheitert am Login. Lösung: Senior tippt **nie** Zugangsdaten.

### Weg 1 — QR-Pairing (bevorzugt)

1. Neu-installierte Senior-App: startet, zeigt großen Button „Angehörigen bitten mich einzurichten" → Vollbild-QR.
2. Angehöriger öffnet QuartierApp auf seinem Handy → Menü „Senior einrichten" → Kamera → scannt QR.
3. Backend erzeugt `device_pairing_token` (JWT, 10 min, single-use, signiert). Angehörigen-App POST `/api/device/pair`.
4. Angehöriger wählt (oder erstellt) den Senior-Account, bestätigt.
5. Senior-Gerät pollt Token-Endpoint → bekommt **Long-Lived-Refresh-Token (6 Monate Gültigkeit, Auto-Refresh bei jedem Online-Kontakt)**.
6. Senior-Gerät zeigt personalisierten Welcome → KI-Onboarding beginnt (Sektion 3).

### Weg 2 — 8-stelliger Code (wenn Angehöriger remote)

**Wiederverwendung existierend:** Tabelle `caregiver_invites` (Mig 071 verwandt, ggf. Sub-Schema) hat bereits 8-stellige Codes mit 24h TTL und single-use. Adapter nötig, um die Codes als „Pairing-Codes" zu verwenden.

- Angehöriger in App → „Senior einladen" → tippt Name + Beziehung → bekommt 8-stelligen Code.
- Senior-Gerät → „Ich habe einen Code bekommen" → großer Nummernblock → Code eingeben.
- Rest wie Weg 1.

### Weg 3 — Magic-Link-Fallback
Bestehender E-Mail-Flow für Senior-Selbstanmeldung. Unverändert.

### Neue Tabelle

```sql
-- Migration 171 (neu)
create table public.device_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  device_id text not null,        -- Capacitor Device.getId() / Tauri Machine-UUID
  token_hash text not null,        -- SHA256 des Token
  pairing_method text not null,    -- 'qr' | 'code' | 'magic_link'
  created_at timestamptz default now(),
  last_used_at timestamptz default now(),
  expires_at timestamptz not null, -- 6 Monate nach Create
  revoked_at timestamptz
);

create index on device_refresh_tokens (user_id) where revoked_at is null;
create index on device_refresh_tokens (expires_at);
```

### Security
- QR-Token signiert (HMAC), 10 min Gültigkeit, single-use (im Redis-Cache markiert).
- Rate-Limit: max 5 Pairing-Versuche pro Stunde pro Angehörigen-Account.
- Audit-Log: jedes Pairing loggt Device-ID + IP.
- Senior kann in Profil → „Angemeldete Geräte" eines per Tap abmelden.

---

## Sektion 3 — KI-Onboarding + Senior-Memory

**Das Schema existiert schon** (Migration 122, genehmigt 2026-03-31). Wir bauen nur Frontend + KI-Integration.

### Kernkonzept (aus `2026-03-31-senior-memory-layer-design.md`)
- **Structured Facts** (nicht Conversation Summaries) — einzeln löschbar (DSGVO Art. 17).
- **3 Consent-Level:** basis (profile/routine/preference/contact), care (care_need), personal.
- **4-stufiger MDR-Schutz:** Kategorie-Regeln → Consent → Scope → Medizin-Blocklist.
- **KI schlägt vor, Server entscheidet** (`save_memory` ist Tool-Call, kein Direkt-Write).
- **AES-256-GCM** für `care_need` + `personal` (nutzt existierendes `lib/care/field-encryption.ts`).

### Onboarding-Dialog (~8 min beim Erst-Start)

Wizard-Schritte, jeweils mit TTS-Voice und großem Text:
1. Anrede + Name („Wie möchten Sie angesprochen werden?")
2. Wohnsituation (allein / mit Partner / …)
3. Wichtige Personen (Kinder, Nachbarn, Hausarzt)
4. Medikamente ja/nein (Details später)
5. Notfallkontakt (112 + 1 Angehöriger)
6. Täglichen Check-in? (Morgen-Erinnerung?)
7. Kachel-Tour der App

**Bei jedem Schritt:** KI fasst zusammen, was sie gespeichert hat, bittet um Bestätigung („Ich habe notiert: Ihr Hausarzt ist Dr. Meier. Passt das?").

### KI-Provider (per Feature-Flag)

| Flag-Wert | Modell | Kosten | DSGVO | Default |
|---|---|---|---|---|
| `AI_PROVIDER=claude` | Claude Haiku 4 | ~1-15 €/Mo Pilot | ADV ✅, Schrems-II grauzone | **Pilot-Default** |
| `AI_PROVIDER=mistral` | Mistral Small (Paris) | ~2 €/Mo Pilot | voll EU | Backup / Kunden-Präferenz |
| `AI_PROVIDER=off` | kein LLM | 0 € | ideal | Paranoia / Fallback |

- **Prompt-Caching** für App-Wissensdokument (5 min TTL, senkt Input-Kosten 90%).
- **RAG-System-Prompt:** Die KI kennt App-Features, Navigation, Quartier Bad Säckingen, DSGVO-Regeln, `senior_memory` des aktuellen Users.

### Wer darf schreiben/lesen Memory

| Rolle | Lesen | Schreiben |
|---|:---:|:---:|
| Senior selbst (KI-Dialog) | ✅ alles | ✅ Selbst-Aussagen |
| Angehöriger (Care-Access A) | ✅ basis + care wenn freigeschaltet | ✅ Notizen, care_need |
| Einzel-Pflege (B, Flag OFF in Pilot) | ✅ nur care | ✅ Visiten-Doku |
| Pflegefirma (C, Flag OFF in Pilot) | wie B, pro Klient | wie B |
| Notfall (E) | nur Notfall-Karte (Sektion 5) | ❌ |

### Offen (im Pilot nicht entschieden)
- Voice-Input beim Onboarding? (Whisper API oder nur Text.) → Pilot nur Text, Stufe 2 Voice.
- Siezen/Duzen: **Siezen** (Brand Guide).

### Wiederverwendet / Neu

| Baustein | Status |
|---|---|
| `user_memory_facts` DB-Schema (Mig 122) | ✅ existiert, Stufe 1 nur verwenden |
| `care_consents` Tabelle (Mig 108) | ✅ erweitern um `memory_basis/care/personal`-Features |
| KI-Integration mit `save_memory` Tool | 🔨 NEU |
| Onboarding-Wizard Frontend | 🔨 NEU |
| Memory-Übersicht (Senior sieht + löscht) | 🔨 NEU |
| Angehörigen-Edit für Memory | 🔨 NEU |

---

## Sektion 4 — Care-Access per QR-Scan

**Drei Flags, alle nutzen denselben Scan-Mechanismus:**

| Flag | Pilot-Default | Beschreibung |
|---|---|---|
| `CARE_ACCESS_FAMILY` | **ON** | Familie/Freunde (A) |
| `CARE_ACCESS_INDIVIDUAL_CAREGIVER` | OFF | Einzel-Pflegerin (B) — Stufe 2 |
| `CARE_ACCESS_CARE_COMPANY` | OFF | Pflegefirma/Heim (C) — Stufe 3, nach Zulassungen |
| `CARE_ACCESS_EMERGENCY` | **ON** | Notfall-Scan (E) |

Neue Admin-UI-Gruppe **„Care-Access"** (analog zur „Gesundheit"-Gruppe).

### Scan-Flow (gemeinsam)

1. Senior-Gerät Profil-Seite → Button „Jemand möchte mich besuchen" → Vollbild-QR.
2. QR enthält `senior_access_token` (JWT, 5 min, signiert, rotiert im Hintergrund).
3. Scanner öffnet eigene App → „Senior scannen" → Kamera → POST `/api/care/access/claim`.
4. Backend prüft:
   - **Bereits verknüpft** (caregiver_links existiert) → direkter Zugriff.
   - **Neu:** Senior-Gerät zeigt Dialog „Frau Schmitt möchte Zugriff — zulassen?" → Senior tippt Bestätigen → neuer Eintrag in `caregiver_links`.
5. Audit-Log: neuer Eintrag in `care_access_audit` (wer, wann, welche Daten).

### A — Familie/Freunde (Pilot-Default)

**Wiederverwendung:** `caregiver_links` (Mig 071) + `caregiver_invites` (existiert). Nur QR-Scan-Entry neu.

Was der Angehörige sieht:
- Dashboard: letzter Check-in, Medi-Status, SOS-Historie 30 Tage.
- Memory (Level basis): profile, routine, preference, contact.
- Memory (Level care): nur wenn Senior explizit freigeschaltet hat.
- **Schreiben:** Notizen in `historische_notizen`, Check-in-Vorschlag, Medi-Abhaken vor Ort.

### B — Einzel-Pflegerin (Flag OFF, Stufe 2 Design)

- Extra Felder: Vitals, Visitenprotokoll, Wunddoku (optional Foto), PDF-Export.
- Neue Tabelle `care_visits_detailed` (erweitert Mig 126) + `vital_measurements` (NEU).

### C — Pflegefirma/Heim (Flag OFF, Stufe 3 Design)

**Wiederverwendung:** `organizations` (Mig 073) + `org_members`. Nur Verknüpfung `senior ↔ organization` + Rollen-Feinschliff neu.

### Security-Punkte
- Scan-Token rotiert alle 5 min.
- Neu-Verknüpfung immer mit Senior-Bestätigung (kein Silent-Pairing).
- Revocation per Tap („Frau Schmitt kommt nicht mehr" → Link geht in `revoked_at`).

### Wiederverwendet / Neu

| Baustein | Status |
|---|---|
| `caregiver_links` + `caregiver_invites` (Mig 071) | ✅ nutzen |
| `organizations` + `org_members` (Mig 073) | ✅ nutzen (für C) |
| `care_consents` (Mig 108) | ✅ erweitern |
| `care_visits` (Mig 126) | ✅ nutzen |
| QR-Token-Generation + Scan-API | 🔨 NEU |
| Admin-UI-Gruppe „Care-Access" | 🔨 NEU (analog Stufe 3 Gesundheit) |
| `care_access_audit` Tabelle | 🔨 NEU |

---

## Sektion 5 — Notfall-Karte (E)

**Praktisch komplett vorhanden.** Wir nutzen `emergency_profiles` (3 Ebenen, AES-256-GCM, QR-Export, öffentlicher Link).

### Was existiert
- Tabelle `emergency_profiles` (level1/2/3, jeweils verschlüsselt).
- UI `NotfallmappeView.tsx` in `nachbar-pflege/` — View + Edit.
- PDF-Export mit QR-Code zu öffentlichem Link (`healthcare.qr/u/<id>`).
- API `GET/PUT /api/emergency-profile`.

### Was Stufe 1 ergänzt
- **Senior-App-Einstieg:** Profil → „Meine Notfall-Karte" → reuses NotfallmappeView in Senior-Design.
- **Öffentliche Notfall-Seite** `/notfall/[token]`: groß, lesbar, nur Level 1 (Allergien, Medis, Notfallkontakt, Blutgruppe, Patientenverfügung ja/nein).
- **Opt-in je Feld:** Senior entscheidet, was öffentlich sichtbar ist (im Profil-Toggle).
- **Rotierbarer Token:** bei Verlust neu generieren.

### Neu
- `/notfall/[token]` öffentliche Seite — NEU (wenige Stunden Arbeit).
- Opt-in-Toggle-Panel in Senior-Profil — NEU.

---

## Sektion 6 — Rechtliches + Ship-Checklist

### DSGVO / Datenschutz
- **AVV mit allen Drittanbietern:**
  - Anthropic (Claude): AVV-Vertrag unterschreiben (Standard-Template verfügbar).
  - Mistral: AVV-Vertrag unterschreiben.
  - Vercel: AVV existiert.
  - Supabase: EU-Frankfurt, AVV existiert.
- **DSFA-Update** auf Stufe 1 der Senior App (AI-Verarbeitung, Memory-Layer).
- **Datenschutzerklärung** erweitern um: KI-Nutzung, Memory-Layer, QR-Scan, Device-Pairing, Notfall-Karte öffentlich.
- **Consent-Historisierung** (existiert via `care_consents`) abdecken für: `ai_onboarding`, `memory_basis`, `memory_care`, `memory_personal`.

### App Stores
- **Google Play Account ($25)** — offen in MEMORY, jetzt fällig.
- **Apple Developer Account** — existiert via Annette Asal.
- **App Store Review Guidelines:** Chat, KI, Gesundheit → entsprechende Labels.
- **Privacy Nutrition Label** (Apple) und **Data safety** (Google) — Pflicht-Angaben vorbereiten.

### Medizinprodukte-Status
- **RPP-001:** Senior App ist **kein Medizinprodukt** — bleibt Organisations-/Kommunikations-Tool.
- KI darf nicht „diagnostizieren" oder „therapieren" — System-Prompt enthält harte Grenzen (bekannt aus HARTE_LAENGE-Regel).
- Medikamenten-Erfassen ja (als Information), Medikamenten-Empfehlung nein.

### Ship-Checklist Stufe 1

- [ ] Wrapper Windows (Tauri) — kompiliert, signiert, installierbar auf AWOW
- [ ] Wrapper Android — APK in Play Internal Testing
- [ ] Wrapper iOS — TestFlight Build
- [ ] `device_refresh_tokens` Mig 171 auf Prod
- [ ] `care_access_audit` Mig 172 auf Prod
- [ ] `memory_basis/care/personal` Consent-Features in `care_consents` aktivieren
- [ ] Admin-UI-Gruppe „Care-Access" mit 4 Flags
- [ ] KI-Provider-Flag `AI_PROVIDER` (claude/mistral/off) implementiert
- [ ] KI-System-Prompt + RAG-App-Wissensdokument geschrieben
- [ ] Onboarding-Wizard 7 Schritte
- [ ] Memory-Übersicht (Senior sieht + löscht)
- [ ] Angehörigen-Edit-UI für Memory
- [ ] QR-Scan-Komponente (Kamera-Plugin Capacitor/Tauri)
- [ ] `/api/device/pair` + `/api/care/access/claim` + `/api/notfall/[token]` Routes
- [ ] Notfall-Public-Seite `/notfall/[token]`
- [ ] `nachbar-kiosk/` löschen aus Repo
- [ ] AVV-Verträge unterschrieben
- [ ] Datenschutzerklärung aktualisiert
- [ ] DSFA aktualisiert
- [ ] Play-Account aktiviert + App-Metadaten vorbereitet
- [ ] E2E-Tests für Onboarding + Pair + Scan + Emergency

---

## Stufen-Roadmap

| Stufe | Inhalt | Zeitraum (grob) |
|---|---|---|
| **1 (dieses Doc)** | Ship-Fast Pilot: Wrapper + QR-Onboarding + KI + Memory + A + E | ~3-4 Wochen |
| **2** | B live (Einzel-Pflegerin), Vitals-Zeitreihe, Visit-Doku, PDF-Export | ~4-6 Wochen |
| **3** | C live (Pflegefirma), Heim-Modus, Schicht-Planung, Zulassung | ~8-12 Wochen |
| **4** | Apple Intelligence (iOS lokal), Gemini Nano (Android lokal), Ollama Offline (Windows) — 100% On-Device-Mode | später |

---

## Referenzen

- **Reality-Check-Audit:** diese Session (2026-04-19), Audit-Agent-Output
- **Senior Memory Layer** — `docs/plans/archive/2026-03-31-senior-memory-layer-design.md` + `-implementation.md`
- **Bestehende Migrationen:** 071 (caregiver_links), 073 (organizations), 108 (care_consents), 122 (senior_memory), 126 (care_visits), 128-129 (prescriptions)
- **Aktueller Senior-Code:** `app/(senior)/*` (8 Seiten, 20 px/80 px)
- **Capacitor Config:** existiert in `nachbar-io/`
- **nachbar-kiosk/** (zu löschen)

---

## Offene Punkte vor Implementation

1. **AVV mit Anthropic unterzeichnen** — vor erstem Produktiv-KI-Request.
2. **Google Play $25** zahlen — vor Android-Release.
3. **TTS Layer-1 Cache Mig 168** vorher auf Prod (schon committed, pending Founder-Go).
4. **`nachbar-kiosk/` löschen** — eigener kleiner Commit, kein Einfluss auf Pilot.

---

## Approval

Design abgestimmt Thomas/Claude in Session 2026-04-19. Nächster Schritt: **Implementation-Plan schreiben** via `superpowers:writing-plans`.
