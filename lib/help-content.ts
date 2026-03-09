// Nachbar.io — Hilfecenter Inhalte
// Strukturiert nach Cognitive Load Theory: max. 5 Eintraege pro Kategorie

export interface HelpItem {
  question: string;
  answer: string;
}

export interface HelpCategory {
  id: string;
  title: string;
  icon: string;
  items: HelpItem[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Erste Schritte",
    icon: "rocket",
    items: [
      {
        question: "Wie registriere ich mich bei Nachbar.io?",
        answer: "Sie benötigen einen Einladungscode Ihres Haushalts. Diesen erhalten Sie per Brief oder von Ihrem Nachbarn. Geben Sie den Code bei der Registrierung ein, um Ihrem Haushalt beizutreten.",
      },
      {
        question: "Was bedeuten die Vertrauensstufen?",
        answer: "Jeder Nutzer hat eine Vertrauensstufe: 'Neu' (nach Registrierung), 'Verifiziert' (Haushalt bestätigt), 'Vertrauenswürdig' (aktives Mitglied) und 'Admin' (Verwaltung). Höhere Stufen schalten mehr Funktionen frei.",
      },
      {
        question: "Kann ich den Seniorenmodus aktivieren?",
        answer: "Ja! Unter Profil finden Sie den Schalter 'Seniorenmodus'. Dieser vergrößert alle Texte und Buttons für bessere Lesbarkeit und vereinfacht die Navigation auf maximal 4 Klicks.",
      },
      {
        question: "Wie ändere ich meinen Anzeigenamen?",
        answer: "Gehen Sie zu Profil → Profil bearbeiten. Dort können Sie Ihren Anzeigenamen ändern. Aus Datenschutzgründen wird Ihre E-Mail-Adresse nicht angezeigt.",
      },
    ],
  },
  {
    id: "map-neighbors",
    title: "Karte & Nachbarn",
    icon: "map",
    items: [
      {
        question: "Was bedeuten die Farben auf der Karte?",
        answer: "Grün = Alles in Ordnung. Rot = Dringend/Wichtig. Gelb = Information/Hinweis. Blau = Bewohner im Urlaub. Die Farben helfen, den Status im Quartier auf einen Blick zu erfassen.",
      },
      {
        question: "Wie verbinde ich mich mit einem Nachbarn?",
        answer: "Klicken Sie auf ein Haus auf der Quartierskarte. Im Info-Panel sehen Sie die Bewohner. Klicken Sie auf 'Verbinden', um eine Anfrage zu senden. Sobald der Nachbar annimmt, können Sie private Nachrichten austauschen.",
      },
      {
        question: "Was ist der Urlaub-Modus?",
        answer: "Unter Profil → Urlaub-Modus können Sie angeben, wann Sie verreisen. Ihr Haus wird dann blau auf der Karte markiert. So wissen Ihre Nachbarn, dass sie ein Auge auf Ihr Zuhause werfen sollten.",
      },
      {
        question: "Wie kann ich meine Position auf der Karte anpassen?",
        answer: "Unter Profil → Kartenposition können Sie Ihren Haus-Punkt auf der Karte verschieben, falls er nicht exakt stimmt. Ziehen Sie den Punkt einfach an die richtige Stelle.",
      },
      {
        question: "Warum sehe ich bei einem Haus 'Noch keine Bewohner registriert'?",
        answer: "Das bedeutet, dass sich noch niemand aus diesem Haushalt bei Nachbar.io angemeldet hat. Sobald Bewohner sich mit ihrem Einladungscode registrieren, werden sie dort angezeigt.",
      },
    ],
  },
  {
    id: "messages",
    title: "Nachrichten",
    icon: "message",
    items: [
      {
        question: "Wie starte ich eine Konversation?",
        answer: "Verbinden Sie sich zuerst mit einem Nachbarn über die Quartierskarte. Nach Annahme der Anfrage wird automatisch ein Chat erstellt. Sie finden alle Nachrichten unter dem Nachrichten-Tab.",
      },
      {
        question: "Können andere meine Nachrichten lesen?",
        answer: "Nein. Nachrichten sind privat zwischen Ihnen und Ihrem Gesprächspartner. Niemand sonst hat Zugriff — auch kein Administrator.",
      },
      {
        question: "Was bedeutet die Lesebestätigung?",
        answer: "Wenn unter Ihrer Nachricht 'Gelesen' steht, hat der Empfänger die Nachricht geöffnet. Dies hilft einzuschätzen, ob Ihre Nachricht angekommen ist.",
      },
      {
        question: "Wie lehne ich eine Verbindungsanfrage ab?",
        answer: "Auf der Nachrichten-Seite sehen Sie offene Anfragen ganz oben. Klicken Sie auf das X-Symbol, um eine Anfrage abzulehnen. Der Anfragende wird nicht benachrichtigt.",
      },
    ],
  },
  {
    id: "emergency",
    title: "Notfall & Hilfe",
    icon: "alert",
    items: [
      {
        question: "Was tue ich bei einem Notfall?",
        answer: "Bei einem echten Notfall (Feuer, medizinischer Notfall, Verbrechen) IMMER zuerst 112 oder 110 anrufen! Nachbar.io zeigt Ihnen automatisch die Notrufnummern an, ersetzt aber NICHT den Rettungsdienst.",
      },
      {
        question: "Was ist ein Nachbarschafts-Alert?",
        answer: "Ein Alert informiert Ihre Nachbarn über wichtige Ereignisse — von Wasserrohrbruch über Stromausfall bis zu verdächtigen Beobachtungen. Nutzen Sie Alerts verantwortungsvoll.",
      },
      {
        question: "Wie biete ich Hilfe an?",
        answer: "Unter Hilfe → Neues Angebot können Sie Hilfe anbieten (z.B. Einkaufshilfe, technische Unterstützung). Nachbarn, die Hilfe suchen, können sich dann direkt bei Ihnen melden.",
      },
      {
        question: "Was passiert, wenn ich auf einen Alert reagiere?",
        answer: "Klicken Sie auf 'Ich helfe' bei einem offenen Alert. Der Ersteller sieht, dass Hilfe unterwegs ist. Sie können auch eine kurze Nachricht hinterlassen.",
      },
    ],
  },
  {
    id: "profile",
    title: "Mein Profil",
    icon: "user",
    items: [
      {
        question: "Was ist das Reputationssystem?",
        answer: "Sie sammeln Punkte durch Helfen, Teilen und Engagement im Quartier. Es gibt 5 Stufen von 'Helfer' bis 'Diamant-Helfer'. Die Reputation zeigt, wie aktiv Sie in der Nachbarschaft sind.",
      },
      {
        question: "Was sind Fähigkeiten?",
        answer: "Unter Profil → Fähigkeiten können Sie angeben, wobei Sie Nachbarn helfen können (z.B. IT-Hilfe, Gartenarbeit). Öffentliche Fähigkeiten erscheinen im Experten-Verzeichnis.",
      },
      {
        question: "Wie lösche ich mein Konto?",
        answer: "Kontaktieren Sie den Administrator Ihres Quartiers. Gemäß DSGVO werden alle Ihre Daten vollständig und unwiderruflich gelöscht.",
      },
      {
        question: "Werden meine Daten geschützt?",
        answer: "Ja. Nachbar.io speichert nur die nötigsten Daten auf Servern in der EU (Frankfurt). Ihre E-Mail wird verschlüsselt gespeichert. Nur verifizierte Nachbarn können Quartiersdaten sehen.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Sicherheit & Datenschutz",
    icon: "shield",
    items: [
      {
        question: "Wer kann meine Daten sehen?",
        answer: "Nur verifizierte Mitglieder Ihres Quartiers sehen Ihren Anzeigenamen und Ihre Aktivitäten. Ihre E-Mail-Adresse und persönlichen Daten sind für andere Nutzer nicht einsehbar.",
      },
      {
        question: "Wo werden meine Daten gespeichert?",
        answer: "Alle Daten werden auf Servern in Frankfurt am Main (EU) gespeichert. Die Datenverarbeitung erfolgt gemäß DSGVO. Es findet kein Datentransfer in Drittländer statt.",
      },
      {
        question: "Was ist der Einladungscode?",
        answer: "Der Einladungscode stellt sicher, dass nur tatsächliche Bewohner Ihres Quartiers Zugang erhalten. Pro Haushalt gibt es einen individuellen Code, der per Brief verteilt wird.",
      },
      {
        question: "Kann der Admin meine Nachrichten lesen?",
        answer: "Nein. Direktnachrichten zwischen Nachbarn sind privat und durch Zugriffsrichtlinien (Row Level Security) geschützt. Auch Administratoren haben keinen Zugriff auf Ihre Nachrichten.",
      },
    ],
  },
];
