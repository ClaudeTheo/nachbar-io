// ÖPNV-Haltestellen fuer Bad Säckingen (EFA-BW IDs)

export interface OepnvStopConfig {
  id: string;
  name: string;
}

export const OEPNV_STOPS_BAD_SAECKINGEN: OepnvStopConfig[] = [
  { id: "8506566", name: "Bad Säckingen Bahnhof" },
];

export const EFA_BW_BASE_URL = "https://www.efa-bw.de/nvbw/XSLT_DM_REQUEST";

export const EFA_BW_DEPARTURE_URL =
  "https://www.efa-bw.de/nvbw/XSLT_DM_REQUEST?language=de&type_dm=stop&name_dm=8506566";
