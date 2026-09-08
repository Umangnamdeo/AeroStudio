'use client';

import { Activity, User, Cpu, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useEffect } from 'react';

export function Header() {
  const setWebGpuSupported = useAppStore((state) => state.setWebGpuSupported);
  const webGpuSupported = useAppStore((state) => state.webGpuSupported);
  const gpuInfo = useAppStore((state) => state.gpuInfo);
  const setGpuInfo = useAppStore((state) => state.setGpuInfo);
  const isLowOverheadMode = useAppStore((state) => state.isLowOverheadMode);
  const setIsLowOverheadMode = useAppStore((state) => state.setIsLowOverheadMode);
  const windAudioEnabled = useAppStore((state) => state.windAudioEnabled);
  const setWindAudioEnabled = useAppStore((state) => state.setWindAudioEnabled);
  const windAudioVolume = useAppStore((state) => state.windAudioVolume);
  const setWindAudioVolume = useAppStore((state) => state.setWindAudioVolume);
  const velocityKmH = useAppStore((state) => state.velocityKmH);

  useEffect(() => {
    // 1. Detect WebGPU capability
    async function checkGPUCapabilities() {
      let webgpu = false;
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          webgpu = !!adapter;
        } catch (e) {
          webgpu = false;
        }
      }
      setWebGpuSupported(webgpu);

      // 2. Query WebGL renderer info to determine GPU tier
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'Standard WebGL';
          const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'Standard Vendor';

          const rendererLower = renderer.toLowerCase();
          const isSoftware = rendererLower.includes('swiftshader') || rendererLower.includes('llvmpipe') || rendererLower.includes('warp');
          const isIntegrated = rendererLower.includes('intel') || rendererLower.includes('uhd') || rendererLower.includes('iris') || rendererLower.includes('graphics');
          const isDiscrete = !isSoftware && !isIntegrated && (rendererLower.includes('nvidia') || rendererLower.includes('amd') || rendererLower.includes('radeon') || rendererLower.includes('apple'));

          setGpuInfo({
            renderer,
            vendor,
            isIntegratedOrSoftware: isSoftware || isIntegrated || !isDiscrete,
            tier: isSoftware ? 'software' : isDiscrete ? 'discrete' : 'integrated',
          });
        }
      } catch (err) {
        console.warn('Could not inspect WebGL debug renderer info:', err);
      }
    }

    checkGPUCapabilities();
  }, [setWebGpuSupported, setGpuInfo]);

  return (
    <header className="col-span-1 lg:col-span-2 h-16 border-b border-[rgba(236,236,237,0.15)] flex items-center justify-between px-8 bg-[rgba(11,11,12,0.85)] backdrop-blur-[12px] z-50 select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#3b82f6]">
            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
          </svg>
          <h1 className="font-syne font-extrabold text-[1.2rem] tracking-[0.1em] uppercase text-[#3b82f6]">
            AERO Studio
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs border-l border-[rgba(236,236,237,0.08)] pl-4">
          <span className="label">Project</span>
          <span className="font-mono text-xs text-[#ececed]">VELOCE_GT3_EVAL-04</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* GPU Status Indicator */}
        <div 
          className="flex items-center gap-2 text-[11px] font-mono text-[#ececed]"
          title={gpuInfo?.renderer || 'Detecting GPU'}
        >
          <span 
            className={`w-1.5 h-1.5 rounded-full ${
              webGpuSupported === null ? 'bg-zinc-500 animate-pulse' :
              webGpuSupported ? 'bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]' :
              gpuInfo?.tier === 'discrete' ? 'bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
            }`} 
          />
          
          <span>
            {webGpuSupported ? (
              'WebGPU Active'
            ) : gpuInfo ? (
              gpuInfo.tier === 'discrete' ? (
                'WebGL2 (Discrete GPU)'
              ) : (
                <span className="text-amber-300">
                  {gpuInfo.tier === 'software' ? 'Software (Safe Mode)' : 'Integrated (Safe Mode)'}
                </span>
              )
            ) : (
              'Checking Graphics...'
            )}
          </span>
        </div>

        {/* Dynamic Wind Tunnel Aeroacoustics Audio Control */}
        <div 
          className={`flex items-center gap-2 px-2.5 py-1 rounded-[2px] border transition-all ${
            windAudioEnabled 
              ? 'bg-[rgba(56,189,248,0.08)] border-[rgba(56,189,248,0.3)] shadow-[0_0_12px_rgba(56,189,248,0.15)]' 
              : 'bg-[#141416] border-[rgba(236,236,237,0.12)]'
          }`}
        >
          <button
            onClick={() => setWindAudioEnabled(!windAudioEnabled)}
            className={`flex items-center gap-1.5 text-[10px] font-mono cursor-pointer transition-colors ${
              windAudioEnabled ? 'text-[#38bdf8]' : 'text-[#ececed]/50 hover:text-[#ececed]'
            }`}
            title={windAudioEnabled ? 'Wind Tunnel Audio Active · Click to Mute' : 'Enable Wind Tunnel Aeroacoustic Sound (Reacts to Airspeed)'}
          >
            {windAudioEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#38bdf8] animate-pulse" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <span className="hidden sm:inline font-mono uppercase text-[9px] tracking-wider font-medium">
              {windAudioEnabled ? 'Aero Audio' : 'Muted'}
            </span>
          </button>

          {windAudioEnabled && (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-[rgba(56,189,248,0.2)]">
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={windAudioVolume}
                onChange={(e) => setWindAudioVolume(parseFloat(e.target.value))}
                className="w-14 h-1 accent-[#38bdf8] bg-zinc-800 rounded appearance-none cursor-pointer"
                title={`Aeroacoustics Volume: ${Math.round(windAudioVolume * 100)}% · Airspeed: ${velocityKmH} km/h`}
              />
              <span className="text-[9px] font-mono text-[#38bdf8] hidden md:inline">
                {Math.round(windAudioVolume * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Enhanced / Safe Mode Switcher */}
        <button
          onClick={() => setIsLowOverheadMode(!isLowOverheadMode)}
          className={`border border-[rgba(236,236,237,0.15)] bg-transparent text-[#ececed] px-3 py-1.5 text-[10px] label cursor-pointer transition-all hover:border-[rgba(236,236,237,0.35)] ${
            isLowOverheadMode ? 'border-[#3b82f6] text-[#3b82f6] opacity-100' : 'opacity-75 hover:opacity-100'
          }`}
          title="Toggle safe mode to bypass heavy shadow buffering"
        >
          {isLowOverheadMode ? 'Safe Mode' : 'Enhanced Mode'}
        </button>

        {/* Account / User Avatar */}
        <div 
          className="w-8 h-8 bg-[rgba(236,236,237,0.08)] rounded-[2px] flex items-center justify-center text-[#ececed] hover:bg-[rgba(236,236,237,0.15)] transition-colors cursor-pointer"
          title="Engineer Profile"
        >
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}
