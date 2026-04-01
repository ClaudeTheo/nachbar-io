/** Gesundheitstipps für den Kiosk — 50 evidenzbasierte Tipps */

export interface HealthTip {
  id: number;
  category: "bewegung" | "ernaehrung" | "schlaf" | "soziales" | "vorsorge" | "mental";
  title: string;
  body: string;
  source: string;
  season?: "fruehling" | "sommer" | "herbst" | "winter";
}

export const HEALTH_TIPS: HealthTip[] = [
  // === BEWEGUNG (9) ===
  {
    id: 1,
    category: "bewegung",
    title: "Täglich 20 Minuten spazieren",
    body: "Ein täglicher Spaziergang stärkt Herz und Kreislauf. Schon 20 Minuten reichen aus, um das Risiko für Herz-Kreislauf-Erkrankungen deutlich zu senken. Gehen Sie möglichst im Grünen.",
    source: "DGK (Deutsche Gesellschaft für Kardiologie)",
  },
  {
    id: 2,
    category: "bewegung",
    title: "Treppen statt Aufzug",
    body: "Treppensteigen ist ein einfaches Training für den Alltag. Es kräftigt die Beinmuskulatur und verbessert die Ausdauer. Beginnen Sie mit einer Etage und steigern Sie sich langsam.",
    source: "BZgA",
  },
  {
    id: 3,
    category: "bewegung",
    title: "Gleichgewichtsübungen am Morgen",
    body: "Stellen Sie sich täglich für 30 Sekunden auf ein Bein, zum Beispiel beim Zähneputzen. Das trainiert Ihr Gleichgewicht und beugt Stürzen vor. Halten Sie sich anfangs an der Wand fest.",
    source: "DGOOC",
  },
  {
    id: 4,
    category: "bewegung",
    title: "Dehnübungen gegen Verspannungen",
    body: "Einfache Dehnübungen für Nacken und Schultern helfen gegen Verspannungen. Führen Sie die Übungen langsam und ohne Schmerzen aus. Täglich 5 Minuten genügen.",
    source: "DGSS",
  },
  {
    id: 5,
    category: "bewegung",
    title: "Nordic Walking für Einsteiger",
    body: "Nordic Walking schont die Gelenke und trainiert den ganzen Körper. Die Stöcke geben zusätzliche Sicherheit auf unebenem Boden. Viele Sportvereine bieten Kurse für Ältere an.",
    source: "DOSB",
    season: "fruehling",
  },
  {
    id: 6,
    category: "bewegung",
    title: "Schwimmen schont die Gelenke",
    body: "Im Wasser werden die Gelenke entlastet, während die Muskeln trotzdem trainiert werden. Besonders Rückenschwimmen und Aquagymnastik sind für Ältere geeignet.",
    source: "DGSP",
    season: "sommer",
  },
  {
    id: 7,
    category: "bewegung",
    title: "Sturzprävention durch Kraft",
    body: "Kräftige Beine schützen vor Stürzen. Einfache Übungen wie Aufstehen vom Stuhl ohne Hände trainieren die Oberschenkel. Wiederholen Sie das 10-mal, zwei- bis dreimal täglich.",
    source: "RKI",
  },
  {
    id: 8,
    category: "bewegung",
    title: "Gartenarbeit als Fitness",
    body: "Gartenarbeit ist ein vielseitiges Körpertraining. Graben, Pflanzen und Gießen trainieren Kraft und Beweglichkeit. Achten Sie auf knieschonende Haltungen und machen Sie regelmäßig Pausen.",
    source: "BZgA",
    season: "fruehling",
  },
  {
    id: 9,
    category: "bewegung",
    title: "Bewegung bei Kälte",
    body: "Auch im Winter ist Bewegung an der frischen Luft wichtig. Tragen Sie rutschfestes Schuhwerk und wärmen Sie sich vorher drinnen auf. Schon ein kurzer Gang um den Block tut gut.",
    source: "DGK",
    season: "winter",
  },

  // === ERNÄHRUNG (9) ===
  {
    id: 10,
    category: "ernaehrung",
    title: "Genug trinken — 1,5 Liter täglich",
    body: "Im Alter lässt das Durstgefühl nach. Stellen Sie sich morgens 1,5 Liter Wasser oder ungesüßten Tee bereit. Trinken Sie regelmäßig, auch wenn Sie keinen Durst verspüren.",
    source: "DGE",
  },
  {
    id: 11,
    category: "ernaehrung",
    title: "Fünf Portionen Obst und Gemüse",
    body: "Die Deutsche Gesellschaft für Ernährung empfiehlt täglich 5 Portionen Obst und Gemüse. Eine Portion ist etwa eine Handvoll. Tiefkühlobst und -gemüse sind genauso wertvoll wie frische.",
    source: "DGE",
  },
  {
    id: 12,
    category: "ernaehrung",
    title: "Vollkornbrot statt Weißbrot",
    body: "Vollkornprodukte liefern mehr Ballaststoffe, Vitamine und Mineralstoffe. Sie halten länger satt und fördern die Verdauung. Steigen Sie schrittweise auf Vollkorn um.",
    source: "DGE",
  },
  {
    id: 13,
    category: "ernaehrung",
    title: "Kalzium für starke Knochen",
    body: "Im Alter brauchen Sie besonders viel Kalzium für die Knochen. Milchprodukte, Brokkoli und kalziumreiches Mineralwasser sind gute Quellen. 1.000 mg täglich werden empfohlen.",
    source: "DGE",
  },
  {
    id: 14,
    category: "ernaehrung",
    title: "Weniger Salz, mehr Kräuter",
    body: "Zu viel Salz kann den Blutdruck erhöhen. Würzen Sie stattdessen mit frischen Kräutern wie Basilikum, Petersilie oder Rosmarin. Das schmeckt besser und ist gesünder.",
    source: "DGE",
  },
  {
    id: 15,
    category: "ernaehrung",
    title: "Eiweiß gegen Muskelschwund",
    body: "Im Alter baut der Körper Muskeln ab. Ausreichend Eiweiß hilft dagegen. Gute Quellen sind mageres Fleisch, Fisch, Hülsenfrüchte und Milchprodukte. Verteilen Sie die Eiweißzufuhr über den Tag.",
    source: "DGE",
  },
  {
    id: 16,
    category: "ernaehrung",
    title: "Saisonales Obst bevorzugen",
    body: "Saisonales Obst ist frischer, schmeckt besser und ist günstiger. Im Sommer sind Beeren und Kirschen ideal, im Herbst Äpfel und Birnen. Auf dem Wochenmarkt finden Sie regionale Ware.",
    source: "BMEL",
    season: "sommer",
  },
  {
    id: 17,
    category: "ernaehrung",
    title: "Warme Suppen im Winter",
    body: "Eine warme Gemüsesuppe wärmt von innen und liefert wichtige Nährstoffe. Kochen Sie gleich eine größere Menge und frieren Sie Portionen ein. Das spart Zeit und Sie essen trotzdem gesund.",
    source: "DGE",
    season: "winter",
  },
  {
    id: 18,
    category: "ernaehrung",
    title: "Fisch zweimal pro Woche",
    body: "Fisch liefert wertvolle Omega-3-Fettsäuren, die das Herz schützen. Essen Sie ein- bis zweimal pro Woche Fisch, am besten fettreichen wie Lachs, Makrele oder Hering.",
    source: "DGE",
  },

  // === SCHLAF (8) ===
  {
    id: 19,
    category: "schlaf",
    title: "Regelmäßige Schlafenszeit",
    body: "Gehen Sie möglichst jeden Tag zur gleichen Zeit ins Bett und stehen Sie zur gleichen Zeit auf. Ein regelmäßiger Rhythmus hilft dem Körper, leichter einzuschlafen.",
    source: "DGSM",
  },
  {
    id: 20,
    category: "schlaf",
    title: "Schlafzimmer kühl und dunkel",
    body: "Die ideale Schlaftemperatur liegt bei 16 bis 18 Grad. Lüften Sie vor dem Schlafen und verdunkeln Sie das Zimmer. Ein kühler, dunkler Raum fördert den erholsamen Schlaf.",
    source: "DGSM",
  },
  {
    id: 21,
    category: "schlaf",
    title: "Kein Koffein nach 14 Uhr",
    body: "Koffein bleibt bis zu 8 Stunden im Körper wirksam. Trinken Sie ab dem frühen Nachmittag keinen Kaffee, schwarzen oder grünen Tee mehr. Kräutertee oder warme Milch sind gute Alternativen.",
    source: "DGSM",
  },
  {
    id: 22,
    category: "schlaf",
    title: "Abendritual einüben",
    body: "Ein festes Abendritual bereitet den Körper auf den Schlaf vor. Lesen Sie ein Buch, hören Sie ruhige Musik oder trinken Sie eine Tasse Kräutertee. Vermeiden Sie helles Bildschirmlicht.",
    source: "BZgA",
  },
  {
    id: 23,
    category: "schlaf",
    title: "Mittagsschlaf kurz halten",
    body: "Ein kurzer Mittagsschlaf von 20 bis 30 Minuten kann erfrischend sein. Längere Schlafphasen am Tag können jedoch den Nachtschlaf stören. Stellen Sie sich einen Wecker.",
    source: "DGSM",
  },
  {
    id: 24,
    category: "schlaf",
    title: "Leichtes Abendessen",
    body: "Schweres, fettiges Essen am Abend belastet die Verdauung und stört den Schlaf. Essen Sie abends leicht, zum Beispiel Suppe oder Brot mit magerem Belag. Die letzte Mahlzeit sollte 2 Stunden vor dem Schlafen sein.",
    source: "DGE",
  },
  {
    id: 25,
    category: "schlaf",
    title: "Sorgen aufschreiben",
    body: "Wenn Sorgen Sie am Einschlafen hindern, schreiben Sie diese abends auf einen Zettel. Nehmen Sie sich vor, am nächsten Tag darüber nachzudenken. Das hilft, den Kopf frei zu bekommen.",
    source: "DGPPN",
  },
  {
    id: 26,
    category: "schlaf",
    title: "Natürliches Licht am Morgen",
    body: "Morgens helles Tageslicht tanken hilft der inneren Uhr. Öffnen Sie nach dem Aufstehen die Vorhänge oder gehen Sie kurz an die frische Luft. Das verbessert den Schlaf-Wach-Rhythmus.",
    source: "DGSM",
  },

  // === SOZIALES (8) ===
  {
    id: 27,
    category: "soziales",
    title: "Täglich mit jemandem sprechen",
    body: "Soziale Kontakte halten geistig fit und beugen Einsamkeit vor. Rufen Sie täglich jemanden an oder sprechen Sie mit Nachbarn. Auch kurze Gespräche beim Einkaufen zählen.",
    source: "BZgA",
  },
  {
    id: 28,
    category: "soziales",
    title: "Nachbarschaftshilfe annehmen",
    body: "Es ist keine Schwäche, Hilfe anzunehmen. Nachbarn helfen gerne bei kleinen Dingen wie Einkaufen oder Glühbirnen wechseln. Bieten Sie im Gegenzug Ihre Stärken an.",
    source: "BAGSO",
  },
  {
    id: 29,
    category: "soziales",
    title: "Verein oder Gruppe beitreten",
    body: "Gemeinsame Aktivitäten machen Freude und schaffen Verbindungen. Ob Chor, Seniorengruppe oder Wanderverein — probieren Sie aus, was Ihnen Spaß macht. Viele Angebote sind kostenlos.",
    source: "BAGSO",
  },
  {
    id: 30,
    category: "soziales",
    title: "Ehrenamt als Bereicherung",
    body: "Ehrenamtliche Tätigkeit gibt dem Alltag Sinn und Struktur. Sie können Ihre Erfahrung an Jüngere weitergeben. Erkundigen Sie sich bei Ihrer Gemeinde nach Möglichkeiten.",
    source: "BMFSFJ",
  },
  {
    id: 31,
    category: "soziales",
    title: "Gemeinsam kochen und essen",
    body: "Gemeinsame Mahlzeiten sind gut für Körper und Seele. Laden Sie Nachbarn zum Mittagessen ein oder besuchen Sie einen Mittagstisch. Zusammen schmeckt es besser.",
    source: "DGE",
  },
  {
    id: 32,
    category: "soziales",
    title: "Briefe oder Karten schreiben",
    body: "Handgeschriebene Post macht Freude — dem Empfänger und dem Schreiber. Es trainiert die Feinmotorik und pflegt Beziehungen. Schreiben Sie regelmäßig an Familie oder Freunde.",
    source: "BAGSO",
  },
  {
    id: 33,
    category: "soziales",
    title: "Mehrgenerationen-Kontakte",
    body: "Der Austausch mit jüngeren Menschen hält geistig jung. Viele Schulen und Kindergärten suchen Lesepaten oder Erzählgroßkinder. Diese Begegnungen bereichern beide Seiten.",
    source: "BMFSFJ",
  },
  {
    id: 34,
    category: "soziales",
    title: "Feste und Feiern besuchen",
    body: "Stadtteil- und Quartierfeste bieten eine gute Gelegenheit, neue Leute kennenzulernen. Auch wenn Sie allein hingehen — Sie sind willkommen. Trauen Sie sich, jemanden anzusprechen.",
    source: "BAGSO",
    season: "sommer",
  },

  // === VORSORGE (8) ===
  {
    id: 35,
    category: "vorsorge",
    title: "Jährliche Gesundheitsvorsorge",
    body: "Ab 35 Jahren haben Sie alle 3 Jahre Anspruch auf einen Gesundheits-Check-up, ab 65 jährlich. Der Arzt prüft Blutdruck, Blutzucker und Cholesterin. Die Kosten trägt die Krankenkasse.",
    source: "GBA",
  },
  {
    id: 36,
    category: "vorsorge",
    title: "Zahnkontrolle alle 6 Monate",
    body: "Regelmäßige Zahnkontrollen sind auch im Alter wichtig. Der Zahnarzt erkennt Probleme früh und kann sie leichter behandeln. Das Bonusheft sichert Ihnen höhere Zuschüsse beim Zahnersatz.",
    source: "BZAEK",
  },
  {
    id: 37,
    category: "vorsorge",
    title: "Impfschutz prüfen lassen",
    body: "Auch im Alter ist ein aktueller Impfschutz wichtig. Lassen Sie Ihren Arzt prüfen, ob Auffrischungen nötig sind. Besonders Grippe- und Pneumokokken-Impfung werden ab 60 empfohlen.",
    source: "RKI / STIKO",
  },
  {
    id: 38,
    category: "vorsorge",
    title: "Blutdruck regelmäßig messen",
    body: "Hoher Blutdruck verursacht oft keine Beschwerden, schädigt aber Herz und Gefäße. Messen Sie regelmäßig zu Hause. Werte über 140/90 sollten Sie mit Ihrem Arzt besprechen.",
    source: "DHL",
  },
  {
    id: 39,
    category: "vorsorge",
    title: "Medikamentenplan aktuell halten",
    body: "Führen Sie eine aktuelle Liste aller Medikamente, die Sie einnehmen. Zeigen Sie diese bei jedem Arztbesuch vor. Fragen Sie Ihren Apotheker nach einem Medikationsplan.",
    source: "ABDA",
  },
  {
    id: 40,
    category: "vorsorge",
    title: "Grippeimpfung im Herbst",
    body: "Die Grippeimpfung wird jährlich im Oktober oder November empfohlen. Für Menschen ab 60 Jahren ist sie besonders wichtig. Fragen Sie Ihren Hausarzt nach einem Termin.",
    source: "RKI / STIKO",
    season: "herbst",
  },
  {
    id: 41,
    category: "vorsorge",
    title: "Augen regelmäßig prüfen",
    body: "Ab 40 steigt das Risiko für Augenerkrankungen wie Glaukom oder Makuladegeneration. Gehen Sie alle 1 bis 2 Jahre zur Augenkontrolle. Frühe Erkennung kann das Sehvermögen erhalten.",
    source: "BVA",
  },
  {
    id: 42,
    category: "vorsorge",
    title: "Patientenverfügung erstellen",
    body: "Eine Patientenverfügung legt fest, welche Behandlungen Sie im Notfall wünschen. Sprechen Sie mit Ihrer Familie und Ihrem Arzt darüber. Formulare gibt es kostenlos beim Bundesjustizministerium.",
    source: "BMJ",
  },

  // === MENTAL (8) ===
  {
    id: 43,
    category: "mental",
    title: "Kreuzworträtsel und Sudoku",
    body: "Rätsel und Denkspiele halten das Gehirn aktiv. Täglich 15 Minuten genügen, um die geistige Fitness zu fördern. Probieren Sie verschiedene Rätselarten aus.",
    source: "DGPPN",
  },
  {
    id: 44,
    category: "mental",
    title: "Neues lernen hält jung",
    body: "Lernen Sie etwas Neues, zum Beispiel eine Fremdsprache oder ein Instrument. Das bildet neue Verbindungen im Gehirn. Volkshochschulen bieten günstige Kurse für jedes Alter.",
    source: "BZgA",
  },
  {
    id: 45,
    category: "mental",
    title: "Dankbarkeit üben",
    body: "Schreiben Sie abends drei Dinge auf, für die Sie an diesem Tag dankbar sind. Das verbessert nachweislich die Stimmung und den Schlaf. Es müssen keine großen Dinge sein.",
    source: "DGPPN",
  },
  {
    id: 46,
    category: "mental",
    title: "Achtsamkeit im Alltag",
    body: "Nehmen Sie sich täglich 5 Minuten, um bewusst innezuhalten. Konzentrieren Sie sich auf Ihre Atmung oder lauschen Sie den Geräuscheln um Sie herum. Das reduziert Stress und beruhigt.",
    source: "DGPM",
  },
  {
    id: 47,
    category: "mental",
    title: "Musik hören hebt die Stimmung",
    body: "Musik kann die Stimmung heben und Erinnerungen wecken. Hören Sie täglich Ihre Lieblingsmusik. Studien zeigen, dass Musik auch Schmerzen und Angst lindern kann.",
    source: "DGM",
  },
  {
    id: 48,
    category: "mental",
    title: "Lachen ist gesund",
    body: "Lachen stärkt das Immunsystem, senkt Stresshormone und verbessert die Stimmung. Schauen Sie eine lustige Sendung oder lesen Sie Witze. Auch gemeinsames Lachen mit anderen tut gut.",
    source: "BZgA",
  },
  {
    id: 49,
    category: "mental",
    title: "Natur erleben entspannt",
    body: "Zeit in der Natur senkt den Blutdruck und baut Stress ab. Schon 20 Minuten im Park oder Wald genügen. Achten Sie bewusst auf Vogelgesang, Blätter und frische Luft.",
    source: "BfN",
    season: "fruehling",
  },
  {
    id: 50,
    category: "mental",
    title: "Hilfe suchen ist Stärke",
    body: "Wenn Sie sich länger als zwei Wochen traurig oder antriebslos fühlen, sprechen Sie mit Ihrem Arzt. Seelische Erkrankungen sind gut behandelbar. Die Telefonseelsorge ist unter 0800 111 0 111 erreichbar.",
    source: "DGPPN",
  },
];

/** Kategorie-Emojis für die Anzeige */
export const CATEGORY_EMOJIS: Record<HealthTip["category"], string> = {
  bewegung: "\uD83C\uDFC3",
  ernaehrung: "\uD83E\uDD57",
  schlaf: "\uD83D\uDE34",
  soziales: "\uD83E\uDD1D",
  vorsorge: "\uD83E\uDE7A",
  mental: "\uD83E\uDDE0",
};

/** Kategorie-Labels für die Anzeige */
export const CATEGORY_LABELS: Record<HealthTip["category"], string> = {
  bewegung: "Bewegung",
  ernaehrung: "Ernährung",
  schlaf: "Schlaf",
  soziales: "Soziales",
  vorsorge: "Vorsorge",
  mental: "Mental",
};
