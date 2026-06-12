// Zentrale Pseudonymisierung fuer KI-Payloads.
// Ziel: direkte Kontaktdaten und genaue Adressen nie ungefiltert an Provider
// senden. Das ersetzt keine fachliche Freigabe, ist aber die technische
// Mindestschicht direkt vor Provider-Aufrufen.

import type { AIChatInput } from "@/lib/ai/types";

export interface PseudonymizeResult {
  text: string;
  redactions: number;
}

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const STREET_ADDRESS_PATTERN =
  /\b(?:[\p{L}][\p{L}.'-]*(?:stra(?:sse|\u00dfe)|str\.|weg|allee|gasse|platz|ring|damm|ufer|steig|pfad)|[\p{L}][\p{L}.'-]*(?:\s+[\p{L}][\p{L}.'-]*){0,3}\s+(?:stra(?:sse|\u00dfe)|str\.|weg|allee|gasse|platz|ring|damm|ufer|steig|pfad))\s+\d{1,4}\s?[a-zA-Z]?\b/giu;
const PHONE_PATTERN =
  /(^|[^\w])((?:\+49|0049|0)(?:[\s()./-]*\d){6,})(?!\w)/g;
const POSTAL_CODE_PATTERN = /(^|[^\d])(\d{5})(?!\d)/g;
const NAME_INTRO_PATTERN =
  /\b([Mm]ein\s+Name\s+ist|[Ii]ch\s+hei(?:ss|\u00df)e|[Ii]ch\s+bin)\s+([A-Z\u00c4\u00d6\u00dc][\p{L}'-]+(?:\s+[A-Z\u00c4\u00d6\u00dc][\p{L}'-]+){0,2})/gu;

function redactSimple(
  value: string,
  pattern: RegExp,
  replacement: string,
): PseudonymizeResult {
  let redactions = 0;
  const text = value.replace(pattern, () => {
    redactions += 1;
    return replacement;
  });
  return { text, redactions };
}

export function pseudonymizeAiText(value: string): PseudonymizeResult {
  let text = value;
  let redactions = 0;

  for (const [pattern, replacement] of [
    [EMAIL_PATTERN, "[E-MAIL]"],
    [UUID_PATTERN, "[ID]"],
    [STREET_ADDRESS_PATTERN, "[ADRESSE]"],
  ] as const) {
    const result = redactSimple(text, pattern, replacement);
    text = result.text;
    redactions += result.redactions;
  }

  text = text.replace(PHONE_PATTERN, (_match, prefix: string) => {
    redactions += 1;
    return `${prefix}[TELEFON]`;
  });

  text = text.replace(POSTAL_CODE_PATTERN, (_match, prefix: string) => {
    redactions += 1;
    return `${prefix}[PLZ]`;
  });

  text = text.replace(
    NAME_INTRO_PATTERN,
    (_match, prefix: string): string => {
      redactions += 1;
      return `${prefix} [NAME]`;
    },
  );

  return { text, redactions };
}

export function pseudonymizeAiMessages<
  TMessage extends { role: string; content: string },
>(messages: readonly TMessage[]): TMessage[] {
  return messages.map((message) => ({
    ...message,
    content: pseudonymizeAiText(message.content).text,
  }));
}

export function pseudonymizeAiChatInput(input: AIChatInput): AIChatInput {
  return {
    ...input,
    system: pseudonymizeAiText(input.system).text,
    messages: pseudonymizeAiMessages(input.messages),
  };
}
