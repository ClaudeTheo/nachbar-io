import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Pill,
  ShieldCheck,
  Stethoscope,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { CareAppointment } from "@/lib/care/types";
import { computeTileDisabled } from "@/lib/health-feature-gate";
import { isLegacyRoute } from "@/lib/legacy-routes";

interface CheckinStatus {
  completedCount: number;
  totalCount: number;
  nextDue: string | null;
  allCompleted: boolean;
  checkinEnabled: boolean;
}

interface MedicationDueStatus {
  pendingCount: number;
  completedCount: number;
}

interface CareTileProps {
  href: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  iconClassName: string;
  disabled: boolean;
}

interface CareHubTileGridProps {
  checkinStatus: CheckinStatus | null;
  medicationStatus: MedicationDueStatus | null;
  nextAppointment: CareAppointment | null;
  healthFlagStates: Record<string, boolean>;
}

function CareTile({
  href,
  label,
  subtitle,
  icon: Icon,
  iconClassName,
  disabled,
}: CareTileProps) {
  const content = (
    <>
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconClassName}`} />
        <span className="font-semibold text-anthrazit">{label}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {disabled ? "Im Pilot noch deaktiviert" : subtitle}
      </p>
    </>
  );

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        className="flex min-h-[100px] flex-col justify-between rounded-xl border border-dashed bg-muted/35 p-4"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex min-h-[100px] flex-col justify-between rounded-xl border bg-white p-4 shadow-sm transition-colors hover:bg-gray-50 active:scale-[0.98]"
    >
      {content}
    </Link>
  );
}

export function CareHubTileGrid({
  checkinStatus,
  medicationStatus,
  nextAppointment,
  healthFlagStates,
}: CareHubTileGridProps) {
  const medSubtitle =
    medicationStatus && medicationStatus.pendingCount > 0
      ? `${medicationStatus.pendingCount} ausstehend`
      : medicationStatus
        ? "Alle eingenommen"
        : "Übersicht";

  const terminSubtitle = nextAppointment
    ? new Date(nextAppointment.scheduled_at).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Keine Termine";

  return (
    <div className="grid grid-cols-2 gap-3">
      <CareTile
        href="/care/checkin"
        label="Check-in"
        subtitle={
          checkinStatus?.allCompleted
            ? "Alle erledigt"
            : checkinStatus
              ? `${checkinStatus.completedCount}/${checkinStatus.totalCount} erledigt`
              : "Wie geht es Ihnen?"
        }
        icon={CheckCircle2}
        iconClassName="text-quartier-green"
        disabled={computeTileDisabled(
          "/care/checkin",
          healthFlagStates,
          isLegacyRoute,
        )}
      />

      <CareTile
        href="/care/medications"
        label="Medikamente"
        subtitle={medSubtitle}
        icon={Pill}
        iconClassName="text-blue-500"
        disabled={computeTileDisabled(
          "/care/medications",
          healthFlagStates,
          isLegacyRoute,
        )}
      />

      <CareTile
        href="/care/aerzte"
        label="Ärzte"
        subtitle="in der Nähe"
        icon={Stethoscope}
        iconClassName="text-emerald-600"
        disabled={computeTileDisabled(
          "/care/aerzte",
          healthFlagStates,
          isLegacyRoute,
        )}
      />

      <CareTile
        href="/care/termine"
        label="Termine"
        subtitle={nextAppointment ? `Nächster: ${terminSubtitle}` : terminSubtitle}
        icon={CalendarDays}
        iconClassName="text-violet-500"
        disabled={computeTileDisabled(
          "/care/termine",
          healthFlagStates,
          isLegacyRoute,
        )}
      />

      <CareTile
        href="/care/sprechstunde"
        label="Sprechstunde"
        subtitle="Video-Termin"
        icon={Video}
        iconClassName="text-red-500"
        disabled={computeTileDisabled(
          "/care/sprechstunde",
          healthFlagStates,
          isLegacyRoute,
        )}
      />

      <CareTile
        href="/praevention"
        label="Vorsorge"
        subtitle="Erinnerungen"
        icon={ShieldCheck}
        iconClassName="text-amber-500"
        disabled={computeTileDisabled(
          "/praevention",
          healthFlagStates,
          isLegacyRoute,
        )}
      />
    </div>
  );
}
