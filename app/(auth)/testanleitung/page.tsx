"use client";

import Link from "next/link";
import { ArrowLeft, CheckSquare, Users, Bell, Shield, Smartphone, MessageCircle, HelpCircle } from "lucide-react";

export default function TestanleitungPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit">
        <ArrowLeft className="h-4 w-4" /> Zur Startseite
      </Link>

      <div className="mb-8 text-center">
        <div className="mb-2 text-4xl">🏡</div>
        <h1 className="text-2xl font-bold text-anthrazit">So testen Sie Nachbar.io</h1>
        <p className="mt-2 text-muted-foreground">
          Eine einfache Anleitung — Schritt für Schritt
        </p>
      </div>

      {/* Willkommen */}
      <div className="mb-6 rounded-xl border-2 border-quartier-green bg-quartier-green/5 p-5">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-quartier-green">
          <CheckSquare className="h-5 w-5" />
          Bevor es losgeht
        </h3>
        <p className="mb-2 text-sm text-muted-foreground">
          Nachbar.io ist eine Internetseite speziell für unsere Nachbarschaft. Sie funktioniert
          wie eine App auf Ihrem Handy — direkt im Internet-Browser (z.B. Safari oder Chrome).
        </p>
        <p className="mb-3 text-sm text-muted-foreground">
          Wenn Sie sich anmelden, sehen Sie automatisch ein kleines Test-Fenster am unteren Rand.
          Dort können Sie Ihren Fortschritt verfolgen. Aber keine Sorge — diese Anleitung hier erklärt
          alles nochmal ganz in Ruhe.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-lg bg-quartier-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-quartier-green/90"
        >
          Zur Anmeldung
        </Link>
      </div>

      <div className="mb-6 rounded-xl border bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Wichtig:</strong> Verwenden Sie zum Testen bitte <strong>keine echten persönlichen Daten</strong>.
        Denken Sie sich einfach etwas aus — z.B. einen Fantasie-Namen für Ihren Hilfe-Eintrag.
      </div>

      {/* 1. Registrierung */}
      <Section icon={<Smartphone className="h-5 w-5" />} title="1. Konto erstellen" id="registrierung">
        <p className="mb-3 text-sm text-muted-foreground">
          Zuerst brauchen Sie ein Benutzerkonto. Das dauert nur wenige Minuten.
        </p>
        <ol className="list-inside list-decimal space-y-3 text-sm">
          <li>
            Öffnen Sie auf Ihrem Handy den Internet-Browser (Safari auf iPhone, Chrome auf Android)
          </li>
          <li>
            Geben Sie oben in die Adresszeile ein: <strong>nachbar-io.vercel.app</strong>
          </li>
          <li>
            Tippen Sie auf den grünen Knopf <strong>&quot;Registrieren&quot;</strong>
          </li>
          <li>
            Geben Sie Ihre <strong>E-Mail-Adresse</strong> ein und wählen Sie ein <strong>Passwort</strong> (mindestens 8 Zeichen — z.B. &quot;Nachbar123&quot;)
          </li>
          <li>
            Bei der Adresse: Tippen Sie auf <strong>&quot;Adresse manuell angeben&quot;</strong>, wählen Sie Ihre Straße aus der Liste und geben Sie Ihre Hausnummer ein
          </li>
          <li>
            Geben Sie einen <strong>Anzeigenamen</strong> ein — das ist der Name, den andere Nachbarn sehen (z.B. Ihr Vorname)
          </li>
          <li>
            Wählen Sie <strong>&quot;Normal&quot;</strong> oder <strong>&quot;Seniorenmodus&quot;</strong> — im Seniorenmodus ist alles größer und leichter zu lesen
          </li>
          <li>
            Fertig! <strong>Thomas wird Ihre Adresse kurz prüfen</strong> und dann freischalten
          </li>
        </ol>
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          <strong>Ganz normal:</strong> Bis Thomas Ihre Adresse bestätigt hat, sehen Sie oben ein gelbes Band.
          Das verschwindet automatisch nach der Freischaltung.
        </div>
      </Section>

      {/* 2. Die App kennenlernen */}
      <Section icon={<CheckSquare className="h-5 w-5" />} title="2. Die App kennenlernen" id="grundlagen">
        <p className="mb-3 text-sm text-muted-foreground">
          Nach der Freischaltung können Sie alles ausprobieren. Hier eine Übersicht, was Sie testen können:
        </p>

        <h4 className="mb-2 text-sm font-semibold">Erste Schritte</h4>
        <Checklist items={[
          "Öffnen Sie die Seite und schauen Sie sich die Startseite an",
          "Unten am Bildschirm sehen Sie 5 Symbole — tippen Sie jedes einmal an: Startseite, Hilfe, Karte, Marktplatz, Profil",
        ]} />

        <h4 className="mb-2 mt-5 text-sm font-semibold">Ihr Profil anpassen</h4>
        <Checklist items={[
          "Tippen Sie unten rechts auf \"Profil\"",
          "Tippen Sie auf \"Profil bearbeiten\" und schreiben Sie einen kurzen Text über sich (z.B. \"Ich wohne seit 5 Jahren hier\")",
          "Schalten Sie die Benachrichtigungen ein: Profil → Benachrichtigungen → einschalten (Ihr Handy fragt Sie dann, ob die Seite Ihnen Nachrichten schicken darf — tippen Sie auf \"Erlauben\")",
          "Probieren Sie den Urlaubsmodus aus: einschalten und wieder ausschalten",
          "Öffnen Sie das Hilfe-Center: dort finden Sie Antworten auf häufige Fragen",
        ]} />

        <h4 className="mb-2 mt-5 text-sm font-semibold">Die Nachbarschaftskarte</h4>
        <p className="mb-2 text-xs text-muted-foreground">
          Die Karte zeigt unsere Nachbarschaft von oben. Jedes Haus ist eingezeichnet.
        </p>
        <Checklist items={[
          "Tippen Sie unten auf \"Karte\" — Sie sehen ein Luftbild mit allen 3 Straßen",
          "Tippen Sie auf ein Haus — es öffnet sich ein kleines Fenster mit Infos",
          "Tippen Sie auf die kleine Lampe neben einem Haus — die Farbe wechselt (Grün = alles gut, Rot = brauche Hilfe, Gelb = bin im Urlaub)",
        ]} />

        <h4 className="mb-2 mt-5 text-sm font-semibold">Hilfe anbieten oder suchen</h4>
        <p className="mb-2 text-xs text-muted-foreground">
          Das Herzstück von Nachbar.io: Nachbarn helfen Nachbarn.
        </p>
        <Checklist items={[
          "Tippen Sie unten auf \"Hilfe\"",
          "Tippen Sie auf den grünen Knopf \"Neuer Eintrag\" oder \"+\"",
          "Schreiben Sie z.B. \"Suche jemanden zum Blumen gießen nächste Woche\"",
          "Wählen Sie eine Kategorie (z.B. \"Haushalt\") und wie dringend es ist",
          "Schauen Sie sich die Hilfe-Einträge anderer Tester an",
          "Antworten Sie auf einen Eintrag eines anderen Testers",
        ]} />

        <h4 className="mb-2 mt-5 text-sm font-semibold">Marktplatz — Verschenken, Verleihen, Suchen</h4>
        <Checklist items={[
          "Tippen Sie unten auf \"Marktplatz\"",
          "Erstellen Sie ein Angebot (z.B. \"Verschenke Blumentöpfe\")",
          "Schauen Sie sich die Leihbörse an — hier können Nachbarn Dinge ausleihen",
          "Probieren Sie \"Wer hat?\" aus — hier können Sie fragen, ob jemand etwas bestimmtes hat",
        ]} />

        <h4 className="mb-2 mt-5 text-sm font-semibold">Gemeinschaft — Brett, Veranstaltungen, Tipps</h4>
        <Checklist items={[
          "Öffnen Sie das Schwarze Brett — hier können Nachbarn Aushänge machen",
          "Schauen Sie bei Veranstaltungen rein und erstellen Sie ein Test-Event (z.B. \"Straßenfest am Samstag\")",
          "Schreiben Sie einen Tipp für die Nachbarschaft (z.B. \"Der Briefkasten wird um 14 Uhr geleert\")",
          "Lesen Sie die lokalen Nachrichten",
          "Schauen Sie bei Umfragen rein und erstellen Sie eine Test-Umfrage",
        ]} />
      </Section>

      {/* 3. Nachrichten schreiben (zu zweit) */}
      <Section icon={<Users className="h-5 w-5" />} title="3. Nachrichten schreiben (braucht 2 Personen)" id="kommunikation">
        <div className="mb-3 rounded-lg bg-quartier-green/10 p-3 text-sm text-quartier-green-dark">
          <strong>Zu zweit testen:</strong> Für diesen Teil brauchen Sie einen zweiten Tester.
          Verabreden Sie sich kurz — z.B. per Telefon oder WhatsApp.
        </div>

        <h4 className="mb-2 text-sm font-semibold">Sich gegenseitig schreiben</h4>
        <ol className="list-inside list-decimal space-y-2 text-sm">
          <li><strong>Person A</strong> öffnet &quot;Nachrichten&quot; (das Briefumschlag-Symbol)</li>
          <li><strong>Person A</strong> sucht <strong>Person B</strong> und sendet eine Kontaktanfrage</li>
          <li><strong>Person B</strong> schaut nach — dort sollte die Anfrage erscheinen</li>
          <li><strong>Person B</strong> nimmt die Anfrage an</li>
          <li>Jetzt können sich beide Nachrichten schreiben!</li>
          <li>Achten Sie darauf: Neue Nachrichten sollten <strong>sofort</strong> erscheinen — ohne dass Sie die Seite neu laden müssen</li>
          <li>Schauen Sie, ob am Nachrichten-Symbol eine <strong>kleine Zahl</strong> erscheint, wenn Sie ungelesene Nachrichten haben</li>
        </ol>

        <h4 className="mb-2 mt-5 text-sm font-semibold">Benachrichtigungen testen (zu zweit)</h4>
        <p className="mb-2 text-xs text-muted-foreground">
          Voraussetzung: Beide haben die Benachrichtigungen eingeschaltet (siehe oben bei &quot;Profil anpassen&quot;).
        </p>
        <ol className="list-inside list-decimal space-y-2 text-sm">
          <li><strong>Person A</strong> erstellt einen neuen Hilfe-Eintrag</li>
          <li><strong>Person B</strong> wartet kurz — es sollte eine Benachrichtigung auf dem Handy erscheinen (ähnlich wie bei WhatsApp)</li>
          <li>Tippen Sie auf die Benachrichtigung — die App sollte sich öffnen und den richtigen Eintrag zeigen</li>
          <li>Tippen Sie auf das Glocken-Symbol oben rechts — dort sehen Sie alle Ihre Benachrichtigungen</li>
        </ol>

        <h4 className="mb-2 mt-5 text-sm font-semibold">Nachbarn einladen</h4>
        <Checklist items={[
          "Gehen Sie zu Profil → \"Nachbar einladen\"",
          "Erstellen Sie eine Einladung — es öffnet sich WhatsApp mit einem fertigen Text",
          "Sie müssen die Einladung NICHT wirklich senden — es reicht zu prüfen, ob WhatsApp sich öffnet",
        ]} />
      </Section>

      {/* 4. Besondere Funktionen */}
      <Section icon={<Bell className="h-5 w-5" />} title="4. Besondere Funktionen" id="sonderfaelle">
        <h4 className="mb-2 text-sm font-semibold">Notfall-Hinweis testen</h4>
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <strong>Keine Sorge:</strong> Sie rufen dabei <strong>NICHT</strong> wirklich den Notruf an!
          Wir testen nur, ob der Warnhinweis richtig angezeigt wird.
        </div>
        <ol className="list-inside list-decimal space-y-2 text-sm">
          <li>Gehen Sie zu &quot;Hilfe&quot; und erstellen Sie einen neuen Eintrag</li>
          <li>Wählen Sie als Kategorie <strong>&quot;Feuer/Brand&quot;</strong></li>
          <li>Es sollte sofort ein <strong>großes rotes Band</strong> erscheinen mit dem Hinweis &quot;Rufen Sie zuerst 112 an!&quot;</li>
          <li>Prüfen Sie: Das rote Band sollte <strong>über allem anderen</strong> stehen — nichts sollte es verdecken</li>
          <li>Probieren Sie das Gleiche mit &quot;Medizinischer Notfall&quot; und &quot;Kriminalität&quot;</li>
        </ol>

        <h4 className="mb-2 mt-5 text-sm font-semibold">Seniorenmodus ausprobieren</h4>
        <p className="mb-2 text-xs text-muted-foreground">
          Der Seniorenmodus macht alles größer und leichter zu bedienen.
        </p>
        <Checklist items={[
          "Gehen Sie zu Profil und schalten Sie den Seniorenmodus ein",
          "Prüfen Sie: Ist die Schrift jetzt deutlich größer?",
          "Prüfen Sie: Sind die Knöpfe groß genug, um sie leicht zu treffen?",
          "Prüfen Sie: Können Sie alle Texte gut lesen? (Kontrast/Farben)",
        ]} />
      </Section>

      {/* 5. Datenschutz */}
      <Section icon={<Shield className="h-5 w-5" />} title="5. Datenschutz prüfen" id="dsgvo">
        <p className="mb-3 text-sm text-muted-foreground">
          Ihre Daten gehören Ihnen. Prüfen Sie, ob der Datenschutz funktioniert:
        </p>
        <Checklist items={[
          "Öffnen Sie die Impressum-Seite (ganz unten auf der Startseite)",
          "Öffnen Sie die Datenschutz-Seite (ebenfalls ganz unten)",
          "Gehen Sie zu Profil → \"Meine Daten herunterladen\" — es wird eine Datei gespeichert",
          "Prüfen Sie: In dieser Datei sollten NUR Ihre eigenen Daten stehen — keine Adressen von anderen Nachbarn",
        ]} />
      </Section>

      {/* 6. Allgemeiner Eindruck */}
      <Section icon={<Smartphone className="h-5 w-5" />} title="6. Allgemeiner Eindruck" id="qualitaet">
        <p className="mb-3 text-sm text-muted-foreground">
          Zum Schluss noch ein paar allgemeine Punkte. Achten Sie einfach darauf:
        </p>
        <Checklist items={[
          "Sieht die Seite auf Ihrem Handy gut aus? (Kein Text abgeschnitten, alles lesbar)",
          "Sind alle Texte auf Deutsch und höflich formuliert?",
          "Laden die Seiten schnell genug? (Nicht länger als 3 Sekunden)",
          "Wenn etwas nicht funktioniert: Ist die Fehlermeldung verständlich?",
        ]} />

        <h4 className="mb-2 mt-5 text-sm font-semibold">App auf den Startbildschirm legen (freiwillig)</h4>
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          <p className="mb-2">
            Sie können Nachbar.io wie eine richtige App auf Ihren Startbildschirm legen.
            Dann müssen Sie nicht jedes Mal die Adresse eintippen.
          </p>
          <p className="mb-1"><strong>Auf dem iPhone (Safari):</strong></p>
          <ol className="mb-2 ml-4 list-decimal space-y-1 text-xs">
            <li>Tippen Sie unten auf das Teilen-Symbol (Quadrat mit Pfeil nach oben)</li>
            <li>Scrollen Sie nach unten und tippen Sie auf &quot;Zum Home-Bildschirm&quot;</li>
            <li>Tippen Sie auf &quot;Hinzufügen&quot;</li>
          </ol>
          <p className="mb-1"><strong>Auf Android (Chrome):</strong></p>
          <ol className="ml-4 list-decimal space-y-1 text-xs">
            <li>Tippen Sie oben rechts auf die drei Punkte (⋮)</li>
            <li>Tippen Sie auf &quot;Zum Startbildschirm hinzufügen&quot;</li>
            <li>Tippen Sie auf &quot;Hinzufügen&quot;</li>
          </ol>
        </div>
        <div className="mt-3">
          <Checklist items={[
            "Wenn Sie die App so installiert haben: Öffnen Sie sie vom Startbildschirm — die Browser-Leiste sollte verschwunden sein",
            "Schalten Sie kurz das WLAN aus — es sollte eine verständliche Meldung kommen",
          ]} />
        </div>
      </Section>

      {/* Zeitplan */}
      <div className="mb-6 rounded-xl border bg-white p-5">
        <h3 className="mb-3 text-lg font-semibold text-anthrazit">Wie lange dauert das?</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Ungefähr eine Stunde — aber Sie können jederzeit pausieren und später weitermachen.
        </p>
        <div className="space-y-2 text-sm">
          <TimeRow time="5 Min." label="Konto erstellen" />
          <TimeRow time="20 Min." label="Alleine ausprobieren (Profil, Karte, Hilfe, Marktplatz)" />
          <TimeRow time="20 Min." label="Zu zweit testen (Nachrichten, Benachrichtigungen)" />
          <TimeRow time="10 Min." label="Besondere Funktionen (Notfall-Hinweis, Seniorenmodus)" />
          <TimeRow time="5 Min." label="Datenschutz und allgemeiner Eindruck" />
        </div>
      </div>

      {/* Tipps */}
      <div className="mb-6 rounded-xl border bg-blue-50 p-5 text-sm text-blue-800">
        <h3 className="mb-2 flex items-center gap-2 font-semibold">
          <HelpCircle className="h-4 w-4" />
          Tipps zum Testen
        </h3>
        <ul className="list-inside list-disc space-y-2">
          <li>Nutzen Sie am besten <strong>Safari</strong> (iPhone) oder <strong>Chrome</strong> (Android)</li>
          <li>Wenn etwas nicht klappt — das ist in Ordnung! Genau dafür testen wir</li>
          <li>Machen Sie gerne einen Screenshot, wenn etwas komisch aussieht</li>
          <li>Notieren Sie kurz, was passiert ist und bei welchem Schritt</li>
          <li>Bei Fragen können Sie sich jederzeit bei Thomas melden</li>
        </ul>
      </div>

      {/* Feedback */}
      <div className="mb-6 rounded-xl border-2 border-quartier-green bg-quartier-green/5 p-5">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-quartier-green">
          <MessageCircle className="h-5 w-5" />
          Feedback geben
        </h3>
        <p className="text-sm text-muted-foreground">
          Nach dem Testen würden wir uns sehr über Ihr Feedback freuen!
          Schreiben Sie Thomas einfach eine kurze Nachricht — per WhatsApp, E-Mail oder direkt in der App.
          Jeder Hinweis hilft, Nachbar.io besser zu machen.
        </p>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Vielen Dank, dass Sie sich die Zeit nehmen! 🏡</p>
        <p className="mt-1">Ihr Feedback macht Nachbar.io besser für die ganze Nachbarschaft.</p>
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
