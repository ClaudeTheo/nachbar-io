// components/care/TechCheck.tsx
// Technik-Check vor Online-Sprechstunde: Kamera, Mikrofon, Internet prüfen
'use client';

import { useEffect, useState } from 'react';
import { Camera, Mic, Wifi, CircleCheck, CircleX } from 'lucide-react';

interface Props {
  onReady: () => void;
  onFailed: (reason: string) => void;
}

type CheckStatus = 'checking' | 'ok' | 'failed';

export function TechCheck({ onReady, onFailed }: Props) {
  const [camera, setCamera] = useState<CheckStatus>('checking');
  const [mic, setMic] = useState<CheckStatus>('checking');
  const [network, setNetwork] = useState<CheckStatus>('checking');

  useEffect(() => {
    async function runChecks() {
      // Kamera prüfen
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        setCamera('ok');
      } catch {
        setCamera('failed');
      }

      // Mikrofon prüfen
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        setMic('ok');
      } catch {
        setMic('failed');
      }

      // Internetverbindung prüfen
      try {
        const start = Date.now();
        await fetch('/api/health', { method: 'HEAD' });
        const latency = Date.now() - start;
        setNetwork(latency < 5000 ? 'ok' : 'failed');
      } catch {
        setNetwork(navigator.onLine ? 'ok' : 'failed');
      }
    }

    runChecks();
  }, []);

  useEffect(() => {
    const allDone = camera !== 'checking' && mic !== 'checking' && network !== 'checking';
    if (!allDone) return;

    if (camera === 'ok' && mic === 'ok' && network === 'ok') {
      onReady();
    } else {
      const reasons: string[] = [];
      if (camera === 'failed') reasons.push('Kamera');
      if (mic === 'failed') reasons.push('Mikrofon');
      if (network === 'failed') reasons.push('Internet');
      onFailed(reasons.join(', '));
    }
  }, [camera, mic, network, onReady, onFailed]);

  function renderStatusIcon(status: CheckStatus) {
    if (status === 'checking') {
      return <div className="h-8 w-8 rounded-full bg-anthrazit/20 animate-pulse" />;
    }
    if (status === 'ok') {
      return <CircleCheck className="h-8 w-8 text-quartier-green" />;
    }
    return <CircleX className="h-8 w-8 text-red-500" />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-anthrazit text-center">Technik-Check</h2>

      <div className="flex items-center gap-4 rounded-2xl bg-white p-4">
        <Camera className="h-8 w-8 text-anthrazit" />
        <span className="text-xl text-anthrazit flex-1">Kamera</span>
        {renderStatusIcon(camera)}
      </div>

      <div className="flex items-center gap-4 rounded-2xl bg-white p-4">
        <Mic className="h-8 w-8 text-anthrazit" />
        <span className="text-xl text-anthrazit flex-1">Mikrofon</span>
        {renderStatusIcon(mic)}
      </div>

      <div className="flex items-center gap-4 rounded-2xl bg-white p-4">
        <Wifi className="h-8 w-8 text-anthrazit" />
        <span className="text-xl text-anthrazit flex-1">Internet</span>
        {renderStatusIcon(network)}
      </div>
    </div>
  );
}
