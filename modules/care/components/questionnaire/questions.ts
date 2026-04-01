// KI-Fragebogen: 15 Fragen fuer Senior Memory Layer
// Jede Antwort wird als user_memory_fact gespeichert

export type QuestionInputType = "text" | "select" | "textarea";

export interface QuestionDefinition {
  id: number;
  label: string;
  placeholder: string;
  memory_category: string;
  memory_key: string;
  consent_level: "memory_basis";
  input_type: QuestionInputType;
  options?: string[];
}

export const QUESTIONNAIRE_QUESTIONS: QuestionDefinition[] = [
  {
    id: 1,
    label: "Wie moechten Sie angesprochen werden?",
    placeholder: "z.B. Frau Mueller, Oma Ingrid, Herr Schmidt...",
    memory_category: "preferences",
    memory_key: "preferred_name",
    consent_level: "memory_basis",
    input_type: "text",
  },
  {
    id: 2,
    label: "Was ist Ihr Lieblingsessen?",
    placeholder: "z.B. Kartoffelsuppe, Apfelkuchen...",
    memory_category: "preferences",
    memory_key: "favorite_food",
    consent_level: "memory_basis",
    input_type: "text",
  },
  {
    id: 3,
    label: "Haben Sie Haustiere?",
    placeholder: "z.B. Katze Mimi, Hund Bruno...",
    memory_category: "household",
    memory_key: "pets",
    consent_level: "memory_basis",
    input_type: "text",
  },
  {
    id: 4,
    label: "Welche Hobbys haben Sie?",
    placeholder: "z.B. Stricken, Gartenarbeit, Lesen...",
    memory_category: "interests",
    memory_key: "hobbies",
    consent_level: "memory_basis",
    input_type: "textarea",
  },
  {
    id: 5,
    label: "Haben Sie Lieblingsmusik oder -sendungen?",
    placeholder: "z.B. Volksmusik, Tatort, Klassik...",
    memory_category: "interests",
    memory_key: "favorite_media",
    consent_level: "memory_basis",
    input_type: "text",
  },
  {
    id: 6,
    label: "Was ist Ihnen im Alltag besonders wichtig?",
    placeholder: "z.B. Selbststaendigkeit, Familie, frische Luft...",
    memory_category: "values",
    memory_key: "daily_values",
    consent_level: "memory_basis",
    input_type: "textarea",
  },
  {
    id: 7,
    label: "Gibt es Dinge, die Sie gar nicht moegen?",
    placeholder: "z.B. Laerm, frueh aufstehen, bestimmte Speisen...",
    memory_category: "preferences",
    memory_key: "dislikes",
    consent_level: "memory_basis",
    input_type: "textarea",
  },
  {
    id: 8,
    label: "Wie sieht ein guter Tag fuer Sie aus?",
    placeholder: "Beschreiben Sie einen schoenen Tag...",
    memory_category: "daily_routine",
    memory_key: "good_day",
    consent_level: "memory_basis",
    input_type: "textarea",
  },
  {
    id: 9,
    label: "Haben Sie Kinder oder Enkel?",
    placeholder: "z.B. 2 Kinder, 4 Enkel...",
    memory_category: "family",
    memory_key: "children_grandchildren",
    consent_level: "memory_basis",
    input_type: "text",
  },
  {
    id: 10,
    label: "Wen rufen Sie bei Problemen zuerst an?",
    placeholder: "z.B. Tochter Maria, Nachbar Herr Bauer...",
    memory_category: "support_network",
    memory_key: "first_contact",
    consent_level: "memory_basis",
    input_type: "text",
  },
  {
    id: 11,
    label: "Wie kommen Sie normalerweise zum Arzt?",
    placeholder: "Bitte waehlen Sie aus...",
    memory_category: "mobility",
    memory_key: "transport_to_doctor",
    consent_level: "memory_basis",
    input_type: "select",
    options: ["Selbst", "Angehoerige", "Taxi", "Fahrdienst"],
  },
  {
    id: 12,
    label: "Nehmen Sie regelmaessig Medikamente?",
    placeholder: "Bitte waehlen Sie aus...",
    memory_category: "health",
    memory_key: "takes_medication",
    consent_level: "memory_basis",
    input_type: "select",
    options: ["Ja", "Nein"],
  },
  {
    id: 13,
    label: "Brauchen Sie Hilfe im Haushalt?",
    placeholder: "Bitte waehlen Sie aus...",
    memory_category: "care_needs",
    memory_key: "household_help",
    consent_level: "memory_basis",
    input_type: "select",
    options: ["Nein", "Manchmal", "Regelmaessig"],
  },
  {
    id: 14,
    label: "Fuehlen Sie sich manchmal einsam?",
    placeholder: "Bitte waehlen Sie aus...",
    memory_category: "wellbeing",
    memory_key: "loneliness",
    consent_level: "memory_basis",
    input_type: "select",
    options: ["Nie", "Selten", "Manchmal", "Oft"],
  },
  {
    id: 15,
    label: "Was wuenschen Sie sich von Ihren Nachbarn?",
    placeholder: "z.B. Gemeinsame Spaziergaenge, Hilfe beim Einkaufen...",
    memory_category: "community",
    memory_key: "neighbor_wishes",
    consent_level: "memory_basis",
    input_type: "textarea",
  },
];
