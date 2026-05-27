# Claude -> Founder: Office-Dateien Wording-Sweep Legal-v2

Datum: 2026-05-25
Driver: Claude (Opus 4.7)
Methode: `python -m markitdown` Text-Extraktion + Bann-Wort-Grep gegen `docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md`

## Geprueft

| Datei | Pfad | Zeilen extrahiert |
|---|---|---|
| Investor-Deck | `C:/Users/thoma/Claud Code/Handy APP/Nachbar_io_Investor_Deck_2026.pptx` | 308 |
| Versionskonzept | `C:/Users/thoma/Claud Code/Handy APP/QuartierApp_Versionskonzept_2026.docx` | 392 |

## Zusammenfassung

| Datei | Treffer total | Hochrisiko | Mittel | Disclaim/OK |
|---|---|---|---|---|
| Investor-Deck | 6 | 1 | 4 | 1 |
| Versionskonzept | 1 | 0 | 0 | 1 |

**Investor-Deck ist die wichtigere Datei**, weil sie aktiv an Investoren geht. Versionskonzept ist intern, einziger Treffer ist eine gewollte Negativ-Abgrenzung.

## Investor-Deck — Treffer im Detail

### 🔴 HOCH-Risiko #1 — "Notfall-System"

| | Wert |
|---|---|
| **Folie** | 3 (Vier-Versionen-Modell Tabelle) und 12 (Pricing-Wiederholung) |
| **Extrakt-Zeile** | 47 ("Nachbar Free") und 231 (Pricing-Block) |
| **Wording** | "Notfall-System, Schwarzes Brett, Marktplatz, ..." |
| **Warum kritisch** | Suggeriert, dass die Free-Version ein eigenstaendiges Notfall-System ist. Ein Investor liest das als Hausnotruf-aequivalent. Bann-Liste verbietet "Notrufsystem", "Alarmzentrale" — "Notfall-System" hat die gleiche Konnotation. MDR-Borderline-Risiko, weil ein Investor das spaeter zitieren koennte. |
| **Empfehlung** | Ersetzen durch eine der Varianten: "112/110-Hinweis", "Notfall-Hinweis (112/110)", "Soforthilfe-Hinweis", "Notfall-Anzeige". Was im Code unter `app/(senior)/layout.tsx` tatsaechlich gebaut ist, ist eine 112-Notruf-Leiste, keine System-Komponente. Wording muss zur tatsaechlichen Funktion passen. |

### 🟡 MITTEL-Risiko #2-#3 — "Status-Monitoring" (2x)

| | Wert |
|---|---|
| **Folie** | 3 und 12 (Pro Community-Spalte) |
| **Extrakt-Zeile** | 49 und 234 |
| **Wording** | "Heartbeat / Status-Monitoring, Video-Call, Chat, ..." |
| **Warum kritisch** | Bann-Liste verbietet "Monitoring", "Patientenueberwachung". "Status-Monitoring" ist nicht direkt verboten, aber semantisch nah. Im Pflege-Portal-Kontext ohne Praefix ("Aktivitaets-...") kann das als Gesundheits-Monitoring missverstanden werden. |
| **Empfehlung** | Ersetzen durch "Status-Dashboard", "Status-Uebersicht", "Aktivitaets-Anzeige" oder den Code-konformen Begriff "Bewohner-Dashboard mit Ampel-Status" (siehe `components/landing/AudienceTabs.tsx:117`). |

### 🟡 MITTEL-Risiko #4-#5 — "Heartbeat" (2x)

| | Wert |
|---|---|
| **Folie** | 3 und 12 |
| **Extrakt-Zeile** | 48 und 233 |
| **Wording** | "...KI-News, Heartbeat / Status-Monitoring..." |
| **Warum kritisch** | "Heartbeat" ist im IT-Engineering ein neutraler Tech-Begriff. Im Senior-/Pflege-Kontext ohne Erklaerung kann ein Leser "Herzschlag-Ueberwachung" verstehen — das waere MDR-Borderline. |
| **Empfehlung** | Im Deck eine kurze Klarstellung ergaenzen: "Heartbeat" → "Tages-Heartbeat (freiwilliges Lebenszeichen)" oder einfach "Lebenszeichen". Im Code wird es als "Lebenszeichen-Ueberwachung" gefuehrt, im Deck als "Heartbeat" — Inkonsistenz. |

### 🟡 MITTEL-Risiko #6 — "Eskalationskette"

| | Wert |
|---|---|
| **Folie** | 3 und 12 |
| **Extrakt-Zeile** | 50 und 236 |
| **Wording** | "Video-Call, Chat, Eskalationskette" |
| **Warum kritisch** | "Eskalationskette" suggeriert eine automatische Kette ("erkennt Notfaelle", "automatische Rettung" sind in der Bann-Liste). Die tatsaechliche Funktion im Repo heisst "Eskalations-Inbox" (siehe `components/landing/AudienceTabs.tsx:120`) — also eine Inbox, in die Helfer aktiv reinschauen, nicht ein automatischer Ausloeser. |
| **Empfehlung** | Ersetzen durch "Eskalations-Inbox" oder "Helfer-Inbox bei Status-Aenderungen". Wording-Konsistenz mit Code. |

### 🟢 Disclaim/OK — "Notfall" (ohne "-System")

| | Wert |
|---|---|
| **Folie** | 12 (Z.231) |
| **Wording** | "Notfall, Marktplatz, Schwarzes Brett, ..." |
| **Bewertung** | OK — neutral, ohne System-Suffix. Lassen. |

## Versionskonzept — Treffer im Detail

### 🟢 Disclaim/OK — "Monitoring" in Negativ-Liste

| | Wert |
|---|---|
| **Extrakt-Zeile** | 262 |
| **Wording** | "\| Keine DiGA \| Keine Diagnose, keine Therapie, kein Monitoring \|" |
| **Bewertung** | OK — das ist eine **bewusste Abgrenzungs-Tabelle** ("Was QuartierApp NICHT ist"). Genau das richtige Wording fuer ein Versionskonzept. Lassen. |

## Encoding-Hinweis (kein Wording-Problem)

Die markitdown-Extraktion hat €-Zeichen kaputt gemacht (Z.221-225 im Investor-Deck zeigen "0 �" statt "0 €"). Das ist ein Extraktions-Artefakt, der Original-Inhalt im pptx ist davon nicht betroffen. Nur fuer den Sweep nicht relevant.

## Empfohlene Aktion

Pitch-Deck und Versionskonzept liegen ausserhalb des Repos und werden mit PowerPoint/Word manuell gepflegt. **Claude editiert das nicht direkt** (Founder-Land, siehe `feedback_memory_arbeitsteilung.md`).

**Vor dem naechsten Investor-Pitch** sollten die 6 Treffer im Investor-Deck (1 HOCH + 4 MITTEL + 1 OK) gefixt werden. Praktisch:

| Suchen (im Deck) | Ersetzen durch |
|---|---|
| Notfall-System | 112/110-Hinweis |
| Status-Monitoring | Status-Dashboard |
| Heartbeat | Tages-Heartbeat (Lebenszeichen) |
| Eskalationskette | Eskalations-Inbox |

Die Tabelle aus Folie 3 (Vier-Versionen-Modell) ist die Schluesselstelle, weil sie auf Folie 12 fast wortgleich wiederholt wird. Beide Folien gleichzeitig anpassen.

## Versionskonzept

Keine Aenderungen noetig.

## Folge-Welle (optional, Backlog)

Wenn Pitch-Deck aktualisiert wird, koennte parallel das Code-Wording in `components/landing/AudienceTabs.tsx` und `app/(senior)/layout.tsx` gegen die Deck-Begriffe gespiegelt werden, sodass Investor sieht im Deck dasselbe wie im Produkt.
