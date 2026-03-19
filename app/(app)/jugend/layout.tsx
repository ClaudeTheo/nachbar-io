// app/(app)/jugend/layout.tsx
// Jugend-Modul: Layout mit FeatureGate
import { FeatureGate } from '@/components/FeatureGate';

export default function JugendLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate
      feature="YOUTH_MODULE"
      fallback={
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-anthrazit">Jugend-Modul</h2>
          <p className="text-gray-500 mt-2">
            Das Jugend-Modul ist in deinem Quartier noch nicht verfügbar.
          </p>
        </div>
      }
    >
      {children}
    </FeatureGate>
  );
}
