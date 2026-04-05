"use client";

import { useParams } from "next/navigation";
import { LargeTitle } from "@/components/ui/LargeTitle";
import { GroupMemberList } from "@/modules/gruppen/components/GroupMemberList";

export default function BeitrittsanfragenPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <LargeTitle title="Beitrittsanfragen" />
      <GroupMemberList groupId={id} isAdmin={true} />
    </div>
  );
}
