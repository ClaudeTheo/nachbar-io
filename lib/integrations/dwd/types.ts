export type DwdSeverity =
  | "Minor"
  | "Moderate"
  | "Severe"
  | "Extreme"
  | "Unknown";

export interface DwdFeatureCollection {
  type: "FeatureCollection";
  features: DwdWarningFeature[];
  totalFeatures?: number;
  numberMatched?: number;
  numberReturned?: number;
  timeStamp?: string;
}

export interface DwdWarningFeature {
  id?: string;
  type: "Feature";
  properties: DwdWarningProperties;
  geometry?: unknown;
}

export interface DwdWarningProperties {
  AREADESC?: string;
  NAME?: string;
  WARNCELLID?: string | number | null;
  IDENTIFIER: string;
  SENDER?: string;
  SENT?: string;
  STATUS?: string;
  MSGTYPE?: string;
  SOURCE?: string;
  SCOPE?: string;
  CODE?: string;
  LANGUAGE?: string;
  CATEGORY?: string;
  EVENT?: string;
  RESPONSETYPE?: string;
  URGENCY?: string;
  SEVERITY?: DwdSeverity | string;
  CERTAINTY?: string;
  EC_PROFILE?: string;
  EC_LICENSE?: string;
  EC_II?: string;
  EC_GROUP?: string;
  EC_AREA_COLOR?: string;
  EFFECTIVE?: string;
  ONSET?: string;
  EXPIRES?: string;
  SENDERNAME?: string;
  HEADLINE?: string;
  DESCRIPTION?: string;
  INSTRUCTION?: string;
  WEB?: string;
  CONTACT?: string;
  PARAMETERNAME?: string;
  PARAMETERVALUE?: string;
  ALTITUDE?: string | number;
  CEILING?: string | number;
}

export interface DwdFetchResult {
  warncellId: string;
  fetchedAt: Date;
  warnings: DwdWarningFeature[];
}

export interface DwdCapAlert {
  identifier: string;
  sender?: string;
  sent?: string;
  status?: string;
  msgType?: string;
  source?: string;
  scope?: string;
  code?: string | string[];
  info: DwdCapInfo[];
}

export interface DwdCapInfo {
  language?: string;
  category?: string | string[];
  event?: string;
  responseType?: string;
  urgency?: string;
  severity?: DwdSeverity | string;
  certainty?: string;
  eventCode?: DwdCapValuePair[];
  effective?: string;
  onset?: string;
  expires?: string;
  senderName?: string;
  headline?: string;
  description?: string;
  instruction?: string;
  web?: string;
  contact?: string;
  parameter?: DwdCapValuePair[];
  area?: DwdCapArea[];
}

export interface DwdCapArea {
  areaDesc?: string;
  geocode?: DwdCapValuePair[];
}

export interface DwdCapValuePair {
  valueName?: string;
  value?: string;
}
