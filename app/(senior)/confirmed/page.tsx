'use client';

import { SeniorStatusScreen } from '@/components/care/senior/SeniorStatusScreen';

export default function SeniorConfirmedPage() {
  return <SeniorStatusScreen type="checkin_ok" autoCloseSeconds={8} />;
}
