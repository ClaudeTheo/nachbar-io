export interface UbaStationsResponse {
  request?: {
    lang?: string;
    recent?: boolean;
    index?: string;
  };
  indices?: string[];
  data?: Record<string, UbaStationRow>;
}

export type UbaStationRow = Array<string | number | null>;

export interface UbaStation {
  id: string;
  code: string;
  name: string;
  city: string | null;
  activeFrom: string | null;
  activeTo: string | null;
  longitude: number;
  latitude: number;
  networkCode: string | null;
}

export interface UbaAirQualityResponse {
  request?: {
    station?: string;
    date_from?: string;
    date_to?: string;
    time_from?: string;
    time_to?: string;
    lang?: string;
    recent?: boolean;
    index?: string;
    datetime_from?: string;
    datetime_to?: string;
  };
  data?: Record<string, Record<string, UbaAirQualityEntry>>;
  indices?: unknown;
  count?: number;
}

export type UbaAirQualityEntry = [
  string,
  number,
  number,
  ...UbaAirQualityComponent[],
];

export type UbaAirQualityComponent = [number, number, number, string];

export interface UbaComponentReading {
  componentId: number;
  code: string;
  label: string;
  unit: string;
  value: number;
  rawIndex: number;
  lqi: number | null;
  chartValue: string | null;
}

export interface UbaMeasurement {
  station: UbaStation;
  stationId: string;
  startedAt: string;
  endedAt: string;
  rawLqi: number;
  lqi: number | null;
  dataIncomplete: boolean;
  components: UbaComponentReading[];
}
