// ModerationService — KI-gestuetzte Inhaltsmoderation
// Kombiniert Wortfilter (Pre-Filter) mit Claude Haiku fuer praezise Bewertung

import Anthropic from '@anthropic-ai/sdk';
import { preFilter } from '@/lib/moderation/word-filter';
import type { ContentForModeration, ModerationResult, ModerationScore } from '@/lib/moderation/types';

/**
 * Moderiert Inhalte in zwei Schritten:
 * 1. Pre-Filter (Wortfilter) — blockiert offensichtliche Verstoesse sofort
 * 2. Claude Haiku — bewertet den Rest mit KI
 * Fallback bei API-Fehler: Vorfilter-Ergebnis verwenden
 */
export async function moderateContent(content: ContentForModeration): Promise<ModerationResult> {
  // Schritt 1: Vorfilter
  const filterResult = preFilter(content.text);

  if (filterResult.blocked) {
    return {
      score: 'red',
      reason: `Blockierter Inhalt erkannt: ${filterResult.matchedPatterns.join(', ')}`,
      confidence: 1.0,
      flaggedCategories: filterResult.matchedPatterns,
    };
  }

  // Schritt 2: KI-Moderation mit Claude Haiku
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Ohne API-Key: Vorfilter-Ergebnis verwenden
    return fallbackResult(filterResult.suspicious, filterResult.matchedPatterns);
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: `Du bist ein Moderationssystem fuer eine deutsche Nachbarschafts-App (QuartierApp).
Bewerte den folgenden Inhalt und antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text drumherum).

Kanal: ${content.channel}
Inhaltstyp: ${content.contentType}

Bewertungskriterien:
- "green": Inhalt ist unbedenklich
- "yellow": Inhalt ist verdaechtig, erfordert manuelle Pruefung
- "red": Inhalt verstoesst klar gegen Richtlinien

JSON-Format:
{"score": "green|yellow|red", "reason": "Begruendung", "confidence": 0.0-1.0, "flaggedCategories": ["kategorie1"]}`,
      messages: [
        {
          role: 'user',
          content: `Bewerte diesen Inhalt:\n\n${content.text}`,
        },
      ],
    });

    // Antwort parsen
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return fallbackResult(filterResult.suspicious, filterResult.matchedPatterns);
    }

    const aiResult = JSON.parse(textBlock.text) as {
      score: ModerationScore;
      reason: string;
      confidence: number;
      flaggedCategories: string[];
    };

    // Wenn Vorfilter verdaechtig + KI sagt green → auf yellow hochstufen
    if (filterResult.suspicious && aiResult.score === 'green') {
      return {
        score: 'yellow',
        reason: `Vorfilter-Warnung: ${filterResult.matchedPatterns.join(', ')}. KI: ${aiResult.reason}`,
        confidence: aiResult.confidence,
        flaggedCategories: [...filterResult.matchedPatterns, ...aiResult.flaggedCategories],
      };
    }

    return aiResult;
  } catch (error) {
    // Fallback bei API-Fehler
    console.error('[moderation] KI-Moderation fehlgeschlagen:', error);
    return fallbackResult(filterResult.suspicious, filterResult.matchedPatterns);
  }
}

/** Fallback-Ergebnis wenn KI nicht verfuegbar */
function fallbackResult(suspicious: boolean, matchedPatterns: string[]): ModerationResult {
  if (suspicious) {
    return {
      score: 'yellow',
      reason: `Vorfilter-Warnung: ${matchedPatterns.join(', ')}`,
      confidence: 0.6,
      flaggedCategories: matchedPatterns,
    };
  }
  return {
    score: 'green',
    reason: 'Keine Auffaelligkeiten erkannt (Vorfilter)',
    confidence: 0.5,
    flaggedCategories: [],
  };
}
