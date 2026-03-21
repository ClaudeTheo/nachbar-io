import type { MealType } from '@/lib/supabase/types';

// Berechnet expires_at basierend auf Typ
export function calculateExpiry(type: MealType, mealDate: string, mealTime: string | null): string {
  if (type === 'portion') {
    // Portionen: naechster Tag 00:00
    const d = new Date(mealDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }
  // Einladungen: meal_date + meal_time oder Ende des Tages
  if (mealTime) {
    return new Date(`${mealDate}T${mealTime}:00`).toISOString();
  }
  const d = new Date(mealDate);
  d.setHours(23, 59, 59);
  return d.toISOString();
}

// Berechnet freie Plaetze
export function availableServings(totalServings: number, signupCount: number): number {
  return Math.max(0, totalServings - signupCount);
}

// Ist das Angebot neu? (< 2 Stunden alt)
export function isNewMeal(createdAt: string): boolean {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  return new Date(createdAt).getTime() > twoHoursAgo;
}

// Formatiert Uhrzeit fuer Anzeige
export function formatMealTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  return `${h}:${m} Uhr`;
}
