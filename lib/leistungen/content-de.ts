// Deutsche Pflege-Sozialleistungen (5 Kern-Leistungen).
// Stand: 2026-04-18 — naechster Pflicht-Review: 2026-10-18 (halbjaehrlich).
// Jede Angabe stammt aus offiziellen Quellen (BMG, GKV, Gesetzestext).
// Keine Rechtsberatung. Verbindlich sind Pflegekasse + Gesetzestext.
//
// Werte-Stand 2026:
//   - Pflegegeld: erhoeht um 4,5 % zum 01.01.2025 (gilt 2026 weiter, naechste
//     gesetzliche Dynamisierung 01.01.2028).
//   - Entlastungsbetrag: 131 EUR/Monat ab 01.01.2025.
//   - Verhinderungspflege: Seit 01.07.2025 "Gemeinsamer Jahresbetrag" (3.539 EUR)
//     fuer Verhinderungs- + Kurzzeitpflege gemeinsam; 8 Wochen/Jahr moeglich.
//   - PflegeZG: Weiterhin bis 10 Arbeitstage mit Lohnersatz via Pflegekasse.

import type { Leistung } from "./types";

const REVIEW = "2026-04-18";

export const LEISTUNGEN_DE: Leistung[] = [
  {
    slug: "pflegegrad",
    country: "DE",
    title: "Pflegegrad beantragen",
    shortDescription:
      "Der Pflegegrad (1 bis 5) ist die Basis fuer alle Leistungen der Pflegeversicherung.",
    longDescription:
      "Der Antrag wird formlos bei der Pflegekasse gestellt (angegliedert an die Krankenkasse). Die Begutachtung erfolgt durch den Medizinischen Dienst (MD) bei gesetzlich Versicherten oder Medicproof bei Privatversicherten. Bewertet werden sechs Module (u. a. Mobilitaet, Selbstversorgung, kognitive Faehigkeiten, Alltagsgestaltung). Je hoeher der Grad, desto mehr Leistungen.",
    legalSource: "Paragraf 14-15 SGB XI",
    officialLink:
      "https://www.gkv-spitzenverband.de/pflegeversicherung/beguthaben/pflegegrade.jsp",
    lastReviewed: REVIEW,
  },
  {
    slug: "pflegegeld",
    country: "DE",
    title: "Pflegegeld bei haeuslicher Pflege",
    shortDescription:
      "Monatliche Zahlung an die pflegebeduerftige Person fuer die haeusliche Pflege durch Angehoerige.",
    longDescription:
      "Wird direkt an die gepflegte Person ausgezahlt. Sie entscheidet, ob und wie sie das Geld an pflegende Angehoerige weitergibt. Anspruch ab Pflegegrad 2. Im Pflegegrad 1 gibt es kein Pflegegeld, aber den Entlastungsbetrag.",
    amount:
      "347 EUR (PG 2), 599 EUR (PG 3), 800 EUR (PG 4), 990 EUR (PG 5) pro Monat (Stand 2026)",
    legalSource: "Paragraf 37 SGB XI",
    officialLink:
      "https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-pflegeversicherung/pflegegeld.html",
    lastReviewed: REVIEW,
  },
  {
    slug: "entlastungsbetrag",
    country: "DE",
    title: "Entlastungsbetrag",
    shortDescription:
      "Zweckgebundener Betrag fuer Betreuungs- und Entlastungsleistungen, bereits ab Pflegegrad 1.",
    longDescription:
      "Wird nicht ausgezahlt, sondern mit Rechnungen anerkannter Dienstleister verrechnet (z. B. Tages-/Nachtpflege, anerkannte Alltagshelfer, Haushaltshilfe, Betreuungsgruppen). Ungenutzte Betraege eines Monats koennen im selben Kalenderjahr und bis 30.06. des Folgejahres uebertragen werden.",
    amount: "131 EUR/Monat (ab Pflegegrad 1, Stand 2026)",
    legalSource: "Paragraf 45b SGB XI",
    officialLink:
      "https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-pflegeversicherung/entlastungsbetrag.html",
    lastReviewed: REVIEW,
  },
  {
    slug: "verhinderungspflege",
    country: "DE",
    title: "Verhinderungspflege (Gemeinsamer Jahresbetrag)",
    shortDescription:
      "Finanzielle Unterstuetzung, wenn die pflegende Person Urlaub braucht, krank oder verhindert ist.",
    longDescription:
      "Seit 01.07.2025 gibt es einen Gemeinsamen Jahresbetrag, der flexibel fuer Verhinderungspflege und Kurzzeitpflege genutzt werden kann. Ersatzpflege ist fuer bis zu 8 Wochen pro Kalenderjahr moeglich — am Stueck oder verteilt. Voraussetzung: Pflegegrad 2 oder hoeher; die pflegende Person hat seit mindestens 6 Monaten gepflegt. Ersatz kann durch einen ambulanten Dienst oder eine Privatperson geleistet werden. Neue Frist seit 2026: Kosten bis zum Ende des Folgejahres beantragen.",
    amount:
      "bis 3.539 EUR/Jahr (Gemeinsamer Jahresbetrag mit Kurzzeitpflege, Stand 2026)",
    legalSource: "Paragraf 39 SGB XI",
    officialLink:
      "https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-pflegeversicherung/verhinderungspflege.html",
    lastReviewed: REVIEW,
  },
  {
    slug: "pflegezg-10tage",
    country: "DE",
    title: "10 Tage Pflege-Freistellung vom Job",
    shortDescription:
      "In einer akuten Pflegesituation duerfen Sie bis zu zehn Arbeitstage der Arbeit fernbleiben.",
    longDescription:
      "Gilt fuer nahe Angehoerige (Ehepartner, Eltern, Kinder, Geschwister, Schwiegereltern u. a.). Pro pflegebeduerftiger Person einmalig 10 Tage. Es besteht Anspruch auf Pflegeunterstuetzungsgeld (Lohnersatz, aehnlich Kinderkrankengeld) ueber die Pflegekasse der gepflegten Person. Antrag direkt bei der Pflegekasse, kurze aerztliche Bescheinigung reicht.",
    amount: "ca. 90 % des ausgefallenen Nettoentgelts (ueber Pflegekasse)",
    legalSource: "Paragraf 2 PflegeZG + Paragraf 44a SGB XI",
    officialLink:
      "https://www.bmfsfj.de/bmfsfj/themen/familie/familie-und-arbeitswelt/pflege-und-beruf/kurzzeitige-arbeitsverhinderung",
    lastReviewed: REVIEW,
  },
];
