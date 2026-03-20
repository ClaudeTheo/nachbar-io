# Amtsblatt-Integration Design

**Datum:** 2026-03-20
**Status:** Genehmigt
**Autor:** Claude + Thomas

## Zusammenfassung

Das Amtsblatt "Trompeterblättle" der Stadt Bad Säckingen (erscheint 14-tägig samstags als PDF) wird automatisch abgerufen, per Claude Haiku in einzelne Meldungen zerlegt und als `municipal_announcements` in der App angezeigt.

## Entscheidungen

| Frage | Entscheidung |
|-------|-------------|
| Welche Inhalte? | Alles (Bekanntmachungen, Veranstaltungen, Vereine, etc.) |
| Aufbereitung? | Reine KI-Zusammenfassung (kein PDF-Viewer) |
| Automatisierung? | Vercel Cron (samstags), ohne n8n |
| Disclaimer? | Ja — KI-generiert + Link zum Original |
| Tech-Ansatz? | Next.js API Route + pdf-parse (JS) + Claude Haiku |

## Datenmodell

### Neue Tabelle: `amtsblatt_issues`

```sql
CREATE TABLE amtsblatt_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES quarters(id),
  issue_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  pdf_url TEXT NOT NULL,
  pages INTEGER,
  extracted_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',  -- pending/processing/done/error
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quarter_id, issue_number, issue_date)
);
```

### Erweiterung: `municipal_announcements`

Neue Spalte `amtsblatt_issue_id UUID REFERENCES amtsblatt_issues(id)` — nullable, nur für Amtsblatt-Meldungen gesetzt.

## Pipeline

```
Vercel Cron (Sa 08:00 UTC)
  → GET /api/cron/amtsblatt-sync
    1. HTML von bad-saeckingen.de/amtsblatt scrapen
    2. Neueste PDF-URL extrahieren (Pattern: /fileadmin/.../Amtsblatt/*.pdf)
    3. Duplikat-Check gegen amtsblatt_issues
    4. PDF herunterladen + pdf-parse → Rohtext
    5. Claude Haiku → JSON-Array mit strukturierten Meldungen
    6. INSERT in municipal_announcements + amtsblatt_issues
```

## KI-Prompt

```
System: Extraktions-Assistent für Amtsblatt Bad Säckingen.
Extrahiere ALLE einzelnen Meldungen als JSON-Array.

Kategorien: verkehr, baustelle, veranstaltung, verwaltung, warnung, sonstiges
(+ neue: verein, soziales, entsorgung)

Pro Meldung: {title, body, category}
Ignoriere: Impressum, Werbeanzeigen, Telefonnummern-Listen.
```

## Kosten

- ~10.000 Tokens pro Ausgabe (20 Seiten) → <$0.01 pro Ausgabe
- 2 Ausgaben/Monat → <$0.02/Monat

## Kategorien-Erweiterung

Bestehende `announcement_category` ENUM erweitern um:
- `verein` — Vereinsmeldungen
- `soziales` — Pflege, Beratung, Senioren
- `entsorgung` — Müll, Wertstoff

## Disclaimer

"Diese Zusammenfassungen wurden automatisch aus dem Amtsblatt der Stadt Bad Säckingen erstellt. Verbindlich ist ausschließlich das Original-Amtsblatt."
