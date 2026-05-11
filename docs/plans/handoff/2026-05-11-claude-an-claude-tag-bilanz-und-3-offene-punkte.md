---
date: 2026-05-11 mittag (UTC+2)
from: Claude Opus 4.7 (1M context) — Session "friendly-nightingale-955729"
to: Naechste Session
status: ready
tldr: Tag-Bilanz 2026-05-11 — GmbH-Banking durch + Phase-I-Gate aufgeloest + Live-Smoke 25/25 ok. Drei konkrete Punkte fuer naechste Session.
---

# Tag-Bilanz 2026-05-11 + 3 offene Punkte fuer naechste Session

## Was heute passiert ist (kompakt)

### GmbH-Banking (vormittag)
- Stammkapital 25.000 EUR von Volksbank-Privatkonto auf FYRST-Geschaeftskonto Theobase GmbH i.G. eingezahlt (Echtzeitueberweisung 08:45, "Erfolgreich gebucht")
- FYRST-Empfaenger-IBAN: `DE64 6807 0212 0081 9987 00` (BIC `DEUTDE6FP11`, Kontomodell BASE)
- FYRST-Kontobestaetigung beantragt + erhalten (gratis SelfService, BestSign)
- Stadler-Mail mit Volksbank+FYRST-PDFs an `info@notar-stadler.de` raus (Thread "Theobase GmbH i.Gr. - Einzahlungsnachweis Stammkapital, UVZ 1044/2026")
- Albiez-Mail (Steuerberater) an `Markus.Albiez@albiez-stb.de` raus (Thread-Reply mit DATEV-Daten-Bitte + Termin-Vorschlag + 7 Themen-Bullets, Anlage: keine — Termin-Vorbereitung erfolgt von Founder)
- HR-Eintragung AG Freiburg laeuft jetzt (2-3 Wochen Erwartung, Stadler reicht ein)
- Auto-Memory + Vault aktualisiert: `GmbH-Stammkapital-Einzahlung-2026-05-11.md`, `Albiez-Mail-2026-05-11-versandt.md`, `Albiez-Sammel-Notiz-bis-Konto.md` (AUFGELOEST)

### App: Phase-I-Gate aufgeloest (mittag)
4 Commits, alle gepusht + via GitHub Actions deployed (Run [25658171901](https://github.com/ClaudeTheo/nachbar-io/actions/runs/25658171901)):

| Commit | Inhalt |
|---|---|
| `8c1972b` | chore(cleanup): 12 untracked Handoffs + 1 Plan + 2 Scripts + `.codex-*.pid` in `.gitignore` |
| `a9dae01` | feat(dashboard): 5 versteckte Tiles ins DiscoverGrid (Leihboerse, Mitessen, Mein Tag, Pakete, Pflegegrad-Navigator) |
| `a1996e2` | **feat(routes): Phase-I-Gate dissolved** — `LEGACY_ROUTE_PREFIXES = []`, vorher 25 Routen serverseitig auf /kreis-start. Tests umgestellt, `/handwerker` haette noch FeatureGate gehabt (Annahme aus Pilot-Smoke), zeigt sich live aber als voll erreichbar. |
| `ff5e3c8` | test(profile): `/companion` ist jetzt aktiver Link (vorher Disabled-Item-Test) |

### Live-Smoke (mittag, nach Deploy)
- Tab `nachbar-io.vercel.app/dashboard` als Founder Thomas eingeloggt (UUID `dbd5e23e-...`)
- 25 ehemals-Legacy-Routes durchgeklickt (automatisiert, browser_batch, jeweils Navigate + URL + H1 + Error-Texte)
- **Ergebnis: 23 gruen, 2 Soft-Befunde, 0 Hard-Fail, 0 `/kreis-start`-Redirect**
- Volle Tabelle: `firmen-gedaechtnis/01_Firma/App-Live-Smoke-2026-05-11.md`

### Email-Wechsel Auth (mittag)
Founder-Auth-Email gewechselt: `thomasth@gmx.de` → `theovonbald@gmail.com` via Supabase MCP `execute_sql` (BEGIN/COMMIT, `auth.users` + `auth.identities`). `email_hash` in `public.users` ist leer (anderes Schema) — kein Touch. Grund: kuenftige Magic-Codes landen direkt in Gmail-Inbox, das automatisiert die Login-Flows in der MCP-Tab-Gruppe.

User-ID: `dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd`. Aktive Session bleibt gueltig (JWT auf User-ID), naechster Login geht an `theovonbald@gmail.com`.

---

## Aktueller Code-Stand

- **nachbar-io master HEAD:** `ff5e3c8` == `origin/master` == LIVE (Deploy 25658171901 ~10:10 UTC+2)
- **Working tree:** clean (im Hauptrepo)
- **Founder-Gates Stand:** §1-§4 + §6 DONE. §5 (AVV Anthropic/Mistral) bleibt bis HR-Eintragung. §7 (Mig 178) bis erste Pilot-Familie.
- **Vitest:** 4480/4480 gruen. Lint clean. TSC clean.
- **Prod-DB:** Unveraendert Founder-only. Mig 191 LIVE seit 2026-05-11 frueh.

---

## DREI offene Punkte fuer naechste Session

### 1. Voice/KI-Pipeline Hoer-Test im Browser

**Stand:** `/companion` Page laedt (Smoke-Check ok, H1 "Quartier-Lotse"). Aber tatsaechliche TTS/STT-Pipeline wurde nicht getestet — nur HTTP-Reachability.

**Was funktionieren sollte:**
- `/api/companion/chat` → `ANTHROPIC_API_KEY` ✅ in Vercel-Prod (siehe Pass-29-Befund)
- `/api/voice/tts` → `OPENAI_API_KEY` ✅ in Vercel-Prod
- `/api/voice/transcribe` → `OPENAI_API_KEY` (Whisper)
- Founder-Bypass (Welle 5, `ff88106`) entsperrt Risk-Scorer fuer Founder-User-ID

**Wie testen (Founder-Hand, Browser):**
1. Eingeloggt auf `nachbar-io.vercel.app/dashboard` (oder Voice-Tab erneut oeffnen)
2. Hard-Refresh (Strg+F5)
3. **Variante A — VoiceAssistantFAB:** Mikrofon-Knopf rechts unten klicken → Mikro-Berechtigung erlauben → sprechen ("Was ist heute geplant?") → Erwartung: STT transkribiert → Claude antwortet → TTS spricht zurueck
4. **Variante B — Companion-Page:** `/companion` oeffnen → Text tippen ("Wie ist das Wetter heute?") → Claude antwortet mit Quartier-Lotse-Kontext
5. **Bei Fehler:** DevTools (F12) → Console + Network-Tab → Response-Body von `/api/voice/...` oder `/api/companion/chat` kopieren

**Was naechste Session tut:** Falls Founder Fehler meldet, Bugs im Code suchen + fixen.

### 2. Bug-Report-Button auf Senior-/Auth-Layouts

**Stand:** `BugReportButton` aktuell nur in `app/(app)/layout.tsx:63` + `app/(auth)/login/page.tsx:415` (mit `anonymous`-Flag).

**Fehlt in 6 Layouts** (Pre-Check 2026-05-11 frueh):

| Layout | Pages | Pilot-Wichtigkeit |
|---|---|---|
| `app/(senior)/layout.tsx` | checkin, kreis-start, medications, sos, sprechstunde, schreiben, kennenlernen, pair, profil, confirmed | **HOCH** — Senior-App Stufe-1 (Tauri/Capacitor-Wrapper) |
| `app/senior/layout.tsx` | home, checkin, news, medications, help, preview | **HOCH** — Web-Senior-Modus |
| `app/terminal/[token]/layout.tsx` | Pflege-Terminal | MITTEL (anonym, Token-Modus) |
| `app/b2b/layout.tsx` | Marketing-Landing | NIEDRIG |
| `app/(kiosk)/kiosk/layout.tsx` | Kiosk | KEIN (Pi 5 deprecated 2026-04-19) |
| `app/(auth)/layout.tsx` | Auth-Pages | NIEDRIG (Login-Page hat schon einen) |

`BugReportButton` braucht keinen Provider und unterstuetzt `anonymous`-Modus.

**Empfehlung naechste Session:**
- Founder benennt konkret die Pages mit Bug-Bedarf (in Pass 29 hatte Founder keine konkrete Page genannt — der Smoke heute hat keine offensichtlichen Bugs gefunden, also vielleicht ist die Frage gerade kalt)
- Wenn Senior-App jetzt drankommt: `(senior)` + `senior/` Layouts patchen (10 Min, mit Tests)

### 3. 0 Events im Pilot — Test-Events anlegen

**Stand:** Im Pilot-Quartier `ee6cfcab-f615-47cd-afe7-808a27cb584b` (Bad Saeckingen) gibt es 0 Rows in `public.events`.

**Warum:**
- Cron `quartier-events-sync` schreibt nicht in `events`, sondern nur in `quartier_info_cache`
- Cron `recurring-events` braucht Basis-Events (Henne-Ei)
- Onboarding-Apply (`/api/admin/quarters/[id]/events/apply`) schreibt in `municipal_config.crawled_events` (Welle W10-Persist), nicht direkt in `events`
- Demo-Seed `scripts/seed-demo-quarter.ts` Zeile 199 nutzt veraltetes `created_by` (Schema heisst `user_id`) — wuerde fail

**Schema `events`** (Mig 004 + Mig 051):
Pflichtfelder: `id`, `user_id`, `quarter_id`, `title`, `event_date`, `category` (enum: community, sports, culture, market, kids, seniors, cleanup, other).

**Drei Wege fuer naechste Session:**

A) **Browser-UI (am schnellsten, Founder klickt selbst):**
Https://nachbar-io.vercel.app/events/new — 3 Events von Hand anlegen (~5 Min).

B) **Admin-EventManagement-Tab:** `/admin` → EventManagement-Tab (Liste + Create).

C) **SQL-Seed via Supabase MCP** (Claude autonom mit Founder-Go `EVENTS-SEED-GO`):
```sql
INSERT INTO events (user_id, quarter_id, title, description, location, event_date, event_time, category)
VALUES
  ('dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd', 'ee6cfcab-f615-47cd-afe7-808a27cb584b', 'Nachbarschafts-Cafe', 'Lockerer Austausch im Quartier', 'Rathausstrasse', CURRENT_DATE + 3, '15:00', 'community'),
  ('dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd', 'ee6cfcab-f615-47cd-afe7-808a27cb584b', 'Spaziergang am Rhein', 'Gemeinsamer Spaziergang', 'Rheinpromenade', CURRENT_DATE + 5, '10:00', 'sports'),
  ('dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd', 'ee6cfcab-f615-47cd-afe7-808a27cb584b', 'Kaffeekraenzchen', 'Kaffee und Kuchen', 'Begegnungszentrum', CURRENT_DATE + 7, '15:30', 'seniors');
```

---

## Was sonst noch wichtig ist fuer naechste Session

- **Albiez-Antwort abwarten** auf die heutige Mail (`Markus.Albiez@albiez-stb.de`). Erwartet: DATEV-Beraternummer + Mandantennummer + Termin-Vorschlag. Sobald da → FYRST-SelfService "SRZ-Vereinbarung" ausfuellen (Schritt 7 aus `firmen-gedaechtnis/01_Firma/GmbH-FYRST-Plan-2026-05-04.md`).
- **Stadler-Antwort abwarten** — falls er separate Einlagebestaetigung verlangt (statt der Volksbank+FYRST-Kontobestaetigungs-Kombi), bei FYRST-Support `0228 5500 3303` anrufen.
- **Email-Wechsel auf Gmail** — naechster Founder-Login auf `nachbar-io.vercel.app` mit `theovonbald@gmail.com`. Magic-Code landet in Gmail-Tab.

---

## Geographische Files-Map

| Was | Wo |
|---|---|
| Tag-Bilanz Live-Smoke | `firmen-gedaechtnis/01_Firma/App-Live-Smoke-2026-05-11.md` |
| GmbH-Banking heute | `firmen-gedaechtnis/01_Firma/GmbH-Stammkapital-Einzahlung-2026-05-11.md` |
| Albiez-Mail Volltext | `firmen-gedaechtnis/01_Firma/Albiez-Mail-2026-05-11-versandt.md` |
| Auto-Memory Session-Einstieg | `~/.claude/projects/.../memory/project_session_handover.md` |
| Auto-Memory Index | `~/.claude/projects/.../memory/MEMORY.md` (Stand-Pointer-Zeile) |
| Auto-Memory GmbH-Track | `~/.claude/projects/.../memory/project_gmbh_gruendung.md` |

---

## Bewaehrte Pattern aus dieser Session (durable Lessons)

1. **Browser-Automation mit Umlauten:** `computer.type` (Browser-MCP) auf Windows kann Unicode-Umlaute nicht zuverlaessig senden (US-Layout-Issue). Loesung: `javascript_tool` mit `createElement`/`createTextNode` + InputEvent-Dispatch (Gmail nutzt TrustedTypes, `innerHTML` ist verboten).
2. **Supabase Auth-Email-Update via SQL:** `auth.users.email` + `auth.identities.identity_data->>'email'` in einer Transaktion. `email_change_*`-Spalten zuruecksetzen, sonst pending-state. `public.users.email_hash` ist anderes Schema (SHA-256), beim Founder leer — kein Touch noetig.
3. **GitHub Actions Deploy-Trigger:** `gh workflow run deploy.yml -R ClaudeTheo/nachbar-io --ref master`. Run-ID via `gh run list -w deploy.yml -L 1`. Watch via `gh run view <ID> --json status,conclusion`.
4. **Live-Smoke-Pattern:** browser_batch mit Navigate + Wait + JS-Eval pro Route. JS gibt `{url, title, h1, errorTexts}` zurueck. 5 Routes pro Batch = ~30 Sek. Pro Hard-Fail nochmal mit `read_console_messages` + `network_requests` vertiefen.
