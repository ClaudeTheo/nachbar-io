import { notFound } from "next/navigation";
import type { Step } from "../../components";
import { RegisterPreviewForm } from "../RegisterPreviewForm";

const PREVIEW_STEPS: Record<string, Step> = {
  identity: "identity",
  "pilot-role": "pilot_role",
  "ai-consent": "ai_consent",
};

function isLocalPreviewEnabled() {
  return process.env.NODE_ENV !== "production";
}

export default async function RegisterLocalPreviewPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  if (!isLocalPreviewEnabled()) notFound();

  const { step } = await params;
  const previewStep = PREVIEW_STEPS[step];
  if (!previewStep) notFound();

  return <RegisterPreviewForm initialStep={previewStep} />;
}
