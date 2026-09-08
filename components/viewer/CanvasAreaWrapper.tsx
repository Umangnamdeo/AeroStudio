'use client';

import { useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { Activity } from 'lucide-react';

const CanvasArea = dynamic(() => import('./CanvasArea').then(mod => mod.CanvasArea), {
  ssr: false,
});

const emptySubscribe = () => () => {};

export function CanvasAreaWrapper() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isClient) {
    return (
      <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center text-zinc-500">
        <Activity className="w-6 h-6 text-[#63b3ed] animate-spin mb-3" />
        <span className="font-mono text-xs text-zinc-400">Initializing Virtual Wind Tunnel...</span>
      </div>
    );
  }

  return <CanvasArea />;
}
