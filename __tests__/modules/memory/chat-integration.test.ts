import { describe, it, expect } from "vitest";
import {
  buildMemoryTool,
  processMemoryToolCall,
} from "@/modules/memory/services/chat-integration";

describe("Chat Integration", () => {
  it("erzeugt save_memory Tool-Definition", () => {
    const tool = buildMemoryTool();
    expect(tool.name).toBe("save_memory");
    expect(tool.input_schema.properties).toHaveProperty("category");
    expect(tool.input_schema.properties).toHaveProperty("key");
    expect(tool.input_schema.properties).toHaveProperty("value");
    expect(tool.input_schema.properties).toHaveProperty("confidence");
  });
});
