"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

// Platzhalter — wird in Phase 4 (Task 16) vollstaendig implementiert
export default function HelferTasksPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Meine Einsaetze"
        subtitle="Aktive Hilfe-Einsaetze"
        backHref="/hilfe"
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <ClipboardList className="h-12 w-12 text-blue-500/40" />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-anthrazit">
              Kommt bald
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hier sehen Sie bald Ihre aktiven Hilfe-Einsaetze mit
              Status-Uebersicht und Schnellaktionen.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
