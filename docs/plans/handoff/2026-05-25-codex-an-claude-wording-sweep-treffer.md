# Codex -> Claude: Marketing-Wording-Sweep Legal-v2

Datum: 2026-05-25

Quelle: `docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md`

Suchraum:
- `app/`, `components/`, `modules/`, `lib/`, `public/`
- ohne `__tests__/**`, Legal-Paket, `docs/**`, `.next/**`, Locks/Logs
- Zusatzdatei: `C:/Users/thoma/Claud Code/Handy APP/Nachbar-io_Marketing_Prompt.md`

Nicht bearbeitet: keine Marketing-Wording-Edits durch Codex in Welle 1B.

| # | Datei:Zeile | Kontext (eine Zeile) | Bann-Wort | Einordnung |
|---|---|---|---|---|
| 1 | app/(senior)/medications/page.tsx:37 | `/* Stille Fehlerbehandlung fuer Geraet */` | Behandlung | False positive: technischer Kommentar |
| 2 | app/(senior)/medications/page.tsx:78 | `/* Stille Fehlerbehandlung fuer Geraet */` | Behandlung | False positive: technischer Kommentar |
| 3 | app/(senior)/pair/page.tsx:157 | `/* Stille Fehlerbehandlung beim Polling */` | Behandlung | False positive: technischer Kommentar |
| 4 | app/(senior)/page.tsx:42 | `/* Stille Fehlerbehandlung fuer Geraet */` | Behandlung | False positive: technischer Kommentar |
| 5 | app/(senior)/page.tsx:67 | `/* Stille Fehlerbehandlung fuer Geraet */` | Behandlung | False positive: technischer Kommentar |
| 6 | app/(kiosk)/kiosk/login/page.tsx:72 | `/* Stille Fehlerbehandlung */` | Behandlung | False positive: technischer Kommentar |
| 7 | app/notfall/[token]/page.tsx:153 | `label="Erkrankungen / Diagnosen"` | Diagnosen | Funktionales Datenfeld im Notfallprofil, kein Marketing |
| 8 | app/(kiosk)/kiosk/data/health-tips.ts:321 | `Patientenverfuegung ... welche Behandlungen Sie im Notfall wuenschen` | Behandlungen | Ratgebertext, nicht App-Versprechen; Claude-Review optional |
| 9 | components/care/index.ts:99 | `// Fehlerbehandlung` | Behandlung | False positive: technischer Kommentar |
| 10 | components/illustrations/IllustrationRenderer.tsx:52 | `// Stille Fehlerbehandlung - Illustration ist nicht kritisch` | Behandlung | False positive: technischer Kommentar |
| 11 | components/landing/AudienceTabs.tsx:127 | `"Verordnungs-Tracker - Behandlungs-, Grund- und psychiatrische Pflege"` | Behandlung | Hochrisiko: positiv-werbendes Landing-Wording, an Claude offen |
| 12 | app/api/admin/youth/overview/route.ts:76 | `// Fehlerbehandlung KPIs` | Behandlung | False positive: technischer Kommentar |
| 13 | app/api/care/sos/route.test.ts:255 | `describe('Fehlerbehandlung', () => {` | Behandlung | False positive: Testdatei ausserhalb `__tests__` |
| 14 | modules/voice/services/system-prompt.ts:72 | `Du beantwortest KEINE Gesundheits-Fragen und stellst KEINE Diagnosen.` | Diagnosen | Disclaim/protective wording |
| 15 | modules/voice/services/system-prompt.ts:168 | `Hausnotruf: Was er kostet, wer ihn bezahlt ...` | Hausnotruf | Kein App-Versprechen, aber an Claude offen wegen KI-Wissensbasis |
| 16 | modules/memory/services/memory-loader.ts:112 | `Speichere KEINE Diagnosen, Medikamente oder Finanzdaten` | Diagnosen | Disclaim/protective wording |
| 17 | modules/memory/services/medical-blocklist.ts:4 | `const DIAGNOSEN = [` | Diagnosen | Schutzlogik/Blocklist, kein Marketing |
| 18 | modules/memory/services/medical-blocklist.ts:9 | `'diagnose', 'diagnostiziert', ...` | Diagnose | Schutzlogik/Blocklist, kein Marketing |
| 19 | modules/memory/services/medical-blocklist.ts:27 | `const THERAPIEN = [` | Therapien | Schutzlogik/Blocklist, kein Marketing |
| 20 | modules/memory/services/medical-blocklist.ts:28 | `chemotherapie, bestrahlung, dialyse, ...` | Therapie | Schutzlogik/Blocklist, kein Marketing |
| 21 | modules/memory/services/medical-blocklist.ts:29 | `ergotherapie, logopaedie, psychotherapie, ...` | Therapie | Schutzlogik/Blocklist, kein Marketing |
| 22 | modules/memory/services/medical-blocklist.ts:34 | `...DIAGNOSEN, ...THERAPIEN` | Diagnosen/Therapien | Schutzlogik/Blocklist, kein Marketing |
| 23 | modules/memory/services/chat-integration.ts:10 | `KEINE Diagnosen, Medikamente, Vitalwerte oder Therapien speichern.` | Diagnosen/Therapien | Disclaim/protective wording |
| 24 | modules/memory/components/MemoryConsentScreen.tsx:130 | `Keine Diagnosen, Medikamente oder Vitalwerte werden gespeichert.` | Diagnosen | Disclaim/protective wording |
| 25 | modules/memory/components/CaregiverMemoryEditor.tsx:83 | `Keine Diagnosen,` | Diagnosen | Disclaim/protective wording |
| 26 | app/api/care/checkin/route.test.ts:367 | `describe('Fehlerbehandlung', () => {` | Behandlung | False positive: Testdatei ausserhalb `__tests__` |
| 27 | app/(app)/gruppen/[id]/page.tsx:50 | `// Stille Fehlerbehandlung` | Behandlung | False positive: technischer Kommentar |
| 28 | app/api/kiosk/companion/route.ts:50 | `Stelle niemals medizinische Diagnosen ... Bei Notfaellen weise sofort auf 112 hin.` | Diagnosen | Disclaim/protective wording |
| 29 | modules/hilfe/services/yearly-report.service.ts:192 | `steuerliche Behandlung` | Behandlung | False positive: juristisch/steuerlicher Begriff |
| 30 | modules/praevention/services/ki-session.service.ts:97 | `Keine Diagnosen, keine Therapie, keine medizinischen Ratschlaege.` | Diagnosen/Therapie | Disclaim/protective wording |
| 31 | modules/gruppen/components/GroupPostFeed.tsx:48 | `// Stille Fehlerbehandlung` | Behandlung | False positive: technischer Kommentar |
| 32 | modules/gruppen/components/GroupPostComments.tsx:62 | `// Stille Fehlerbehandlung` | Behandlung | False positive: technischer Kommentar |
| 33 | app/(app)/care/termine/page.tsx:41 | `label: "Therapie"` | Therapie | Funktionales Terminlabel, kein Marketing |
| 34 | app/(app)/care/termine/buchen/[doctorId]/page.tsx:63 | `// Stille Fehlerbehandlung` | Behandlung | False positive: technischer Kommentar |
| 35 | app/(app)/care/termine/buchen/[doctorId]/page.tsx:81 | `// Stille Fehlerbehandlung` | Behandlung | False positive: technischer Kommentar |
| 36 | modules/care/components/navigator/nba-questions.ts:502 | `label: "Therapiemassnahmen zu Hause"` | Therapie | Funktionaler Pflegegrad-Kontext, kein Marketing |
| 37 | modules/care/components/navigator/nba-questions.ts:503 | `Uebungen, Atemtherapie, Physiotherapie durchfuehren.` | Therapie | Funktionaler Pflegegrad-Kontext, kein Marketing |
| 38 | modules/care/components/navigator/nba-questions.ts:517 | `Z.B. Dialyse, Bestrahlung, Ergotherapie.` | Therapie | Funktionaler Pflegegrad-Kontext, kein Marketing |
| 39 | app/(app)/care/status/page.tsx:25 | `NUR Datum, Uhrzeit, Arztname, Typ - KEINE Notizen/Diagnosen` | Diagnosen | Disclaim/protective wording |
| 40 | app/(app)/care/status/page.tsx:212 | `Termine laden ... KEINE Notizen/Diagnosen!` | Diagnosen | Disclaim/protective wording |
| 41 | app/(app)/care/sprechstunde/page.tsx:34 | `// Stille Fehlerbehandlung - leere Liste zeigen` | Behandlung | False positive: technischer Kommentar |
| 42 | lib/ai/system-prompts/senior-app-knowledge.md:24 | `Keine medizinischen Diagnosen. Nie.` | Diagnosen | Disclaim/protective wording |
| 43 | lib/ai/system-prompts/senior-app-knowledge.md:173 | `Du stellst nie medizinische Diagnosen.` | Diagnosen | Disclaim/protective wording |
| 44 | lib/ai/system-prompts/senior-app-knowledge.md:206 | `Du stellst keine Diagnose. Du schaetzt den Schweregrad nicht ein.` | Diagnose | Disclaim/protective wording |
| 45 | lib/ai/system-prompts/senior-app-knowledge.md:260 | `Nicht speichern: ... Diagnosen, Medikamenten-Dosierungen ...` | Diagnosen | Disclaim/protective wording |
| 46 | lib/ai/system-prompts/senior-app-knowledge.md:303 | `Zuerst der Notruf. Keine Frage, keine Diagnose, keine Einschaetzung.` | Diagnose | Disclaim/protective wording |
| 47 | lib/ai/system-prompts/senior-app-knowledge.md:314 | `Nie Diagnosen stellen.` | Diagnosen | Disclaim/protective wording |
| 48 | app/(app)/care/meine-senioren/[seniorId]/page.tsx:610 | `behandlungspflege: "Behandlungspflege"` | Behandlung | Funktionales Pflege-Label, kein Marketing |
| 49 | app/(app)/care/meine-senioren/[seniorId]/page.tsx:616 | `behandlungspflege: "bg-purple-100 text-purple-700"` | Behandlung | False positive: CSS-Key |
| 50 | modules/care/components/caregiver/CareVisitCard.tsx:19 | `behandlungspflege: "Behandlungspflege"` | Behandlung | Funktionales Pflege-Label, kein Marketing |
| 51 | modules/care/components/emergency/EmergencyProfileForm.tsx:340 | `Erkrankungen / Diagnosen` | Diagnosen | Funktionales Datenfeld im Notfallprofil, kein Marketing |
| 52 | app/(app)/care/aerzte/page.tsx:95 | `// Stille Fehlerbehandlung - leere Liste zeigen` | Behandlung | False positive: technischer Kommentar |
| 53 | app/(app)/care/contact/page.tsx:45 | `// Stille Fehlerbehandlung` | Behandlung | False positive: technischer Kommentar |
| 54 | modules/care/components/appointments/AppointmentCalendar.test.tsx:145 | `title: "Physiotherapie"` | Therapie | False positive: Testdatei |
| 55 | modules/care/components/appointments/AppointmentCalendar.test.tsx:152 | `getByText("Physiotherapie")` | Therapie | False positive: Testdatei |
| 56 | modules/care/components/appointments/AppointmentForm.tsx:21 | `{ value: 'therapy', label: 'Therapie' }` | Therapie | Funktionales Terminlabel, kein Marketing |
| 57 | modules/care/components/appointments/AppointmentCard.tsx:21 | `therapy: { label: 'Therapie' ... }` | Therapie | Funktionales Terminlabel, kein Marketing |
| 58 | lib/security/security-middleware.ts:73 | `(Diagnose-Tests, Self-Lockout) keinen 4h-Block hinterlaesst.` | Diagnose | False positive: technischer Kommentar |
| 59 | app/(app)/admin/components/PushBroadcast.tsx:43 | `// Stille Fehlerbehandlung` | Behandlung | False positive: technischer Kommentar |
| 60 | app/(app)/admin/components/QuarterManagement.tsx:196 | `// Stille Fehlerbehandlung` | Behandlung | False positive: technischer Kommentar |

## Zusatzdateien

| Datei | Ergebnis |
|---|---|
| `C:/Users/thoma/Claud Code/Handy APP/Nachbar-io_Marketing_Prompt.md` | 0 Treffer |
| `C:/Users/thoma/Claud Code/Handy APP/QuartierApp_Versionskonzept_2026.docx` | Nicht direkt per `rg` geprueft, an Claude eskaliert |
| `C:/Users/thoma/Claud Code/Handy APP/Nachbar_io_Investor_Deck_2026.pptx` | Nicht direkt per `rg` geprueft, an Claude eskaliert |

## Codex-Ergebnis

- Gesamttreffer: 60
- Hochrisiko (positiv-werbendes Wording): 1
- Disclaim-Vorkommen (negiert/protective, ok): 16
- False-positive/funktionale Fachbegriffe: 42
- Zusaetzlich offen (nicht positiv-werbend, aber Bann-Wort in KI-Wissensbasis): 1
- An Claude offen: 4
  - `components/landing/AudienceTabs.tsx:127`
  - `modules/voice/services/system-prompt.ts:168`
  - `C:/Users/thoma/Claud Code/Handy APP/QuartierApp_Versionskonzept_2026.docx`
  - `C:/Users/thoma/Claud Code/Handy APP/Nachbar_io_Investor_Deck_2026.pptx`
