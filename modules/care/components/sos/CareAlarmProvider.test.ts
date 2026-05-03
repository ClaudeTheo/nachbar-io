// modules/care/components/sos/CareAlarmProvider.test.ts
// Lokale Care-Previews duerfen keinen Alarm-/Check-in-Status laden.

import { describe, expect, it } from "vitest";
import { shouldBypassCareAlarmProvider } from "@/modules/care/components/sos/CareAlarmProvider";

describe("shouldBypassCareAlarmProvider", () => {
  it.each(["/care/preview", "/care/consent/preview"])(
    "deaktiviert den Care-Alarm fuer %s",
    (path) => {
      expect(shouldBypassCareAlarmProvider(path)).toBe(true);
    },
  );
});
