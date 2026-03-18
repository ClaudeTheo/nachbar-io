// app/(app)/care/layout.tsx
import type { ReactNode } from 'react';
import { CareAlarmProvider } from '@/components/care/CareAlarmProvider';
import { CareDisclaimer } from '@/components/care/CareDisclaimer';

export const metadata = {
  title: 'Alltag — QuartierApp',
  description: 'Nachbarschaftshilfe und Alltagsunterstuetzung',
};

export default function CareLayout({ children }: { children: ReactNode }) {
  return (
    <CareAlarmProvider>
      <CareDisclaimer>{children}</CareDisclaimer>
    </CareAlarmProvider>
  );
}
