// lib/ai/system-prompts/__tests__/loader.test.ts
// Tests fuer den File-Loader mit In-Memory-Cache.
// Der Loader liest senior-app-knowledge.md zur Laufzeit ein und cacht das
// Ergebnis, damit pro Request nicht jedes Mal von Disk gelesen wird.

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// fs/promises-Mock via vi.hoisted, damit Named-Export UND Default-Export
// auf dieselbe Mock-Instanz zeigen und der Loader die gemockte Variante
// sieht (spread von importOriginal ueberschreibt die Mock sonst).
const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));

vi.mock("node:fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));

import {
  loadSeniorAppKnowledge,
  __resetSeniorAppKnowledgeCache,
} from "../loader";

beforeEach(() => {
  mockReadFile.mockReset();
  __resetSeniorAppKnowledgeCache();
});

afterEach(() => {
  __resetSeniorAppKnowledgeCache();
});

describe("loadSeniorAppKnowledge", () => {
  it("liest den Datei-Inhalt beim ersten Aufruf von Disk", async () => {
    mockReadFile.mockResolvedValue("WISSENSDOKUMENT_INHALT");

    const content = await loadSeniorAppKnowledge();

    expect(content).toBe("WISSENSDOKUMENT_INHALT");
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it("liefert den gecachten Inhalt beim zweiten Aufruf ohne erneutes Read", async () => {
    mockReadFile.mockResolvedValue("EINMALIG_GELESEN");

    const first = await loadSeniorAppKnowledge();
    const second = await loadSeniorAppKnowledge();

    expect(first).toBe("EINMALIG_GELESEN");
    expect(second).toBe("EINMALIG_GELESEN");
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it("liest den Pfad .../senior-app-knowledge.md ein", async () => {
    mockReadFile.mockResolvedValue("x");

    await loadSeniorAppKnowledge();

    const calledWith = mockReadFile.mock.calls[0]?.[0] as string;
    expect(calledWith).toMatch(/senior-app-knowledge\.md$/);
  });

  it("liest als utf-8", async () => {
    mockReadFile.mockResolvedValue("x");

    await loadSeniorAppKnowledge();

    const encoding = mockReadFile.mock.calls[0]?.[1];
    expect(encoding).toBe("utf-8");
  });

  it("wirft Fehler durch, wenn readFile fehlschlaegt", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    await expect(loadSeniorAppKnowledge()).rejects.toThrow("ENOENT");
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it("cached Fehler nicht: zweiter Aufruf versucht erneut", async () => {
    mockReadFile.mockRejectedValueOnce(new Error("transient"));
    mockReadFile.mockResolvedValueOnce("jetzt_ok");

    await expect(loadSeniorAppKnowledge()).rejects.toThrow("transient");
    const retry = await loadSeniorAppKnowledge();

    expect(retry).toBe("jetzt_ok");
    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });

  it("__resetSeniorAppKnowledgeCache erzwingt neuen Read", async () => {
    mockReadFile.mockResolvedValueOnce("v1");
    mockReadFile.mockResolvedValueOnce("v2");

    const first = await loadSeniorAppKnowledge();
    __resetSeniorAppKnowledgeCache();
    const second = await loadSeniorAppKnowledge();

    expect(first).toBe("v1");
    expect(second).toBe("v2");
    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });
});
