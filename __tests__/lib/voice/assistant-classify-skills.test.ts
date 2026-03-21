import { parseAssistantResponse } from '@/lib/voice/assistant-classify';
import { describe, it, expect } from 'vitest';

describe('set_help_offers Aktion', () => {
  it('erkennt Skills aus JSON-Response', () => {
    const response = JSON.stringify({
      action: 'set_help_offers',
      params: { skills: ['transport', 'garden'] },
      message: 'Skills gesetzt',
      spokenResponse: 'Ich habe Fahrdienst und Garten für Sie ausgewählt.',
    });
    const result = parseAssistantResponse(response, 'Ich kann Fahrdienst und Gartenarbeit anbieten');
    expect(result.action).toBe('set_help_offers');
    expect(result.params.skills).toContain('transport');
    expect(result.params.skills).toContain('garden');
  });

  it('Fallback bei ungueltigem set_help_offers ohne skills', () => {
    const response = JSON.stringify({
      action: 'set_help_offers',
      params: {},
      message: 'Keine Skills erkannt',
      spokenResponse: 'Ich konnte keine Fähigkeiten erkennen.',
    });
    const result = parseAssistantResponse(response, 'Hallo');
    expect(result.action).toBe('set_help_offers');
    expect(result.params).toBeDefined();
  });
});
