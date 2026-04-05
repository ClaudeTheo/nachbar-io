import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Barrierefreiheit | QuartierApp",
  description:
    "Erklärung zur Barrierefreiheit der QuartierApp gemäß Barrierefreiheitsstärkungsgesetz (BFSG).",
};

// Erklärung zur Barrierefreiheit gemäß BFSG (Barrierefreiheitsstärkungsgesetz)
// Pflicht seit 28. Juni 2025 — EU-Richtlinie 2019/882 (European Accessibility Act)
export default function BarrierefreiheitPage() {
  return (
    <main className="min-h-screen bg-warmwhite px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-anthrazit"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>

        <h1 className="mb-8 text-2xl font-bold text-anthrazit">
          Erklärung zur Barrierefreiheit
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-anthrazit/80">
          {/* Einleitung */}
          <section>
            <p>
              Thomas Theobald ist bestrebt, die QuartierApp (nachbar.io) im
              Einklang mit dem Barrierefreiheitsstärkungsgesetz (BFSG) und der
              europäischen Norm EN 301 549 barrierefrei zugänglich zu machen.
            </p>
            <p className="mt-2">
              Diese Erklärung zur Barrierefreiheit gilt für die Web-Anwendung
              unter{" "}
              <a
                href="https://nachbar-io.vercel.app"
                className="text-quartier-green underline"
              >
                nachbar-io.vercel.app
              </a>{" "}
              sowie die zugehörigen Portale (Arzt-Portal, Rathaus-Portal,
              Pflege-Portal).
            </p>
          </section>

          {/* Beschreibung der Dienstleistung */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Beschreibung der Dienstleistung
            </h2>
            <p>
              QuartierApp ist eine digitale Plattform zur Vernetzung von
              Bewohnerinnen und Bewohnern innerhalb eines Quartiers. Die App
              bietet Nachbarschaftshilfe, ein Schwarzes Brett, einen Marktplatz,
              lokale Informationen, ein Notfall-System sowie optionale Module für
              Angehörige, Pflegedienste, Kommunen und Ärzte.
            </p>
            <p className="mt-2">
              Die Nutzung erfolgt über einen Webbrowser auf Desktop-Geräten,
              Tablets und Smartphones. Alle Kernfunktionen sind ohne
              Installation nutzbar (Progressive Web App).
            </p>
          </section>

          {/* Konformitätsstatus */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Stand der Barrierefreiheit
            </h2>
            <p>
              Die QuartierApp ist{" "}
              <strong className="text-anthrazit">weitgehend konform</strong> mit
              den Web Content Accessibility Guidelines (WCAG) 2.1 auf Stufe AA
              sowie der harmonisierten europäischen Norm EN 301 549 V3.2.1
              (2021-03).
            </p>
            <p className="mt-2">
              Die Konformität wurde durch automatisierte Tests (Google Lighthouse
              Accessibility Score 95–100 auf allen Portalen) sowie manuelle
              Prüfungen überprüft.
            </p>
          </section>

          {/* Barrierefreiheits-Maßnahmen */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Umgesetzte Maßnahmen
            </h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Senior-Modus:</strong> Große Touch-Flächen (mindestens
                80 Pixel), erhöhte Kontraste, vereinfachte Navigation
              </li>
              <li>
                <strong>Farbkontraste:</strong> Mindestens 4,5:1 (AA) im
                gesamten Interface, Anthrazit-auf-Weiß erreicht 12,9:1 (AAA)
              </li>
              <li>
                <strong>Tastaturnavigation:</strong> Alle interaktiven Elemente
                sind per Tastatur erreichbar, Skip-Links vorhanden
              </li>
              <li>
                <strong>Semantisches HTML:</strong> Korrekte Überschriften-Hierarchie,
                ARIA-Labels, Landmark-Regionen (main, nav, footer)
              </li>
              <li>
                <strong>Alternativtexte:</strong> Bilder und Icons sind mit
                beschreibenden Alternativtexten versehen
              </li>
              <li>
                <strong>Fokus-Indikatoren:</strong> Sichtbare Fokus-Rahmen bei
                Tastaturnavigation
              </li>
              <li>
                <strong>Responsive Design:</strong> Nutzbar auf allen
                Bildschirmgrößen von 320 Pixel aufwärts
              </li>
              <li>
                <strong>Schriftgrößen:</strong> Skalierbar über
                Browser-Einstellungen, keine festen Pixelwerte für Fließtext
              </li>
              <li>
                <strong>Verständliche Sprache:</strong> Interface-Texte in
                einfacher, klarer Sprache (Deutsch, Siezen)
              </li>
              <li>
                <strong>Fehlermeldungen:</strong> Formular-Fehler werden
                verständlich beschrieben und am Eingabefeld angezeigt
              </li>
            </ul>
          </section>

          {/* Bekannte Einschränkungen */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Bekannte Einschränkungen
            </h2>
            <p className="mb-3">
              Trotz unserer Bemühungen können folgende Bereiche derzeit nicht
              vollständig barrierefrei angeboten werden:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong>Quartierskarte (Leaflet.js):</strong> Die interaktive
                Karte basiert auf einer Drittanbieter-Bibliothek und ist nur
                eingeschränkt per Tastatur bedienbar. Alternative: Alle
                Quartiersinformationen sind auch ohne Karte in Listenform
                verfügbar.
              </li>
              <li>
                <strong>PDF-Dokumente:</strong> Einige ältere PDF-Exporte
                (Quittungen, Abrechnungen) sind möglicherweise nicht vollständig
                mit Screenreadern kompatibel. Wir arbeiten an barrierefreien
                Alternativen.
              </li>
              <li>
                <strong>Video-Sprechstunde:</strong> Die eingebettete
                Video-Funktion nutzt externe Dienste, deren vollständige
                Barrierefreiheit wir nicht garantieren können.
              </li>
            </ul>
          </section>

          {/* Feedback-Mechanismus */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Feedback und Kontakt
            </h2>
            <p>
              Sind Ihnen Barrieren beim Zugang zu unserer Anwendung aufgefallen?
              Wir nehmen Ihr Feedback ernst und arbeiten kontinuierlich an
              Verbesserungen.
            </p>
            <p className="mt-3">
              <strong className="text-anthrazit">Kontakt:</strong>
              <br />
              Thomas Theobald
              <br />
              E-Mail:{" "}
              <a
                href="mailto:thomasth@gmx.de?subject=Barrierefreiheit%20QuartierApp"
                className="text-quartier-green underline"
              >
                thomasth@gmx.de
              </a>
              <br />
              Purkersdorfer Straße 35, 79713 Bad Säckingen
            </p>
            <p className="mt-2">
              Wir bemühen uns, Ihre Anfrage innerhalb von 14 Tagen zu
              beantworten und gemeldete Barrieren zeitnah zu beheben.
            </p>
          </section>

          {/* Durchsetzungsverfahren */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Durchsetzungsverfahren
            </h2>
            <p>
              Sollten Sie mit unserer Antwort nicht zufrieden sein oder
              innerhalb der genannten Frist keine Rückmeldung erhalten, können
              Sie sich an die zuständige Marktüberwachungsbehörde wenden:
            </p>
            <p className="mt-3">
              <strong className="text-anthrazit">
                Marktüberwachungsbehörde für Barrierefreiheit
              </strong>
              <br />
              Landesverwaltungsamt Sachsen-Anhalt
              <br />
              Marktüberwachung — Barrierefreiheitsanforderungen
              <br />
              Ernst-Kamieth-Straße 2, 06112 Halle (Saale)
              <br />
              E-Mail:{" "}
              <a
                href="mailto:marktaufsicht.bfsg@lvwa.sachsen-anhalt.de"
                className="text-quartier-green underline"
              >
                marktaufsicht.bfsg@lvwa.sachsen-anhalt.de
              </a>
              <br />
              Telefon: +49 345 514-0
            </p>
          </section>

          {/* Technische Angaben */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Technische Angaben
            </h2>
            <p>
              Die Barrierefreiheit der QuartierApp basiert auf folgenden
              Technologien:
            </p>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>HTML5 (semantische Struktur)</li>
              <li>CSS (Tailwind CSS, responsive Layout)</li>
              <li>JavaScript (Next.js, React, WAI-ARIA)</li>
              <li>SVG (skalierbare Grafiken mit Alternativtexten)</li>
            </ul>
            <p className="mt-2">
              Die Anwendung wurde für die Nutzung mit aktuellen Versionen
              gängiger Browser (Chrome, Firefox, Safari, Edge) sowie gängigen
              Screenreadern (NVDA, VoiceOver, TalkBack) entwickelt.
            </p>
          </section>

          {/* Erstellungsdatum */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Erstellung und Aktualisierung
            </h2>
            <p>
              Diese Erklärung wurde am <strong>5. April 2026</strong> erstellt.
            </p>
            <p className="mt-2">
              Die Erklärung wird regelmäßig überprüft und bei wesentlichen
              Änderungen der Anwendung aktualisiert. Die letzte inhaltliche
              Prüfung erfolgte am <strong>5. April 2026</strong>.
            </p>
          </section>

          {/* Rechtsgrundlage */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-anthrazit">
              Rechtsgrundlage
            </h2>
            <p>
              Diese Erklärung beruht auf dem Barrierefreiheitsstärkungsgesetz
              (BFSG) vom 16. Juli 2021, zuletzt geändert am 22. März 2024,
              in Umsetzung der Richtlinie (EU) 2019/882 des Europäischen
              Parlaments und des Rates (European Accessibility Act).
            </p>
            <p className="mt-2">
              Maßgebliche technische Norm: EN 301 549 V3.2.1 (2021-03) —
              Barrierefreiheitsanforderungen für IKT-Produkte und
              -Dienstleistungen.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <Link
            href="/impressum"
            className="hover:text-anthrazit hover:underline"
          >
            Impressum
          </Link>
          <Link
            href="/datenschutz"
            className="hover:text-anthrazit hover:underline"
          >
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:text-anthrazit hover:underline">
            AGB
          </Link>
          <Link
            href="/barrierefreiheit"
            className="font-medium text-anthrazit"
          >
            Barrierefreiheit
          </Link>
        </div>
      </div>
    </main>
  );
}
