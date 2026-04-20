# Baustein 4 — Senior-Walkthrough Checkliste

**Termin:** Fr 24.04.2026 (Founder-Termin, Claude begleitet live)
**Voraussetzung:** `npm run dev` laeuft (Port 3000), Senior-Test-Account existiert.
**Dauer:** 1-2 Stunden
**Ziel:** UX-Stolperstellen in Welle-C-Flows vor Push (27.04.) finden und als einzelne Commits fixen.

---

## Vorbereitung (durch Claude, unmittelbar vor Termin)

1. `cd "C:/Users/thoma/Claud Code/Handy APP/nachbar-io"`
2. `.env.local` auf PILOT_MODE=true + AI_PROVIDER_OFF=false fuer den Walkthrough
   (Anthropic-Key muss lokal gesetzt sein, **nicht** prod).
3. `npm run dev` — Server auf http://localhost:3000 bereit.
4. Senior-Test-Account-Login-Credentials bereithalten (aus Supabase-Seed oder
   lokaler .env.local.test).
5. Zweites Browser-Profil (Edge privat, Chrome anderer Agent) fuer Caregiver-Flow.

---

## Senior-Flow

| # | Schritt | Erwartet | OK | Stolperstelle | Kommentar |
|---|---|---|---|---|---|
| 1 | Login als Senior-Test-Account | Weiterleitung auf Senior-Home | | | |
| 2 | Onboarding starten, 3-5 Fakten sprechen/tippen | Wizard laedt, Mikrofon-Icon sichtbar, STT antwortet | | | |
| 3 | KI fragt Geburtstag | **Confirm-Dialog** oeffnet sich | | | |
| 3a | Dialog: TTS-Autoplay loest aus | Stimme liest Stichwort+Wert+Beruhigung | | | |
| 3b | Dialog: Stichwort sichtbar | Z.B. "Geburtstag" als Headline | | | |
| 3c | Dialog: Wert sichtbar | Z.B. "15.03.1948" klar lesbar | | | |
| 3d | Dialog: Beruhigungs-Hinweis | "Sie koennen das jederzeit loeschen" oder aehnlich | | | |
| 4 | "Ja, speichern" klicken | Dialog schliesst, Toast/Feedback, Wizard geht weiter | | | |
| 5 | Navigation `/profil/gedaechtnis` | Liste oeffnet, Eintrag mit "Geburtstag" + Wert da | | | |
| 6 | Eintrag loeschen (Klick/Button) | Confirm-Dialog vor Loeschung | | | |
| 6a | Loeschen bestaetigen | Eintrag weg, Liste aktualisiert | | | |
| 7 | `/profil/gedaechtnis/uebersicht` (DSGVO) | Lesbar, alle Faelle aufgelistet (granted/revoked), Zeitstempel | | | |

---

## Caregiver-Flow

(Zweites Browser-Profil, Login als Angehoeriger-Test-Account der via
`caregiver_links` mit dem Senior verbunden ist.)

| # | Schritt | Erwartet | OK | Stolperstelle | Kommentar |
|---|---|---|---|---|---|
| 8 | Login als Angehoeriger | Weiterleitung auf Angehoeriger-Dashboard | | | |
| 9 | Navigation `/caregiver/senior/<id>/gedaechtnis` | Seite laedt, Senior-Name im Header korrekt | | | |
| 10 | Fakt eintragen (z.B. "Lieblingsessen: Kuerbissuppe") | Save-Button aktiv, Toast nach Save | | | |
| 11 | Liste zeigt neuen Eintrag mit "Von Ihnen"-Badge | Badge grafisch klar erkennbar | | | |
| 12 | Zurueck zu Senior-Login (erstes Profil) | Senior-Session noch aktiv oder Re-Login schnell | | | |
| 13 | Senior oeffnet `/profil/gedaechtnis` | Caregiver-Eintrag sichtbar mit "Von Angehoerigen"-Badge | | | |
| 13a | Senior loescht Caregiver-Eintrag | Erlaubt? (Senior-Scope ueber alle eigenen Fakten) | | | |
| 13b | Angehoeriger sieht Loeschung | Liste im Caregiver-Portal aktualisiert | | | |

---

## Zusatz-Pruefungen (wenn Zeit bleibt)

| # | Schritt | Erwartet | OK | Stolperstelle | Kommentar |
|---|---|---|---|---|---|
| A | Senior-Mode-Font-Check: Text ueberall lesbar? | min. 16 px base, senior-mode-Toggle >= 20 px | | | |
| B | Touch-Targets: alle Buttons >= 80 px hoch? | Gedaechtnis-Buttons, Confirm-Dialog-Buttons | | | |
| C | Kontrast: keine schwachen Grau-auf-Weiss-Kombinationen? | 4.5:1 WCAG AA | | | |
| D | Notfall-Banner (falls sichtbar): 112/110 zuerst? | fire/medical/crime vor allem anderen | | | |
| E | Blocklist-Effekt: Senior tippt Medikament in Freitext | KI **speichert nicht** (Medical Blocklist) | | | |

---

## Stolperstellen-Protokoll (live ausfuellen)

Pro gefundener Stolperstelle ein Eintrag:

```markdown
### Stolperstelle N: <Kurzname>
- **Schwere:** niedrig / mittel / hoch
- **Datei:** <pfad/zur/datei.tsx>
- **Reproduktion:** <genau beschreiben>
- **Fix-Vorschlag:** <eine Zeile>
- **Fix-Aufwand:** <z.B. 15 min>
- **Rote-Zone?:** <nein / ja (warum)>
```

**Abbruchkriterium laut Plan:** Wenn die Liste > 10 wird, nur die 5 wichtigsten
diese Woche fixen, Rest auf nach Push.

---

## Nach dem Walkthrough (Task 4.2 + 4.3)

1. Claude sortiert Stolperstellen nach Schwere + Aufwand.
2. Pro Stolperstelle: Pre-Check (Grep auf aehnliche Stelle), Fix, Test, Commit.
3. Rote-Zone-Stolperstellen (Prod-Daten, Supabase-Schema): **Founder-Go** vor Fix.

Plan-Referenz: [2026-04-21-haertungs-runde-vor-push-plan.md](2026-04-21-haertungs-runde-vor-push-plan.md)
B4 Task 4.2 + 4.3.

---

**Checkliste erstellt:** 2026-04-21 (Claude Opus 4.7 in B3-Session-Extension)
**Reviewer:** Founder (Thomas) beim Walkthrough 24.04.
