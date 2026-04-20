# Founder-Test-Anleitung — Welle C (KI-Onboarding + Memory)

**Datum:** 2026-04-20
**Claude-Vorbereitung:** Dev-Server laeuft lokal (http://localhost:3000), `AI_PROVIDER=mock` gesetzt, 158/158 jsdom-Welle-C-Tests gruen.

---

## Ziel des Tests

Founder durchklickt den End-to-End-Senior-Flow aus Welle C und verifiziert subjektiv:
- Senior-Home zeigt den "🤝 KI kennenlernen"-Button gross genug.
- Wizard-Einstieg ist verstaendlich.
- Consent-Banner (bei fehlender Einwilligung) ist verstaendlich formuliert.
- Nach Einwilligung ist der Wizard bedienbar (tippen reicht; Mikrofon optional).
- Profil → Mein Gedaechtnis zeigt gespeicherte Fakten + 3 Toggles.

---

## Was Claude heute erledigt hat

1. Dev-Server gestartet (Port 3000), `AI_PROVIDER=mock` in `.env.local` eingetragen.
2. Code-seitig verifiziert, dass alle drei Routen korrekt verdrahtet sind:
   - `app/(senior)/page.tsx` → Indigo-Button "🤝 KI kennenlernen" mit href="/kennenlernen" (80 px).
   - `app/(senior)/kennenlernen/page.tsx` → WizardChat-Komponente.
   - `app/(senior)/profil/gedaechtnis/page.tsx` → useMemoryFacts + SeniorMemoryFactList + 3 Consent-Toggles.
3. Smoke-Test der Landing-Page (`http://localhost:3000/`) — HTTP 200, Title "QuartierApp — Ihr digitaler Dorfplatz", rendert sauber.

---

## Warum heute noch KEIN vollstaendiger Live-Klick-Test moeglich ist

Zwei blockierende Voraussetzungen — beide sind rote Zone und warten auf Founder-Go bzw. AVV:

### Blocker 1 — Mig 173 nicht auf Prod

`care_consents.feature` CHECK-Constraint akzeptiert aktuell noch nicht `'ai_onboarding'`. Verifiziert per SQL gegen `uylszchlyhbpbmslcnka`:

```
CHECK (feature IN ('sos','checkin','medications','care_profile','emergency_contacts'))
```

Sobald der Senior auf "Einwilligung erteilen" tippen wuerde, wuerde der POST `/api/care/consent` mit feature=ai_onboarding an einer Postgres-Constraint-Violation scheitern.

**Fix:** Mig 173 (plus Mig 174) per MCP `apply_migration` auf Prod anwenden. Idempotent (DROP + RE-ADD Constraint + Comments). Rote Zone — Founder-Go.

### Blocker 2 — Kein Senior-Test-Account

Abfrage gegen Prod `public.users`:
- `thomasth@gmx.de` hat Role = `doctor`, nicht `senior`.
- Senior-Routen redirecten unauthenticated und ohne Senior-Role auf `/login` (verifiziert: `/kennenlernen` → HTTP 307 Location `/login`).

**Fix-Optionen:**
- **a)** Founder legt via Supabase-Studio einen Test-Account mit role=senior an (z.B. `senior-test@quartierapp.de`). Public.users + auth.users beide notwendig.
- **b)** Founder gibt sich temporaer role=senior (nur zum Testen, hinterher zurueckstellen).
- **c)** Claude legt einen Test-Account an, sobald Founder-Go vorliegt (ist Prod-Write → rote Zone).

---

## Wenn die beiden Blocker geloest sind — 11-Schritte-Klick-Anleitung

(Claude unterstuetzt bei Apply + Account-Anlage auf Founder-Go; dann durchfuehren.)

1. Browser (Edge) auf http://localhost:3000/login oeffnen.
2. Als Senior-Test-Account einloggen (Magic Link via `PILOT_AUTO_VERIFY=true` sollte direkt greifen).
3. Du landest auf `/` (Senior-Home). Pruefe: Uhrzeit, Datum, SOS-Button, 💊/📹/✅-Buttons + den NEUEN **🤝 KI kennenlernen** (Indigo, 80 px).
4. Tippe auf **🤝 KI kennenlernen**.
5. Du siehst entweder den Wizard-Einstieg ODER den Banner **"Brauche Ihre Erlaubnis"** (je nach Consent-Stand).
6. Falls Banner: lies den Text, tippe auf **"Einwilligung erteilen"** (80 px, gruen).
7. Wizard oeffnet. Siehst Eingabe-Bereich + Mic-Button rechts.
8. Tippe **"Mein Name ist Anna"** und sende. Mock-Provider antwortet mit `mock response`.
9. Oben erscheint eine Save-Suggestion (falls Tool-Call vom Mock simuliert wird — beim Mock eher nicht, deshalb ist das in diesem Modus meist leer).
10. Zurueck zum Senior-Home, dann Profil → **Mein Gedaechtnis**. Pruefe die Seite `/profil/gedaechtnis`: DSGVO-Hinweis, Liste, 3 Toggles.
11. Teste einen der 3 Toggles (umschalten, Status sichtbar wechseln). Teste "Loeschen" (Confirm-Overlay, "Ja, loeschen").

---

## Wenn Du NUR "sichten" willst (ohne Login)

- `http://localhost:3000/` — Landing-Page laeuft.
- Alle Welle-C-Komponenten sind durch 158 jsdom-Tests abgedeckt (`npm run test -- __tests__/modules/memory/ __tests__/components/onboarding/`).
- Schritt-fuer-Schritt-Screenshots des Quellcodes findest Du direkt in `app/(senior)/kennenlernen/page.tsx`, `app/(senior)/profil/gedaechtnis/page.tsx`, `modules/voice/components/onboarding/WizardChat.tsx`, `modules/memory/components/SeniorMemoryFactList.tsx`.

---

## Claude-Empfehlung

Wenn der Browser-Klick-Test wichtig ist: **27.04. abwarten**. Dann in einem Rutsch:
1. AVV Anthropic + Mistral signieren (Notar-Nachmittag).
2. Mig 173 + Mig 174 via MCP `apply_migration` auf Prod.
3. Senior-Test-Account via Supabase-Studio anlegen.
4. Live-Klick-Test (30 min).

Bis dahin: **Option A — Push-Vorbereitung** und **Option B — F7 cache_control-Rename** vorziehen. Beide brauchen kein Prod-Apply und produzieren verwertbaren Fortschritt.

---

## Was laufen muss

- Dev-Server: `preview_start` (Claude) ODER manuell `cd nachbar-io && npm run dev` (Founder).
- Port 3000 frei.
- `.env.local`: `AI_PROVIDER=mock` (erledigt — Zeile 3), `ANTHROPIC_API_KEY` egal im Mock-Modus.

**Dev-Server beenden:** Strg+C im Terminal ODER Claude ruft `preview_stop`.
