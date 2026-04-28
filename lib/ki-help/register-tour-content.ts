import type { Step } from "@/app/(auth)/register/components/types";

export const REGISTER_TOUR_HINTS: Record<Step, string> = {
  entry:
    "Ich begleite Sie Schritt für Schritt. Zuerst wählen Sie, ob Sie mit Einladungscode starten oder Ihr Quartier suchen.",
  invite_code:
    "Der Einladungscode zeigt, dass Sie zum geschlossenen Test gehören. So bleibt der Pilot überschaubar.",
  address:
    "Ihre Adresse hilft, den richtigen Haushalt und das richtige Quartier zu finden. Sie wird nicht öffentlich angezeigt.",
  identity:
    "Name, Geburtsdatum und E-Mail helfen bei Vertrauen, Sicherheit und der eindeutigen Zuordnung im Pilot.",
  pilot_role:
    "Hier wählen Sie, wie Sie teilnehmen: für sich selbst, als Unterstützung für jemanden, als Hilfe im Quartier oder nur testweise.",
  ai_consent:
    "Hier entscheiden Sie in Ruhe, ob die KI-Hilfe aus bleibt, später helfen darf oder erst später gewählt wird.",
  magic_link_sent:
    "Fast geschafft. Mit dem Code aus Ihrer E-Mail bestätigen Sie den Zugang zur QuartierApp.",
};

export function getRegisterTourHint(step: Step) {
  return REGISTER_TOUR_HINTS[step];
}
