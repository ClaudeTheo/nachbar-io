import { notFound } from "next/navigation";

import { YouthExchangeSurface } from "@/modules/youth/components/YouthExchangeSurface";
import { isLocalUiPreviewEnabled } from "@/lib/local-ui-preview";

export default async function YouthExchangePreviewPage() {
  if (!isLocalUiPreviewEnabled()) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-[#071923] px-4 pt-2">
      <YouthExchangeSurface />
    </main>
  );
}
