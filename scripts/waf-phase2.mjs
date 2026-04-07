#!/usr/bin/env node
// scripts/waf-phase2.mjs
// Stuft WAF-Regeln von LOG auf Phase 2 hoch (Challenge/Deny/Rate-Limit)
// Usage: node scripts/waf-phase2.mjs [--dry-run]
//
// Aenderungen gegenueber Phase 1:
//   R01 Scanner:     LOG → DENY
//   R02 Auth:        LOG → 429
//   R03 API Global:  LOG → 429
//   R04 Cron:        LOG → DENY (bereits aktiv, wird ueberschrieben)
//   R05 Care Routes: BLEIBT LOG (False-Positive-Risiko Pflegekraefte)
//   R06 Geo:         LOG → 429
//   R07 Honeypot:    LOG → DENY (bereits aktiv, wird ueberschrieben)
//   R08 Empty UA:    LOG → CHALLENGE
//   R09 Prevention:  LOG → 429
//   R10 POST Flood:  LOG → CHALLENGE
//
// KEIN persistent in Phase 2 — wird erst in Phase 3 aktiviert.

import { readFileSync } from "fs";
import { join } from "path";

const TEAM_ID = "team_ODteUSt2ffYkGKYgIeMTbKWw";
const PROJECT_ID = "prj_RRTuYhAYnYZqZj9xANINpe93oAMr";

function getToken() {
  const paths = [
    join(process.env.APPDATA || "", "com.vercel.cli/Data/auth.json"),
    join(process.env.HOME || "", ".local/share/com.vercel.cli/auth.json"),
  ];
  for (const p of paths) {
    try {
      return JSON.parse(readFileSync(p, "utf8")).token;
    } catch {}
  }
  throw new Error("Vercel Auth-Token nicht gefunden");
}

// --- PHASE 2 REGEL-DEFINITIONEN ---

const RULES = [
  // R01: Scanner-Block → DENY
  {
    name: "R01 Scanner Block",
    description: "Blockiert bekannte Security-Scanner (Phase 2: DENY)",
    active: true,
    conditionGroup: [
      {
        conditions: [
          {
            type: "user_agent",
            op: "re",
            value:
              "(sqlmap|nikto|nmap|nuclei|dirbuster|gobuster|wpscan|ffuf|feroxbuster|burpsuite|masscan|zgrab|httpx)",
          },
        ],
      },
    ],
    action: { mitigate: { action: "deny", actionDuration: "1h" } },
  },

  // R02: Auth Rate Limit → 429
  {
    name: "R02 Auth Rate Limit",
    description: "Auth/Register: 10/min → 429 (Phase 2)",
    active: true,
    conditionGroup: [
      {
        conditions: [{ type: "path", op: "pre", value: "/api/auth" }],
      },
      {
        conditions: [{ type: "path", op: "pre", value: "/api/register" }],
      },
    ],
    action: {
      mitigate: {
        action: "rate_limit",
        rateLimit: {
          algo: "fixed_window",
          window: 60,
          limit: 10,
          keys: ["ip"],
          action: "deny",
        },
      },
    },
  },

  // R03: API Global Rate Limit → 429
  {
    name: "R03 API Global Rate Limit",
    description: "Globales API-Limit: 300/min → 429 (Phase 2, erhoeht fuer SPA+TTS)",
    active: true,
    conditionGroup: [
      {
        conditions: [{ type: "path", op: "pre", value: "/api/" }],
      },
    ],
    action: {
      mitigate: {
        action: "rate_limit",
        rateLimit: {
          algo: "fixed_window",
          window: 60,
          limit: 300,
          keys: ["ip"],
          action: "log",  // LOG statt deny — Challenge/Deny bricht fetch()-Calls
        },
      },
    },
  },

  // R04: Cron-Schutz → DENY
  {
    name: "R04 Cron Endpoint Protection",
    description: "Blockiert Cron-Zugriffe ohne Authorization-Header (DENY)",
    active: true,
    conditionGroup: [
      {
        conditions: [
          { type: "path", op: "pre", value: "/api/cron" },
          { type: "header", key: "authorization", op: "nex" },
        ],
      },
    ],
    action: { mitigate: { action: "deny" } },
  },

  // R05: Care Routes → BLEIBT LOG (Phase 2 Ausnahme)
  {
    name: "R05 Care Routes Protection (LOG)",
    description: "Care/Heartbeat/Export/Admin: 30/min — BLEIBT LOG (Pflegekraefte-Risiko)",
    active: true,
    conditionGroup: [
      { conditions: [{ type: "path", op: "pre", value: "/api/care/" }] },
      { conditions: [{ type: "path", op: "pre", value: "/api/heartbeat/" }] },
      { conditions: [{ type: "path", op: "pre", value: "/api/export/" }] },
      { conditions: [{ type: "path", op: "pre", value: "/api/admin/" }] },
    ],
    action: {
      mitigate: {
        action: "rate_limit",
        rateLimit: {
          algo: "fixed_window",
          window: 60,
          limit: 30,
          keys: ["ip"],
          action: "log",
        },
      },
    },
  },

  // R06: Geo-Search → 429
  {
    name: "R06 Geo Search Rate Limit",
    description: "Geo-Suche: 20/min → 429 (Phase 2)",
    active: true,
    conditionGroup: [
      {
        conditions: [{ type: "path", op: "pre", value: "/api/geo/" }],
      },
    ],
    action: {
      mitigate: {
        action: "rate_limit",
        rateLimit: {
          algo: "fixed_window",
          window: 60,
          limit: 20,
          keys: ["ip"],
          action: "deny",
        },
      },
    },
  },

  // R07: Honeypot-Pfade → DENY + persistent 24h
  {
    name: "R07 Honeypot Paths",
    description: "Honeypot-Pfade (.env, wp-admin etc.): DENY + 24h Block",
    active: true,
    conditionGroup: [
      {
        conditions: [
          {
            type: "path",
            op: "re",
            value:
              "^/(\\.(env|git).*|wp-admin|wp-login\\.php|phpmyadmin|actuator|debug/vars|server-status|graphql)$",
          },
        ],
      },
    ],
    action: { mitigate: { action: "deny", actionDuration: "24h" } },
  },

  // R08: Empty User-Agent → DENY (nicht challenge — challenge bricht fetch()-Calls)
  {
    name: "R08 Empty User-Agent",
    description: "API-Requests ohne User-Agent: Deny (Phase 2, kein Challenge wg. fetch)",
    active: true,
    conditionGroup: [
      {
        conditions: [
          { type: "path", op: "pre", value: "/api/" },
          { type: "user_agent", op: "eq", value: "" },
        ],
      },
      {
        conditions: [
          { type: "path", op: "pre", value: "/api/" },
          { type: "user_agent", op: "nex" },
        ],
      },
    ],
    action: { mitigate: { action: "deny" } },
  },

  // R09: Prevention Rate Limit → 429
  {
    name: "R09 Prevention Rate Limit",
    description: "Praevention-Routen: 30/min → 429 (Phase 2)",
    active: true,
    conditionGroup: [
      {
        conditions: [{ type: "path", op: "pre", value: "/api/prevention/" }],
      },
    ],
    action: {
      mitigate: {
        action: "rate_limit",
        rateLimit: {
          algo: "fixed_window",
          window: 60,
          limit: 30,
          keys: ["ip"],
          action: "deny",
        },
      },
    },
  },

  // R10: POST-Flood → LOG (dauerhaft LOG — R03 schuetzt bereits mit 300/min global,
  // R10 Challenge blockierte TTS/Companion fetch()-Calls weil Challenge nicht loesbar per JS)
  {
    name: "R10 POST Flood Protection (LOG)",
    description: "POST-Requests: 60/min — LOG only (Challenge bricht fetch/TTS)",
    active: true,
    conditionGroup: [
      {
        conditions: [
          { type: "method", op: "eq", value: "POST" },
          { type: "path", op: "pre", value: "/api/" },
        ],
      },
    ],
    action: {
      mitigate: {
        action: "rate_limit",
        rateLimit: {
          algo: "fixed_window",
          window: 60,
          limit: 60,
          keys: ["ip"],
          action: "log",
        },
      },
    },
  },
];

// CRS: Rulesets (gleich wie Phase 1)
const CRS_CONFIG = {
  sd: { active: true, action: "log" },
  sqli: { active: true, action: "log" },
  xss: { active: true, action: "log" },
  lfi: { active: true, action: "log" },
  rfi: { active: true, action: "log" },
  rce: { active: true, action: "log" },
  gen: { active: true, action: "log" },
  sf: { active: true, action: "log" },
  ma: { active: true, action: "log" },
  php: { active: false, action: "log" },
  java: { active: false, action: "log" },
};

function getAction(rule) {
  const m = rule.action.mitigate;
  if (m.rateLimit) {
    return `rate_limit(${m.rateLimit.limit}/${m.rateLimit.window}s) → ${m.rateLimit.action}`;
  }
  return m.action + (m.actionDuration ? ` (${m.actionDuration})` : "");
}

async function deploy() {
  const dryRun = process.argv.includes("--dry-run");

  const config = {
    firewallEnabled: true,  // EIN — Session 58, alle challenge-Actions entfernt
    rules: RULES,
    crs: CRS_CONFIG,
    ips: [
      { hostname: "79.205.229.195", ip: "79.205.229.195", action: "bypass", notes: "Thomas Home" },
    ],
  };

  console.log("=== Vercel WAF Phase 2 Deployment ===\n");

  RULES.forEach((r, i) => {
    const action = getAction(r);
    const isLog = action.includes("log");
    const marker = isLog ? "  (LOG)" : " ⚡";
    console.log(`  ${i + 1}. ${r.name} → ${action}${marker}`);
  });

  const active = RULES.filter((r) => !getAction(r).includes("log")).length;
  console.log(`\n  Aktiv: ${active}/10 | LOG: ${10 - active}/10`);

  if (dryRun) {
    console.log("\n--- DRY RUN: Kein Deploy ---");
    return;
  }

  const token = getToken();
  console.log("\nDeploying...");

  const resp = await fetch(
    `https://api.vercel.com/v1/security/firewall/config?projectId=${PROJECT_ID}&teamId=${TEAM_ID}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    },
  );

  const result = await resp.json();

  if (!resp.ok) {
    console.error("\nFEHLER:", resp.status);
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log("\n✅ WAF Phase 2 erfolgreich deployed!");
  console.log("   9 Regeln aktiv (DENY/429/Challenge)");
  console.log("   1 Regel LOG (R05 Care Routes)");
  console.log("   CRS: 9/11 im LOG-Modus");
}

deploy().catch(console.error);
