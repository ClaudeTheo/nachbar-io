import { SetupClaimForm } from "@/modules/family-setup/components/SetupClaimForm";

interface SetupPageProps {
  params: Promise<{ token: string }>;
}

export default async function SetupPage({ params }: SetupPageProps) {
  const { token } = await params;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <SetupClaimForm token={token} />
    </main>
  );
}
