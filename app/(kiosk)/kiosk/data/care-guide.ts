/** Pflege-Ratgeber Daten für den Kiosk */

export interface PflegegradInfo {
  grad: number;
  title: string;
  pflegegeld: string;
  sachleistung: string;
  beschreibung: string;
}

export interface PflegeKontakt {
  name: string;
  telefon: string;
  beschreibung: string;
}

export interface PflegeTipp {
  id: number;
  frage: string;
  antwort: string;
}

/** Alle 5 Pflegegrade mit aktuellen Leistungen (Stand 2026) */
export const PFLEGEGRADE: PflegegradInfo[] = [
  {
    grad: 1,
    title: "Geringe Beeinträchtigung",
    pflegegeld: "332 \u20AC / Monat",
    sachleistung: "Keine Sachleistung",
    beschreibung:
      "Geringe Beeinträchtigungen der Selbstständigkeit. Sie erhalten den Entlastungsbetrag von 125 \u20AC monatlich und Beratungsbesuche. Pflegegeld wird seit 2025 auch in Pflegegrad 1 gezahlt.",
  },
  {
    grad: 2,
    title: "Erhebliche Beeinträchtigung",
    pflegegeld: "332 \u20AC / Monat",
    sachleistung: "761 \u20AC / Monat",
    beschreibung:
      "Erhebliche Beeinträchtigungen der Selbstständigkeit. Sie brauchen regelmäßig Hilfe bei der Körperpflege, Ernährung oder Mobilität. Tages- und Nachtpflege wird zusätzlich bezahlt.",
  },
  {
    grad: 3,
    title: "Schwere Beeinträchtigung",
    pflegegeld: "573 \u20AC / Monat",
    sachleistung: "1.432 \u20AC / Monat",
    beschreibung:
      "Schwere Beeinträchtigungen der Selbstständigkeit. Sie benötigen täglich mehrfach Hilfe bei grundlegenden Verrichtungen. Kurzzeitpflege und Verhinderungspflege können zusätzlich genutzt werden.",
  },
  {
    grad: 4,
    title: "Schwerste Beeinträchtigung",
    pflegegeld: "765 \u20AC / Monat",
    sachleistung: "1.778 \u20AC / Monat",
    beschreibung:
      "Schwerste Beeinträchtigungen der Selbstständigkeit. Umfassende Hilfe rund um die Uhr ist nötig. Der vollstationäre Zuschuss beträgt 1.775 \u20AC monatlich.",
  },
  {
    grad: 5,
    title: "Schwerste Beeinträchtigung mit besonderen Anforderungen",
    pflegegeld: "947 \u20AC / Monat",
    sachleistung: "2.200 \u20AC / Monat",
    beschreibung:
      "Schwerste Beeinträchtigungen mit besonderen Anforderungen an die pflegerische Versorgung. Intensivpflege ist nötig. Der vollstationäre Zuschuss beträgt 2.005 \u20AC monatlich.",
  },
];

/** Wichtige Kontakte für Pflege-Anliegen */
export const PFLEGE_KONTAKTE: PflegeKontakt[] = [
  {
    name: "Pflegestützpunkt Baden-Württemberg",
    telefon: "0800 7211 000",
    beschreibung:
      "Kostenlose und unabhängige Pflegeberatung. Hilfe bei Anträgen, Widerspruch und Leistungsansprüchen.",
  },
  {
    name: "MDK (Medizinischer Dienst)",
    telefon: "0800 2 75 36 36",
    beschreibung:
      "Zuständig für die Begutachtung des Pflegegrads. Hier erfahren Sie, wie Sie sich auf den Besuch vorbereiten können.",
  },
  {
    name: "Pflegekasse (bei Ihrer Krankenkasse)",
    telefon: "Siehe Krankenkassenkarte",
    beschreibung:
      "Ihre Pflegekasse ist bei Ihrer Krankenkasse angesiedelt. Dort stellen Sie den Antrag auf Pflegegrad und erhalten Leistungsbescheide.",
  },
  {
    name: "Sozialamt Bad Säckingen",
    telefon: "07761 51-0",
    beschreibung:
      "Hilfe zur Pflege für Menschen mit geringem Einkommen. Beratung zu Sozialhilfe und ergänzenden Leistungen.",
  },
  {
    name: "Verbraucherzentrale Pflegeberatung",
    telefon: "0711 66 91 10",
    beschreibung:
      "Unabhängige Beratung zu Pflegeverträgen, Heimkosten und Ihren Rechten als Pflegebedürftige oder Angehörige.",
  },
  {
    name: "Alzheimer Gesellschaft",
    telefon: "030 259 37 95 14",
    beschreibung:
      "Beratung und Unterstützung für Menschen mit Demenz und deren Angehörige. Informationen zu Betreuungsangeboten.",
  },
  {
    name: "Telefonseelsorge",
    telefon: "0800 111 0 111",
    beschreibung:
      "Kostenlose und anonyme Beratung rund um die Uhr. Für alle Sorgen und Nöte, auch für pflegende Angehörige.",
  },
  {
    name: "Pflegetelefon des Bundesministeriums",
    telefon: "030 20 17 91 31",
    beschreibung:
      "Beratung zu allen Fragen rund um die Pflege. Montag bis Donnerstag 9 bis 18 Uhr. Ein Angebot des BMFSFJ.",
  },
];

/** Häufige Fragen rund um die Pflege (FAQ) */
export const PFLEGE_FAQ: PflegeTipp[] = [
  {
    id: 1,
    frage: "Wie beantrage ich einen Pflegegrad?",
    antwort:
      "Rufen Sie bei Ihrer Pflegekasse an und stellen Sie einen formlosen Antrag. Sie können auch schriftlich beantragen. Die Kasse beauftragt dann den Medizinischen Dienst (MD), der Sie zu Hause besucht und den Pflegebedarf einschätzt.",
  },
  {
    id: 2,
    frage: "Was passiert bei der Begutachtung?",
    antwort:
      "Ein Gutachter des Medizinischen Dienstes besucht Sie zu Hause. Er prüft sechs Bereiche: Mobilität, geistige Fähigkeiten, Verhalten, Selbstversorgung, Krankheitsbewältigung und Alltagsgestaltung. Bitten Sie eine Vertrauensperson, dabei zu sein.",
  },
  {
    id: 3,
    frage: "Was kann ich bei Ablehnung tun?",
    antwort:
      "Sie haben das Recht auf Widerspruch. Legen Sie innerhalb von 4 Wochen schriftlich Widerspruch bei Ihrer Pflegekasse ein. Ein Pflegestützpunkt oder die Verbraucherzentrale hilft Ihnen kostenlos beim Widerspruch. Fordern Sie das Gutachten an und prüfen Sie es genau.",
  },
  {
    id: 4,
    frage: "Was ist der Entlastungsbetrag?",
    antwort:
      "Alle Pflegebedürftigen ab Pflegegrad 1 erhalten 125 Euro monatlich für Entlastungsleistungen. Diesen Betrag können Sie für Tagesbetreuung, Haushaltshilfe oder zugelassene Betreuungsdienste nutzen. Nicht genutzte Beträge verfallen am 30. Juni des Folgejahres.",
  },
  {
    id: 5,
    frage: "Was ist Verhinderungspflege?",
    antwort:
      "Wenn Ihre private Pflegeperson krank wird oder Urlaub braucht, springt die Verhinderungspflege ein. Sie erhalten bis zu 1.612 Euro jährlich für eine Ersatzpflege. Die Pflegeperson muss den Pflegebedürftigen mindestens 6 Monate gepflegt haben.",
  },
  {
    id: 6,
    frage: "Was ist Kurzzeitpflege?",
    antwort:
      "Kurzzeitpflege ist die vorübergehende Unterbringung in einem Pflegeheim, zum Beispiel nach einem Krankenhausaufenthalt. Sie erhalten bis zu 1.774 Euro jährlich für maximal 8 Wochen. Nicht genutzte Mittel der Verhinderungspflege können hinzugerechnet werden.",
  },
  {
    id: 7,
    frage: "Welche Pflegehilfsmittel bekomme ich?",
    antwort:
      "Sie erhalten monatlich bis zu 40 Euro für zum Verbrauch bestimmte Hilfsmittel wie Einmalhandschuhe, Bettschutzeinlagen oder Desinfektionsmittel. Technische Hilfsmittel wie Pflegebetten oder Rollstühle werden leihweise oder mit Zuzahlung bereitgestellt.",
  },
  {
    id: 8,
    frage: "Gibt es Zuschüsse für den Wohnungsumbau?",
    antwort:
      "Ja. Die Pflegekasse zahlt bis zu 4.000 Euro pro Maßnahme für wohnumfeldverbessernde Anpassungen. Dazu gehören zum Beispiel ein Treppenlift, barrierefreie Dusche oder Türverbreiterungen. Stellen Sie den Antrag vor dem Umbau.",
  },
  {
    id: 9,
    frage: "Was ist Tages- und Nachtpflege?",
    antwort:
      "Bei der Tagespflege werden Sie tagsüber in einer Einrichtung betreut und abends nach Hause gebracht. Die Kosten werden je nach Pflegegrad übernommen. Das Pflegegeld wird dadurch nicht gekürzt. Nachtpflege funktioniert umgekehrt für die Nacht.",
  },
  {
    id: 10,
    frage: "Habe ich Anspruch auf Pflegeberatung?",
    antwort:
      "Ja. Jeder Pflegebedürftige und jeder Angehörige hat Anspruch auf kostenlose Pflegeberatung. Die Pflegekasse muss Ihnen innerhalb von 2 Wochen einen Beratungstermin anbieten. Die Beratung kann auch bei Ihnen zu Hause stattfinden.",
  },
  {
    id: 11,
    frage: "Kann ich Pflegegeld und Sachleistung kombinieren?",
    antwort:
      "Ja, das nennt sich Kombinationsleistung. Wenn Sie zum Beispiel nur 60 Prozent der Sachleistung nutzen, erhalten Sie noch 40 Prozent des Pflegegeldes. Ihre Pflegekasse berechnet das automatisch.",
  },
  {
    id: 12,
    frage: "Welche Leistungen gibt es für pflegende Angehörige?",
    antwort:
      "Pflegende Angehörige erhalten Rentenversicherungsbeiträge, sind unfallversichert und können bis zu 10 Tage Pflegeunterstützungsgeld beantragen. Außerdem stehen Ihnen Kur- und Erholungsangebote zu. Informieren Sie sich bei Ihrer Pflegekasse.",
  },
  {
    id: 13,
    frage: "Wie finde ich einen guten Pflegedienst?",
    antwort:
      "Holen Sie Angebote von mehreren Pflegediensten ein und vergleichen Sie Leistungen und Preise. Achten Sie auf die Qualitätsprüfung des MD (Pflegenoten). Ihr Pflegestützpunkt kann Ihnen zugelassene Dienste in Ihrer Nähe nennen.",
  },
  {
    id: 14,
    frage: "Was zahlt die Kasse bei vollstationärer Pflege?",
    antwort:
      "Die Pflegekasse zahlt je nach Pflegegrad einen monatlichen Zuschuss zum Heimentgelt. Zusätzlich gibt es Leistungszuschläge, die mit der Dauer des Heimaufenthalts steigen: 15% im 1. Jahr, 30% im 2. Jahr, 50% im 3. Jahr und 75% ab dem 4. Jahr.",
  },
  {
    id: 15,
    frage: "Was ist ein Pflegetagebuch und wozu brauche ich es?",
    antwort:
      "Ein Pflegetagebuch dokumentiert den täglichen Hilfebedarf über 1 bis 2 Wochen. Notieren Sie, wann und wobei Sie Hilfe brauchen. Es ist ein wichtiges Dokument für die Begutachtung und für einen Widerspruch. Vordrucke gibt es kostenlos im Internet.",
  },
];
