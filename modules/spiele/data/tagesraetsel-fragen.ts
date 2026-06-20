// Welle SP1-2 — Tagesrätsel-Fragen (Produktiv-Daten).
// Quelle: docs/plans/2026-06-12-tagesraetsel-fragen-entwurf.md
// Founder-freigegeben 2026-06-17 (as-is). Eigene Formulierungen, kein fremdes
// Material (UrhG/§ 87a); Sprichwörter = gemeinfreies Volksgut.
// Wording-Regel: keine Heil-/Wirk-Versprechen (Wording-Guard schützt automatisch,
// siehe docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md). Failure-free: `story` wird
// nach JEDER Antwort gezeigt; `answer` ist nur die beste Antwort, kein „richtig/falsch".

import type { TagesraetselFrage } from "@/modules/spiele/services/tagesraetsel.service";

export const TAGESRAETSEL_FRAGEN: TagesraetselFrage[] = [
  // --- Lokal: Bad Säckingen & Hochrhein (15) ---
  {
    q: "Welcher Fluss fließt an Bad Säckingen vorbei?",
    options: ["Donau", "Rhein", "Elbe", "Neckar"],
    answer: 1,
    story:
      "Dieser Abschnitt des Rheins heißt Hochrhein — er verbindet den Bodensee mit Basel. Auf der anderen Uferseite liegt schon die Schweiz.",
    lokal: true,
  },
  {
    q: "Wofür ist die Holzbrücke von Bad Säckingen berühmt?",
    options: [
      "Sie ist die älteste Steinbrücke",
      "Sie ist die längste gedeckte Holzbrücke Europas",
      "Sie hat sieben Türme",
      "Sie wurde nie fertig",
    ],
    answer: 1,
    story:
      "Rund 200 Meter überdachtes Holz — und am anderen Ende steht man in Stein in der Schweiz. Ein Spaziergang über die Brücke ist eine kleine Auslandsreise zu Fuß.",
    lokal: true,
  },
  {
    q: "Wie heißt die große Kirche mitten in Bad Säckingen?",
    options: ["Gallusdom", "Liebfrauenkirche", "Fridolinsmünster", "Stephansmünster"],
    answer: 2,
    story:
      "Das Fridolinsmünster ist dem heiligen Fridolin geweiht, einem irischen Wandermönch. Er gilt als Stadtpatron von Bad Säckingen.",
    lokal: true,
  },
  {
    q: "Welches Fest feiert Bad Säckingen jedes Jahr mit einer großen Prozession?",
    options: ["Fridolinsfest", "Gallusfest", "Rheinfest", "Brückenfest"],
    answer: 0,
    story:
      "Anfang März wird der Stadtpatron Fridolin gefeiert — sein Schrein wird feierlich durch die Straßen getragen. Dazu kommen Besucher von beiden Seiten des Rheins.",
    lokal: true,
  },
  {
    q: "Wer schrieb das berühmte Werk „Der Trompeter von Säckingen“?",
    options: [
      "Theodor Fontane",
      "Joseph Victor von Scheffel",
      "Wilhelm Busch",
      "Eduard Mörike",
    ],
    answer: 1,
    story:
      "Scheffels Versdichtung aus dem 19. Jahrhundert machte das Städtchen weit über die Region hinaus bekannt. Deshalb begegnet einem der Trompeter in Bad Säckingen bis heute überall.",
    lokal: true,
  },
  {
    q: "Wie heißt das Schloss in Bad Säckingen?",
    options: [
      "Schloss Rheinfels",
      "Schloss Hohenbaden",
      "Schloss Schönau",
      "Schloss Waldshut",
    ],
    answer: 2,
    story:
      "Schloss Schönau wird auch „Trompeterschloss“ genannt. Heute ist dort ein Museum zuhause — unter anderem mit einer bekannten Trompetensammlung.",
    lokal: true,
  },
  {
    q: "In welchem Bundesland liegt Bad Säckingen?",
    options: ["Bayern", "Hessen", "Rheinland-Pfalz", "Baden-Württemberg"],
    answer: 3,
    story:
      "Ganz im Süden des Landes, im Landkreis Waldshut, direkt an der Schweizer Grenze. Weiter südlich geht es in Deutschland kaum.",
    lokal: true,
  },
  {
    q: "Welches Land liegt direkt auf der anderen Rheinseite?",
    options: ["Frankreich", "Österreich", "Schweiz", "Liechtenstein"],
    answer: 2,
    story:
      "Gegenüber liegt Stein im Kanton Aargau. Viele Menschen pendeln hier täglich über die Grenze — zur Arbeit, zum Einkaufen oder einfach zum Spazieren.",
    lokal: true,
  },
  {
    q: "Wie heißt der beliebte See oberhalb von Bad Säckingen?",
    options: ["Titisee", "Bergsee", "Schluchsee", "Mummelsee"],
    answer: 1,
    story:
      "Der Bergsee ist ein klassisches Ausflugsziel: einmal gemütlich rundherum spazieren, dann einkehren. Im Sommer spendet der Wald am Ufer angenehmen Schatten.",
    lokal: true,
  },
  {
    q: "Wie heißt das Thermalbad in Bad Säckingen?",
    options: ["Aqualon", "Caracalla", "Vita Classica", "Rheinwelle"],
    answer: 0,
    story:
      "Das warme Thermalwasser hat Tradition — das „Bad“ im Stadtnamen kommt vom Kurwesen. Ein Besuch dort ist für viele ein liebgewonnenes Ritual.",
    lokal: true,
  },
  {
    q: "Wie heißt die Kreisstadt des Landkreises, zu dem Bad Säckingen gehört?",
    options: ["Lörrach", "Freiburg", "Waldshut-Tiengen", "Singen"],
    answer: 2,
    story:
      "Waldshut-Tiengen entstand aus zwei Städten, die sich zusammengeschlossen haben. Daher der Doppelname.",
    lokal: true,
  },
  {
    q: "Welches Mittelgebirge beginnt nördlich von Bad Säckingen?",
    options: ["Harz", "Schwarzwald", "Eifel", "Erzgebirge"],
    answer: 1,
    story:
      "Der südliche Teil über Bad Säckingen wird Hotzenwald genannt. Wer gern wandert, findet dort stille Höhen mit Blick bis zu den Alpen.",
    lokal: true,
  },
  {
    q: "Wie heißt der historische Turm in der Altstadt von Bad Säckingen?",
    options: ["Gallusturm", "Pulverturm", "Storchenturm", "Diebsturm"],
    answer: 0,
    story:
      "Der Gallusturm ist ein Rest der alten Stadtbefestigung. Er erinnert daran, dass die Stadt einst von Mauern umgeben war.",
    lokal: true,
  },
  {
    q: "Welche Bahnstrecke führt durch Bad Säckingen?",
    options: ["Schwarzwaldbahn", "Höllentalbahn", "Hochrheinbahn", "Gäubahn"],
    answer: 2,
    story:
      "Die Hochrheinbahn verbindet Basel mit dem Bodenseeraum — immer am Rhein entlang. Eine der schönsten Bahnstrecken im Süden.",
    lokal: true,
  },
  {
    q: "In welche Richtung fließt der Rhein bei Bad Säckingen?",
    options: ["Nach Osten", "Nach Westen", "Nach Norden", "Nach Süden"],
    answer: 1,
    story:
      "Vom Bodensee aus fließt der Hochrhein westwärts Richtung Basel. Erst dort macht der Fluss seinen großen Knick nach Norden.",
    lokal: true,
  },

  // --- Sprichwörter vervollständigen (8) ---
  {
    q: "„Wer rastet, der …“",
    options: ["rostet", "rastet weiter", "ruht gut", "reist"],
    answer: 0,
    story:
      "Ein altes Sprichwort übers Dranbleiben. Es stammt aus einer Zeit, in der rostiges Werkzeug schnell unbrauchbar wurde.",
  },
  {
    q: "„Morgenstund hat …“",
    options: ["kalte Füße", "Gold im Mund", "viel zu tun", "frische Luft"],
    answer: 1,
    story:
      "Wer früh aufsteht, hat den schönsten Teil des Tages für sich. Viele schwören bis heute auf die ruhigen Morgenstunden.",
  },
  {
    q: "„Was Hänschen nicht lernt, …“",
    options: [
      "lernt Hans nimmermehr",
      "lernt er morgen",
      "weiß die Oma",
      "steht im Buch",
    ],
    answer: 0,
    story:
      "So streng, wie das Sprichwort klingt, stimmt es zum Glück nicht — Neues lernen geht in jedem Alter. Aber hübsch gereimt ist es allemal.",
  },
  {
    q: "„Aller guten Dinge sind …“",
    options: ["zwei", "vier", "drei", "sieben"],
    answer: 2,
    story:
      "Die Drei gilt seit jeher als Glückszahl — drei Wünsche, drei Versuche, drei Prüfungen im Märchen.",
  },
  {
    q: "„Der Apfel fällt …“",
    options: ["ins Gras", "nicht weit vom Stamm", "immer nach unten", "in den Korb"],
    answer: 1,
    story:
      "Gemeint sind natürlich Eltern und Kinder, die sich oft ähnlicher sind, als sie zugeben würden.",
  },
  {
    q: "„Wer den Pfennig nicht ehrt, …“",
    options: [
      "hat keine Börse",
      "zahlt mit Talern",
      "ist des Talers nicht wert",
      "spart am Ende",
    ],
    answer: 2,
    story:
      "Pfennig und Taler gibt es längst nicht mehr — das Sprichwort über den Wert kleiner Dinge hat alle Währungen überlebt.",
  },
  {
    q: "„Reden ist Silber, …“",
    options: [
      "Schweigen ist Gold",
      "Singen ist schöner",
      "Zuhören ist Pflicht",
      "Schreiben ist Blei",
    ],
    answer: 0,
    story:
      "Manchmal sagt ein freundliches Schweigen mehr als viele Worte. Das wussten schon unsere Großeltern.",
  },
  {
    q: "„Übung macht …“",
    options: ["müde", "den Meister", "Musik", "den Anfang"],
    answer: 1,
    story:
      "Ob Stricken, Schach oder Schwarzwälder Kirschtorte — was man oft tut, gelingt immer leichter.",
  },

  // --- Natur & Alltag (12) ---
  {
    q: "Welcher Vogel klopft mit dem Schnabel ans Holz?",
    options: ["Amsel", "Specht", "Star", "Zaunkönig"],
    answer: 1,
    story:
      "Der Specht zimmert Höhlen in Baumstämme und sucht darunter nach Insekten. Sein Trommeln im Frühjahr ist außerdem seine Art zu singen.",
  },
  {
    q: "Welche Blume dreht ihren Kopf mit der Sonne?",
    options: ["Tulpe", "Rose", "Sonnenblume", "Nelke"],
    answer: 2,
    story:
      "Junge Sonnenblumen folgen der Sonne tatsächlich von Ost nach West. Ausgewachsene Blüten schauen dann meist fest nach Osten — der Morgensonne entgegen.",
  },
  {
    q: "Wie viele Beine hat eine Spinne?",
    options: ["Sechs", "Acht", "Zehn", "Zwölf"],
    answer: 1,
    story:
      "Daran erkennt man: Spinnen sind keine Insekten — die haben nämlich nur sechs Beine.",
  },
  {
    q: "Welcher Nadelbaum verliert im Winter seine Nadeln?",
    options: ["Tanne", "Fichte", "Kiefer", "Lärche"],
    answer: 3,
    story:
      "Die Lärche färbt sich im Herbst goldgelb und wirft dann alle Nadeln ab. Im Frühjahr treibt sie zartgrün wieder aus.",
  },
  {
    q: "Was sammeln Bienen an den Blüten?",
    options: ["Nektar", "Tau", "Samen", "Blätter"],
    answer: 0,
    story:
      "Aus dem Nektar machen die Bienen ihren Honig. Ganz nebenbei bestäuben sie dabei Obstbäume und Blumen — ohne sie gäbe es kaum Kirschen am Hochrhein.",
  },
  {
    q: "Welches Tier hält einen echten Winterschlaf?",
    options: ["Eichhörnchen", "Igel", "Amsel", "Reh"],
    answer: 1,
    story:
      "Der Igel schläft den Winter wirklich durch. Das Eichhörnchen hält dagegen nur Winterruhe — es wacht zwischendurch auf und holt sich seine versteckten Nüsse.",
  },
  {
    q: "Welcher Monat hat die wenigsten Tage?",
    options: ["November", "April", "Februar", "Juni"],
    answer: 2,
    story:
      "Normalerweise 28 Tage — und alle vier Jahre im Schaltjahr einer mehr, damit der Kalender mit der Sonne Schritt hält.",
  },
  {
    q: "Wie nennt man gefrorene Regenkörner im Sommergewitter?",
    options: ["Schnee", "Raureif", "Hagel", "Graupel"],
    answer: 2,
    story:
      "Hagelkörner entstehen hoch oben in Gewitterwolken, wo Wassertropfen in eisiger Luft gefrieren. Manche werden so groß wie Kirschen.",
  },
  {
    q: "Welche Farbe entsteht, wenn man Blau und Gelb mischt?",
    options: ["Orange", "Grün", "Violett", "Braun"],
    answer: 1,
    story:
      "Das kennt jeder vom Tuschkasten. Maler mischen sich ihre Grüntöne oft selbst — jedes Grün ein bisschen anders.",
  },
  {
    q: "Welches Gemüse bringt einen beim Schneiden zum Weinen?",
    options: ["Gurke", "Möhre", "Zwiebel", "Kartoffel"],
    answer: 2,
    story:
      "Beim Schneiden setzt die Zwiebel einen Reizstoff frei. Ein Trick dagegen: die Zwiebel vorher kurz kalt abspülen.",
  },
  {
    q: "Was zeigt ein Barometer an?",
    options: ["Temperatur", "Luftdruck", "Windstärke", "Regenmenge"],
    answer: 1,
    story:
      "Fällt der Luftdruck, kommt oft schlechtes Wetter — deshalb hing früher in vielen Fluren ein Barometer, auf das man morgens klopfte.",
  },
  {
    q: "Welcher Planet wird „der rote Planet“ genannt?",
    options: ["Venus", "Jupiter", "Saturn", "Mars"],
    answer: 3,
    story:
      "Rostroter Staub bedeckt seine Oberfläche, daher die Farbe. In klaren Nächten kann man den Mars mit bloßem Auge als rötlichen Punkt sehen.",
  },

  // --- Deutschland & Welt (11) ---
  {
    q: "Was ist die Landeshauptstadt von Baden-Württemberg?",
    options: ["Karlsruhe", "Mannheim", "Stuttgart", "Freiburg"],
    answer: 2,
    story:
      "Stuttgart liegt in einem Talkessel voller Weinberge — mitten in der Stadt wächst Wein.",
  },
  {
    q: "Welcher Fluss fließt durch Hamburg?",
    options: ["Rhein", "Elbe", "Weser", "Oder"],
    answer: 1,
    story:
      "Über die Elbe erreichen große Seeschiffe den Hamburger Hafen, obwohl die Stadt gut 100 Kilometer vom Meer entfernt liegt.",
  },
  {
    q: "Wie heißt der höchste Berg Deutschlands?",
    options: ["Feldberg", "Watzmann", "Brocken", "Zugspitze"],
    answer: 3,
    story:
      "Knapp 3.000 Meter hoch, in den bayerischen Alpen. Der Feldberg im Schwarzwald ist immerhin der höchste Berg außerhalb der Alpen — quasi unser Hausberg-Riese.",
  },
  {
    q: "In welchem Meer liegt die Insel Sylt?",
    options: ["Ostsee", "Nordsee", "Mittelmeer", "Atlantik"],
    answer: 1,
    story:
      "Sylt ist berühmt für seinen langen Weststrand und das Wattenmeer. Bei Ebbe kann man dort weit hinauslaufen, wo eben noch Wasser war.",
  },
  {
    q: "Was feiert man am 6. Dezember?",
    options: ["Heiligabend", "Nikolaus", "Dreikönig", "Silvester"],
    answer: 1,
    story:
      "Am Vorabend stellen Kinder die geputzten Stiefel vor die Tür. Der Brauch geht auf den heiligen Nikolaus von Myra zurück, der heimlich Gutes getan haben soll.",
  },
  {
    q: "Welches Weihnachtsgebäck ist eine Dresdner Spezialität?",
    options: ["Lebkuchen", "Spekulatius", "Stollen", "Printen"],
    answer: 2,
    story:
      "Der Dresdner Stollen ist mit seiner Zuckerschicht dem gewickelten Christkind nachempfunden. Lebkuchen gehören dagegen nach Nürnberg, Printen nach Aachen.",
  },
  {
    q: "Aus welchem Getreide wird klassisches Schwarzbrot gebacken?",
    options: ["Weizen", "Roggen", "Hafer", "Mais"],
    answer: 1,
    story:
      "Roggen wächst auch auf kargen Böden und in rauem Klima. Deshalb war Roggenbrot jahrhundertelang das tägliche Brot in weiten Teilen Deutschlands.",
  },
  {
    q: "Welches Instrument hat 88 Tasten?",
    options: ["Akkordeon", "Orgel", "Klavier", "Cembalo"],
    answer: 2,
    story:
      "52 weiße und 36 schwarze. Die Orgel hat zwar Manuale und Pedale ohne feste Zahl — aber die 88 gehören dem Klavier.",
  },
  {
    q: "Wer komponierte das Klavierstück „Für Elise“?",
    options: ["Mozart", "Bach", "Schubert", "Beethoven"],
    answer: 3,
    story:
      "Wer die geheimnisvolle Elise war, weiß bis heute niemand genau. Das kleine Stück gehört trotzdem zu den bekanntesten Melodien der Welt.",
  },
  {
    q: "Welche Jahreszeit beginnt im März?",
    options: ["Sommer", "Frühling", "Herbst", "Winter"],
    answer: 1,
    story:
      "Um den 20. März sind Tag und Nacht genau gleich lang. Danach werden die Tage wieder länger — und am Hochrhein blühen bald die Obstbäume.",
  },
  {
    q: "Welche Stadt ist die Bundesstadt der Schweiz?",
    options: ["Zürich", "Genf", "Bern", "Basel"],
    answer: 2,
    story:
      "Streng genommen hat die Schweiz gar keine Hauptstadt per Gesetz — Bern ist die „Bundesstadt“, in der Regierung und Parlament sitzen.",
  },

  // --- Märchen & Klassiker (4) ---
  {
    q: "Wer hat „Die Bremer Stadtmusikanten“ aufgeschrieben?",
    options: [
      "Wilhelm Hauff",
      "Die Brüder Grimm",
      "Hans Christian Andersen",
      "Ludwig Bechstein",
    ],
    answer: 1,
    story:
      "Die Brüder Grimm sammelten Volksmärchen und schrieben sie auf. Ihre Sammlung wird bis heute in aller Welt vorgelesen.",
  },
  {
    q: "Esel, Hund, Katze — und wer ist der vierte Bremer Stadtmusikant?",
    options: ["Ziege", "Schwein", "Hahn", "Gans"],
    answer: 2,
    story:
      "Vier Tiere, die niemand mehr wollte, machen sich gemeinsam auf den Weg — und vertreiben mit ihrem „Konzert“ die Räuber aus dem Haus.",
  },
  {
    q: "Wie heißen die beiden Lausbuben bei Wilhelm Busch: „Max und …“?",
    options: ["Moritz", "Martin", "Michel", "Matthias"],
    answer: 0,
    story:
      "Sieben Streiche in gereimten Versen — seit über 150 Jahren werden sie vorgelesen, geschmunzelt inklusive.",
  },
  {
    q: "Wie heißt die Stelle, an der die Mosel in den Rhein mündet?",
    options: ["Loreley", "Deutsches Eck", "Rheinknie", "Drachenfels"],
    answer: 1,
    story:
      "Das Deutsche Eck liegt in Koblenz, mit dem großen Reiterdenkmal an der Spitze. Von oben sieht man, wie sich die beiden Flüsse vereinen.",
  },
];
