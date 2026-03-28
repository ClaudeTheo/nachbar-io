// app/(app)/care/layout.tsx
import type { ReactNode } from "react";
import { CareAlarmProvider } from "@/modules/care/components/sos/CareAlarmProvider";
import { CareDisclaimer } from "@/modules/care/components/consent/CareDisclaimer";

export const metadata = {
  title: "Alltag — QuartierApp",
  description: "Nachbarschaftshilfe und Alltagsunterstuetzung",
};

export default function CareLayout({ children }: { children: ReactNode }) {
  return (
    <CareAlarmProvider>
      <CareDisclaimer>{children}</CareDisclaimer>
    </CareAlarmProvider>
  );
}
