import {
  Fire, Ambulance, Warning, Drop, Lightning, FirstAid,
  Key, PawPrint, ShoppingCart, Wrench, Question,
  HardHat, Recycle, Confetti, Car, Handshake, Buildings,
  UsersThree, Newspaper, CloudSun,
  Sun, ForkKnife, Moon, MoonStars,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export interface CategoryIconConfig {
  icon: Icon;
  bgColor: string;
  iconColor: string;
}

// Alert-Kategorien (AlertCard, Alert-Erstellung)
export const ALERT_ICON_MAP: Record<string, CategoryIconConfig> = {
  fire:            { icon: Fire,         bgColor: "bg-icon-bg-red",    iconColor: "text-red-600" },
  health_concern:  { icon: Ambulance,    bgColor: "bg-icon-bg-red",    iconColor: "text-red-600" },
  crime:           { icon: Warning,      bgColor: "bg-icon-bg-red",    iconColor: "text-red-600" },
  water_damage:    { icon: Drop,         bgColor: "bg-icon-bg-blue",   iconColor: "text-blue-600" },
  power_outage:    { icon: Lightning,    bgColor: "bg-icon-bg-amber",  iconColor: "text-amber-600" },
  fall:            { icon: FirstAid,     bgColor: "bg-icon-bg-orange", iconColor: "text-orange-600" },
  door_lock:       { icon: Key,          bgColor: "bg-icon-bg-amber",  iconColor: "text-amber-600" },
  pet:             { icon: PawPrint,     bgColor: "bg-icon-bg-green",  iconColor: "text-green-600" },
  shopping:        { icon: ShoppingCart,  bgColor: "bg-icon-bg-blue",   iconColor: "text-blue-600" },
  tech_help:       { icon: Wrench,       bgColor: "bg-icon-bg-blue",   iconColor: "text-blue-600" },
  other:           { icon: Question,     bgColor: "bg-icon-bg-gray",   iconColor: "text-gray-600" },
};

// News-Kategorien (NewsCard)
export const NEWS_ICON_MAP: Record<string, CategoryIconConfig> = {
  infrastructure: { icon: HardHat,    bgColor: "bg-icon-bg-orange", iconColor: "text-orange-600" },
  waste:          { icon: Recycle,     bgColor: "bg-icon-bg-gray",   iconColor: "text-gray-600" },
  events:         { icon: Confetti,    bgColor: "bg-icon-bg-purple", iconColor: "text-purple-600" },
  traffic:        { icon: Car,         bgColor: "bg-icon-bg-blue",   iconColor: "text-blue-600" },
  social:         { icon: Handshake,   bgColor: "bg-icon-bg-green",  iconColor: "text-green-600" },
  administration: { icon: Buildings,   bgColor: "bg-icon-bg-gray",   iconColor: "text-gray-600" },
  clubs:          { icon: UsersThree,  bgColor: "bg-icon-bg-purple", iconColor: "text-purple-600" },
  weather:        { icon: CloudSun,    bgColor: "bg-icon-bg-blue",   iconColor: "text-blue-600" },
  other:          { icon: Newspaper,   bgColor: "bg-icon-bg-gray",   iconColor: "text-gray-600" },
};

// Tageszeit-Begruessung (Dashboard)
export const GREETING_ICON_MAP: Record<string, CategoryIconConfig> = {
  morning:    { icon: Sun,       bgColor: "bg-icon-bg-amber",  iconColor: "text-amber-500" },
  lunch:      { icon: ForkKnife, bgColor: "bg-icon-bg-orange", iconColor: "text-orange-500" },
  afternoon:  { icon: CloudSun,  bgColor: "bg-icon-bg-blue",   iconColor: "text-blue-500" },
  evening:    { icon: Moon,      bgColor: "bg-icon-bg-purple", iconColor: "text-purple-500" },
  night:      { icon: MoonStars, bgColor: "bg-icon-bg-purple", iconColor: "text-purple-500" },
};

// Fallback fuer unbekannte Kategorien
export const FALLBACK_ICON: CategoryIconConfig = {
  icon: Question,
  bgColor: "bg-icon-bg-gray",
  iconColor: "text-gray-600",
};
