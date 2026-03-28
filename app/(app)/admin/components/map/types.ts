// Gemeinsame Typen fuer MapEditor-Subkomponenten

import type { MapHouseData, LampColor, StreetCode } from "@/lib/map-houses";
import type { User, Household, HouseholdMember } from "@/lib/supabase/types";

/** Haushalt mit zugeordneten Mitgliedern */
export interface HouseholdWithMembers extends Household {
  members: (HouseholdMember & { user?: Pick<User, "display_name" | "avatar_url"> })[];
}

/** Drag-State fuer SVG-Haus-Verschiebung */
export interface DragState {
  houseId: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

/** Neues-Haus Formular-State */
export interface NewHouseForm {
  num: string;
  s: StreetCode;
  defaultColor: LampColor;
  x: number;
  y: number;
}

// Re-Exports fuer bequemen Import
export type { MapHouseData, LampColor, StreetCode, User, Household, HouseholdMember };
