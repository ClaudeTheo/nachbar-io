// lib/care/escalation.test.ts
// Nachbar.io — Eskalationslogik Tests

import { describe, it, expect } from 'vitest';
import { shouldEscalate, getNextEscalationLevel } from './escalation';
import { DEFAULT_ESCALATION_CONFIG } from './constants';

describe('shouldEscalate', () => {
  it('returns true when level 1 alert exceeds level_2 timeout', () => {
    const createdAt = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    const result = shouldEscalate(1, createdAt, [], DEFAULT_ESCALATION_CONFIG);
    expect(result).toBe(true);
  });

  it('returns false when level 1 alert is within timeout', () => {
    const createdAt = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const result = shouldEscalate(1, createdAt, [], DEFAULT_ESCALATION_CONFIG);
    expect(result).toBe(false);
  });

  it('returns true when level 2 uses escalated_at timestamp', () => {
    const createdAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const escalatedAt = [new Date(Date.now() - 16 * 60 * 1000).toISOString()];
    const result = shouldEscalate(2, createdAt, escalatedAt, DEFAULT_ESCALATION_CONFIG);
    expect(result).toBe(true);
  });

  it('returns false for level 4 (max level)', () => {
    const createdAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = shouldEscalate(4, createdAt, [], DEFAULT_ESCALATION_CONFIG);
    expect(result).toBe(false);
  });
});

describe('getNextEscalationLevel', () => {
  it('returns level + 1 for levels 1-3', () => {
    expect(getNextEscalationLevel(1)).toBe(2);
    expect(getNextEscalationLevel(2)).toBe(3);
    expect(getNextEscalationLevel(3)).toBe(4);
  });

  it('returns null for level 4', () => {
    expect(getNextEscalationLevel(4)).toBeNull();
  });
});
