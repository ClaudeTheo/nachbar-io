// lib/youth/badges.ts
// Jugend-Modul: Badge-Eligibility Engine
export interface BadgeCondition {
  condition_type: string;
  condition_value: Record<string, number | string>;
}

export interface UserStats {
  total_tasks: number;
  category_counts: Record<string, number>;
  total_points: number;
}

export function checkBadgeEligibility(badge: BadgeCondition, stats: UserStats): boolean {
  const { condition_type, condition_value } = badge;

  switch (condition_type) {
    case 'task_count':
      return stats.total_tasks >= (condition_value.count as number);

    case 'category_count': {
      const cat = condition_value.category as string;
      const count = condition_value.count as number;
      return (stats.category_counts[cat] || 0) >= count;
    }

    case 'points_total':
      return stats.total_points >= (condition_value.points as number);

    case 'manual':
      return false; // Nur manuell vergeben

    default:
      return false;
  }
}
