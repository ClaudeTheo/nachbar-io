#!/usr/bin/env node
// scripts/waf-enable-rule.mjs
// Stuft WAF-Regeln einzeln von LOG auf DENY/429 hoch.
// Usage: node scripts/waf-enable-rule.mjs <stufe>
//
// Stufen (kumulativ):
//   0 = Alles LOG (Ausgangszustand Session 59)
//   1 = R07 Honeypot → DENY 24h
//   2 = + R01 Scanner → DENY 1h
//   3 = + R04 Cron → DENY
//   4 = + R08 Empty UA → DENY
//   5 = + R02 Auth Rate Limit 10/min → 429
//   6 = + R06 Geo Search 20/min → 429
//   7 = + R09 Prevention 30/min → 429
//
// R03 (API Global), R05 (Care), R10 (POST Flood) bleiben IMMER LOG.
// NIEMALS challenge als Action — fetch() kann Challenges nicht loesen!

import { readFileSync } from "fs";
import { join } from "path";

const TEAM_ID = "team_ODteUSt2ffYkGKYgIeMTbKWw";
const PROJECT_ID = "prj_RRTuYhAYnYZqZj9xANINpe93oAMr";

function getToken() {
  const p = join(process.env.APPDATA || "", "com.vercel.cli/Data/auth.json");
  return JSON.parse(readFileSync(p, "utf8")).token;
}

const stufe = parseInt(process.argv[2] || "0", 10);
if (stufe < 0 || stufe > 7) {
  console.error("Stufe muss 0-7 sein");
  process.exit(1);
}

// --- REGELN ---
// Jede Regel hat ihre LOG- und AKTIV-Version

function r01(active) {
  return {
    name: active ? "R01 Scanner Block" : "R01 Scanner Block (LOG)",
    description: "Blockiert bekannte Security-Scanner",
    active: true,
    conditionGroup: [{
      conditions: [{
        type: "user_agent", op: "re",
        value: "(sqlmap|nikto|nmap|nuclei|dirbuster|gobuster|wpscan|ffuf|feroxbuster|burpsuite|masscan|zgrab|httpx)",
      }],
    }],
    action: { mitigate: active ? { action: "deny", actionDuration: "1h" } : { action: "log" } },
  };
}

function r02(active) {
  return {
    name: active ? "R02 Auth Rate Limit" : "R02 Auth Rate Limit (LOG)",
    description: "Auth/Register: 10/min",
    active: true,
    conditionGroup: [
      { conditions: [{ type: "path", op: "pre", value: "/api/auth" }] },
      { conditions: [{ type: "path", op: "pre", value: "/api/register" }] },
    ],
    action: {
      mitigate: {
        action: "rate_limit",
        rateLimit: {
          algo: "fixed_window", window: 60, limit: 10, keys: ["ip"],
          action: active ? "deny" : "log",
        },
      },
    },
  };
}

function r03() {
  // IMMER LOG — 300/min global
  return {
    name: "R03 API Global Rate Limit (LOG)",
    description: "Globales API-Limit: 300/min — LOG (schützt vor Überlast-Erkennung)",
    active: true,
    conditionGroup: [
      { conditions: [{ type: "path", op: "pre", value: "/api/" }] },
    ],
    action: {
      mitigate: {
        action: "rate_limit",
        rateLimit: { algo: "fixed_window", window: 60, limit: 300, keys: ["ip"], action: "log" },
      },
    },
  };
}

function r04(active) {
  return {
    name: active ? "R04 Cron Endpoint Protection" : "R04 Cron Endpoint Protection (LOG)",
    description: "Blockiert Cron-Zugriffe ohne Authorization-Header",
    active: true,
    conditionGroup: [{
      conditions: [
        { type: "path", op: "pre", value: "/api/cron" },
        { type: "header", key: "authorization", op: "nex" },
      ],
    }],
    action: { mitigate: active ? { action: "deny" } : { action: "log" } },
  };
}

function r05() {
  // IMMER LOG — Pflegekraefte False-Positive-Risiko
  return {
    name: "R05 Care Routes Protection (LOG)",
    description: "Care/Heartbeat/Export/Admin: 30/min — LOG (Pflegekraefte-Risiko)",
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
        rateLimit: { algo: "fixed_window", window: 60, limit: 30, keys: ["ip"], action: "log" },
      },
    },
  };
}

function r06(active) {
  return {
    name: active ? "R06 Geo Search Rate Limit" : "R06 Geo Search Rate Limit (LOG)",
    description: "Geo-Suche: 20/min",
    active: true,
    conditionGroup: [
      { conditions: [{ type: "path", op: "pre", value: "/api/geo/" }] },
    ],
    action: {
      mitigate: {
        action: "rate_limit",
        rateLimit: { algo: "fixed_window", window: 60, limit: 20, keys: ["ip"], action: active ? "deny" : "log" },
      },
    },
  };
}

function r07(active) {
  return {
    name: active ? "R07 Honeypot Paths" : "R07 Honeypot Paths (LOG)",
    description: "Honeypot-Pfade (.env, wp-admin etc.)",
    active: true,
    conditionGroup: [{
      conditions: [{
        type: "path", op: "re",
        value: "^/(\\.(env|git).*|wp-admin|wp-login\\.php|phpmyadmin|actuator|debug/vars|server-status|graphql)$",
      }],
    }],
    action: { mitigate: active ? { action: "deny", actionDuration: "24h" } : { action: "log" } },
  };
}

function r08(active) {
  // NUR "eq empty" — "nex" (not exists) blockiert auch curl/fetch mit UA (Vercel-Bug/Fehlverhalten).
  // Session 60: nex-Condition entfernt weil sie normale Requests blockte.
  return {
    name: active ? "R08 Empty User-Agent" : "R08 Empty User-Agent (LOG)",
    description: "API-Requests mit leerem User-Agent",
    active: true,
    conditionGroup: [
      { conditions: [{ type: "path", op: "pre", value: "/api/" }, { type: "user_agent", op: "eq", value: "" }] },
    ],
    action: { mitigate: active ? { action: "deny" } : { action: "log" } },
  };
}

function r09(active) {
  return {
    name: active ? "R09 Prevention Rate Limit" : "R09 Prevention Rate Limit (LOG)",
    description: "Praevention-Routen: 30/min",
    active: true,
    conditionGroup: [
      { conditions: [{ type: "path", op: "pre", value: "/api/prevention/" }] },
    ],
    action: {
      mitigate: {
        action: "rate_limit",
        rateLimit: { algo: "fixed_window", window: 60, limit: 30, keys: ["ip"], action: active ? "deny" : "log" },
      },
    },
  };
}

function r10() {
  // IMMER LOG — R03 schuetzt bereits global
  return {
    name: "R10 POST Flood Protection (LOG)",
    description: "POST-Requests: 60/min — LOG (Challenge bricht fetch/TTS)",
    active: true,
    conditionGroup: [{
      conditions: [
        { type: "method", op: "eq", value: "POST" },
        { type: "path", op: "pre", value: "/api/" },
      ],
    }],
    action: {
      mitigate: {
        action: "rate_limit",
        rateLimit: { algo: "fixed_window", window: 60, limit: 60, keys: ["ip"], action: "log" },
      },
    },
  };
}

// Stufen-Konfiguration: welche Regeln bei welcher Stufe aktiv werden
const rules = [
  r01(stufe >= 2),  // Stufe 2
  r02(stufe >= 5),  // Stufe 5
  r03(),             // IMMER LOG
  r04(stufe >= 3),  // Stufe 3
  r05(),             // IMMER LOG
  r06(stufe >= 6),  // Stufe 6
  r07(stufe >= 1),  // Stufe 1
  r08(stufe >= 4),  // Stufe 4
  r09(stufe >= 7),  // Stufe 7
  r10(),             // IMMER LOG
];

// CRS: ALLE deaktiviert — active:true verursachte 403 auf der Homepage (Session 60)
const CRS_CONFIG = {
  sd: { active: false, action: "log" },
  sqli: { active: false, action: "log" },
  xss: { active: false, action: "log" },
  lfi: { active: false, action: "log" },
  rfi: { active: false, action: "log" },
  rce: { active: false, action: "log" },
  gen: { active: false, action: "log" },
  sf: { active: false, action: "log" },
  ma: { active: false, action: "log" },
  php: { active: false, action: "log" },
  java: { active: false, action: "log" },
};

async function deploy() {
  const dryRun = process.argv.includes("--dry-run");

  const config = {
    firewallEnabled: true,
    rules,
    crs: CRS_CONFIG,
    // KEIN ips-Array! Vercel WAF API interpretiert bypass-IPs als BLOCKING-Regeln (Bug/Fehlnutzung).
    // System-Bypass stattdessen über /v1/security/firewall/bypass API (sourceIp-Feld).
    ips: [],
  };

  console.log(`\n=== WAF Stufe ${stufe}/7 ===\n`);

  rules.forEach((r, i) => {
    const m = r.action.mitigate;
    const rl = m.rateLimit;
    let action;
    if (rl) action = `rate_limit(${rl.limit}/${rl.window}s) → ${rl.action}`;
    else action = m.action + (m.actionDuration ? ` (${m.actionDuration})` : "");
    const isLog = action.includes("log");
    console.log(`  ${isLog ? "  " : "⚡"} R${String(i + 1).padStart(2, "0")} ${r.name} → ${action}`);
  });

  const active = rules.filter(r => {
    const m = r.action.mitigate;
    if (m.rateLimit) return m.rateLimit.action !== "log";
    return m.action !== "log";
  }).length;

  console.log(`\n  Aktiv: ${active}/10 | LOG: ${10 - active}/10\n`);

  if (dryRun) {
    console.log("--- DRY RUN: Kein Deploy ---\n");
    return;
  }

  const token = getToken();
  console.log("Deploying...");

  const resp = await fetch(
    `https://api.vercel.com/v1/security/firewall/config?projectId=${PROJECT_ID}&teamId=${TEAM_ID}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(config),
    },
  );

  const result = await resp.json();
  if (!resp.ok) {
    console.error("FEHLER:", resp.status);
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log(`\nWAF Stufe ${stufe} deployed!\n`);

  // Test-Hinweise
  const tests = [];
  if (stufe >= 1) tests.push('  curl -s -o /dev/null -w "%{http_code}" https://nachbar-io.vercel.app/.env  → erwartet: 403');
  if (stufe >= 2) tests.push('  curl -s -o /dev/null -w "%{http_code}" -A "sqlmap/1.0" https://nachbar-io.vercel.app/  → erwartet: 403');
  if (stufe >= 3) tests.push('  curl -s -o /dev/null -w "%{http_code}" https://nachbar-io.vercel.app/api/cron/test  → erwartet: 403');
  if (stufe >= 4) tests.push('  curl -s -o /dev/null -w "%{http_code}" -A "" https://nachbar-io.vercel.app/api/test  → erwartet: 403');

  if (tests.length > 0) {
    console.log("Test-Befehle:");
    tests.forEach(t => console.log(t));
    console.log("\n  + Browser-Test: https://nachbar-io.vercel.app/ normal aufrufen → muss 200 sein\n");
  }
}

deploy().catch(console.error);
