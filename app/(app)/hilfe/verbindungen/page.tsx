import ConnectionManager from "@/components/hilfe/ConnectionManager";
import InviteCodeInput from "@/components/hilfe/InviteCodeInput";
import HilfeNav from "@/components/hilfe/HilfeNav";

export default function VerbindungenPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">Verbindungen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Verwalten Sie Ihre Helfer-Verbindungen
        </p>
      </div>
      <div className="p-4 space-y-6">
        <ConnectionManager role="senior" />
        <InviteCodeInput />
      </div>
      <HilfeNav />
    </div>
  );
}
