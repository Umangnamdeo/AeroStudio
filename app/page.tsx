'use client';

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { CanvasAreaWrapper } from '@/components/viewer/CanvasAreaWrapper';
import { MetricsOverlay } from '@/components/viewer/MetricsOverlay';
import { WindTunnelAudioPlayer } from '@/components/audio/WindTunnelAudioPlayer';

export default function Home() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] grid-rows-[64px_1fr] h-screen w-screen overflow-hidden bg-[#0b0b0c] text-[#ececed]">
      {/* Background Aeroacoustics Audio Engine */}
      <WindTunnelAudioPlayer />

      {/* Header */}
      <Header />

      {/* Main 3D Viewport */}
      <main className="relative col-start-1 row-start-2 w-full h-full overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#1a1a1d_0%,#0b0b0c_100%)]">
        <div className="w-full h-full relative">
          <CanvasAreaWrapper />
          <MetricsOverlay />
        </div>
      </main>

      {/* Sidebar Controls */}
      <Sidebar />
    </div>
  );
}

