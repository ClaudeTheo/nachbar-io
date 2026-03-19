// lib/youth/points.ts
// Jugend-Modul: Punkte-Berechnung fuer Aufgaben
const BASE_REWARD = 20;
const TECHNIK_BONUS = 10;
const DURATION_FACTOR = 1 / 3; // 1 Punkt pro 3 Minuten
const MAX_REWARD = 200;

export function calculateTaskReward(category: string, estimatedMinutes: number): number {
  let reward = BASE_REWARD;

  // Kategorie-Bonus
  if (category === 'technik') reward += TECHNIK_BONUS;

  // Dauer-Bonus (ab 30 Min): 20 Punkte pro 30 Minuten extra
  if (estimatedMinutes > 30) {
    const extraBlocks = Math.floor((estimatedMinutes - 30) / 30);
    reward += extraBlocks * 20;
  }

  return Math.min(reward, MAX_REWARD);
}
