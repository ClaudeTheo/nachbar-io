// Multi-Agent Window Setup: 4 Browserfenster fuer gleichzeitige Rollen-Simulation
// Nutzt Playwright-Kontexte mit fester Fensterposition (2x2 Grid)

import { Browser, BrowserContext, Page } from "@playwright/test";
import { createAgent, loginAgent, TestAgent } from "../helpers/agent-factory";
import { TEST_AGENTS } from "../helpers/test-config";

/** Konfiguration fuer die 4 Simulations-Agenten */
export const MULTI_AGENT_CONFIG = {
  // Bewohner (Senior) — Free
  bewohner: {
    agentId: "senior_s",
    label: "Bewohner (Senior/Free)",
    viewport: { width: 393, height: 851 },
  },
  // Angehoeriger — Plus
  angehoeriger: {
    agentId: "betreuer_t",
    label: "Angehöriger (Plus)",
    viewport: { width: 640, height: 720 },
  },
  // Stadt/Kommune — Pro Community
  stadt: {
    agentId: "stadt_k",
    label: "Stadt (Pro Community)",
    viewport: { width: 640, height: 720 },
  },
  // Arzt — Pro Medical (+ Bewohner)
  arzt: {
    agentId: "arzt_d",
    label: "Arzt (Pro Medical)",
    viewport: { width: 640, height: 720 },
  },
} as const;

export type MultiAgentRole = keyof typeof MULTI_AGENT_CONFIG;

export interface MultiAgentSetup {
  bewohner: TestAgent;
  angehoeriger: TestAgent;
  stadt: TestAgent;
  arzt: TestAgent;
}

/**
 * Erstellt und loggt alle 4 Agenten ein.
 * Jeder Agent bekommt einen eigenen Browser-Kontext (isolierte Session).
 */
export async function setupMultiAgentWindows(
  browser: Browser,
): Promise<MultiAgentSetup> {
  const agents: Partial<MultiAgentSetup> = {};

  for (const [role, config] of Object.entries(MULTI_AGENT_CONFIG)) {
    console.log(`[SETUP] Erstelle Agent: ${config.label}...`);

    const agent = await createAgent(browser, config.agentId, {
      viewport: config.viewport,
    });

    await loginAgent(agent);
    console.log(`[SETUP] ${config.label} eingeloggt → ${agent.page.url()}`);

    agents[role as MultiAgentRole] = agent;
  }

  return agents as MultiAgentSetup;
}

/**
 * Alle 4 Agenten-Kontexte schliessen.
 */
export async function cleanupMultiAgentWindows(
  setup: MultiAgentSetup,
): Promise<void> {
  for (const [role, agent] of Object.entries(setup)) {
    try {
      await agent.context.close();
      console.log(`[CLEANUP] ${role} geschlossen`);
    } catch {
      // Kontext bereits geschlossen
    }
  }
}
