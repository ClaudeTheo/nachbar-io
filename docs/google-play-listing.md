# Google Play Store Listing — QuartierApp

## Kurzname
QuartierApp

## Kurzbeschreibung (80 Zeichen)
Ihre Nachbarschaft. Sicher vernetzt. Lokal informiert.

## Langbeschreibung (deutsch, max 4.000 Zeichen)

QuartierApp verbindet Ihre Nachbarschaft — sicher, lokal und datenschutzkonform.

Fuer Bewohner des Quartiers Bad Saeckingen (Purkersdorfer Str., Sanarystr., Oberer Rebberg) bietet QuartierApp:

NOTFALL-HINWEIS
Bei Gefahr zuerst 112 oder 110. QuartierApp zeigt diesen Hinweis prominent an. Danach koennen Sie zusaetzlich vertraute Kontakte oder Nachbarn informieren. QuartierApp ist kein Hausnotruf, keine Leitstelle und garantiert keine Reaktionszeit.

SCHWARZES BRETT
Teilen Sie Neuigkeiten, Gesuche und Hinweise mit Ihren Nachbarn. Von der verlorenen Katze bis zum Strassenfest — alles an einem Ort.

MARKTPLATZ
Verschenken, tauschen, verkaufen — direkt in der Nachbarschaft. Nachhaltig und ohne Versandkosten.

QUARTIERSKARTE
Sehen Sie auf einen Blick, was in Ihrem Quartier passiert. OpenStreetMap-basiert, ohne Tracking, ohne Werbung.

TAEGLICHER CHECK-IN
Wie geht es Ihnen heute? Ein kurzer Klick genuegt. Der Check-in ist eine freiwillige Organisationshilfe fuer den Alltag. Wenn Sie moechten, koennen Angehoerige den Status sehen (nur mit Ihrer ausdruecklichen Einwilligung).

KI-HILFE OPTIONAL
KI-Hilfe wird nur nach Einwilligung freigeschaltet. Nutzer sehen klar, wenn sie mit KI interagieren. KI-Antworten koennen Fehler enthalten und ersetzen keine medizinische, rechtliche oder finanzielle Beratung.

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
Grosse Buttons (mind. 80px), hoher Kontrast (4.5:1), klare Wege und Notrufhinweis zuerst. QuartierApp ist fuer alle Altersgruppen gemacht.

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
| Deutscher Alias Account-Loeschung | https://quartierapp.de/konto-loeschen |

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
  - User-generated content can be reported by users and reviewed by admins
  - AI assistance is optional, consent-based, and clearly disclosed to users
  - Location: foreground-only, no background location
  - Check-in is subjective daily status, NOT medical diagnosis or monitoring
  - Push notifications require opt-in
  - Account deletion available in-app (/profile/delete) AND via web (quartierapp.de/account-loeschen, German alias: quartierapp.de/konto-loeschen)
  - UGC: Community guidelines acceptance required before first post
  - Emergency: 112/110 banner shown for fire/medical/crime - app is NOT an emergency service, house alarm system, dispatch center, or medical device

Data Sharing:
  - Personal AI features are off by default and require user consent
  - Where AI providers are enabled, users are informed before use and outputs are disclosed as AI assistance
  - Core database is hosted in Supabase EU infrastructure (Frankfurt)
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
| User Content (Posts, Meldungen) | Ja | Optional (KI-Anbieter, nur wenn freigeschaltet) | App-Funktionalitaet, Sicherheit |
| Fotos/Videos | Ja | Nein | App-Funktionalitaet |

**Zusaetzlich deklarieren:**
- Verschluesselung: TLS in Transit + AES-256-GCM at Rest (sensible Felder)
- Account-Loeschung: verfuegbar (In-App + Web)
- DSGVO-konform: EU-Hosting (Frankfurt)

## Wording Guardrails

Vor jedem Store-Submit `docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md` pruefen.
