"use client";

import { SeniorHomeActions } from "@/components/senior/SeniorHomeActions";

export function SeniorLocalPreviewClient() {
  return (
    <SeniorHomeActions
      userName="Erika"
      onNavigate={() => {
        // Lokale UI-Preview: keine Navigation, kein Auth- oder DB-Touch.
      }}
    />
  );
}
