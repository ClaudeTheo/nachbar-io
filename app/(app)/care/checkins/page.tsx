'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import { CheckinHistory } from '@/components/care/CheckinHistory';
import type { CareCheckin } from '@/lib/care/types';

export default function CheckinsPage() {
  const [checkins, setCheckins] = useState<CareCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/care/checkin?limit=50');
      if (res.ok) setCheckins(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="px-4 py-6 space-y-4">
      <Link href="/care" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit">
        <ArrowLeft className="h-4 w-4" />
        Zurueck
      </Link>
      <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
        <Clock className="h-6 w-6 text-quartier-green" />
        Check-in-Verlauf
      </h1>
      <CheckinHistory checkins={checkins} loading={loading} />
    </div>
  );
}
