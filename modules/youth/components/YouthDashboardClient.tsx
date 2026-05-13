"use client";

import { NachbarKarte } from "@/components/NachbarKarte";
import { TaskBoard } from "@/modules/youth/components/TaskBoard";
import { YouthHomeSurface } from "@/modules/youth/components/YouthHomeSurface";
import { useYouthProfile } from "@/modules/youth/services/hooks";

function YouthDashboardSkeleton() {
  return (
    <div className="-mx-4 -mt-2 min-h-[calc(100vh-5rem)] bg-[#071923] px-4 py-6 text-white">
      <div className="animate-pulse space-y-4">
        <div className="h-56 rounded-[28px] bg-white/10" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-20 rounded-[18px] bg-white/10" />
          <div className="h-20 rounded-[18px] bg-white/10" />
          <div className="h-20 rounded-[18px] bg-white/10" />
        </div>
        <div className="h-[420px] rounded-[24px] bg-white/10" />
      </div>
    </div>
  );
}

export function YouthDashboardClient() {
  const { profile, loading } = useYouthProfile();

  if (loading) {
    return <YouthDashboardSkeleton />;
  }

  return (
    <YouthHomeSurface
      profile={profile}
      mapSlot={<NachbarKarte activityMode="youth" />}
      taskSlot={<TaskBoard quarterId={profile?.quarter_id ?? undefined} />}
    />
  );
}
