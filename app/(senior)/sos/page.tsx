"use client";

import { SosCategoryPicker } from "@/modules/care/components/sos/SosCategoryPicker";

export default function SeniorSosPage() {
  return (
    <div className="py-4">
      <SosCategoryPicker source="device" />
    </div>
  );
}
