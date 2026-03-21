# Google Play Store Listing — QuartierApp

## Kurzname
QuartierApp

## Kurzbeschreibung (80 Zeichen)
Ihre Nachbarschaft. Sicher vernetzt. Lokal informiert.

## Langbeschreibung (deutsch, max 4.000 Zeichen)

QuartierApp verbindet Ihre Nachbarschaft — sicher, lokal und datenschutzkonform.

Fuer Bewohner des Quartiers Bad Saeckingen (Purkersdorfer Str., Sanarystr., Oberer Rebberg) bietet QuartierApp:

NOTFALL-SYSTEM
Bei Gefahr sofort 112 oder 110 — QuartierApp zeigt den Notruf-Banner prominent an und kann Ihren GPS-Standort an Helfer weitergeben. Kein Ersatz fuer den Notruf, aber eine schnelle Ergaenzung.

SCHWARZES BRETT
Teilen Sie Neuigkeiten, Gesuche und Hinweise mit Ihren Nachbarn. Von der verlorenen Katze bis zum Strassenfest — alles an einem Ort.

MARKTPLATZ
Verschenken, tauschen, verkaufen — direkt in der Nachbarschaft. Nachhaltig und ohne Versandkosten.

QUARTIERSKARTE
Sehen Sie auf einen Blick, was in Ihrem Quartier passiert. OpenStreetMap-basiert, ohne Tracking, ohne Werbung.

TAEGLICHER CHECK-IN
Wie geht es Ihnen heute? Ein kurzer Klick genuegt. Fuer Sie selbst — und wenn Sie moechten, koennen Angehoerige Ihren Status sehen (nur mit Ihrer ausdruecklichen Einwilligung).

KI-NACHRICHTEN
Lokale Nachrichten aus dem Amtsblatt, automatisch zusammengefasst. Kein Scrollen durch endlose Seiten — das Wichtigste auf einen Blick.

MUELLKALENDER
Nie wieder die Tonne vergessen. Echte Abfuhrtermine Ihres Entsorgers, automatisch synchronisiert.

MAENGELMELDER
Schlagloch, kaputte Laterne, wilder Muell? Melden Sie es mit Foto und GPS-Position direkt an die Verwaltung.

HANDWERKER-PORTAL
Finden Sie vertrauenswuerdige Handwerker in Ihrer Naehe — mit Bewertungen aus der Nachbarschaft.

DATENSCHUTZ
- Alle Daten bleiben in der EU (Frankfurt)
- DSGVO-konform, keine Werbung, kein Tracking
- Sensible Daten mit AES-256-GCM verschluesselt
- Sie bestimmen, wer was sieht
- Konto-Loeschung jederzeit moeglich (in der App und auf quartierapp.de)

FUER SENIOREN OPTIMIERT
Grosse Buttons (mind. 80px), hoher Kontrast (4.5:1), maximal 4 Klicks fuer jede Aktion. QuartierApp ist fuer alle Altersgruppen gemacht.

KOSTENLOS
QuartierApp ist in der Pilotphase komplett kostenlos. Keine versteckten Kosten, keine In-App-Kaeufe.

Mehr Informationen: quartierapp.de

---

## App-Metadaten

| Feld | Wert |
|------|------|
| Package Name | de.quartierapp.app |
| Primaere Kategorie | Social |
| Verfuegbarkeit | Nur Deutschland |
| Preis | Kostenlos |
| Kontakt-E-Mail | thomasth@gmx.de |
| Support-E-Mail | support@quartierapp.de |
| Datenschutzerklaerung | https://quartierapp.de/datenschutz |
| Support-Seite | https://quartierapp.de/support |
| Community-Richtlinien | https://quartierapp.de/richtlinien |
| Account-Loeschung | https://quartierapp.de/account-loeschen |

---

## Review Notes (englisch, fuer Google Play Review Team)

```
Demo Account:
  Email: review@quartierapp.de
  Password: QuartierReview2026!
  Invite Code: DEMO-REVIEW

App Overview:
  Pilot release for Bad Saeckingen, Germany (~30-40 households).
  Hyperlocal community app for a single neighborhood quarter.

Key Points for Review:
  - No paid features, no IAP, no external purchase flows (pilot phase)
  - Content moderated via AI (Claude Haiku) + admin review queue
  - Location: foreground-only, no background location
  - Check-in is subjective wellbeing status, NOT medical diagnosis
  - Push notifications require opt-in
  - Account deletion available in-app (/profile/delete) AND via web (quartierapp.de/account-loeschen)
  - UGC: Community guidelines acceptance required before first post
  - Emergency: 112/110 banner shown for fire/medical/crime — app does NOT replace emergency services

Data Sharing:
  - User-generated content is sent to Anthropic Claude API (Haiku) for:
    (1) AI news summarization, (2) content moderation scoring
  - Anthropic does not store data permanently (API usage, no training)
  - All other data stays within Supabase EU infrastructure (Frankfurt)
```

---

## Data Safety Section (Referenz fuer Play Console)

| Datentyp | Gesammelt | Geteilt | Zweck |
|----------|-----------|---------|-------|
| Name | Ja | Nein | App-Funktionalitaet, Kontoverwaltung |
| E-Mail | Ja | Nein | App-Funktionalitaet, Kontoverwaltung |
| Grober Standort | Ja | Nein | App-Funktionalitaet (Quartierskarte) |
| Genauer Standort | Ja | Nein | App-Funktionalitaet (Notfall-GPS, temporaer) |
| Gesundheitsdaten (Check-in-Status) | Ja | Nein | App-Funktionalitaet |
| User Content (Posts, Meldungen) | Ja | Ja (Anthropic) | App-Funktionalitaet, Sicherheit |
| Fotos/Videos | Ja | Nein | App-Funktionalitaet |

**Zusaetzlich deklarieren:**
- Verschluesselung: TLS in Transit + AES-256-GCM at Rest (sensible Felder)
- Account-Loeschung: verfuegbar (In-App + Web)
- DSGVO-konform: EU-Hosting (Frankfurt)
