"use client";

import { Smartphone, KeyRound, UserPlus, Home, CircleHelp, Phone } from "lucide-react";

export default function OnboardingAnleitungPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:px-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-anthrazit print:text-4xl">
          Willkommen bei QuartierApp
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Ihre digitale Nachbarschaft — einfach erklärt
        </p>
      </div>

      {/* Was ist Nachbar.io */}
      <div className="mb-6 rounded-xl border-2 border-quartier-green bg-quartier-green/5 p-5 print:border print:bg-white">
        <h2 className="mb-2 text-xl font-semibold text-quartier-green">
          Was ist QuartierApp?
        </h2>
        <p className="text-base leading-relaxed text-gray-700">
          QuartierApp ist eine Internetseite speziell für Ihre Nachbarschaft.
          Sie funktioniert wie eine App auf Ihrem Handy — direkt im Internet-Browser.
          Hier können Sie Nachbarn kennenlernen, Hilfe anbieten oder suchen,
          und immer wissen, was in der Nachbarschaft los ist.
        </p>
      </div>

      {/* 3 Schritte */}
      <h2 className="mb-4 text-xl font-semibold text-anthrazit">
        So melden Sie sich an — in 3 Schritten
      </h2>

      <Step number={1} icon={<KeyRound className="h-5 w-5" />} title="Einladungscode eingeben">
        <ol className="list-inside list-decimal space-y-3 text-base">
          <li>
            Öffnen Sie im Browser: <strong>nachbar-io.vercel.app</strong>
          </li>
          <li>
            Tippen Sie auf &quot;Registrieren&quot;
          </li>
          <li>
            Geben Sie Ihren <strong>Einladungscode</strong> ein (steht auf Ihrem persönlichen Zettel)
          </li>
        </ol>
      </Step>

      <Step number={2} icon={<UserPlus className="h-5 w-5" />} title="Konto erstellen">
        <ol className="list-inside list-decimal space-y-3 text-base">
          <li>
            Geben Sie Ihren <strong>Namen</strong> ein (z.B. nur Vorname reicht)
          </li>
          <li>
            Geben Sie Ihre <strong>E-Mail-Adresse</strong> ein
          </li>
          <li>
            Sie erhalten eine E-Mail mit einem <strong>Bestätigungslink</strong> — tippen Sie darauf
          </li>
          <li>
            Fertig! Sie sind angemeldet.
          </li>
        </ol>
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 print:border print:border-amber-200">
          <strong>Hinweis:</strong> Falls die E-Mail nicht kommt, schauen Sie bitte im Spam-Ordner nach.
        </div>
      </Step>

      <Step number={3} icon={<Home className="h-5 w-5" />} title="Nachbarschaft entdecken">
        <p className="mb-3 text-base">
          Nach der Anmeldung können Sie sofort loslegen:
        </p>
        <ul className="list-inside list-disc space-y-2 text-base">
          <li><strong>Startseite</strong> — Neuigkeiten aus der Nachbarschaft</li>
          <li><strong>Hilfe</strong> — Hilfe anbieten oder suchen</li>
          <li><strong>Karte</strong> — Unsere Nachbarschaft auf der Karte</li>
          <li><strong>Marktplatz</strong> — Verschenken, Verleihen, Suchen</li>
          <li><strong>Profil</strong> — Ihre Einstellungen und Benachrichtigungen</li>
        </ul>
      </Step>

      {/* PWA Installation */}
      <div className="mb-6 rounded-xl border bg-blue-50 p-5 print:bg-white print:border-blue-200">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-blue-900">
          <Smartphone className="h-5 w-5" />
          App auf dem Startbildschirm (empfohlen)
        </h2>
        <p className="mb-3 text-sm text-blue-800">
          Sie können QuartierApp wie eine richtige App auf Ihren Startbildschirm legen.
          Dann müssen Sie nicht jedes Mal die Adresse eintippen.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold text-sm text-blue-900">iPhone (Safari):</p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-blue-800">
              <li>Unten auf das Teilen-Symbol tippen</li>
              <li>&quot;Zum Home-Bildschirm&quot; wählen</li>
              <li>&quot;Hinzufügen&quot; tippen</li>
            </ol>
          </div>
          <div>
            <p className="mb-1 font-semibold text-sm text-blue-900">Android (Chrome):</p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-blue-800">
              <li>Oben rechts auf die drei Punkte tippen</li>
              <li>&quot;Zum Startbildschirm hinzufügen&quot;</li>
              <li>&quot;Hinzufügen&quot; tippen</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Kontakt */}
      <div className="mb-6 rounded-xl border-2 border-quartier-green bg-quartier-green/5 p-5 print:border print:bg-white">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-quartier-green">
          <Phone className="h-5 w-5" />
          Fragen? Wir helfen gerne!
        </h2>
        <p className="text-base text-gray-700">
          Bei Fragen oder Problemen melden Sie sich einfach bei Thomas:
        </p>
        <p className="mt-2 text-base font-medium">
          E-Mail: <strong>thomasth@gmx.de</strong>
        </p>
      </div>

      {/* Seniorenmodus Hinweis */}
      <div className="mb-6 rounded-xl border bg-gray-50 p-5 print:bg-white">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-anthrazit">
          <CircleHelp className="h-5 w-5 text-quartier-green" />
          Tipp: Seniorenmodus
        </h2>
        <p className="text-base text-gray-700">
          Unter <strong>Profil → Einstellungen</strong> können Sie den
          <strong> Seniorenmodus</strong> einschalten. Dann wird alles größer
          und leichter zu lesen — ideal für Tablets und wenn Sie eine größere Schrift bevorzugen.
        </p>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground print:mt-8">
        <p>QuartierApp — Ihre digitale Nachbarschaft</p>
        <p className="mt-1">nachbar.io</p>
      </div>
    </div>
  );
}

function Step({ number, icon, title, children }: {
  number: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 rounded-xl border bg-white p-5 print:break-inside-avoid">
      <h3 className="mb-3 flex items-center gap-3 text-lg font-semibold text-anthrazit">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-quartier-green text-white text-sm font-bold">
          {number}
        </span>
        <span className="text-quartier-green">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}
