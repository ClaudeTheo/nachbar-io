// app/(app)/care/caregiver/page.tsx
// Nachbar.io — Angehoerige verwalten (Bewohner-Seite)

import { CaregiverSettings } from '@/components/care/CaregiverSettings';

export const metadata = {
  title: 'Angehoerige verwalten — Nachbar.io',
};

export default function CaregiverPage() {
  return <CaregiverSettings />;
}
