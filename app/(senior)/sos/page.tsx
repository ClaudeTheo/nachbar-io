'use client';

import { SosCategoryPicker } from '@/components/care/SosCategoryPicker';

export default function SeniorSosPage() {
  return (
    <div className="py-4">
      <SosCategoryPicker source="device" />
    </div>
  );
}
