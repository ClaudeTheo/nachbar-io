# Nachbar.io — Vollstaendige Projektbeschreibung

## 1. Uebersicht

| Feld | Wert |
|------|------|
| **Projektname** | Nachbar.io |
| **Typ** | Hyperlokale Community-PWA (Progressive Web App) |
| **Zielgebiet** | Bad Saeckingen — Purkersdorfer Str., Sanarystr., Oberer Rebberg |
| **Zielgruppe** | ~30-40 Haushalte, alle Altersgruppen (inkl. Senioren) |
| **Status** | MVP fertiggestellt, Phase 2 Features implementiert |
| **Live-URL** | https://nachbar-io.vercel.app |
| **Repository** | https://github.com/ClaudeTheo/nachbar-io |
| **Lizenz** | Privat |

---

## 2. Problemstellung & Vision

### Das Problem
In vielen Wohnquartieren kennen sich Nachbarn kaum noch. Aeltere Menschen vereinsamen, Hilfeangebote verpuffen, lokale Informationen erreichen nicht alle. Bestehende Plattformen wie Facebook Gruppen oder nebenan.de sind entweder zu unuebersichtlich, nicht datenschutzkonform oder nicht auf kleine Quartiere zugeschnitten.

### Die Loesung
Nachbar.io ist eine minimalistische, DSGVO-konforme Nachbarschafts-App fuer genau ein Quartier. Sie verbindet 30-40 Haushalte ueber eine gemeinsame Plattform mit Soforthilfe-System, Hilfe-Boerse, Marktplatz und lokalem Nachrichtenservice. Besonderer Fokus liegt auf Senioren-Tauglichkeit und Notfall-Kommunikation.

### Kern-Prinzipien
1. **Hyperlokal:** Nur das eigene Quartier, keine globale Plattform
2. **DSGVO-first:** Alle Daten in der EU, Privacy by Design
3. **Senioren-tauglich:** Vereinfachter Modus mit grossen Buttons
4. **Notfall-ready:** 112/110 Banner immer vor App-Funktionen
5. **Einladung-only:** Kein offenes Netzwerk, nur verifizierte Nachbarn

---

## 3. Technologie-Stack

### Frontend
| Technologie | Version | Zweck |
|-------------|---------|-------|
| Next.js | 16.1.6 | React-Framework (App Router) |
| TypeScript | 5.x | Typsicherheit |
| Tailwind CSS | 4.x | Utility-first Styling |
| shadcn/ui | 4.0 | UI-Komponentenbibliothek |
| Leaflet.js | 1.9.4 | Interaktive Karte (OpenStreetMap) |
| sonner | 2.0.7 | Toast-Benachrichtigungen |
| date-fns | 4.1.0 | Datums-Formatierung (DE Locale) |
| lucide-react | 0.577 | Icons |

### Backend
| Technologie | Version | Zweck |
|-------------|---------|-------|
| Supabase | 2.98 | PostgreSQL, Auth, Realtime, Storage |
| Region | EU Frankfurt | DSGVO-Konformitaet |
| RLS | Aktiv | Row Level Security auf allen 17 Tabellen |
| Web Push API | Nativ | Push-Benachrichtigungen (kein Firebase) |
| web-push | 3.6.7 | Server-seitige Push-Implementierung |

### KI-Integration
| Technologie | Zweck |
|-------------|-------|
| Anthropic Claude Haiku | Lokale Nachrichtenzusammenfassung |

### Hosting & CI/CD
| Service | Zweck |
|---------|-------|
| Vercel | Frontend-Hosting (Global CDN) |
| Supabase Cloud | Backend (EU Frankfurt) |
| GitHub | Code-Repository |
| GitHub Actions | CI/CD Pipeline (geplant) |

### Testing
| Tool | Zweck |
|------|-------|
| Playwright | E2E-Tests (15/15 bestanden) |
| Vitest | Unit-Tests (konfiguriert) |
| React Testing Library | Komponenten-Tests (konfiguriert) |

---

## 4. Datenbank-Schema

### 17 Tabellen im Ueberblick

#### Kern-Tabellen
- **users** — Nutzerprofile (18 Testnutzer angelegt)
- **households** — 36 Haushalte mit GPS-Koordinaten und Einladungs-Codes
- **household_members** — Verknuepfung Nutzer-Haushalt mit Verifikation

#### Soforthilfe-System
- **alerts** — Hilfeanfragen mit 8 Kategorien und Eskalations-Radius
- **alert_responses** — Antworten auf Hilfeanfragen (help/info/resolved)

#### Community-Features
- **help_requests** — Hilfe-Boerse (Suche/Angebot)
- **help_responses** — Antworten auf Hilfe-Eintraege
- **marketplace_items** — Marktplatz (Verkaufen/Verschenken/Verleihen/Suchen)
- **lost_found** — Fundbuero (Verloren/Gefunden)
- **events** — Veranstaltungskalender
- **event_participants** — Event-Teilnahmen (going/interested/cancelled)

#### Kommunikation
- **conversations** — 1:1-Nachrichtenthreads
- **direct_messages** — Einzelne Chatnachrichten
- **notifications** — In-App-Benachrichtigungen (8 Typen)
- **push_subscriptions** — Web-Push-Endpunkte

#### System
- **skills** — Kompetenzen/Experten-Profile (13 Kategorien)
- **news_items** — KI-aggregierte lokale Nachrichten
- **senior_checkins** — Sicherheits-Check-ins fuer Senioren
- **community_rules_violations** — Melde-/Moderationssystem

### Sicherheit: Row Level Security (RLS)
Alle Tabellen haben aktive RLS-Policies:
- `is_verified_member()` — Nur verifizierte Quartiermitglieder sehen Daten
- `is_admin()` — Admin-Zugriff fuer Verwaltung
- Eigene Daten: Nutzer koennen nur eigene Eintraege bearbeiten/loeschen
- Conversations: Nur Teilnehmer sehen ihre Gespraeche

---

## 5. Funktionsmodule im Detail

### 5.1 Authentifizierung & Onboarding
- **Registrierung:** 4-Schritt-Wizard (E-Mail/Passwort → Einladungs-Code → Profil → Modus-Wahl)
- **Login:** E-Mail + Passwort, automatische Weiterleitung nach UI-Modus
- **QR-Code Onboarding:** Admin generiert QR-Codes fuer Flyer → Direkt-Link zur Registrierung
- **Middleware:** Schuetzt alle App-Routen, erneuert Session-Cookies

### 5.2 Soforthilfe-System (Alerts)
- **8 Kategorien:** Wasserschaden, Stromausfall, Tuer zu, Sturz, Einkaufshilfe, Technik, Haustier, Sonstiges
- **Eskalations-Kaskade:** Sofort → direkte Nachbarn, 10 Min → Strasse, 30 Min → Quartier
- **Notfall-Banner:** Bei fire/medical/crime IMMER 112/110 anzeigen (nicht verhandelbar)
- **Push-Benachrichtigungen:** Web Push API, max 3/Stunde, Ruhezeiten 22-7 Uhr
- **Status-Tracking:** Offen → Hilfe kommt → Erledigt

### 5.3 Quartierskarte
- **Leaflet.js + OpenStreetMap** (kostenlos, DSGVO-konform)
- **Licht-Indikatoren:** Jedes Haus hat ein Licht (gruen=OK, gelb blinkend=Hilfe, gruen gross=Hilfe kommt)
- **Echtzeit-Updates:** Supabase Realtime-Subscription auf Alerts
- **Interaktiv:** Klick auf Haus zeigt Details

### 5.4 Hilfe-Boerse
- **Zwei Typen:** Hilfe suchen / Hilfe anbieten
- **10 Kategorien:** Garten, Einkaufen, Fahrdienst, IT, Kinderbetreuung, Handwerk, Tierbetreuung, Nachhilfe, Gesellschaft, Sonstiges
- **Filter:** Nach Kategorie filterbar
- **Antwort-System:** Nutzer koennen auf Hilfe-Eintraege antworten

### 5.5 Marktplatz
- **4 Typen:** Verkaufen, Verschenken, Suchen, Verleihen
- **9 Kategorien:** Moebel, Werkzeug, Kinderartikel, Buecher, Elektronik, Kleidung, Pflanzen, Haushalt, Sonstiges
- **Preis-Optionen:** Preis in Euro oder "Geschenkt"
- **Status:** Aktiv → Reserviert → Erledigt

### 5.6 Fundbuero
- **Verloren oder Gefunden** melden
- **7 Kategorien:** Schluessel, Geldboerse, Handy, Haustier, Kleidung, Spielzeug, Sonstiges
- **Ortshinweis:** z.B. "Naehe Sanarystr. Hoehe Nr. 3"

### 5.7 Quartiersnews
- **KI-Zusammenfassung:** Claude Haiku API aggregiert lokale Nachrichten
- **6 Kategorien:** Infrastruktur, Events, Verwaltung, Wetter, Abfallwirtschaft, Sonstiges
- **Relevanz-Score:** 0-10 (nur relevante Nachrichten werden angezeigt)

### 5.8 Veranstaltungskalender (Phase 2)
- **Events erstellen:** Titel, Beschreibung, Ort, Datum/Uhrzeit, max. Teilnehmer
- **8 Kategorien:** Nachbarschaftstreffen, Sport, Kultur, Flohmarkt, Kinder, Senioren, Putzaktion, Sonstiges
- **Teilnahme:** "Teilnehmen" oder "Interessiert" klicken
- **Ausgebucht-Anzeige:** Wenn max. Teilnehmerzahl erreicht

### 5.9 Direktnachrichten (Phase 2)
- **1:1 Chat** zwischen verifizierten Nachbarn
- **Echtzeit:** Supabase Realtime fuer sofortige Zustellung
- **Gelesen-Status:** Haken wenn Nachricht gelesen wurde
- **Ungelesen-Badge:** Anzahl ungelesener Nachrichten in der Liste

### 5.10 Seniorenmodus
- **Separate Routen** (/senior/*)
- **Design-Regeln:** Min. 80px Touch-Targets, 4.5:1 Kontrast, max 4 Taps
- **4 Hauptfunktionen:** Hilfe anfragen, Nachrichten, Alles in Ordnung, Nachbarn kontaktieren
- **Taegl. Check-in:** Sicherheits-Check fuer alleinlebende Senioren
- **Notruf:** 112-Button immer sichtbar

### 5.11 QR-Code Onboarding (Phase 2)
- **API-Route:** /api/qr?code=PKD001 generiert QR-Code-Bild
- **Flyer-tauglich:** Admin druckt QR-Codes fuer Hausbriefkaesten
- **Auto-Fill:** QR-Code oeffnet Registrierung mit vorausgefuelltem Code

### 5.12 Admin-Dashboard
- **Statistiken:** 6 Kennzahlen (Nutzer, Haushalte, Meldungen, Hilfe, Marktplatz)
- **Nutzer-Liste:** Alle registrierten Nutzer mit Trust-Level und Modus
- **Haushalte-Liste:** Alle Haushalte mit Invite-Code und QR-Link
- **Meldungen-Liste:** Letzte 50 Alerts mit Status

---

## 6. Design-System

### Farben
| Farbe | Hex | Verwendung |
|-------|-----|-----------|
| Anthrazit | #2D3142 | Primaerfarbe, Text, Headings |
| Quartier-Gruen | #4CAF87 | Aktionen, Erfolg, Branding |
| Alert-Amber | #F59E0B | Warnungen, offene Meldungen |
| Emergency-Rot | #EF4444 | NUR fuer 112/110 Notruf-Banner |
| Warmweiss | #FAFAF8 | Hintergrund |
| Hellgrau | #F0F0EC | Sekundaerer Hintergrund |

### Typografie
- **Font:** Inter (Google Fonts)
- **Grid:** 8px
- **Senior-Modus:** 22px+ Body, 24px+ Buttons

### Tonalitaet
- Siezen ("Sie" statt "du")
- Ruhig und sachlich
- Kein Startup-Hype
- Empathisch bei Hilfe-Situationen

### Animationen
- `animate-fade-in-up` — Sanftes Einblenden von unten
- `animate-stagger` — Versetztes Einblenden von Listen
- `animate-shimmer` — Lade-Skelett-Effekt
- `animate-pulse-alert` — Pulsierendes Amber fuer aktive Alerts
- `prefers-reduced-motion` wird respektiert

---

## 7. PWA-Features

- **Service Worker:** Offline-Faehigkeit + Push-Benachrichtigungen
- **Web App Manifest:** Installierbar auf iOS/Android Home-Screen
- **Install-Prompt:** Banner fordert zur Installation auf
- **Push-Notifications:** Native Web Push (kein Firebase/OneSignal)
- **Pull-to-Refresh:** Mobile Geste zum Aktualisieren

---

## 8. DSGVO-Konformitaet

| Massnahme | Umsetzung |
|-----------|-----------|
| Datenstandort | Supabase EU Frankfurt |
| Datensparsamkeit | Nur email_hash gespeichert, keine Klartext-E-Mail |
| Row Level Security | Alle 17 Tabellen mit RLS |
| Invite-Only | Kein oeffentlicher Zugang |
| Keine Tracking-Pixel | Keine Analytics-Dienste |
| Kein Social Login | Nur E-Mail/Passwort |
| Loeschbarkeit | Kaskaden-Loeschung bei Account-Entfernung |
| Verschluesselung | HTTPS erzwungen, Push-Keys verschluesselt |

---

## 9. Dateistruktur

```
nachbar-io/
├── app/
│   ├── (app)/                    # Geschuetzte App-Seiten
│   │   ├── admin/page.tsx        # Admin-Dashboard
│   │   ├── alerts/               # Soforthilfe
│   │   │   ├── page.tsx          # Alert-Liste
│   │   │   ├── new/page.tsx      # Neuer Alert
│   │   │   └── [id]/page.tsx     # Alert-Detail
│   │   ├── dashboard/page.tsx    # Startseite
│   │   ├── events/               # Veranstaltungen
│   │   │   ├── page.tsx          # Event-Liste
│   │   │   ├── new/page.tsx      # Neues Event
│   │   │   └── [id]/page.tsx     # Event-Detail
│   │   ├── help/                 # Hilfe-Boerse
│   │   │   ├── page.tsx          # Hilfe-Liste
│   │   │   ├── new/page.tsx      # Neue Hilfe
│   │   │   └── [id]/page.tsx     # Hilfe-Detail
│   │   ├── lost-found/           # Fundbuero
│   │   ├── map/page.tsx          # Quartierskarte
│   │   ├── marketplace/          # Marktplatz
│   │   ├── messages/             # Direktnachrichten
│   │   │   ├── page.tsx          # Gespraechs-Liste
│   │   │   └── [id]/page.tsx     # Chat-Ansicht
│   │   ├── news/page.tsx         # Quartiersnews
│   │   ├── profile/              # Profil & Einstellungen
│   │   └── welcome/page.tsx      # Onboarding-Tour
│   ├── (auth)/                   # Auth-Seiten
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── senior/                   # Seniorenmodus
│   │   ├── home/page.tsx
│   │   ├── checkin/page.tsx
│   │   ├── help/page.tsx
│   │   └── news/page.tsx
│   ├── api/                      # API-Routen
│   │   ├── alerts/route.ts
│   │   ├── push/subscribe/route.ts
│   │   ├── push/send/route.ts
│   │   ├── news/aggregate/route.ts
│   │   └── qr/route.ts
│   └── layout.tsx                # Root-Layout
├── components/
│   ├── AlertCard.tsx
│   ├── BottomNav.tsx
│   ├── EmergencyBanner.tsx
│   ├── InstallPrompt.tsx
│   ├── NewsCard.tsx
│   ├── PullToRefresh.tsx
│   ├── QuarterMap.tsx
│   ├── SeniorButton.tsx
│   ├── ServiceWorkerRegistration.tsx
│   ├── TrustBadge.tsx
│   └── ui/                       # shadcn/ui Komponenten
├── lib/
│   ├── constants.ts              # Quartier-Konfiguration
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase-Client
│   │   ├── server.ts             # Server Supabase-Client
│   │   ├── middleware.ts          # Session-Verwaltung
│   │   └── types.ts              # TypeScript-Definitionen
│   └── utils.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_fix_registration_rls.sql
│   │   ├── 003_help_responses.sql
│   │   └── 004_events_and_messages.sql
│   └── seed.sql                   # Testdaten (36 HH, 18 User)
├── e2e/                           # Playwright E2E-Tests
│   ├── auth.spec.ts
│   ├── navigation.spec.ts
│   ├── pwa.spec.ts
│   └── api.spec.ts
├── public/
│   ├── manifest.json
│   ├── sw.js                      # Service Worker
│   └── icons/                     # App-Icons
└── CLAUDE.md                      # Projekt-Kontext fuer KI
```

---

## 10. Roadmap

### Phase 1: Pilotquartier (Monat 1-3) ← AKTUELL
- MVP fertiggestellt
- 36 Haushalte konfiguriert
- Alle Kernfunktionen live
- E2E-Tests bestanden
- Deployed auf Vercel

### Phase 2: Multi-Quartier (Monat 4-9) ← TEILWEISE IMPLEMENTIERT
- Veranstaltungskalender ✅
- Direktnachrichten ✅
- QR-Code Onboarding ✅
- Multi-Tenant-Architektur (ausstehend)
- Erweitertes Admin-Dashboard (ausstehend)

### Phase 3: Stadt/Gemeinden (Monat 10-18)
- Gemeinde-Portal
- Muellkalender-Integration
- Handwerker-Verzeichnis
- Native App-Shell (Capacitor)

### Phase 4: Plattform (Monat 18+)
- White-Label fuer Hausverwaltungen
- B2B SaaS-Modell
- API fuer Drittanbieter

---

## 11. Kosten

### Aktuell (Phase 1)
| Posten | Kosten |
|--------|--------|
| Supabase Free | $0/Monat |
| Vercel Hobby | $0/Monat |
| Claude API (Haiku) | ~$1/Monat |
| Domain | ~$3/Monat |
| **Gesamt** | **~$4/Monat** |

### Geplant (Phase 2+)
| Posten | Kosten |
|--------|--------|
| Supabase Pro | $25/Monat |
| Vercel Pro | $20/Monat |
| Claude API | ~$5/Monat |
| **Gesamt** | **~$50/Monat** |

---

## 12. Kontakt & Links

- **Live:** https://nachbar-io.vercel.app
- **Code:** https://github.com/ClaudeTheo/nachbar-io
- **Supabase:** https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka
