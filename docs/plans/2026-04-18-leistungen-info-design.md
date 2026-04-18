# Design — Info-Baustein "Was steht uns zu?" (DE + CH)

**Stand:** 2026-04-18
**Autor:** Thomas + Claude (Session 69)
**Status:** Brainstorming-Design, genehmigt
**Nachfolger-Doc:** `2026-04-18-leistungen-info-plan.md` (Implementation-Plan, siehe writing-plans)

---

## 1. Kernversprechen

Plus-Nutzer sehen auf einer eigenen Seite die 5 wichtigsten Pflege-Sozialleistungen fuer Ihr Land (DE oder CH), mit Betrag, Gesetzesgrundlage, offiziellem Link und Vorlese-Funktion. **Read-only, keine Beratung, keine Speicherung von Gesundheitsdaten.** Admin-Panel steuert Ein-/Ausschaltung pro Quartier via Feature-Flag.

**Zielgruppe:** Plus-Abonnenten (8,90 EUR) in Bad Saeckingen (DE) und — sobald verfuegbar — angrenzende Schweizer Quartiere (Grenzregion BS/BL/AG/SH). Sekundaerziel: attraktives Anzeichen-Argument fuer CH-Pilotpartner.

---

## 2. Architektur-Entscheidungen

| # | Thema | Entscheidung | Begruendung |
|---|---|---|---|
| 1 | Platzierung | Eigene Route `/was-steht-uns-zu`, verlinkt aus `/mein-kreis` | Pflegekontext = Familienkreis, nicht Geo-Info. 4-Kachel-Grundraster bleibt unberuehrt |
| 2 | Gating | Teaser fuer Free, Paywall beim Klick | Legitimer Plus-Hebel, keine Conversion-Verschwendung |
| 3 | Inhaltsumfang | 5 DE + 5 CH Leistungen (Top-Prio) | MVP — ~90 % der Angehoerigen-Fragen abgedeckt, Ausbau trivial |
| 4 | Interaktion | Reine Info-Seite, kein Selbst-Check | DSGVO (Pflegegrad = Art. 9), RDG-Risiko, YAGNI |
| 5a | Content-Pflege | Statisch in TypeScript (`lib/leistungen/content.ts`) | Pflege <= 2x/Jahr, kein Admin-Editor noetig |
| 5b | Vorlesen | TTS-Button (Layer-1-Cache genutzt) | Senior-Zielgruppe, Infrastruktur existiert |
| 6 | Laenderbestimmung | `quarters.country` (Feld existiert) | Null Schema-Change, Fallback DE bei NULL |
| 7 | Kantons-Differenzierung CH | Nur EL-Karte hat Kantons-Schalter fuer 6 Grenz-/Pilot-Kantone (AG, BL, BS, SH, TG, ZH); Rest: Link zu Sozialamt | 26-Matrix unverhaeltnismaessig bei 0 CH-Quartieren |
| 8 | API-Strategie | **Keine Live-APIs** — Content manuell, halbjaehrlich reviewed, jede Angabe mit offizieller Quelle + Gesetzesreferenz + Link | Oeffentliche Sozialversicherungs-APIs existieren praktisch nicht (DE/CH) |

---

## 3. Datenmodell

### 3.1 Content-Typ (statisch)

```ts
// nachbar-io/lib/leistungen/content.ts
export type Country = 'DE' | 'CH';
export type Canton = 'AG' | 'BL' | 'BS' | 'SH' | 'TG' | 'ZH';

export interface Leistung {
  slug: string;               // z.B. 'pflegegrad' (DE) oder 'ahv-betreuungsgutschrift' (CH)
  country: Country;
  title: string;              // "Pflegegrad beantragen"
  shortDescription: string;   // 1 Satz, TTS-Quelle
  longDescription: string;    // 2-3 Saetze
  amount?: string;            // "125 EUR pro Monat"
  legalSource: string;        // "Paragraf 45b SGB XI"
  officialLink: string;       // https-URL zu BMG/GKV/BSV/BAG
  lastReviewed: string;       // ISO-Datum 'YYYY-MM-DD'
  cantonVariants?: Partial<Record<Canton, {
    amount: string;
    note: string;
    officialLink: string;
  }>>;                        // nur fuer CH-EL-Karte relevant
}

export const LEISTUNGEN: Leistung[] = [ /* 10 Eintraege */ ];
```

### 3.2 Feature-Flag (DB)

Neuer Eintrag in existierender `feature_flags`-Tabelle:

- `key = 'leistungen_info'`
- `default_value = false`
- Admin kann pro Quartier toggeln via Super-Admin-Dashboard

**Kein neues Schema, kein neuer Admin-Editor.**

### 3.3 Sozialamt-Map (CH-Kantone 20/26 ohne Eigen-Variante)

```ts
// nachbar-io/lib/leistungen/ch-sozialaemter.ts
export const CH_SOZIALAEMTER: Record<Canton | string, { name: string; url: string; phone?: string }> = {
  AG: { name: 'Sozialdienste Kanton Aargau', url: '...' },
  // ... alle 26 Kantone, aber inhaltlicher Content nur fuer 6
};
```

---

## 4. Die 10 Leistungen (Entwurf, Recherche bei Umsetzung final)

### DE (5)

| Slug | Titel | Betrag | Rechtsgrundlage | Quelle |
|---|---|---|---|---|
| `pflegegrad` | Pflegegrad beantragen | — | Paragraf 14-15 SGB XI | gkv-spitzenverband.de |
| `pflegegeld` | Pflegegeld bei haeuslicher Pflege | 347-990 EUR/Monat (Grad 2-5) | Paragraf 37 SGB XI | bundesgesundheitsministerium.de |
| `entlastungsbetrag` | Entlastungsbetrag | 125 EUR/Monat ab Grad 1 | Paragraf 45b SGB XI | bundesgesundheitsministerium.de |
| `verhinderungspflege` | Verhinderungspflege | bis 1.685 EUR/Jahr | Paragraf 39 SGB XI | bundesgesundheitsministerium.de |
| `pflegezg-10tage` | 10 Tage Pflege-Freistellung | bezahlt (Akutsituation) | Paragraf 2 PflegeZG | bmfsfj.de |

### CH (5, davon 1 mit Kantons-Schalter)

| Slug | Titel | Betrag | Rechtsgrundlage | Quelle |
|---|---|---|---|---|
| `ahv-betreuungsgutschrift` | AHV-Betreuungsgutschrift | Gutschrift 45.360 CHF/Jahr (2025) | Art. 29septies AHVG | ahv-iv.ch |
| `ahv-iv-hilflosenentschaedigung` | Hilflosenentschaedigung | 252-2.016 CHF/Monat | AHVG/IVG | ahv-iv.ch |
| `iv-assistenzbeitrag` | IV-Assistenzbeitrag | 35,30 CHF/Std. | Art. 39 IVV | ahv-iv.ch |
| `or-329g-betreuungsurlaub` | Betreuungsurlaub | 3 Tage/Ereignis, max. 10 Tage/Jahr | Art. 329g OR | admin.ch |
| `el-kubk` **+ Kantons-Schalter** | EL-Krankheits-/Behinderungskosten | **kantonal** | Art. 14 ELG + kant. Vollzug | kantonales Sozialamt |

**Kantons-Schalter fuer `el-kubk`:** Default = Wohnkanton (aus `quarters.state`, falls CH), sonst Auswahl. Fuer AG/BL/BS/SH/TG/ZH konkrete Angaben; fuer Rest „Details regelt Ihr Kanton — [Link zum Sozialamt]".

---

## 5. User-Flow

```
[/mein-kreis]
   Plus-User: Karte "Was steht uns zu?" mit Untertitel "5 wichtige Pflege-Leistungen"
   Free-User: gleiche Karte + Badge "Plus"
      Tap → Paywall-Modal (existiert)

   Tap als Plus-User oder Trial → [/was-steht-uns-zu]
      [ALERT-Banner]
      ⚠ Keine Rechtsberatung. Stand: 18.04.2026.
         Verbindlich ist Ihre Pflegekasse / Ausgleichskasse.

      [TTSButton: "Vorlesen"]

      Wenn Quartier DE: 5 DE-Karten
      Wenn Quartier CH: 5 CH-Karten
         (fuer `el-kubk`: Kantons-Dropdown oder automatisch aus quarters.state)
      Wenn Quartier.country NULL: DE-Fallback

      Pro Karte:
         Titel
         Betrag (wenn vorhanden, fett)
         longDescription
         Rechtsgrundlage-Chip
         "Zur offiziellen Quelle"-Link (oeffnet in neuem Tab)

      Footer:
         "Stand: {lastReviewed}"
         "Hinweis gefunden? [support-email]"
```

**Flag off:** Seite 307 → `/kreis-start`. Karte in `/mein-kreis` nicht gerendert.

---

## 6. Komponenten-Layout (Code)

```
nachbar-io/
  app/(app)/
    was-steht-uns-zu/
      page.tsx                          # Server-Component, laed country via quarter
  lib/leistungen/
    content.ts                          # 10 Leistungen typisiert
    content.test.ts                     # Validation-Tests
    ch-sozialaemter.ts                  # 26 Kantons-Links
    get-country.ts                      # User → Quartier → country (Fallback DE)
    feature-flag.ts                     # Wrapper fuer `leistungen_info` Flag-Check
  components/leistungen/
    LeistungsKarte.tsx                  # Einzelne Karte (Senior-Mode)
    KantonsSchalter.tsx                 # Nur fuer el-kubk (CH)
    Haftungsausschluss.tsx              # Prominenter Disclaimer-Block
  supabase/migrations/
    169_feature_flag_leistungen_info.sql  # Seed Flag-Default=false
```

**Wiederverwendet:**
- `TTSButton` (`@/modules/voice/components/companion/TTSButton`)
- `LargeTitle` (`@/components/ui/LargeTitle`)
- Paywall-Modal (existiert in Plus-Gating anderer Features)
- `care_subscriptions.plan`-Check (`lib/subscription.ts`)
- Super-Admin-Dashboard Feature-Flag-UI (existiert)

---

## 7. Haftungsausschluss (verbindlich)

Prominenter Banner am Seiten-Anfang **und** unter jeder Karte (small print):

> **Keine Rechtsberatung.** Alle Angaben ohne Gewaehr, Stand {lastReviewed}. Betraege und Bedingungen aendern sich jaehrlich. Verbindlich sind allein Ihre **Pflegekasse** (DE) bzw. **Ausgleichskasse / IV-Stelle** (CH) sowie der jeweilige Gesetzeswortlaut.

Begruendung: Schutz gegen § 2 RDG (Rechtsdienstleistungsgesetz) und §§ 6/8 UWG. Reine Information mit offizieller Quelle = unkritisch; personalisierter Rat waere Rechtsdienstleistung.

---

## 8. Tests

### Unit-Tests
- `content.test.ts` — alle 10 Eintraege: valide slugs (unique), `lastReviewed` parsebar, `officialLink` https, 5 pro country.
- `get-country.test.ts` — Quartier DE → 'DE', CH → 'CH', NULL → 'DE' (Fallback), kein Quartier → 'DE'.
- `feature-flag.test.ts` — Flag true/false/missing.

### Integration-Tests (Vitest + RTL)
- Flag off → Route 307, Kreis-Link nicht gerendert.
- Flag on + Plan free → Teaser + Paywall-CTA (kein Content-Leak).
- Flag on + Plan plus + country DE → 5 DE-Karten, kein CH-Content.
- Flag on + Plan plus + country CH + state AG → CH-Karten inkl. EL-Karte mit Aargau-Variante.
- Flag on + country CH + state VD (kein Eigen-Variant) → EL-Karte zeigt Sozialamt-Link.

### Admin-Test
- Dashboard-Toggle schreibt `feature_flags` → naechste Seitenladung wirkt.

**Kein E2E-Playwright** (Phase-1-Tech-Debt bekannt; neue Tests hier waeren Tropfen auf heissen Stein).

---

## 9. Review-Mechanismus

Statt Live-APIs nutzen wir **harte Review-Intervalle**:

- `lastReviewed` pro Karte im Content-File.
- Unit-Test failt, wenn `lastReviewed` > 7 Monate alt (`assertFreshness()` mit Toleranz).
- Kalender-Reminder fuer Thomas: jeweils **15. Januar** (Anpassung Beitraege/Betraege) und **15. Juli** (Midyear-Check).
- Optional Phase 2: Admin-Dashboard-Widget „N Karten > 6 Monate unreviewed".

---

## 10. Out of Scope (Phase 2)

- Selbst-Check-Wizard („Hat Ihr Angehoeriger einen Pflegegrad?")
- Persoenliches Pflege-Profil (Gesundheitsdaten → Verschluesselung)
- Karten 6-15 pro Land (Kurzzeitpflege, Hilfsmittel, Wohnumfeld, Familienpflegezeit, etc.)
- DB-editierbarer Content + Admin-Editor
- Alle 26 CH-Kantone mit Eigen-Varianten
- Live-API-Integration (falls eine verfuegbar wird)
- Frankreich/Oesterreich (Elsass-Grenze, Tirol)

---

## 11. Risiken

| # | Risiko | Mitigation |
|---|---|---|
| 1 | Angaben veralten (Beitragsaenderungen 2027) | Review-Intervall-Test, halbjaehrliche Kalendereintraege |
| 2 | RDG-/UWG-Vorwurf | Prominenter Disclaimer, keine personalisierte Empfehlung, nur offizielle Quellen |
| 3 | CH-Kantonsangaben fuer 6 Kantone falsch | Jede Angabe mit direkter Kantonsseiten-URL verlinken; bei Fehlern schnelle Korrektur moeglich (statisches File) |
| 4 | Plus-Nutzer fuehlen sich durch Paywall „abgezockt" | Teaser-Text ehrlich: „Wir haben recherchiert und vorbereitet — kein Geheimwissen" |
| 5 | Flag-Default true bei CH-Quartieren vergessen | Admin-Checkliste im Onboarding CH-Partner |

---

## 12. Aufwand (grob)

| Paket | Tage |
|---|---|
| 5 DE-Karten recherchieren + Content-File + Types | 1,0 |
| 5 CH-Karten bundesweit recherchieren | 0,75 |
| EL-Karte + 6 Kantons-Varianten + 26-Eintrag-Sozialamt-Map | 0,75 |
| Route + Page + Komponenten + TTS-Integration | 0,5 |
| Feature-Flag-Migration + Admin-Toggle-Hook | 0,25 |
| Tests (Unit + Integration, Ziel ~15 neue) | 0,5 |
| Review-Mechanismus (`assertFreshness` Test + Kalender) | 0,25 |
| **Gesamt (unscharf)** | **~4 Tage** |

---

## 13. Naechste Schritte

1. Design-Doc committen (dieser Commit).
2. `writing-plans`-Skill invoken → Implementation-Plan `2026-04-18-leistungen-info-plan.md` mit Einzel-Tasks, Abhaengigkeiten und TDD-Reihenfolge.
3. Migration-Nummer sichern (naechste freie ist `169`, pruefen vor Erstellung).
4. Recherche-Auftrag fuer Content: Thomas (wenn Zeit) oder eigener Task mit GPT-/WebSearch-Recherche, Quelle pro Angabe verpflichtend.
5. Founder-Go fuer Migration auf Prod (Rote Zone).
