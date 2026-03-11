// lib/testing/test-config.ts
// Nachbar.io — Testpunkte-Konfiguration fuer das Pilot-QA-System
// Basierend auf den bestehenden Sections A-N aus /testanleitung

import type { TestPath, TestPoint } from './types';

// ============================================================
// Aktuelle Version der Testpunkte-Konfiguration
// ============================================================
export const TEST_CONFIG_VERSION = '1.0';

// ============================================================
// Testpfade mit allen Testpunkten
// ============================================================

export const TEST_PATHS: TestPath[] = [
  // ─────────────────────────────────────────────────
  // 1. Registrierung & Grundlagen
  // ─────────────────────────────────────────────────
  {
    id: 'registration',
    name: 'Registrierung & Grundlagen',
    icon: 'Smartphone',
    description: 'App oeffnen, Registrierung, Dashboard und Navigation pruefen',
    estimatedMinutes: 10,
    order: 1,
    points: [
      {
        id: 'A1',
        title: 'App im Browser oeffnen',
        description: 'Oeffnen Sie nachbar-io.vercel.app — die Startseite (Login) wird angezeigt.',
        route: '/login',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['critical'],
      },
      {
        id: 'A2',
        title: 'Registrierung abschliessen',
        description: 'Alle 5 Schritte der Registrierung durchlaufen: E-Mail, Passwort, Adresse, Anzeigename, UI-Modus.',
        route: '/register',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['critical'],
      },
      {
        id: 'A3',
        title: 'Dashboard nach Freischaltung',
        description: 'Nach der Freischaltung durch Admin: Dashboard wird angezeigt mit persoenlicher Begrueassung.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['critical'],
      },
      {
        id: 'A4',
        title: 'Untere Navigation pruefen',
        description: 'Alle Tabs in der Bottom-Navigation antippen: Dashboard, Hilfe, Karte, Marktplatz, Profil. Jeder Tab zeigt die richtige Seite.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'A5',
        title: 'PWA installieren',
        description: 'App als PWA installieren ("Zum Startbildschirm hinzufuegen"). App oeffnet sich anschliessend ohne Browser-Rahmen.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 2. Profil & Einstellungen
  // ─────────────────────────────────────────────────
  {
    id: 'profile',
    name: 'Profil & Einstellungen',
    icon: 'UserCog',
    description: 'Profil bearbeiten, Push aktivieren, Urlaubsmodus, Reputation',
    estimatedMinutes: 8,
    order: 2,
    points: [
      {
        id: 'B1',
        title: 'Profil oeffnen',
        description: 'Profil-Seite oeffnen und Anzeigenamen pruefen — stimmt er mit der Registrierung ueberein?',
        route: '/profil',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'B2',
        title: 'Profil bearbeiten',
        description: 'Profil bearbeiten: Bio-Text hinzufuegen und speichern. Text erscheint danach auf der Profilseite.',
        route: '/profil/bearbeiten',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'B3',
        title: 'Push-Benachrichtigungen aktivieren',
        description: 'Profil → Benachrichtigungen → Push aktivieren. Browser-Berechtigung wird angefragt.',
        route: '/profil',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['critical'],
      },
      {
        id: 'B4',
        title: 'Urlaubsmodus testen',
        description: 'Urlaubsmodus ein- und ausschalten. Status aendert sich sichtbar auf dem Profil.',
        route: '/profil',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'B5',
        title: 'Hilfe-Center oeffnen',
        description: 'Hilfe-Center oeffnen und FAQ-Eintraege lesen. Texte sind verstaendlich und vollstaendig.',
        route: '/profil',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'B6',
        title: 'Reputation-Seite pruefen',
        description: 'Profil → "Meine Reputation" oeffnen. Punkte und Level werden angezeigt.',
        route: '/profil',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 3. Quartierskarte
  // ─────────────────────────────────────────────────
  {
    id: 'map',
    name: 'Quartierskarte',
    icon: 'Map',
    description: 'Interaktive SVG-Karte: Haeuser, Lampen, Filter',
    estimatedMinutes: 5,
    order: 3,
    points: [
      {
        id: 'C1',
        title: 'Karte oeffnen und Strassen sehen',
        description: 'Karte oeffnen — alle 3 Strassen (Purkersdorfer, Sanary, Oberer Rebberg) sind sichtbar.',
        route: '/map',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'C2',
        title: 'Haus antippen — Info-Panel',
        description: 'Auf ein Haus tippen — Info-Panel oeffnet sich mit Hausnummer und Bewohner-Status.',
        route: '/map',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'C3',
        title: 'Lampe antippen — Farbwechsel',
        description: 'Lampe antippen — Farbe wechselt (Gruen → Rot → Gelb → Gruen). Glow-Effekt sichtbar.',
        route: '/map',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'C4',
        title: 'Strassenfilter nutzen',
        description: 'Strassenfilter oben nutzen — nur die gewaehlte Strasse wird hervorgehoben.',
        route: '/map',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 4. Hilfe-System
  // ─────────────────────────────────────────────────
  {
    id: 'help',
    name: 'Hilfe-System',
    icon: 'HandHelping',
    description: 'Hilfe-Eintraege erstellen, beantworten, Kategorien pruefen',
    estimatedMinutes: 8,
    order: 4,
    points: [
      {
        id: 'D1',
        title: 'Hilfe-Eintrag erstellen',
        description: 'Neuen Hilfe-Eintrag erstellen (z.B. "Suche jemanden zum Blumen giessen"). Eintrag erscheint in der Liste.',
        route: '/hilfe',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['critical'],
      },
      {
        id: 'D2',
        title: 'Kategorie und Dringlichkeit waehlen',
        description: 'Beim Erstellen: Kategorie und Dringlichkeit waehlen. Beide werden korrekt gespeichert und angezeigt.',
        route: '/hilfe',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'D3',
        title: 'Hilfe-Eintrag anderer sehen',
        description: 'Hilfe-Eintrag eines anderen Testers sehen — Titel, Beschreibung und Status sind lesbar.',
        route: '/hilfe',
        mode: 'pair',
        version: '1.0',
        active: true,
        partnerInstructions: 'Ein anderer Tester muss vorher einen Hilfe-Eintrag erstellt haben.',
      },
      {
        id: 'D4',
        title: 'Auf Hilfe-Eintrag antworten',
        description: 'Auf einen Hilfe-Eintrag eines anderen Testers antworten. Antwort wird gespeichert und ist sichtbar.',
        route: '/hilfe',
        mode: 'pair',
        version: '1.0',
        active: true,
        partnerInstructions: 'Ein anderer Tester muss vorher einen Hilfe-Eintrag erstellt haben.',
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 5. Marktplatz & Boersen
  // ─────────────────────────────────────────────────
  {
    id: 'marketplace',
    name: 'Marktplatz & Boersen',
    icon: 'ShoppingBag',
    description: 'Marktplatz, Leihboerse, Wer hat? pruefen',
    estimatedMinutes: 8,
    order: 5,
    points: [
      {
        id: 'E1',
        title: 'Marktplatz oeffnen',
        description: 'Marktplatz oeffnen — Angebotsliste wird geladen. Layout ist uebersichtlich.',
        route: '/marktplatz',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'E2',
        title: 'Angebot erstellen',
        description: 'Neues Angebot erstellen (z.B. "Verschenke Blumentoepfe"). Alle Felder ausfuellen. Angebot erscheint in der Liste.',
        route: '/marktplatz/erstellen',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['critical'],
      },
      {
        id: 'E3',
        title: 'Leihboerse oeffnen',
        description: 'Leihboerse oeffnen — Liste wird geladen. Navigation funktioniert.',
        route: '/leihboerse',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'E4',
        title: 'Leihboerse-Eintrag erstellen',
        description: 'Neuen Leihboerse-Eintrag erstellen. Eintrag erscheint in der Liste.',
        route: '/leihboerse/erstellen',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'E5',
        title: '"Wer hat?" nutzen',
        description: '"Wer hat?" Seite oeffnen und neue Anfrage erstellen.',
        route: '/werhat',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 6. Community
  // ─────────────────────────────────────────────────
  {
    id: 'community',
    name: 'Community',
    icon: 'Users',
    description: 'Pinnwand, Events, Tipps, News, Umfragen',
    estimatedMinutes: 10,
    order: 6,
    points: [
      {
        id: 'F1',
        title: 'Schwarzes Brett oeffnen',
        description: 'Pinnwand oeffnen — Eintraege werden angezeigt. Layout ist klar und uebersichtlich.',
        route: '/pinnwand',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'F2',
        title: 'Veranstaltungen oeffnen',
        description: 'Events-Seite oeffnen — kommende Veranstaltungen werden aufgelistet.',
        route: '/events',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'F3',
        title: 'Event erstellen',
        description: 'Neues Event erstellen mit Titel, Datum, Ort, Beschreibung. Event erscheint in der Liste.',
        route: '/events/erstellen',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'F4',
        title: 'Tipp schreiben',
        description: 'Tipps-Seite oeffnen und neuen Tipp erstellen. Tipp wird gespeichert und angezeigt.',
        route: '/tipps/erstellen',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'F5',
        title: 'Lokale Nachrichten lesen',
        description: 'News-Seite oeffnen — KI-aggregierte lokale Nachrichten werden angezeigt.',
        route: '/news',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'F6',
        title: 'Umfrage erstellen',
        description: 'Umfragen-Seite oeffnen und neue Umfrage mit Optionen erstellen.',
        route: '/umfragen/erstellen',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 7. Nachrichten (Pair-Tests)
  // ─────────────────────────────────────────────────
  {
    id: 'messages',
    name: 'Nachrichten',
    icon: 'MessageCircle',
    description: 'Direktnachrichten, Kontaktanfragen, Echtzeit-Chat',
    estimatedMinutes: 10,
    order: 7,
    points: [
      {
        id: 'G1',
        title: 'Nachrichten oeffnen',
        description: 'Tester A oeffnet "Nachrichten" in der Navigation. Nachrichtenliste wird angezeigt.',
        route: '/nachrichten',
        mode: 'pair',
        version: '1.0',
        active: true,
        partnerInstructions: 'Tester B muss registriert und freigeschaltet sein.',
      },
      {
        id: 'G2',
        title: 'Kontaktanfrage senden',
        description: 'Tester A sucht Tester B und sendet eine Kontaktanfrage.',
        route: '/nachrichten',
        mode: 'pair',
        version: '1.0',
        active: true,
        tags: ['critical'],
        partnerInstructions: 'Tester B wartet auf die eingehende Kontaktanfrage.',
      },
      {
        id: 'G3',
        title: 'Kontaktanfrage empfangen',
        description: 'Tester B sieht die eingehende Kontaktanfrage von Tester A.',
        route: '/nachrichten',
        mode: 'pair',
        version: '1.0',
        active: true,
        partnerInstructions: 'Tester A muss vorher die Kontaktanfrage gesendet haben.',
      },
      {
        id: 'G4',
        title: 'Kontaktanfrage annehmen',
        description: 'Tester B nimmt die Anfrage an. Beide sehen nun den Chat.',
        route: '/nachrichten',
        mode: 'pair',
        version: '1.0',
        active: true,
        partnerInstructions: 'Tester A hat die Anfrage gesendet, Tester B nimmt an.',
      },
      {
        id: 'G5',
        title: 'Nachricht senden',
        description: 'Tester A sendet eine Textnachricht an Tester B.',
        route: '/nachrichten',
        mode: 'pair',
        version: '1.0',
        active: true,
        tags: ['critical'],
        partnerInstructions: 'Tester B prueft ob die Nachricht in Echtzeit erscheint.',
      },
      {
        id: 'G6',
        title: 'Echtzeit-Empfang pruefen',
        description: 'Tester B sieht die Nachricht von Tester A in Echtzeit — OHNE Seite neu zu laden.',
        route: '/nachrichten',
        mode: 'pair',
        version: '1.0',
        active: true,
        tags: ['critical'],
        partnerInstructions: 'Tester A sendet die Nachricht, Tester B beobachtet.',
      },
      {
        id: 'G7',
        title: 'Antwort live empfangen',
        description: 'Tester B antwortet → Tester A sieht die Antwort live ohne Neuladen.',
        route: '/nachrichten',
        mode: 'pair',
        version: '1.0',
        active: true,
        partnerInstructions: 'Beide Tester pruefen die Echtzeit-Zustellung.',
      },
      {
        id: 'G8',
        title: 'Ungelesene Nachrichten Badge',
        description: 'Ungelesene Nachrichten werden als Zahl am Nachrichten-Icon in der Navigation angezeigt.',
        route: '/nachrichten',
        mode: 'pair',
        version: '1.0',
        active: true,
        partnerInstructions: 'Ein Tester sendet eine Nachricht, der andere prueft das Badge.',
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 8. Push & Einladungen (Pair-Tests)
  // ─────────────────────────────────────────────────
  {
    id: 'push_invites',
    name: 'Push & Einladungen',
    icon: 'Bell',
    description: 'Push-Benachrichtigungen, Benachrichtigungs-Center, Einladungssystem',
    estimatedMinutes: 10,
    order: 8,
    points: [
      {
        id: 'H1',
        title: 'Push durch Hilfe-Eintrag ausloesen',
        description: 'Tester A erstellt einen neuen Hilfe-Eintrag. Alle Nachbarn mit aktivem Push sollten benachrichtigt werden.',
        route: '/hilfe',
        mode: 'pair',
        version: '1.0',
        active: true,
        tags: ['critical'],
        partnerInstructions: 'Tester B hat Push aktiviert (B3) und wartet auf die Benachrichtigung.',
      },
      {
        id: 'H2',
        title: 'Push-Benachrichtigung empfangen',
        description: 'Tester B prueft: Kommt eine Push-Benachrichtigung auf dem Geraet an?',
        route: '/',
        mode: 'pair',
        version: '1.0',
        active: true,
        tags: ['critical'],
        partnerInstructions: 'Tester A hat den Hilfe-Eintrag erstellt.',
      },
      {
        id: 'H3',
        title: 'Push-Tap Navigation',
        description: 'Tippen auf die Push-Nachricht oeffnet die richtige Seite in der App.',
        route: '/',
        mode: 'pair',
        version: '1.0',
        active: true,
        partnerInstructions: 'Pruefe ob der richtige Hilfe-Eintrag geoeffnet wird.',
      },
      {
        id: 'H4',
        title: 'Benachrichtigungs-Center oeffnen',
        description: 'Glocken-Icon antippen → alle Benachrichtigungen werden aufgelistet.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'H5',
        title: 'Benachrichtigung als gelesen markieren',
        description: 'Einzelne Benachrichtigung antippen → wird als gelesen markiert.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'H6',
        title: 'Ungelesene Badge an Glocke',
        description: 'Ungelesene Benachrichtigungen werden als rote Zahl am Glocken-Icon angezeigt.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'I1',
        title: 'Nachbar einladen',
        description: 'Profil → "Nachbar einladen" antippen.',
        route: '/profil',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'I2',
        title: 'WhatsApp-Einladung erstellen',
        description: 'Einladung per WhatsApp-Link erstellen. Link wird generiert.',
        route: '/profil',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'I3',
        title: 'WhatsApp oeffnet sich',
        description: 'WhatsApp oeffnet sich mit vorgefertigtem Einladungstext.',
        route: '/profil',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'I4',
        title: 'Einladungen anzeigen',
        description: '"Meine Einladungen" zeigt die offene Einladung mit Status.',
        route: '/profil',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 9. Sonderfaelle
  // ─────────────────────────────────────────────────
  {
    id: 'special',
    name: 'Sonderfaelle',
    icon: 'AlertTriangle',
    description: 'Notfall-Banner, Seniorenmodus, spezielle Szenarien',
    estimatedMinutes: 10,
    order: 9,
    points: [
      {
        id: 'J1',
        title: 'Notfall-Banner: Feuer',
        description: 'Hilfe-Eintrag mit Kategorie "Feuer/Brand" erstellen — rotes Notfall-Banner erscheint mit 112-Hinweis. ACHTUNG: Nicht den echten Notruf waehlen!',
        route: '/hilfe',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['critical', 'safety'],
      },
      {
        id: 'J2',
        title: 'Notfall-Banner Sichtbarkeit',
        description: 'Das rote Banner steht UEBER allem — kein UI-Element verdeckt es.',
        route: '/hilfe',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['critical', 'safety'],
      },
      {
        id: 'J3',
        title: 'Notfall-Banner: Medizinisch',
        description: 'Gleicher Test mit "Medizinischer Notfall" — Banner mit 112 erscheint.',
        route: '/hilfe',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['critical', 'safety'],
      },
      {
        id: 'J4',
        title: 'Notfall-Banner: Kriminalitaet',
        description: 'Gleicher Test mit "Kriminalitaet" — Banner mit 110 erscheint.',
        route: '/hilfe',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['critical', 'safety'],
      },
      {
        id: 'K1',
        title: 'Seniorenmodus aktivieren',
        description: 'Im Profil den Seniorenmodus aktivieren. UI wechselt zum vereinfachten Layout.',
        route: '/profil',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['senior', 'accessibility'],
      },
      {
        id: 'K2',
        title: 'Schrift wird groesser',
        description: 'Im Seniorenmodus: Schrift ist deutlich groesser und gut lesbar.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['senior', 'accessibility'],
      },
      {
        id: 'K3',
        title: 'Touch-Targets 80px',
        description: 'Buttons und interaktive Elemente sind fingerkuppengross (mindestens 80px).',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['senior', 'accessibility'],
      },
      {
        id: 'K4',
        title: 'Kontrast prufen',
        description: 'Kontraste sind gut lesbar — mindestens 4.5:1 Verhaeltnis.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['senior', 'accessibility'],
      },
      {
        id: 'K5',
        title: 'Max 4 Taps Regel',
        description: 'Jede Hauptaktion ist in maximal 4 Taps erreichbar.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['senior', 'accessibility'],
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 10. DSGVO & Qualitaet
  // ─────────────────────────────────────────────────
  {
    id: 'quality',
    name: 'DSGVO & Qualitaet',
    icon: 'Shield',
    description: 'Datenschutz, Impressum, Design-Qualitaet, Offline, PWA',
    estimatedMinutes: 8,
    order: 10,
    points: [
      {
        id: 'L1',
        title: 'Impressum-Seite',
        description: 'Impressum-Seite oeffnen und pruefen: Vollstaendige Angaben vorhanden.',
        route: '/impressum',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['dsgvo'],
      },
      {
        id: 'L2',
        title: 'Datenschutz-Seite',
        description: 'Datenschutz-Seite oeffnen: Vollstaendige Erklaerung vorhanden.',
        route: '/datenschutz',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['dsgvo'],
      },
      {
        id: 'L3',
        title: 'Daten exportieren',
        description: 'Profil → "Daten exportieren" → JSON-Datei wird heruntergeladen.',
        route: '/profil',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['dsgvo', 'critical'],
      },
      {
        id: 'L4',
        title: 'Export enthaelt keine Fremddaten',
        description: 'In der exportierten Datei stehen KEINE Adressen oder Daten anderer Nachbarn.',
        route: '/profil',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['dsgvo', 'critical'],
      },
      {
        id: 'M1',
        title: 'Mobile Layout pruefen',
        description: 'App sieht auf dem Handy gut aus — kein abgeschnittener Text, kein Overflow.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['ui'],
      },
      {
        id: 'M2',
        title: 'Deutsche Sie-Form',
        description: 'Alle Texte auf Deutsch und durchgehend in "Sie"-Form.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['text'],
      },
      {
        id: 'M3',
        title: 'Farbschema pruefen',
        description: 'Farben: Gruen als Hauptfarbe, Gelb/Amber fuer Warnungen. Rot wird NUR fuer Notruf-Banner (112/110) verwendet.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['ui'],
      },
      {
        id: 'M4',
        title: 'Rot nur fuer Notruf',
        description: 'Rot (#EF4444) wird ausschliesslich fuer das Notruf-Banner verwendet — nirgens sonst.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['ui', 'critical'],
      },
      {
        id: 'M5',
        title: 'Ladezeiten pruefen',
        description: 'Seiten laden in 2-3 Sekunden. Keine langen Wartezeiten oder haengende Spinners.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['performance'],
      },
      {
        id: 'M6',
        title: 'Deutsche Fehlermeldungen',
        description: 'Fehlermeldungen sind verstaendlich und auf Deutsch — kein Englisch, kein technischer Jargon.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
        tags: ['text'],
      },
      {
        id: 'N1',
        title: 'PWA Installation',
        description: 'App als PWA installieren ueber Browser-Menue.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'N2',
        title: 'PWA ohne Browser-Rahmen',
        description: 'Vom Startbildschirm oeffnen — App zeigt keinen Browser-Rahmen, eigenes App-Fenster.',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
      {
        id: 'N3',
        title: 'Offline-Meldung',
        description: 'WLAN kurz ausschalten — sinnvolle Offline-Meldung wird angezeigt (kein Crash).',
        route: '/',
        mode: 'solo',
        version: '1.0',
        active: true,
      },
    ],
  },
];

// ============================================================
// Hilfsfunktionen
// ============================================================

/** Alle aktiven Testpunkte als flache Liste */
export function getAllActiveTestPoints(): TestPoint[] {
  return TEST_PATHS.flatMap(path =>
    path.points.filter(p => p.active)
  );
}

/** Alle Testpunkt-IDs */
export function getAllTestPointIds(): string[] {
  return getAllActiveTestPoints().map(p => p.id);
}

/** Testpunkt nach ID finden */
export function getTestPointById(id: string): TestPoint | undefined {
  for (const path of TEST_PATHS) {
    const point = path.points.find(p => p.id === id);
    if (point) return point;
  }
  return undefined;
}

/** Testpfad fuer einen Testpunkt finden */
export function getPathForTestPoint(pointId: string): TestPath | undefined {
  return TEST_PATHS.find(path =>
    path.points.some(p => p.id === pointId)
  );
}

/** Gesamtanzahl aktiver Testpunkte */
export function getTotalActivePoints(): number {
  return getAllActiveTestPoints().length;
}

/** Geschaetzte Gesamtdauer in Minuten */
export function getTotalEstimatedMinutes(): number {
  return TEST_PATHS.reduce((sum, path) => sum + path.estimatedMinutes, 0);
}
