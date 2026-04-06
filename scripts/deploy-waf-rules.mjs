#!/usr/bin/env node
// scripts/deploy-waf-rules.mjs
// Deployt Vercel WAF-Regeln via API — alle im LOG-Modus (Phase 1)
// Usage: node scripts/deploy-waf-rules.mjs [--dry-run] [--hobby]
//
// --dry-run: Zeigt Konfiguration ohne zu deployen
// --hobby:   Nur 3 Regeln (Hobby-Plan-Limit)

import { readFileSync } from "fs";
import { join } from "path";

const TEAM_ID = "team_ODteUSt2ffYkGKYgIeMTbKWw";
const PROJECT_ID = "prj_RRTuYhAYnYZqZj9xANINpe93oAMr";

// Token aus Vercel CLI lesen
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

// --- REGEL-DEFINITIONEN (alle LOG-Modus) ---

const RULES_FULL = [
  // Regel 1: Scanner-Block
  {
    name: "R01 Scanner Block (LOG)",
    description: "Erkennt bekannte Security-Scanner anhand User-Agent",
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
    action: { mitigate: { action: "log" } },
  },

  // Regel 2: Auth Rate Limit
  {
    name: "R02 Auth Rate Limit (LOG)",
    description: "Rate-Limit fuer Auth/Register-Routen: 10/min",
    active: true,
    conditionGroup: [
      {
        conditions: [
          { type: "path", op: "pre", value: "/api/auth" },
        ],
      },
      {
        conditions: [
          { type: "path", op: "pre", value: "/api/register" },
        ],
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
          action: "log",
        },
      },
    },
  },

  // Regel 3: API Global Rate Limit
  {
    name: "R03 API Global Rate Limit (LOG)",
    description: "Globales API Rate-Limit: 120/min",
    active: true,
    conditionGroup: [
      {
        conditions: [
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
          limit: 120,
          keys: ["ip"],
          action: "log",
        },
      },
    },
  },

  // Regel 4: Cron-Schutz
  {
    name: "R04 Cron Endpoint Protection (LOG)",
    description: "Blockiert Cron-Zugriffe ohne Authorization-Header",
    active: true,
    conditionGroup: [
      {
        conditions: [
          { type: "path", op: "pre", value: "/api/cron" },
          { type: "header", key: "authorization", op: "nex" },
        ],
      },
    ],
    action: { mitigate: { action: "log" } },
  },

  // Regel 5: Sensitive Care Routes
  {
    name: "R05 Care Routes Protection (LOG)",
    description: "Rate-Limit fuer Care/Heartbeat/Export/Admin: 30/min",
    active: true,
    conditionGroup: [
      {
        conditions: [
          { type: "path", op: "pre", value: "/api/care/" },
        ],
      },
      {
        conditions: [
          { type: "path", op: "pre", value: "/api/heartbeat/" },
        ],
      },
      {
        conditions: [
          { type: "path", op: "pre", value: "/api/export/" },
        ],
      },
      {
        conditions: [
          { type: "path", op: "pre", value: "/api/admin/" },
        ],
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
          action: "log",
        },
      },
    },
  },

  // Regel 6: Geo-Search Anti-Enumeration
  {
    name: "R06 Geo Search Rate Limit (LOG)",
    description: "Anti-Enumeration fuer Geo-Suche: 20/min",
    active: true,
    conditionGroup: [
      {
        conditions: [
          { type: "path", op: "pre", value: "/api/geo/" },
        ],
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
          action: "log",
        },
      },
    },
  },

  // Regel 7: Honeypot-Pfade
  {
    name: "R07 Honeypot Paths (LOG)",
    description: "Erkennt Zugriffe auf bekannte Honeypot-Pfade",
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
    action: { mitigate: { action: "log" } },
  },

  // Regel 8: Empty User-Agent
  {
    name: "R08 Empty User-Agent (LOG)",
    description: "Erkennt API-Requests ohne User-Agent",
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
    action: { mitigate: { action: "log" } },
  },

  // Regel 9: Prevention Rate Limit
  {
    name: "R09 Prevention Rate Limit (LOG)",
    description: "Rate-Limit fuer Praevention-Routen: 30/min",
    active: true,
    conditionGroup: [
      {
        conditions: [
          { type: "path", op: "pre", value: "/api/prevention/" },
        ],
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
          action: "log",
        },
      },
    },
  },

  // Regel 10: POST-Flood Protection
  {
    name: "R10 POST Flood Protection (LOG)",
    description: "Rate-Limit fuer POST-Requests auf API: 30/min",
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
          limit: 30,
          keys: ["ip"],
          action: "log",
        },
      },
    },
  },
];

// Hobby-Version: nur die 3 wichtigsten Regeln
const RULES_HOBBY = [RULES_FULL[0], RULES_FULL[6], RULES_FULL[2]]; // Scanner, Honeypot, Global Rate Limit

// CRS: Eingebaute Rulesets (alle LOG-Modus)
const CRS_CONFIG = {
  sd: { active: true, action: "log" }, // Scanner Detection
  sqli: { active: true, action: "log" }, // SQL Injection
  xss: { active: true, action: "log" }, // XSS
  lfi: { active: true, action: "log" }, // Local File Inclusion
  rfi: { active: true, action: "log" }, // Remote File Inclusion
  rce: { active: true, action: "log" }, // Remote Code Execution
  gen: { active: true, action: "log" }, // Generic Attack
  sf: { active: true, action: "log" }, // Session Fixation
  ma: { active: true, action: "log" }, // Multipart Attack
  php: { active: false, action: "log" }, // PHP (nicht relevant, Next.js)
  java: { active: false, action: "log" }, // Java (nicht relevant)
};

async function deployRules() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const hobbyMode = args.includes("--hobby");

  const rules = hobbyMode ? RULES_HOBBY : RULES_FULL;

  const config = {
    firewallEnabled: true,
    rules,
    crs: CRS_CONFIG,
    ips: [],
  };

  console.log("=== Vercel WAF Deployment ===");
  console.log(`Modus: ${hobbyMode ? "HOBBY (3 Regeln)" : "PRO (10 Regeln)"}`);
  console.log(`Regeln: ${rules.length}`);
  console.log(
    `CRS aktiv: ${Object.entries(CRS_CONFIG).filter(([, v]) => v.active).length}/11`,
  );
  console.log(`Alle Aktionen: LOG (Phase 1 — kein Block)`);
  console.log("");

  rules.forEach((r, i) => {
    const actionType = r.action.mitigate.rateLimit
      ? `rate_limit(${r.action.mitigate.rateLimit.limit}/${r.action.mitigate.rateLimit.window}s) → log`
      : r.action.mitigate.action;
    console.log(`  ${i + 1}. ${r.name} → ${actionType}`);
  });

  console.log("");
  console.log("CRS Rulesets:");
  Object.entries(CRS_CONFIG).forEach(([key, val]) => {
    console.log(`  ${key}: ${val.active ? "LOG" : "AUS"}`);
  });

  if (dryRun) {
    console.log("\n--- DRY RUN: Kein Deploy ---");
    console.log(JSON.stringify(config, null, 2));
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

  console.log("\nERFOLG! WAF-Konfiguration deployed.");
  console.log(`Version: ${result.active?.version}`);
  console.log(`Regeln: ${result.active?.rules?.length}`);
  console.log(
    `Firewall: ${result.active?.firewallEnabled ? "AKTIV" : "INAKTIV"}`,
  );
  console.log("\nAlle Regeln im LOG-Modus — kein Traffic wird geblockt.");
  console.log(
    "Monitoring: Vercel Dashboard → Projekt → Firewall → Traffic",
  );
}

deployRules().catch((err) => {
  console.error("Fehler:", err.message);
  process.exit(1);
});
