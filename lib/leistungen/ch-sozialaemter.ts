// Zentrale Sozialaemter / Sozialdienste der 26 Schweizer Kantone.
// Quelle: kantonale Behoerden-Portale (Stand 2026-04-18).
// Genutzt fuer "Anderer Kanton"-Fallback im EL-KuBK-Kantonsschalter.
// URL-Update-Regel: Bei HTTP-Redirect auf neue Domain hier direkt anpassen,
// kein Code-Change noetig. Pflicht-Review halbjaehrlich (siehe freshness-Test).

export interface Sozialamt {
  name: string;
  url: string;
  phone?: string;
}

export const CH_SOZIALAEMTER: Record<string, Sozialamt> = {
  AG: {
    name: "Departement Gesundheit und Soziales Aargau",
    url: "https://www.ag.ch/de/verwaltung/dgs",
  },
  AI: {
    name: "Amt fuer Soziales Appenzell Innerrhoden",
    url: "https://www.ai.ch/verwaltung/gesundheits-und-sozialdepartement/sozialamt",
  },
  AR: {
    name: "Amt fuer Soziales Appenzell Ausserrhoden",
    url: "https://www.ar.ch/verwaltung/departement-gesundheit-und-soziales/amt-fuer-soziales",
  },
  BE: {
    name: "Gesundheits-, Sozial- und Integrationsdirektion Bern",
    url: "https://www.gsi.be.ch",
  },
  BL: {
    name: "Kantonales Sozialamt Basel-Landschaft",
    url: "https://www.baselland.ch/politik-und-behorden/direktionen/finanz-und-kirchendirektion/sozialamt",
  },
  BS: {
    name: "Amt fuer Sozialbeitraege Basel-Stadt",
    url: "https://www.asb.bs.ch",
  },
  FR: {
    name: "Kantonales Sozialamt Freiburg",
    url: "https://www.fr.ch/de/gsd/ksa",
  },
  GE: {
    name: "Service des prestations complementaires Geneve",
    url: "https://www.ge.ch/organisation/service-prestations-complementaires",
  },
  GL: {
    name: "Abteilung Soziales Glarus",
    url: "https://www.gl.ch/verwaltung/volkswirtschaft-und-inneres/soziales.html/979",
  },
  GR: {
    name: "Sozialamt Graubuenden",
    url: "https://www.gr.ch/DE/institutionen/verwaltung/dvs/soa/home/Seiten/Sozialamt.aspx",
  },
  JU: {
    name: "Service de l\u2019action sociale Jura",
    url: "https://www.jura.ch/DIN/SAS.html",
  },
  LU: {
    name: "Dienststelle Soziales und Gesellschaft Luzern",
    url: "https://disg.lu.ch",
  },
  NE: {
    name: "Service de l\u2019action sociale Neuchatel",
    url: "https://www.ne.ch/autorites/DECS/SASO/Pages/accueil.aspx",
  },
  NW: {
    name: "Sozialamt Nidwalden",
    url: "https://www.nw.ch/sozialamt",
  },
  OW: {
    name: "Amt fuer Gesundheit und Soziales Obwalden",
    url: "https://www.ow.ch/aemter/244",
  },
  SG: {
    name: "Kantonales Sozialamt St. Gallen",
    url: "https://www.sg.ch/gesundheit-soziales/soziales.html",
  },
  SH: {
    name: "Kantonales Sozialamt Schaffhausen",
    url: "https://sh.ch/CMS/Webseite/Kanton-Schaffhausen/Beh-rde/Verwaltung/Departement-des-Innern/Sozialamt-2795-DE.html",
  },
  SO: {
    name: "Amt fuer Gesellschaft und Soziales Solothurn",
    url: "https://so.ch/verwaltung/departement-des-innern/amt-fuer-gesellschaft-und-soziales/",
  },
  SZ: {
    name: "Amt fuer Gesundheit und Soziales Schwyz",
    url: "https://www.sz.ch/behoerden/verwaltung/departement-des-innern/amt-fuer-gesundheit-und-soziales.html/8756-8758-8802-9316-9317",
  },
  TG: {
    name: "Generalsekretariat DFS / Sozialamt Thurgau",
    url: "https://sozialamt.tg.ch",
  },
  TI: {
    name: "Divisione dell\u2019azione sociale e delle famiglie Ticino",
    url: "https://www4.ti.ch/dss/dasf/ufaf/ufficio",
  },
  UR: {
    name: "Amt fuer Soziales Uri",
    url: "https://www.ur.ch/dienstleistungen?dienst_id=3731",
  },
  VD: {
    name: "Direction generale de la cohesion sociale Vaud",
    url: "https://www.vd.ch/themes/social",
  },
  VS: {
    name: "Dienststelle fuer Sozialwesen Wallis",
    url: "https://www.vs.ch/de/web/sas",
  },
  ZG: {
    name: "Direktion des Innern / Amt fuer Sozialhilfe Zug",
    url: "https://zg.ch/sozialamt",
  },
  ZH: {
    name: "Kantonales Sozialamt Zuerich",
    url: "https://www.zh.ch/de/soziales.html",
  },
};
