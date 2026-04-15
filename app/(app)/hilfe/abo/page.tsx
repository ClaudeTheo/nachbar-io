import SubscriptionManager from "@/modules/hilfe/components/SubscriptionManager";
import { HilfeNav } from "@/modules/hilfe/components/HilfeNav";

export default function AboPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">
          Pflegekassen-Abrechnung
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Quittungen, Monatsberichte und Budget-Ueberblick fuer Ihre
          Nachbarschaftshilfe an einem Ort.
        </p>
      </div>
      <div className="p-4">
        <SubscriptionManager />
      </div>
      <HilfeNav />
    </div>
  );
}
