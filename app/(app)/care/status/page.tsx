"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";

// Platzhalter — wird in Phase 4 (Task 18) vollstaendig implementiert
export default function CareStatusPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Status"
        subtitle="Heartbeat und Check-in Ihrer Angehoerigen"
        backHref="/dashboard"
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <Heart className="h-12 w-12 text-quartier-green/40" />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-anthrazit">
              Kommt bald
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hier sehen Sie bald den Heartbeat und Check-in-Status
              Ihrer verbundenen Angehoerigen.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
