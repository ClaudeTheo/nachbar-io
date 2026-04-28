// Statische FAQ-Daten fuer den KI-Hilfe-Begleiter (Touchpoint 2: Pulse-Dot im AiConsent-Step).
// Founder-approved 2026-04-27. Aenderungen brauchen erneute Abnahme.
export interface KiHelpFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const KI_HELP_FAQ: ReadonlyArray<KiHelpFaqItem> = [
  {
    id: "what",
    question: "Was ist die KI-Hilfe?",
    answer:
      "Eine optionale Funktion, die Ihnen später beim Vorlesen, beim Formulieren von Antworten und bei kleinen Fragen helfen kann. Standardmäßig ausgeschaltet, wird nur aktiv, wenn Sie es ausdrücklich wünschen.",
  },
  {
    id: "later-help",
    question: "Was kann sie später für mich tun?",
    answer:
      "Nachrichten und Hinweise vorlesen, Antworten per Sprache statt per Tippen und beim Formulieren helfen — zum Beispiel: „Kannst du mir diesen Hinweis vorlesen?“ oder „Hilf mir, eine kurze Antwort zu formulieren.“",
  },
  {
    id: "active-now",
    question: "Ist die KI jetzt schon aktiv?",
    answer:
      "Nein. Vor Ihrer Einwilligung passiert nichts. Diese Hilfetexte sind fest geschrieben, keine Live-KI.",
  },
  {
    id: "data",
    question: "Was passiert mit meinen Daten?",
    answer:
      "Vor Ihrer Einwilligung wird nichts an eine KI gesendet. Persönliche KI-Funktionen starten erst, wenn die nötigen Schutzmaßnahmen aktiv sind. Ihre Eingaben sind nicht öffentlich.",
  },
  {
    id: "switch-off",
    question: "Kann ich die KI später wieder ausschalten?",
    answer:
      "Ja, jederzeit in den Einstellungen. Sie können die Stufe wechseln oder die KI-Hilfe ganz ausschalten.",
  },
  {
    id: "levels",
    question: "Was bedeutet Basis, Alltag und Persönlich?",
    answer:
      "Drei Stufen mit unterschiedlicher Tiefe der Hilfe — Basis (App-Hilfe und Vorlesen), Alltag (Formulieren, Verstehen und kleine Fragen), Persönlich (tiefere Hilfe mit zusätzlichen Schutzmaßnahmen, derzeit gesperrt).",
  },
  {
    id: "personal-locked",
    question: "Warum ist Persönlich noch gesperrt?",
    answer:
      "Persönliche KI-Hilfe braucht zusätzliche Schutzmaßnahmen, die noch nicht alle abgeschlossen sind. Sobald die stehen, schalten wir die Stufe frei und informieren Sie.",
  },
];
