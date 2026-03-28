"use client";

import { SeniorStatusScreen } from "@/modules/care/components/senior/SeniorStatusScreen";

export default function SeniorConfirmedPage() {
  return <SeniorStatusScreen type="checkin_ok" autoCloseSeconds={8} />;
}
