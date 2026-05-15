import { notFound } from "next/navigation";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CareHubTileGrid } from "@/modules/care/components/CareHubTileGrid";
import { isLocalUiPreviewEnabled } from "@/lib/local-ui-preview";

const enabledHealthFlags = {
  MEDICATIONS_ENABLED: true,
  DOCTORS_ENABLED: true,
  APPOINTMENTS_ENABLED: true,
  VIDEO_CONSULTATION: true,
  HEARTBEAT_ENABLED: true,
  GDT_ENABLED: true,
};

export default async function CareLocalPreviewPage() {
  if (!isLocalUiPreviewEnabled()) notFound();

  return (
    <div className="space-y-6 px-4 py-6">
      <PageHeader
        title={
          <>
            <Heart className="h-6 w-6 text-red-500" /> Mein Tag
          </>
        }
        subtitle="Alltag, Gesundheit und Termine auf einen Blick"
        backHref="/dashboard"
        backLabel="Zurück zum Dashboard"
      />

      <CareHubTileGrid
        checkinStatus={{
          completedCount: 1,
          totalCount: 3,
          nextDue: null,
          allCompleted: false,
          checkinEnabled: true,
        }}
        medicationStatus={{ pendingCount: 1, completedCount: 2 }}
        nextAppointment={null}
        healthFlagStates={enabledHealthFlags}
      />
    </div>
  );
}
