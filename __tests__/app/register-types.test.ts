import { expectTypeOf, describe, it } from "vitest";
import type {
  AiAssistanceLevel,
  RegisterFormState,
} from "@/app/(auth)/register/components/types";

describe("RegisterFormState types", () => {
  it("AiAssistanceLevel covers off/basic/everyday/later", () => {
    expectTypeOf<AiAssistanceLevel>().toEqualTypeOf<
      "off" | "basic" | "everyday" | "later"
    >();
  });

  it("RegisterFormState exposes optional aiAssistanceLevel", () => {
    expectTypeOf<RegisterFormState["aiAssistanceLevel"]>().toEqualTypeOf<
      AiAssistanceLevel | undefined
    >();
  });
});
