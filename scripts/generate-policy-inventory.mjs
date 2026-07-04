// scripts/generate-policy-inventory.mjs
// Nachbar.io — Generiert ein diffbares Inventar der EFFEKTIVEN Sicherheits-Objekte
// (RLS-Policies, Trigger, Tabellen-Grants) aus dem LOKALEN Supabase-Stack.
// Hintergrund (R2, Architektur-Review 2026-07-04): 648x CREATE POLICY verteilt
// ueber 198 Migrationen — ohne Inventar ist jedes Audit Archaeologie.
//
// Nutzung:  npm run supabase:start   (lokaler Stack muss laufen)
//           node scripts/generate-policy-inventory.mjs
// Output:   docs/security/policy-inventory.md (einchecken; Diff = Policy-Aenderung)
//
// Kein neues npm-Paket noetig: nutzt docker exec + psql im Stack-Container.

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CONTAINER = "supabase_db_nachbar-io";
const OUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "docs",
  "security",
  "policy-inventory.md",
);

function psql(sql) {
  try {
    return execFileSync(
      "docker",
      ["exec", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-A", "-F", "\t", "-t", "-c", sql],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (err) {
    console.error(
      `\nFEHLER: Konnte psql im Container '${CONTAINER}' nicht ausfuehren.\n` +
        `Laeuft der lokale Stack? -> npm run supabase:start\n\n` +
        String(err?.message ?? err),
    );
    process.exit(1);
  }
}

function rows(sql) {
  return psql(sql)
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(Boolean)
    .map((l) => l.split("\t"));
}

function mdEscape(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function table(headers, data) {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `|${headers.map(() => "---").join("|")}|`;
  const body = data.map((r) => `| ${r.map(mdEscape).join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}\n`;
}

// 1) RLS-Policies (effektiver Stand, nicht Migrations-Historie)
const policies = rows(`
  SELECT schemaname || '.' || tablename,
         policyname,
         cmd,
         array_to_string(roles, ','),
         COALESCE(left(regexp_replace(qual, '\\s+', ' ', 'g'), 160), ''),
         COALESCE(left(regexp_replace(with_check, '\\s+', ' ', 'g'), 160), '')
  FROM pg_policies
  ORDER BY schemaname, tablename, policyname;
`);

// 2) RLS-Status je Tabelle (Tabellen OHNE RLS zuerst — das sind die Kandidaten fuer Findings)
const rlsStatus = rows(`
  SELECT n.nspname || '.' || c.relname,
         CASE WHEN c.relrowsecurity THEN 'AN' ELSE 'AUS' END,
         CASE WHEN c.relforcerowsecurity THEN 'ja' ELSE 'nein' END
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' AND n.nspname IN ('public')
  ORDER BY c.relrowsecurity ASC, 1;
`);

// 3) Trigger (privilege-relevante Sticky-Trigger sichtbar machen)
const triggers = rows(`
  SELECT event_object_schema || '.' || event_object_table,
         trigger_name,
         string_agg(event_manipulation, ','),
         action_timing
  FROM information_schema.triggers
  WHERE trigger_schema IN ('public')
  GROUP BY 1, 2, 4
  ORDER BY 1, 2;
`);

// 4) Tabellen-Grants fuer die drei App-Rollen
const grants = rows(`
  SELECT table_schema || '.' || table_name,
         grantee,
         string_agg(privilege_type, ',' ORDER BY privilege_type)
  FROM information_schema.role_table_grants
  WHERE grantee IN ('anon', 'authenticated', 'service_role')
    AND table_schema IN ('public')
  GROUP BY 1, 2
  ORDER BY 1, 2;
`);

const noRls = rlsStatus.filter((r) => r[1] === "AUS");

const md = `# Policy-Inventar (generiert)

> **NICHT von Hand editieren.** Generiert via \`node scripts/generate-policy-inventory.mjs\`
> aus dem lokalen Supabase-Stack (= Migrations-Replay-Stand, NICHT zwingend Prod — siehe
> Schema-Baseline-Konzept \`docs/plans/2026-07-04-schema-baseline-konzept.md\`).
> Nach jeder Migration mit Policy-/Trigger-/Grant-Bezug neu generieren und einchecken —
> der Git-Diff dieser Datei IST das Security-Review-Artefakt.

Kennzahlen: **${policies.length} Policies** · ${rlsStatus.length} public-Tabellen (${noRls.length} OHNE RLS) · ${triggers.length} Trigger · ${grants.length} Grant-Zeilen

## ⚠️ Tabellen ohne RLS (public)

${noRls.length === 0 ? "_Keine — alle public-Tabellen haben RLS._" : table(["Tabelle", "RLS", "forced"], noRls)}

## RLS-Policies (effektiv)

${table(["Tabelle", "Policy", "Cmd", "Rollen", "USING (gekuerzt)", "WITH CHECK (gekuerzt)"], policies)}

## Trigger (public)

${table(["Tabelle", "Trigger", "Events", "Timing"], triggers)}

## Tabellen-Grants (anon / authenticated / service_role)

${table(["Tabelle", "Rolle", "Privilegien"], grants)}
`;

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${md.trimEnd()}\n`, "utf8");
console.log(
  `OK: ${policies.length} Policies, ${triggers.length} Trigger, ${grants.length} Grant-Zeilen, ` +
    `${noRls.length} Tabellen ohne RLS -> ${OUT_PATH}`,
);
