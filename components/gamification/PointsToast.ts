// Gamification Toast — zeigt "+X Punkte fuer Y" nach Aktionen
import { toast } from "sonner";
import {
  POINTS_CONFIG,
  ACTION_LABELS,
} from "@/modules/gamification/services/constants";

/** Toast anzeigen: "+10 Punkte fuer Board-Beitrag" */
export function showPointsToast(action: string, points?: number) {
  const label = ACTION_LABELS[action] ?? action;
  const pts = points ?? POINTS_CONFIG[action]?.points ?? 0;
  if (pts <= 0) return;

  toast.success(`+${pts} Punkte für ${label}`, {
    duration: 3000,
  });
}
