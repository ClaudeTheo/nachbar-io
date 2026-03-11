// app/(app)/care/layout.tsx
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Pflege — Nachbar.io',
  description: 'Seniorenhilfe und Pflegeunterstuetzung',
};

export default function CareLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
