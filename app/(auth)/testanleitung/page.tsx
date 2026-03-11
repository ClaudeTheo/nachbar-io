"use client";

import Link from "next/link";
import { ArrowLeft, CheckSquare, Users, Bell, Shield, Smartphone } from "lucide-react";

export default function TestanleitungPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit">
        <ArrowLeft className="h-4 w-4" /> Zur Startseite
      </Link>

      <div className="mb-8 text-center">
        <div className="mb-2 text-4xl">🧪</div>
        <h1 className="text-2xl font-bold text-anthrazit">Testanleitung</h1>
        <p className="mt-2 text-muted-foreground">
          Nachbar.io — Pilottest fuer Bad Saeckingen
        </p>
      </div>

      {/* Hinweis auf das neue Test-System */}
      <div className="mb-6 rounded-xl border-2 border-quartier-green bg-quartier-green/5 p-5">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-quartier-green">
          <CheckSquare className="h-5 w-5" />
          Neues Test-System verfuegbar
        </h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Fuer registrierte Tester steht jetzt ein interaktives Test-System mit Fortschrittsverfolgung,
          Status-Tracking und automatischen Berichten zur Verfuegung. Melden Sie sich einfach an —
          das Test-Panel erscheint automatisch.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-lg bg-quartier-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-quartier-green/90"
        >
          Zum Login &amp; Test starten
        </Link>
      </div>

      <p className="mb-6 text-center text-xs text-muted-foreground">
        Die folgende Checkliste dient als Referenz. Nutzen Sie bevorzugt das interaktive Test-System nach dem Login.
      </p>

      {/* Registrierung */}
      <Section icon={<Smartphone className="h-5 w-5" />} title="1. Registrierung" id="registrierung">
        <ol className="list-inside list-decimal space-y-2 text-sm">
          <li>Öffnen Sie <strong>nachbar-io.vercel.app</strong> auf Ihrem Smartphone</li>
          <li>Tippen Sie auf <strong>&quot;Registrieren&quot;</strong></li>
          <li><strong>Schritt 1:</strong> E-Mail-Adresse und Passwort eingeben (mind. 8 Zeichen)</li>
          <li><strong>Schritt 2:</strong> Wählen Sie <strong>&quot;Adresse manuell angeben&quot;</strong></li>
          <li><strong>Schritt 3:</strong> Wählen Sie eine Straße und geben Sie eine beliebige Hausnummer ein</li>
          <li><strong>Schritt 4:</strong> Geben Sie einen Anzeigenamen ein (Vorname reicht)</li>
          <li><strong>Schritt 5:</strong> Wählen Sie Ihren UI-Modus (Normal oder Seniorenmodus)</li>
          <li>Nach der Registrierung: <strong>Thomas wird Ihre Adresse bestätigen</strong></li>
        </ol>
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          <strong>Hinweis:</strong> Solange die Adresse nicht bestätigt ist, sehen Sie ein gelbes Banner. Das ist normal!
        </div>
      </Section>

      {/* Grundlagen */}
      <Section icon={<CheckSquare className="h-5 w-5" />} title="2. Grundlagen testen" id="grundlagen">
        <Checklist items={[
          "A1 — App im Browser öffnen und Startseite sehen",
          "A2 — Registrierung abschließen (alle 5 Schritte)",
          "A3 — Nach Freischaltung: Dashboard sehen mit Begrüßung",
          "A4 — Untere Navigation: alle Tabs antippen (Dashboard, Hilfe, Karte, Marktplatz, Profil)",
          "A5 — App als PWA installieren (\"Zum Startbildschirm hinzufügen\")",
        ]} />

        <h4 className="mb-2 mt-4 text-sm font-semibold">Profil &amp; Einstellungen</h4>
        <Checklist items={[
          "B1 — Profil öffnen und Anzeigenamen prüfen",
          "B2 — Profil bearbeiten: Bio-Text hinzufügen",
          "B3 — Push-Benachrichtigungen aktivieren (Profil → Benachrichtigungen)",
          "B4 — Urlaubsmodus ein- und ausschalten",
          "B5 — Hilfe-Center öffnen und FAQ lesen",
          "B6 — Reputation-Seite öffnen (Profil → Meine Reputation)",
        ]} />

        <h4 className="mb-2 mt-4 text-sm font-semibold">Quartierskarte</h4>
        <Checklist items={[
          "C1 — Karte öffnen und alle 3 Straßen sehen",
          "C2 — Auf ein Haus tippen → Info-Panel öffnet sich",
          "C3 — Lampe antippen → Farbe wechselt (Grün → Rot → Gelb)",
          "C4 — Straßenfilter nutzen",
        ]} />

        <h4 className="mb-2 mt-4 text-sm font-semibold">Hilfe-System</h4>
        <Checklist items={[
          "D1 — Neuen Hilfe-Eintrag erstellen (z.B. \"Suche jemanden zum Blumen gießen\")",
          "D2 — Kategorie und Dringlichkeit wählen",
          "D3 — Hilfe-Eintrag eines anderen Testers sehen",
          "D4 — Auf einen Hilfe-Eintrag antworten",
        ]} />

        <h4 className="mb-2 mt-4 text-sm font-semibold">Marktplatz &amp; Börsen</h4>
        <Checklist items={[
          "E1 — Marktplatz öffnen",
          "E2 — Neues Angebot erstellen (z.B. \"Verschenke Blumentöpfe\")",
          "E3 — Leihbörse öffnen",
          "E4 — Neuen Leihbörse-Eintrag erstellen",
          "E5 — \"Wer hat?\" nutzen",
        ]} />

        <h4 className="mb-2 mt-4 text-sm font-semibold">Community</h4>
        <Checklist items={[
          "F1 — Schwarzes Brett öffnen",
          "F2 — Veranstaltungen öffnen",
          "F3 — Neues Event erstellen",
          "F4 — Tipps-Seite öffnen und neuen Tipp schreiben",
          "F5 — Lokale Nachrichten lesen",
          "F6 — Umfragen öffnen und neue erstellen",
        ]} />
      </Section>

      {/* Kommunikation */}
      <Section icon={<Users className="h-5 w-5" />} title="3. Kommunikation testen (zu zweit!)" id="kommunikation">
        <div className="mb-3 rounded-lg bg-quartier-green/10 p-3 text-xs text-quartier-green-dark">
          <strong>Wichtig:</strong> Diese Tests erfordern mindestens 2 Tester gleichzeitig!
        </div>

        <h4 className="mb-2 text-sm font-semibold">Nachrichten zwischen Nachbarn</h4>
        <Checklist items={[
          "G1 — Tester A öffnet \"Nachrichten\" in der Navigation",
          "G2 — Tester A sucht Tester B und sendet eine Kontaktanfrage",
          "G3 — Tester B sieht die Kontaktanfrage",
          "G4 — Tester B nimmt die Anfrage an",
          "G5 — Tester A sendet eine Nachricht an Tester B",
          "G6 — Tester B sieht die Nachricht in Echtzeit (ohne Seite neu zu laden!)",
          "G7 — Tester B antwortet → Tester A sieht die Antwort live",
          "G8 — Ungelesene Nachrichten werden als Zahl am Icon angezeigt",
        ]} />

        <h4 className="mb-2 mt-4 text-sm font-semibold">Push-Benachrichtigungen (zu zweit!)</h4>
        <div className="mb-2 text-xs text-muted-foreground">
          Voraussetzung: Beide Tester haben Push aktiviert (siehe B3)
        </div>
        <Checklist items={[
          "H1 — Tester A erstellt einen neuen Hilfe-Eintrag",
          "H2 — Tester B prüft: Kommt eine Push-Benachrichtigung an?",
          "H3 — Tippen auf die Push-Nachricht → richtige Seite öffnet sich",
          "H4 — Benachrichtigungs-Center (Glocke) öffnen → alle Benachrichtigungen sehen",
          "H5 — Einzelne Benachrichtigung als gelesen markieren",
          "H6 — Ungelesene als rote Zahl an der Glocke angezeigt",
        ]} />

        <h4 className="mb-2 mt-4 text-sm font-semibold">Einladungssystem</h4>
        <Checklist items={[
          "I1 — Profil → \"Nachbar einladen\"",
          "I2 — Einladung per WhatsApp-Link erstellen",
          "I3 — WhatsApp öffnet sich mit vorgefertigtem Text",
          "I4 — \"Meine Einladungen\" zeigt die offene Einladung",
        ]} />
      </Section>

      {/* Sonderfälle */}
      <Section icon={<Bell className="h-5 w-5" />} title="4. Sonderfälle" id="sonderfaelle">
        <h4 className="mb-2 text-sm font-semibold">Notfall-System</h4>
        <div className="mb-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          <strong>ACHTUNG:</strong> Bitte NICHT den echten Notruf wählen! Dies testet nur das Banner.
        </div>
        <Checklist items={[
          "J1 — Hilfe-Eintrag mit Kategorie \"Feuer/Brand\" erstellen",
          "J2 — Rotes Banner erscheint mit \"Rufen Sie zuerst 112 an!\"",
          "J3 — Banner steht ÜBER allem — nichts verdeckt es",
          "J4 — Gleicher Test mit \"Medizinischer Notfall\" und \"Kriminalität\"",
        ]} />

        <h4 className="mb-2 mt-4 text-sm font-semibold">Seniorenmodus</h4>
        <Checklist items={[
          "K1 — Im Profil den Seniorenmodus aktivieren",
          "K2 — Schrift wird deutlich größer",
          "K3 — Buttons sind fingerkuppengroß (80px)",
          "K4 — Kontraste sind gut lesbar",
          "K5 — Jede Hauptaktion in max. 4 Taps erreichbar",
        ]} />
      </Section>

      {/* DSGVO */}
      <Section icon={<Shield className="h-5 w-5" />} title="5. Datenschutz (DSGVO)" id="dsgvo">
        <Checklist items={[
          "L1 — Impressum-Seite öffnen",
          "L2 — Datenschutz-Seite öffnen",
          "L3 — Profil → \"Daten exportieren\" → JSON-Datei wird heruntergeladen",
          "L4 — In der Datei stehen keine Adressen anderer Nachbarn",
        ]} />
      </Section>

      {/* Qualität */}
      <Section icon={<Smartphone className="h-5 w-5" />} title="6. Allgemeine Qualität" id="qualitaet">
        <Checklist items={[
          "M1 — App sieht auf dem Handy gut aus (kein abgeschnittener Text)",
          "M2 — Alle Texte auf Deutsch und in \"Sie\"-Form",
          "M3 — Farben: Grün als Hauptfarbe, Gelb/Amber für Warnungen",
          "M4 — Rot wird NUR für Notruf-Banner (112/110) verwendet",
          "M5 — Seiten laden in 2-3 Sekunden",
          "M6 — Fehlermeldungen sind verständlich (kein Englisch)",
          "N1 — App als PWA installieren",
          "N2 — Vom Startbildschirm öffnen → kein Browser-Rahmen",
          "N3 — WLAN kurz aus → sinnvolle Offline-Meldung",
        ]} />
      </Section>

      {/* Zeitplan */}
      <div className="mb-6 rounded-xl border bg-white p-5">
        <h3 className="mb-3 text-lg font-semibold text-anthrazit">⏱️ Zeitplan (~65 Min.)</h3>
        <div className="space-y-2 text-sm">
          <TimeRow time="5 Min." label="Registrierung" />
          <TimeRow time="20 Min." label="Solo-Tests (Profil, Karte, Hilfe, Marktplatz)" />
          <TimeRow time="20 Min." label="Paar-Tests (Nachrichten, Push, Einladungen)" />
          <TimeRow time="10 Min." label="Sonderfälle (Notfall, Seniorenmodus, DSGVO)" />
          <TimeRow time="5 Min." label="Qualität (Aussehen, Offline, PWA)" />
          <TimeRow time="5 Min." label="Feedback an Thomas senden" />
        </div>
      </div>

      {/* Hinweise */}
      <div className="mb-6 rounded-xl border bg-blue-50 p-5 text-sm text-blue-800">
        <h3 className="mb-2 font-semibold">Technische Hinweise</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>Beste Erfahrung: Chrome (Android) oder Safari (iPhone)</li>
          <li>Push muss im Browser UND in den Handy-Einstellungen erlaubt sein</li>
          <li>Keine echten sensiblen Daten beim Testen verwenden</li>
          <li>Bei Fehlern: Screenshot machen + Aufgaben-Nr. notieren</li>
        </ul>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Vielen Dank für Ihre Hilfe! 🏡</p>
        <p className="mt-1">Ihr Feedback macht Nachbar.io besser für alle Nachbarn.</p>
      </div>
    </div>
  );
}

// Hilfkomponenten

function Section({ icon, title, id, children }: { icon: React.ReactNode; title: string; id: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border bg-white p-5" id={id}>
      <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-anthrazit">
        <span className="text-quartier-green">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-gray-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TimeRow({ time, label }: { time: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 rounded bg-quartier-green/10 px-2 py-0.5 text-center text-xs font-medium text-quartier-green">
        {time}
      </span>
      <span>{label}</span>
    </div>
  );
}
