'use client';

// Nachbar Hilfe — Entlastungsbetrag-Tracker Seite
// Zeigt das monatliche Pflegebudget (131 EUR nach § 45b SGB XI)

import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { BudgetTracker } from '@/components/hilfe/BudgetTracker';

export default function HilfeBudgetPage() {
  return (
    <div className="px-4 py-6 space-y-6">
      <PageHeader
        title={<><Wallet className="h-6 w-6 text-[#4CAF87]" /> Entlastungsbetrag-Tracker</>}
        subtitle="Behalten Sie den Ueberblick ueber Ihren monatlichen Entlastungsbetrag nach § 45b SGB XI."
        backHref="/hilfe"
      />

      <BudgetTracker />
    </div>
  );
}
