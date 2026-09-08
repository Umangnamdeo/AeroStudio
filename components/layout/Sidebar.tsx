'use client';

import { useAppStore, ViewMode } from '@/store/useAppStore';
import { useRef } from 'react';

export function Sidebar() {
  const { 
    viewMode, 
    setViewMode, 
    modelData, 
    setModelData,
    velocityKmH,
    setVelocityKmH,
    yawAngleDeg,
    setYawAngleDeg,
    inletType,
    setInletType,
    smokeRakeX,
    setSmokeRakeX,
    smokeMode,
    setSmokeMode,
    smokeColor,
    setSmokeColor,
    smokeRakeY,
    setSmokeRakeY,
    streamlineRecalibrationEnabled,
    setStreamlineRecalibrationEnabled,
    triggerRecalibration,
    windAudioEnabled,
    setWindAudioEnabled,
    windAudioVolume,
    setWindAudioVolume,
    rollingRoadEnabled,
    setRollingRoadEnabled,
    rollingRoadMode,
    setRollingRoadMode,
    wheelSpinEnabled,
    setWheelSpinEnabled,
    chassisDynamicsEnabled,
    setChassisDynamicsEnabled,
    isSimulating,
    setIsSimulating,
    hasRunSimulation,
    setHasRunSimulation,
    simulationProgress,
    setSimulationProgress,
    loadSampleModel,
    clearModel,
    resetModelTransform,
    gpuInfo,
    webGpuSupported
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModelData({ url, name: file.name });
    }
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationProgress(5);

    let progress = 5;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 14) + 8;
      if (progress >= 100) {
        progress = 100;
        setSimulationProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          setIsSimulating(false);
          setHasRunSimulation(true);
        }, 250);
      } else {
        setSimulationProgress(progress);
      }
    }, 120);
  };

  // Convert height 0.2m - 1.6m to cm (20 - 160)
  const currentHeightCm = Math.round(smokeRakeY * 100);

  return (
    <aside className="bg-[#141416] border-l border-[rgba(236,236,237,0.15)] flex flex-col h-full overflow-hidden select-none z-20">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".stl,.obj,.glb,.gltf"
        className="hidden"
      />

      {/* Aside Header */}
      <div className="p-6 border-b border-[rgba(236,236,237,0.08)] shrink-0">
        <div className="label mb-3 flex justify-between items-center">
          <span>Configuration Settings</span>
          <button 
            onClick={() => {
              clearModel();
              resetModelTransform();
            }}
            className="text-[#f43f5e] hover:underline cursor-pointer tracking-wider uppercase text-[10px]"
          >
            Reset
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="2"
              className="shrink-0"
            >
              <path d="M14.5 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v3.8" />
            </svg>
            <span className="font-mono text-[13px] font-bold truncate text-[#ececed]">
              {modelData ? modelData.name : 'GT_Aero_Concept.stl'}
            </span>
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#0b0b0c] border border-[rgba(236,236,237,0.15)] hover:border-[rgba(236,236,237,0.3)] text-[#ececed] py-1.5 px-3 rounded-[4px] text-[11px] font-mono shrink-0 cursor-pointer transition-colors"
          >
            Import
          </button>
        </div>
      </div>

      {/* Aside Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Baseline Vehicles */}
        <section>
          <h4 className="label mb-3">Baseline Vehicles</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => loadSampleModel('gt')}
              className={`bg-[#0b0b0c] border p-3 text-left cursor-pointer transition-all rounded-[2px] ${
                modelData?.builtInType === 'gt' || !modelData
                  ? 'border-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                  : 'border-[rgba(236,236,237,0.08)] hover:border-[rgba(236,236,237,0.2)]'
              }`}
            >
              <span className="text-xs font-semibold block mb-0.5 text-[#ececed]">GT Aero Coupe</span>
              <span className="text-[10px] opacity-50 block font-mono text-[#ececed]">Cd ~0.28 · Fastback</span>
            </button>

            <button
              onClick={() => loadSampleModel('formula')}
              className={`bg-[#0b0b0c] border p-3 text-left cursor-pointer transition-all rounded-[2px] ${
                modelData?.builtInType === 'formula'
                  ? 'border-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                  : 'border-[rgba(236,236,237,0.08)] hover:border-[rgba(236,236,237,0.2)]'
              }`}
            >
              <span className="text-xs font-semibold block mb-0.5 text-[#ececed]">F1 Wing Element</span>
              <span className="text-[10px] opacity-50 block font-mono text-[#ececed]">High Downforce</span>
            </button>
          </div>
        </section>

        {/* Flow Generator & Wind Setup */}
        <section>
          <h4 className="label mb-3">Flow Generator & Wind Setup</h4>
          <div className="bg-[#0b0b0c] p-4 border border-[rgba(236,236,237,0.08)] flex flex-col gap-4 rounded-[2px]">
            {/* Generator Type: Pipeline vs Jet Turbofan */}
            <div>
              <div className="label mb-2 flex justify-between items-center">
                <span>Inlet Mode</span>
                <span className="text-[9px] font-mono text-[#3b82f6] uppercase">
                  {inletType === 'fan' ? 'Jet Turbofan Engine' : 'Pipeline Manifold'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setInletType('pipeline')}
                  className={`p-2.5 border text-left rounded-[2px] transition-all cursor-pointer ${
                    inletType === 'pipeline'
                      ? 'border-[#3b82f6] bg-[#141416] shadow-[0_0_12px_rgba(59,130,246,0.15)] text-[#ececed]'
                      : 'border-[rgba(236,236,237,0.08)] bg-transparent text-[#ececed] opacity-50 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12h16M4 6h16M4 18h16" />
                    </svg>
                    <span className="text-xs font-semibold">Pipeline</span>
                  </div>
                  <span className="text-[9px] font-mono opacity-60 block">Manifold Rake</span>
                </button>

                <button
                  onClick={() => setInletType('fan')}
                  className={`p-2.5 border text-left rounded-[2px] transition-all cursor-pointer ${
                    inletType === 'fan'
                      ? 'border-[#3b82f6] bg-[#141416] shadow-[0_0_12px_rgba(59,130,246,0.15)] text-[#ececed]'
                      : 'border-[rgba(236,236,237,0.08)] bg-transparent text-[#ececed] opacity-50 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      className={inletType === 'fan' ? 'animate-spin' : ''} 
                      style={{ animationDuration: `${Math.max(0.5, 300 / Math.max(20, velocityKmH))}s` }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a10 10 0 0 1 10 10M12 22a10 10 0 0 1-10-10" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span className="text-xs font-semibold">Jet Turbofan</span>
                  </div>
                  <span className="text-[9px] font-mono opacity-60 block">Rotating Engine</span>
                </button>
              </div>
            </div>

            {/* Inlet Velocity / Airspeed with Slider + Keyboard Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="label">Wind Speed</span>
                <div className="flex items-center gap-1 bg-[#141416] px-2 py-0.5 border border-[rgba(236,236,237,0.12)] rounded-[2px]">
                  <input
                    type="number"
                    min={10}
                    max={400}
                    step={5}
                    value={velocityKmH}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) setVelocityKmH(Math.max(10, Math.min(400, val)));
                    }}
                    className="w-12 bg-transparent text-right font-mono text-xs text-[#3b82f6] outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
                  />
                  <span className="text-[10px] font-mono text-[#ececed]/50">km/h</span>
                </div>
              </div>
              <input 
                type="range" 
                value={velocityKmH} 
                min={20} 
                max={320}
                onChange={(e) => setVelocityKmH(Number(e.target.value))}
                className="w-full h-[2px] bg-[rgba(236,236,237,0.15)] appearance-none outline-none my-2 accent-[#3b82f6] cursor-pointer"
              />
              <div className="label flex justify-between opacity-30 text-[8px]">
                <span>20</span>
                <span>140</span>
                <span>320 km/h</span>
              </div>
            </div>

            {/* Ambient Wind Tunnel Aeroacoustics Audio Control */}
            <div className="bg-[#141416] p-3 border border-[rgba(236,236,237,0.08)] rounded-[2px] flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="label flex items-center gap-1.5 text-[10px]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  Tunnel Aeroacoustics
                </span>
                <button
                  onClick={() => setWindAudioEnabled(!windAudioEnabled)}
                  className={`px-2 py-0.5 text-[9px] font-mono border rounded-[2px] cursor-pointer transition-all flex items-center gap-1.5 ${
                    windAudioEnabled
                      ? 'border-[#38bdf8] bg-[rgba(56,189,248,0.1)] text-[#38bdf8]'
                      : 'border-[rgba(236,236,237,0.15)] bg-transparent text-[#ececed]/50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${windAudioEnabled ? 'bg-[#38bdf8] animate-pulse' : 'bg-[#71717a]'}`} />
                  <span>{windAudioEnabled ? 'AUDIO ON' : 'MUTED'}</span>
                </button>
              </div>

              {windAudioEnabled && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex justify-between items-center text-[9px] font-mono">
                    <span className="text-[#ececed]/60">Master Volume</span>
                    <span className="text-[#38bdf8]">{Math.round(windAudioVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={1.0}
                    step={0.05}
                    value={windAudioVolume}
                    onChange={(e) => setWindAudioVolume(parseFloat(e.target.value))}
                    className="w-full h-[2px] bg-[rgba(236,236,237,0.15)] appearance-none outline-none accent-[#38bdf8] cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-[#ececed]/40 pt-1 border-t border-[rgba(236,236,237,0.06)]">
                    <span>Pitch: {Math.round(55 + Math.pow(Math.min(1.2, Math.max(0.06, velocityKmH / 300)), 1.18) * 620)} Hz</span>
                    <span>Sound Level: ~{Math.round(58 + (velocityKmH / 320) * 44)} dBA</span>
                  </div>
                </div>
              )}
            </div>

            {/* Y-Axis Angle / Yaw with Slider + Keyboard Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="label">Y-Axis Angle</span>
                  {yawAngleDeg !== 0 && (
                    <button
                      onClick={() => setYawAngleDeg(0)}
                      className="text-[9px] font-mono text-[#38bdf8] hover:underline cursor-pointer"
                      title="Reset to 0°"
                    >
                      [0°]
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-[#141416] px-2 py-0.5 border border-[rgba(236,236,237,0.12)] rounded-[2px]">
                  <input
                    type="number"
                    min={-45}
                    max={45}
                    step={1}
                    value={Math.round(yawAngleDeg)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) setYawAngleDeg(Math.max(-45, Math.min(45, val)));
                    }}
                    className="w-10 bg-transparent text-right font-mono text-xs text-[#3b82f6] outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
                  />
                  <span className="text-[10px] font-mono text-[#ececed]/50">deg</span>
                </div>
              </div>
              <input 
                type="range" 
                value={yawAngleDeg} 
                min={-30} 
                max={30}
                step={0.5}
                onChange={(e) => setYawAngleDeg(Number(e.target.value))}
                className="w-full h-[2px] bg-[rgba(236,236,237,0.15)] appearance-none outline-none my-2 accent-[#3b82f6] cursor-pointer"
              />
              <div className="label flex justify-between opacity-30 text-[8px]">
                <span>-30°</span>
                <span>0° (Headwind)</span>
                <span>+30°</span>
              </div>
            </div>

            {/* Inlet / Injector Height with Slider + Keyboard Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="label">Generator Height</span>
                <div className="flex items-center gap-1 bg-[#141416] px-2 py-0.5 border border-[rgba(236,236,237,0.12)] rounded-[2px]">
                  <input
                    type="number"
                    min={20}
                    max={160}
                    step={1}
                    value={currentHeightCm}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) setSmokeRakeY(Math.max(0.2, Math.min(1.6, val / 100)));
                    }}
                    className="w-10 bg-transparent text-right font-mono text-xs text-[#3b82f6] outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
                  />
                  <span className="text-[10px] font-mono text-[#ececed]/50">cm</span>
                </div>
              </div>
              <input 
                type="range" 
                value={currentHeightCm} 
                min={20} 
                max={160}
                onChange={(e) => setSmokeRakeY(Number(e.target.value) / 100)}
                className="w-full h-[2px] bg-[rgba(236,236,237,0.15)] appearance-none outline-none my-2 accent-[#3b82f6] cursor-pointer"
              />
              <div className="label flex justify-between opacity-30 text-[8px]">
                <span>20 cm</span>
                <span>80 cm</span>
                <span>160 cm</span>
              </div>
            </div>

            {/* Generator Lateral Position (X-Axis Traverse) with Slider + Numeric Input + Center Reset */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="label">Lateral Traverse (X-Axis)</span>
                  {smokeRakeX !== 0 && (
                    <button
                      onClick={() => setSmokeRakeX(0)}
                      className="text-[9px] font-mono text-[#38bdf8] hover:underline cursor-pointer"
                      title="Reset to center (0.00m)"
                    >
                      [Center]
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-[#141416] px-2 py-0.5 border border-[rgba(236,236,237,0.12)] rounded-[2px]">
                  <span className="text-[10px] font-mono text-[#ececed]/50">
                    {smokeRakeX > 0.01 ? 'R' : smokeRakeX < -0.01 ? 'L' : 'C'}
                  </span>
                  <input
                    type="number"
                    min={-1.8}
                    max={1.8}
                    step={0.05}
                    value={Number(smokeRakeX.toFixed(2))}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) setSmokeRakeX(Math.max(-1.8, Math.min(1.8, val)));
                    }}
                    className="w-12 bg-transparent text-right font-mono text-xs text-[#3b82f6] outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
                  />
                  <span className="text-[10px] font-mono text-[#ececed]/50">m</span>
                </div>
              </div>
              <input 
                type="range" 
                value={smokeRakeX} 
                min={-1.5} 
                max={1.5}
                step={0.05}
                onChange={(e) => setSmokeRakeX(Number(e.target.value))}
                className="w-full h-[2px] bg-[rgba(236,236,237,0.15)] appearance-none outline-none my-2 accent-[#3b82f6] cursor-pointer"
              />
              <div className="label flex justify-between opacity-30 text-[8px]">
                <span>-1.5m (Left)</span>
                <span>0.0m (Center)</span>
                <span>+1.5m (Right)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Rolling Road (Moving Ground Treadmill) */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h4 className="label">Rolling Road (Treadmill)</h4>
            <button
              onClick={() => setRollingRoadEnabled(!rollingRoadEnabled)}
              className={`px-2 py-0.5 text-[9px] font-mono border rounded-[2px] cursor-pointer transition-all flex items-center gap-1.5 ${
                rollingRoadEnabled
                  ? 'border-[#10b981] bg-[rgba(16,185,129,0.1)] text-[#10b981]'
                  : 'border-[rgba(236,236,237,0.15)] bg-transparent text-[#ececed]/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${rollingRoadEnabled ? 'bg-[#10b981] animate-pulse' : 'bg-[#71717a]'}`} />
              <span>{rollingRoadEnabled ? 'ACTIVE' : 'OFFLINE'}</span>
            </button>
          </div>

          <div className="bg-[#0b0b0c] p-4 border border-[rgba(236,236,237,0.08)] flex flex-col gap-4 rounded-[2px]">
            {/* Belt Configuration Mode */}
            <div>
              <div className="label mb-2 flex justify-between items-center">
                <span>Belt Layout</span>
                <span className="text-[9px] font-mono text-[#3b82f6] uppercase">
                  {rollingRoadMode === 'wide' ? 'Full Track (Wide)' : rollingRoadMode === 'five_belt' ? '5-Belt System' : 'Center Belt'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'wide', label: 'Wide Belt', desc: 'Full Track' },
                  { id: 'five_belt', label: '5-Belt Rig', desc: 'Chassis + WDUs' },
                  { id: 'center_belt', label: 'Center Belt', desc: 'Underbody' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setRollingRoadMode(m.id as any)}
                    className={`py-2 px-1.5 border text-left rounded-[2px] transition-all cursor-pointer ${
                      rollingRoadMode === m.id
                        ? 'border-[#3b82f6] bg-[#141416] text-[#ececed] shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                        : 'border-[rgba(236,236,237,0.08)] bg-transparent text-[#ececed] opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className="text-[10px] font-semibold leading-tight">{m.label}</div>
                    <div className="text-[8px] font-mono opacity-60 mt-0.5 leading-tight">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Running Optical Illusion Toggles */}
            <div className="pt-2 border-t border-[rgba(236,236,237,0.08)] flex flex-col gap-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-[#ececed] opacity-80 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                  Wheel Drive Units (Spin)
                </span>
                <input
                  type="checkbox"
                  checked={wheelSpinEnabled}
                  onChange={(e) => setWheelSpinEnabled(e.target.checked)}
                  className="accent-[#3b82f6] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-[#ececed] opacity-80 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12h5l3-9 4 18 3-9h5" />
                  </svg>
                  Aero Chassis Micro-Dynamics
                </span>
                <input
                  type="checkbox"
                  checked={chassisDynamicsEnabled}
                  onChange={(e) => setChassisDynamicsEnabled(e.target.checked)}
                  className="accent-[#3b82f6] cursor-pointer"
                />
              </label>
            </div>

            {/* Telemetry Indicator */}
            <div className="pt-2 border-t border-[rgba(236,236,237,0.08)] font-mono text-[9px] text-[#ececed]/60 flex justify-between items-center">
              <span>BELT SPEED: {velocityKmH} km/h ({(velocityKmH / 3.6).toFixed(1)} m/s)</span>
              <span className="text-[#10b981]">δ* ≈ 0.0mm (Suction)</span>
            </div>
          </div>
        </section>

        {/* View Mode */}
        <section>
          <h4 className="label mb-3">View Mode</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'smoke', label: 'Smoke Flow' },
              { id: 'solid', label: 'Solid CAD' },
              { id: 'pressure', label: 'Pressure Cp' },
              { id: 'wireframe', label: 'Wireframe' }
            ].map((mode) => {
              const isActive = viewMode === mode.id || (mode.id === 'smoke' && viewMode === 'velocity');
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as ViewMode)}
                  className={`bg-[#0b0b0c] border p-3 text-left cursor-pointer transition-all rounded-[2px] ${
                    isActive
                      ? 'border-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                      : 'border-[rgba(236,236,237,0.08)] hover:border-[rgba(236,236,237,0.2)]'
                  }`}
                >
                  <span className="text-xs font-semibold block text-[#ececed]">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Smoke & Streamlines */}
        <section>
          <h4 className="label mb-3">Smoke & Streamlines</h4>
          <div className="bg-[#0b0b0c] p-4 border border-[rgba(236,236,237,0.08)] flex flex-col gap-4 rounded-[2px]">
            <div>
              <div className="label mb-2">Injector Pattern</div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setSmokeMode('rake')}
                  className={`text-[9px] font-mono py-2 px-3 border transition-all rounded-[2px] ${
                    smokeMode === 'rake'
                      ? 'bg-[#141416] border-[rgba(236,236,237,0.25)] text-[#ececed] font-medium'
                      : 'bg-transparent border-[rgba(236,236,237,0.08)] text-[#ececed] opacity-50 hover:opacity-75'
                  }`}
                >
                  Full Array
                </button>
                <button 
                  onClick={() => setSmokeMode('centerline')}
                  className={`text-[9px] font-mono py-2 px-3 border transition-all rounded-[2px] ${
                    smokeMode === 'centerline'
                      ? 'bg-[#141416] border-[rgba(236,236,237,0.25)] text-[#ececed] font-medium'
                      : 'bg-transparent border-[rgba(236,236,237,0.08)] text-[#ececed] opacity-50 hover:opacity-75'
                  }`}
                >
                  Wand
                </button>
              </div>
            </div>

            <div>
              <div className="label mb-2">Smoke Stream Palette</div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'cyan', label: 'Cyan', hex: '#38bdf8' },
                  { id: 'electric', label: 'Blue', hex: '#818cf8' },
                  { id: 'emerald', label: 'Green', hex: '#10b981' },
                  { id: 'white', label: 'White', hex: '#f8fafc' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSmokeColor(c.id as any)}
                    className={`py-1.5 px-1 text-center font-mono text-[9px] border rounded-[2px] cursor-pointer transition-all flex flex-col items-center gap-1 ${
                      smokeColor === c.id
                        ? 'border-[#3b82f6] bg-[#141416] text-[#ececed]'
                        : 'border-[rgba(236,236,237,0.08)] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 1.0s Dynamic Streamline Recalibration Control */}
            <div className="pt-3 border-t border-[rgba(236,236,237,0.08)] flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="label flex items-center gap-1.5 text-[10px]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  1.0s Recalibration
                </span>
                <button
                  onClick={() => setStreamlineRecalibrationEnabled(!streamlineRecalibrationEnabled)}
                  className={`px-2 py-0.5 text-[9px] font-mono border rounded-[2px] cursor-pointer transition-all flex items-center gap-1.5 ${
                    streamlineRecalibrationEnabled
                      ? 'border-[#38bdf8] bg-[rgba(56,189,248,0.1)] text-[#38bdf8]'
                      : 'border-[rgba(236,236,237,0.15)] bg-transparent text-[#ececed]/50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${streamlineRecalibrationEnabled ? 'bg-[#38bdf8] animate-pulse' : 'bg-[#71717a]'}`} />
                  <span>{streamlineRecalibrationEnabled ? 'ACTIVE (1.0s)' : 'PAUSED'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={triggerRecalibration}
                  className="flex-1 py-1.5 px-2 border border-[rgba(236,236,237,0.15)] bg-[#141416] hover:bg-[#1c1c1f] hover:border-[#38bdf8] text-[#ececed] text-[9px] font-mono rounded-[2px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M8 16H3v5" />
                  </svg>
                  Recalibrate Now
                </button>
              </div>

              <div className="text-[8px] font-mono text-[#ececed]/40 leading-relaxed">
                Adaptive RK2 integration re-evaluates streamline trajectories every 1.0s with continuous C1 vertex relaxation for ultra-smooth unsteady flow simulation.
              </div>
            </div>
          </div>
        </section>

        {/* Device GPU Info */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h4 className="label">Device GPU</h4>
            <span className="bg-[rgba(16,185,129,0.1)] text-[#10b981] px-2 py-0.5 text-[9px] font-mono border border-[rgba(16,185,129,0.2)] rounded-[2px]">
              {webGpuSupported ? 'Hardware' : 'WebGL2 Active'}
            </span>
          </div>
          <div className="font-mono text-[9px] leading-relaxed opacity-50 text-[#ececed]">
            Physics run natively on device via {webGpuSupported ? 'WebGPU compute' : 'optimized WebGL'} context.<br />
            Pipeline: {gpuInfo?.renderer || 'ANGLE (Hardware Graphics Pipeline)'}
          </div>
        </section>
      </div>

      {/* Aside Footer / Compute Action */}
      <div className="p-6 border-t border-[rgba(236,236,237,0.08)] shrink-0">
        <button 
          onClick={handleRunSimulation}
          disabled={isSimulating}
          className="w-full bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white border border-[rgba(255,255,255,0.15)] py-4 px-4 font-bold uppercase tracking-[0.2em] text-[11px] font-mono cursor-pointer shadow-[0_4px_24px_rgba(220,38,38,0.45)] hover:shadow-[0_4px_32px_rgba(220,38,38,0.65)] flex items-center justify-center gap-3 transition-all rounded-[2px] disabled:opacity-60"
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5"
            className={isSimulating ? 'animate-spin' : ''}
          >
            <path d="m12 14 4-4" />
            <path d="M3.34 19a10 10 0 1 1 17.32 0" />
          </svg>
          {isSimulating ? `Computing Solver (${simulationProgress}%)...` : hasRunSimulation ? 'Re-compute Run' : 'Compute Run'}
        </button>
      </div>
    </aside>
  );
}
