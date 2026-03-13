// lib/quarters/types.ts
// Typen fuer Multi-Quartier-System

export type UserRole = 'super_admin' | 'quarter_admin' | 'user';
export type QuarterStatus = 'draft' | 'active' | 'archived';

export interface Quarter {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  country: string | null;
  description: string | null;
  contact_email: string | null;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  bounds_sw_lat: number;
  bounds_sw_lng: number;
  bounds_ne_lat: number;
  bounds_ne_lng: number;
  map_config: MapConfig;
  settings: QuarterSettings;
  max_households: number;
  status: QuarterStatus;
  invite_prefix: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MapConfig {
  type: 'svg' | 'leaflet';
  viewBox?: string;
  backgroundImage?: string;
  houses?: MapHouseConfig[];
  tileUrl?: string;
}

export interface MapHouseConfig {
  id: string;
  x: number;
  y: number;
  label: string;
  street: string;
  houseNumber: string;
}

export interface QuarterSettings {
  allowSelfRegistration?: boolean;
  requireVerification?: boolean;
  enableCareModule?: boolean;
  enableMarketplace?: boolean;
  enableEvents?: boolean;
  enablePolls?: boolean;
  emergencyBannerEnabled?: boolean;
  maxMembersPerHousehold?: number;
  defaultLanguage?: string;
}

export interface QuarterAdmin {
  id: string;
  quarter_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
  user?: {
    display_name: string;
    email_hash: string;
  };
}

export interface QuarterWithStats extends Quarter {
  stats: {
    houseCount: number;
    householdCount: number;
    residentCount: number;
    activeAlerts: number;
    activePosts: number;
  };
}
