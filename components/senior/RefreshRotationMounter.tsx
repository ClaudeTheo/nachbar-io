// components/senior/RefreshRotationMounter.tsx
// Welle B Task B7: Mounted im Senior-Layout, rotiert refresh_token alle 5 min.
// No-op wenn kein refresh_token in localStorage liegt (also vor Pairing).

"use client";

import { useRefreshTokenRotation } from "@/lib/device-pairing/use-refresh-rotation";

export function RefreshRotationMounter() {
  useRefreshTokenRotation();
  return null;
}
