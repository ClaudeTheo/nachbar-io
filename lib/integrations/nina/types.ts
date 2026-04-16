export type NinaSeverity =
  | "Minor"
  | "Moderate"
  | "Severe"
  | "Extreme"
  | "Unknown";

export interface NinaArea {
  areaDesc: string;
  geocode?: Array<{ valueName: string; value: string }>;
}

export interface NinaPayloadData {
  headline?: string;
  description?: string;
  instruction?: string;
  category?: string | string[];
  event?: string;
  provider?: string;
  severity?: NinaSeverity;
  urgency?: string;
  msgType?: string;
  transKeys?: Record<string, string>;
  area?: NinaArea[] | NinaArea;
  valid?: boolean;
}

export interface NinaDashboardItem {
  id: string;
  version?: string | number | null;
  startDate?: string;
  expiresDate?: string;
  severity?: NinaSeverity;
  urgency?: string;
  type?: string;
  i18nTitle?: Record<string, string>;
  payload?: {
    version?: string | number;
    type?: string;
    id?: string;
    hash?: string;
    data?: NinaPayloadData;
  };
  sent?: string;
  expires?: string;
}

export interface NinaFetchResult {
  ars: string;
  fetchedAt: Date;
  warnings: NinaDashboardItem[];
}
