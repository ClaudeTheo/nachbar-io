'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SosCategoryPicker } from '@/components/care/SosCategoryPicker';

export default function SosNewPage() {
  return (
    <div className="px-4 py-6">
      <Link href="/care" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit">
        <ArrowLeft className="h-4 w-4" />
        Zurueck
      </Link>
      <SosCategoryPicker source="app" />
    </div>
  );
}
