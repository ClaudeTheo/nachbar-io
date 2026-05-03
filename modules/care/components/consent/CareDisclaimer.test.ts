// modules/care/components/consent/CareDisclaimer.test.ts
// Lokale Care-Previews sollen nicht vom Erstzugriffs-Disclaimer verdeckt werden.

import { describe, expect, it } from "vitest";
import { shouldBypassCareDisclaimer } from "@/modules/care/components/consent/CareDisclaimer";

describe("shouldBypassCareDisclaimer", () => {
  it.each(["/care/preview", "/care/consent/preview"])(
    "ueberspringt den Disclaimer fuer %s",
    (path) => {
      expect(shouldBypassCareDisclaimer(path)).toBe(true);
    },
  );
});
