import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

// Welle SP1-2 — Wording-Guard.
// Spiele sind KEIN Medizinprodukt und duerfen nicht als Gedaechtnistraining/
// Therapie/Praevention beworben werden (MDR-/UWG-Risiko, siehe
// docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md, Abschnitt "Spiele & Aktivierung").
// Dieser Test liest alle Produktiv-Quellen unter modules/spiele/ +
// app/(senior)/raetsel/ und schlaegt fehl, sobald ein Bann-Begriff eincheckt.

// Deckt die "Nicht verwenden"-Liste aus docs/LEGAL_MARKETING_WORDING_GUARDRAILS.md
// (Abschnitt "Spiele & Aktivierung") ab: Gedaechtnistraining/Gehirnjogging/
// kognitiv/Therapie/Prophylaxe/geistig fit/Demenz sowie die Wirk-Claims
// "foerdert ... Konzentration/Reaktion", "verlangsamt Abbau", "geistige Fitness",
// "wissenschaftlich belegt". Scope = nur neues Spiele-/Raetsel-Quellverzeichnis
// (kein Fremdcode) -> Bann-Begriffe loesen bewusst einen Rephrase-Zwang aus.
const BANNED =
  /gedächtnistraining|gehirnjogging|kognitiv|therap|prophylaxe|geistig fit|geistige|gedächtnis|demenz|hirnleistung|konzentration|reaktion|abbau|wissenschaftlich/i;

const SCAN_DIRS = [
  join(process.cwd(), "modules", "spiele"),
  join(process.cwd(), "app", "(senior)", "raetsel"),
  // SP2-2: „Erinnerung der Woche"-Seite mit abdecken.
  join(process.cwd(), "app", "(senior)", "erinnerung"),
];

// SP2-2: Einzeldateien ausserhalb der Scan-Verzeichnisse, die zum Spiele-/
// Erinnerungs-Wording gehoeren (die Komponente lebt im care-Modul).
const EXTRA_FILES = [
  join(
    process.cwd(),
    "modules",
    "care",
    "components",
    "senior",
    "ErinnerungDerWoche.tsx",
  ),
].filter((f) => existsSync(f));

function collectSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // Test-Dateien selbst NICHT scannen (sonst matcht der Guard seine eigene
    // Bann-Liste). Es geht nur um Produktiv-Quellen.
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      out.push(...collectSourceFiles(join(dir, entry.name)));
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.(test|spec)\./.test(entry.name)
    ) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

describe("Spiele Wording-Guard (SP1-2)", () => {
  const files = [...SCAN_DIRS.flatMap(collectSourceFiles), ...EXTRA_FILES];

  it("scannt tatsaechlich Produktiv-Quellen (Guard ist kein No-Op)", () => {
    // Mindestens der Tagesraetsel-Service muss gefunden werden, sonst greift
    // der Walker nicht und der Guard waere wertlos.
    expect(files.some((f) => f.endsWith("tagesraetsel.service.ts"))).toBe(true);
  });

  it("enthaelt keine Medizinprodukt-/Therapie-Wording-Begriffe", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      const match = content.match(BANNED);
      if (match) offenders.push(`${file}: "${match[0]}"`);
    }
    expect(offenders).toEqual([]);
  });
});
