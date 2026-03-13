// Nachbar.io — Scenario Runner: Orchestriert Multi-Agent Szenarien
import { Browser } from "@playwright/test";
import { createAgent, loginAgent, type TestAgent } from "./agent-factory";
import { waitForStableUI, takeAgentScreenshot } from "./observer";

/**
 * Fuehrt eine Aktion fuer einen Agenten aus und loggt das Ergebnis.
 * Bei Fehler wird ein Screenshot gespeichert.
 */
export async function withAgent<T>(
  agent: TestAgent,
  actionName: string,
  action: (agent: TestAgent) => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  console.log(`${agent.prefix} START: ${actionName}`);

  try {
    const result = await action(agent);
    const duration = Date.now() - startTime;
    console.log(`${agent.prefix} OK: ${actionName} (${duration}ms)`);
    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`${agent.prefix} FAIL: ${actionName} (${duration}ms)`);

    // Screenshot bei Fehler
    try {
      await takeAgentScreenshot(agent.page, agent.prefix, `fail_${actionName}`);
    } catch {
      // Screenshot fehlgeschlagen — ignorieren
    }

    throw err;
  }
}

/**
 * Erstellt mehrere Agenten und loggt sie ein.
 * Gibt ein Array von eingeloggten Agenten zurueck.
 */
export async function setupAgents(
  browser: Browser,
  agentIds: string[]
): Promise<TestAgent[]> {
  const agents: TestAgent[] = [];

  for (const id of agentIds) {
    const agent = await createAgent(browser, id);
    try {
      await loginAgent(agent);
      agents.push(agent);
    } catch (err) {
      console.error(`[SETUP] Agent ${id} Login fehlgeschlagen:`, err);
      await agent.context.close();
      throw err;
    }
  }

  return agents;
}

/**
 * Fuehrt parallele Aktionen fuer verschiedene Agenten aus.
 * Nuetzlich fuer: Agent A postet gleichzeitig, waehrend Agent B den Feed beobachtet.
 */
export async function parallel<T>(
  ...actions: Array<() => Promise<T>>
): Promise<T[]> {
  return Promise.all(actions.map((fn) => fn()));
}

/**
 * Fuehrt Aktionen sequenziell aus, mit optionaler Verzoegerung.
 */
export async function sequential(
  actions: Array<{ agent: TestAgent; name: string; fn: () => Promise<void> }>,
  delayMs: number = 500
): Promise<void> {
  for (const action of actions) {
    await withAgent(action.agent, action.name, action.fn);
    if (delayMs > 0) {
      await action.agent.page.waitForTimeout(delayMs);
    }
  }
}

/**
 * Navigiert einen Agenten zu einer Seite und wartet auf Stabilitaet.
 */
export async function navigateAgent(
  agent: TestAgent,
  path: string
): Promise<void> {
  await agent.page.goto(path);
  await waitForStableUI(agent.page);
}
