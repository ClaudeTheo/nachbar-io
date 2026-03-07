"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-emergency-red/10 p-4">
        <AlertTriangle className="h-8 w-8 text-emergency-red" />
      </div>
      <h2 className="text-lg font-semibold text-anthrazit">
        Etwas ist schiefgelaufen
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Beim Laden dieser Seite ist ein Fehler aufgetreten. Bitte versuchen Sie
        es erneut.
      </p>
      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Erneut versuchen
      </Button>
    </div>
  );
}
