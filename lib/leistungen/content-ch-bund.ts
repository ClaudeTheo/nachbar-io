// Schweizer Pflege-Sozialleistungen auf Bundesebene (4 Leistungen).
// Stand: 2026-04-18. Halbjaehrlicher Pflicht-Review.
// Quellen: ahv-iv.ch (Merkblaetter), fedlex.admin.ch (Gesetzestext).
// Keine Rechtsberatung — verbindlich ist die zustaendige Ausgleichskasse / IV-Stelle.
//
// Anmerkung zum Plan: Der Plan hatte "or-329g" als Slug. Art. 329g OR regelt
// aber den 14-Wochen-Urlaub fuer schwer erkrankte Kinder — fuer pflegende
// Angehoerige alterer Personen ist Art. 329h OR einschlaegig (3 Tage/Ereignis,
// max. 10 Tage/Jahr). Slug entsprechend korrigiert.

import type { Leistung } from "./types";

const REVIEW = "2026-04-18";

export const LEISTUNGEN_CH_BUND: Leistung[] = [
  {
    slug: "ahv-betreuungsgutschrift",
    country: "CH",
    title: "AHV-Betreuungsgutschrift",
    shortDescription:
      "Gutschrift auf Ihr AHV-Konto, wenn Sie Angehoerige pflegen — erhoeht spaeter Ihre Rente.",
    longDescription:
      "Keine direkte Zahlung. Die Gutschrift wird Ihrem Individualkonto gutgeschrieben und zaehlt bei der spaeteren Rentenberechnung als fiktives Einkommen. Voraussetzungen: Sie wohnen weniger als 30 km von der hilflosen Person entfernt oder koennen sie in weniger als einer Stunde erreichen; es besteht eine enge Verwandtschaft (Ehepartner, Kinder, Eltern, Geschwister, Schwiegereltern u. a.); die gepflegte Person bezieht eine Hilflosenentschaedigung mindestens mittleren Grades. Antrag jaehrlich fuer das Vorjahr bei der kantonalen Ausgleichskasse am Wohnort der gepflegten Person. Verfall nach 5 Jahren.",
    amount:
      "dreifache jaehrliche AHV-Mindestrente (Stand 2026: rund 45 400 CHF/Jahr)",
    legalSource: "Art. 29septies AHVG",
    officialLink: "https://www.ahv-iv.ch/p/1.03.d",
    lastReviewed: REVIEW,
  },
  {
    slug: "ahv-iv-hilflosenentschaedigung",
    country: "CH",
    title: "Hilflosenentschaedigung (AHV/IV)",
    shortDescription:
      "Monatliche Zahlung, wenn Sie bei alltaeglichen Verrichtungen auf Hilfe angewiesen sind.",
    longDescription:
      "Drei Stufen je nach Hilflosigkeit — leichten, mittleren oder schweren Grades. Unabhaengig von Einkommen und Vermoegen. Kommt aus AHV bei Rentnern, aus IV bei Personen im Erwerbsalter. Antrag bei der zustaendigen AHV-Ausgleichskasse bzw. IV-Stelle. In Heimen halbiert sich der Betrag. Wartefrist 1 Jahr.",
    amount:
      "252 / 630 / 1 008 CHF pro Monat (leichten / mittleren / schweren Grades, zu Hause, Stand 2026)",
    legalSource: "Art. 43bis AHVG + Art. 42 IVG",
    officialLink: "https://www.ahv-iv.ch/p/3.01.d",
    lastReviewed: REVIEW,
  },
  {
    slug: "iv-assistenzbeitrag",
    country: "CH",
    title: "IV-Assistenzbeitrag",
    shortDescription:
      "Beitrag an die Anstellung einer privaten Assistenzperson — ermoeglicht Leben zu Hause statt im Heim.",
    longDescription:
      "Nur fuer Bezieher einer IV-Hilflosenentschaedigung, die zu Hause wohnen. Der Beitrag finanziert die Loehne einer selbst angestellten Assistenzperson (nicht Angehoerige im gleichen Haushalt). Umfang nach Abklaerungsgespraech mit der IV-Stelle. Anstellung laeuft ueber die pflegebeduerftige Person als Arbeitgeberin.",
    amount:
      "CHF 35.30/h regulaer, CHF 52.95/h mit Qualifikationsanforderung, Nachtdienst CHF 58.85 bis 169.10 (Stand 01.01.2025, gueltig 2026)",
    legalSource: "Art. 42quater-sexies IVG",
    officialLink: "https://www.ahv-iv.ch/p/4.14.d",
    lastReviewed: REVIEW,
  },
  {
    slug: "or-329h-betreuungsurlaub",
    country: "CH",
    title: "Kurzer Betreuungsurlaub (Art. 329h OR)",
    shortDescription:
      "Bis zu 3 Tage pro Ereignis und 10 Tage pro Jahr bezahlter Urlaub fuer die Pflege Angehoeriger.",
    longDescription:
      "Seit 01.01.2021. Anspruch besteht gegenueber dem Arbeitgeber bei gesundheitlicher Beeintraechtigung eines Familienangehoerigen oder Lebenspartners. Lohnfortzahlung vom Arbeitgeber; Nachweis per kurzer Aerzteanordnung. Zaehlt NICHT als Ferien. Fuer schwer erkrankte Kinder gelten hoehere Betraege unter Art. 329g OR (bis 14 Wochen).",
    amount: "voller Lohn fuer bis zu 10 Tage/Jahr",
    legalSource: "Art. 329h OR",
    officialLink:
      "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_329_h",
    lastReviewed: REVIEW,
  },
];
