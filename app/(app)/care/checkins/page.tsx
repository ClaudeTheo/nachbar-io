"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CheckinHistory } from "@/modules/care/components/checkin/CheckinHistory";
import type { CareCheckin } from "@/lib/care/types";

export default function CheckinsPage() {
  const [checkins, setCheckins] = useState<CareCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/care/checkin?limit=50");
      if (res.ok) setCheckins(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="px-4 py-6 space-y-4">
      <PageHeader
        title={
          <>
            <Clock className="h-6 w-6 text-quartier-green" /> Check-in-Verlauf
          </>
        }
        backHref="/care"
      />
      <CheckinHistory checkins={checkins} loading={loading} />
    </div>
  );
}
