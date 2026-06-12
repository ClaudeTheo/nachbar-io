import { describe, expect, it, vi } from "vitest";
import { createClaudeProvider, createMistralProvider } from "@/lib/ai/provider";
import {
  pseudonymizeAiMessages,
  pseudonymizeAiText,
} from "@/lib/ai/pseudonymize";

describe("AI payload pseudonymization", () => {
  it("redacts direct identifiers from free text", () => {
    const input =
      "Mein Name ist Thomas. Ich wohne in der Purkersdorfer Strasse 12, 79713 Bad Saeckingen. Mail: thomas@example.de. Telefon 0171 1234567.";

    const result = pseudonymizeAiText(input);

    expect(result.text).toContain("Mein Name ist [NAME]");
    expect(result.text).toContain("[ADRESSE]");
    expect(result.text).toContain("[PLZ]");
    expect(result.text).toContain("[E-MAIL]");
    expect(result.text).toContain("[TELEFON]");
    expect(result.text).not.toContain("Purkersdorfer");
    expect(result.text).not.toContain("thomas@example.de");
    expect(result.redactions).toBeGreaterThanOrEqual(5);
  });

  it("maps messages without changing roles", () => {
    const messages = pseudonymizeAiMessages([
      { role: "user", content: "Ich heisse Anna und wohne Gartenweg 3." },
      { role: "assistant", content: "Ich rufe 0761 123456 an." },
    ]);

    expect(messages).toEqual([
      { role: "user", content: "Ich heisse [NAME] und wohne [ADRESSE]." },
      { role: "assistant", content: "Ich rufe [TELEFON] an." },
    ]);
  });

  it("redacts Claude provider payloads before fetch", async () => {
    let payload: unknown;
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      payload = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          content: [{ type: "text", text: "ok" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200 },
      );
    });
    const provider = createClaudeProvider({ apiKey: "test-key", fetchImpl });

    await provider.chat({
      system: "Nutzer wohnt Purkersdorfer Strasse 12.",
      messages: [{ role: "user", content: "Telefon 0171 1234567" }],
    });

    const body = JSON.stringify(payload);
    expect(body).toContain("[ADRESSE]");
    expect(body).toContain("[TELEFON]");
    expect(body).not.toContain("Purkersdorfer");
    expect(body).not.toContain("0171");
  });

  it("redacts Mistral provider payloads before fetch", async () => {
    let payload: unknown;
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      payload = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
        { status: 200 },
      );
    });
    const provider = createMistralProvider({ apiKey: "test-key", fetchImpl });

    await provider.chat({
      system: "Kontakt: anna@example.de",
      messages: [{ role: "user", content: "Ich bin Anna" }],
    });

    const body = JSON.stringify(payload);
    expect(body).toContain("[E-MAIL]");
    expect(body).toContain("Ich bin [NAME]");
    expect(body).not.toContain("anna@example.de");
  });
});
