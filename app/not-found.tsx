import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-warmwhite p-6 text-center">
      <div className="text-6xl">🏘️</div>
      <h1 className="text-2xl font-bold text-anthrazit">Seite nicht gefunden</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Diese Seite existiert leider nicht. Vielleicht haben Sie sich in der
        Nachbarschaft verirrt?
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-quartier-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-quartier-green-dark"
        >
          <Home className="h-4 w-4" />
          Zur Startseite
        </Link>
        <Link
          href="/map"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-anthrazit hover:bg-muted"
        >
          <Search className="h-4 w-4" />
          Zur Karte
        </Link>
      </div>
    </div>
  );
}
