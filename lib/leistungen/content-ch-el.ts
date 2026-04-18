// CH Ergaenzungsleistungen: Krankheits- und Behinderungskosten (EL-KuBK).
// Stand 2026-04-18. Halbjaehrlicher Pflicht-Review.
// Kantonale Hoechstbetraege nach Art. 14 ELG in Verbindung mit kantonaler ELV.
// Angaben pro Jahr fuer zu Hause wohnende Alleinstehende.
// Fuer BL/BS/SH liegen keine oeffentlich konsolidierten Zahlen vor; Richtwert
// gemaess Bundesvorgabe 5 000 CHF (Alleinstehend) / 10 000 CHF (Paar) — verbindlich
// ist die kantonale ELV bzw. Rueckfrage bei der zustaendigen Ausgleichskasse.

import type { Leistung } from "./types";

const REVIEW = "2026-04-18";

export const LEISTUNG_CH_EL: Leistung = {
  slug: "el-kubk",
  country: "CH",
  title:
    "Ergaenzungsleistungen fuer Krankheits- und Behinderungskosten (EL-KuBK)",
  shortDescription:
    "Rueckerstattung von Krankheits- und Behinderungskosten zusaetzlich zur jaehrlichen EL — Hoechstbetraege je Kanton unterschiedlich.",
  longDescription:
    "Wer Anspruch auf jaehrliche Ergaenzungsleistungen hat, kann zusaetzlich Krankheits- und Behinderungskosten (Zahnarzt, Spitex-Selbstbehalte, Hilfsmittel, Pflegehilfe, Fahrtkosten u. a.) rueckerstattet bekommen. Die Hoechstbetraege legt jeder Kanton in seiner kantonalen Ergaenzungsleistungsverordnung (ELV) fest. Antrag bei der kantonalen Ausgleichskasse bzw. EL-Stelle — oft dieselbe Adresse wie der AHV-Rentenantrag.",
  amount:
    "kantonal unterschiedlich (Bundesvorgabe Mindestwerte: 5 000 CHF/Jahr Alleinstehende, 10 000 CHF/Jahr Paare, zuzueglich 6 000 CHF im Heim)",
  legalSource: "Art. 14 ELG + kantonale ELV",
  officialLink:
    "https://www.ahv-iv.ch/de/sozialversicherungen/erg%C3%A4nzungsleistungen-el/krankheits-und-behinderungskosten",
  lastReviewed: REVIEW,
  cantonVariants: {
    AG: {
      amount: "ca. 5 000 CHF (Alleinstehende) / 8 000 CHF (Ehepaare) pro Jahr",
      note: "Gemaess kantonaler ELV Aargau. Antrag bei SVA Aargau.",
      officialLink:
        "https://www.sva-aargau.ch/private/ihre-private-situation/finanzielle-unterstuetzung/ergaenzungsleistungen/krankheits-und-5",
    },
    BL: {
      amount:
        "Bundesminimum 5 000 CHF / 10 000 CHF pro Jahr — exakter Wert per kantonaler ELV",
      note: "Details siehe SVA Basel-Landschaft.",
      officialLink:
        "https://www.sva-bl.ch/de/ausgleichskasse/ergaenzungsleistungen-zur-ahv/iv-el",
    },
    BS: {
      amount:
        "Bundesminimum 5 000 CHF / 10 000 CHF pro Jahr — exakter Wert per kantonaler ELV",
      note: "Basel-Stadt bietet zusaetzliche kantonale Leistungen ueber das Bundesminimum hinaus. Antrag bei Ausgleichskasse Basel-Stadt.",
      officialLink:
        "https://www.bs.ch/themen/finanzielle-hilfe/leistungen/ergaenzungsleistungen",
    },
    SH: {
      amount:
        "Bundesminimum 5 000 CHF / 10 000 CHF pro Jahr — exakter Wert per kantonaler ELV",
      note: "Details siehe Kantonales Sozialamt Schaffhausen.",
      officialLink:
        "https://sh.ch/CMS/Webseite/Kanton-Schaffhausen/Beh-rde/Verwaltung/Departement-des-Innern/Sozialamt-2795-DE.html",
    },
    TG: {
      amount:
        "ca. 5 000 CHF (Alleinstehende) / 10 000 CHF (Ehepaare) pro Jahr, zusaetzlich bis 4 800 CHF/Jahr Transportkosten",
      note: "Gemaess kantonaler ELV Thurgau. Antrag bei Sozialversicherungszentrum Thurgau.",
      officialLink: "https://www.svztg.ch/produkte/elkk/",
    },
    ZH: {
      amount:
        "ca. 25 000 CHF (Alleinstehende) / 50 000 CHF (Ehepaare) pro Jahr, im Heim 6 000 CHF",
      note: "Zuerich zaehlt zu den grosszuegigen Kantonen. Antrag bei SVA Zuerich / Gemeindezweigstelle.",
      officialLink:
        "https://svazurich.ch/unsere-produkte/weitere-produkte/weitere-leistungen/ergaenzungsleistungen/leistung.html",
    },
  },
};
