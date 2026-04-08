// Lade-Skelett fuer die Aerzte-Liste
export default function AerzteLoading() {
  return (
    <div className="px-4 py-6 space-y-4">
      <div className="h-8 bg-muted rounded w-2/3 animate-pulse" />
      <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
      <div className="h-10 bg-muted rounded-full w-full animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
