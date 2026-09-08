'use client';

import { useAppStore, CameraPreset } from '@/store/useAppStore';

export function MetricsOverlay() {
  const { 
    geometryData, 
    velocityKmH, 
    yawAngleDeg, 
    inletType,
    inletDistance,
    smokeRakeX,
    streamlineRecalibrationEnabled,
    windAudioEnabled,
    setWindAudioEnabled,
    cameraPreset, 
    setCameraPreset,
    isSimulating,
    hasRunSimulation,
    simulationProgress
  } = useAppStore();

  // Analytical aerodynamic calculations
  const v = velocityKmH / 3.6;
  const rho = 1.225; // kg/m^3
  const dynamicPressure = 0.5 * rho * v * v; // Pascals (N/m^2)

  const frontalArea = geometryData ? geometryData.frontalArea : 2.18;
  const length = geometryData ? geometryData.length : 4.4;
  const height = geometryData ? geometryData.height : 1.24;
  const width = geometryData ? geometryData.width : 1.96;

  const fineness = length / Math.max(0.5, Math.sqrt(frontalArea));
  const hwRatio = height / Math.max(0.5, width);

  const baseCd = 0.32 - (fineness - 2.5) * 0.03 + (hwRatio - 0.7) * 0.1;
  const yawFactor = 1.0 + Math.pow(Math.sin((yawAngleDeg * Math.PI) / 180), 2) * 1.5;
  const cd = Math.max(0.18, Math.min(0.65, baseCd * yawFactor));

  const cl = -0.05 + (hwRatio - 0.7) * 0.15;
  const liftForce = dynamicPressure * cl * frontalArea;

  const camPresets: CameraPreset[] = ['iso', 'front', 'side', 'top', 'rear'];

  return (
    <div className="absolute inset-0 pointer-events-none z-10 w-full h-full overflow-hidden select-none">
      {/* SVG Geometric Overlay Lines */}
      {hasRunSimulation && (
        <svg 
          className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="20%" y1="25%" x2="40%" y2="52%" stroke="#3b82f6" strokeWidth="0.5" />
          <line x1="85%" y1="35%" x2="68%" y2="55%" stroke="#3b82f6" strokeWidth="0.5" />
          <circle cx="40%" cy="52%" r="2" fill="#3b82f6" />
          <circle cx="68%" cy="55%" r="2" fill="#3b82f6" />
        </svg>
      )}

      {/* Top Left Telemetry Area */}
      <div className="absolute top-10 left-10 flex flex-col gap-6 pointer-events-none max-w-sm">
        {/* State A: Standby - Prior to Compute Run */}
        {!hasRunSimulation && !isSimulating && (
          <div className="bg-[#141416]/85 border border-[rgba(236,236,237,0.12)] p-5 rounded backdrop-blur-md shadow-2xl pointer-events-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse" />
              <div className="label text-[#fca5a5]">Solver Standby · Ready</div>
            </div>
            <p className="text-xs text-[#ececed]/70 font-mono leading-relaxed mb-3">
              Vehicle model initialized in virtual tunnel. Click <span className="text-[#f87171] font-bold">COMPUTE RUN</span> to calculate flow aerodynamics, surface pressure, and drag coefficients.
            </p>
            <div className="flex items-center justify-between font-mono text-[10px] text-[#ececed]/40 border-t border-[rgba(236,236,237,0.08)] pt-2">
              <span>AIRSPEED: {velocityKmH} km/h</span>
              <span>MESH: {geometryData ? `${(geometryData.triangleCount / 1000).toFixed(1)}k Tris` : '24.5k Tris'}</span>
            </div>
          </div>
        )}

        {/* State B: Computing Run in progress */}
        {isSimulating && (
          <div className="bg-[#141416]/95 border border-[rgba(220,38,38,0.3)] p-5 rounded backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-ping" />
                <div className="label text-[#f87171]">Computing CFD Solver</div>
              </div>
              <span className="font-mono text-xs text-[#dc2626] font-bold">{simulationProgress}%</span>
            </div>
            <div className="w-full bg-[#0b0b0c] h-1.5 rounded-full overflow-hidden my-2 border border-[rgba(236,236,237,0.1)]">
              <div 
                className="bg-gradient-to-r from-[#dc2626] to-[#ef4444] h-full transition-all duration-150 ease-out"
                style={{ width: `${simulationProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-[9px] text-[#ececed]/50 mt-2">
              <span>RESIDUAL: {(0.0012 * Math.max(0.01, 1 - simulationProgress / 105)).toExponential(2)}</span>
              <span>ITERATION {Math.round(simulationProgress * 1.5)} / 150</span>
            </div>
          </div>
        )}

        {/* State C: Solved Results Display */}
        {hasRunSimulation && !isSimulating && (
          <div className="flex flex-col gap-8 transition-opacity duration-500 animate-fadeIn">
            {/* Stat Block 1: Drag */}
            <div>
              <div className="label flex items-center gap-2">
                <span>Drag Coefficient (Cd)</span>
                <span className="text-[9px] font-mono text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded border border-[#10b981]/20">SOLVED</span>
              </div>
              <div className="text-[3.5rem] font-light tracking-[-0.04em] leading-none mb-1 text-[#ececed] font-sans">
                {cd.toFixed(3)}
              </div>
              <div className="w-10 h-[2px] bg-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.4)] mt-3" />
            </div>

            {/* Stat Block 2: Downforce */}
            <div>
              <div className="label">Downforce</div>
              <div className="text-[3.5rem] font-light tracking-[-0.04em] leading-none mb-1 text-[#ececed] font-sans flex items-baseline">
                <span>{Math.abs(liftForce).toFixed(0)}</span>
                <span className="text-base opacity-40 ml-1 font-mono font-normal">N</span>
              </div>
              <div className="w-10 h-[2px] bg-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.4)] mt-3" />
            </div>
          </div>
        )}
      </div>

      {/* Mid Right Flow Separation Zone (Only displayed after compute run) */}
      {hasRunSimulation && !isSimulating && (
        <div className="absolute top-[35%] right-10 text-right pointer-events-none transition-opacity duration-500">
          <div className="label">Flow Separation Zone</div>
          <div className="w-10 h-[2px] bg-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.4)] mt-3 ml-auto" />
        </div>
      )}

      {/* Bottom Left Flow Details */}
      <div className="absolute bottom-10 left-10 flex items-end gap-12 pointer-events-none">
        {hasRunSimulation && !isSimulating && (
          <div>
            <div className="label">Front/Rear Balance</div>
            <div className="font-mono text-xs mt-1 text-[#ececed]">48.5% / 51.5%</div>
          </div>
        )}
        <div>
          <div className="label">Inlet Source</div>
          <div className="font-mono text-xs mt-1 text-[#ececed] flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${inletType === 'fan' ? 'bg-[#38bdf8] animate-pulse' : 'bg-[#3b82f6]'}`} />
            <span>{inletType === 'fan' ? 'Jet Turbofan' : 'Pipeline Rake'}</span>
          </div>
        </div>
        <div>
          <div className="label">Rolling Road (Treadmill)</div>
          <div className="font-mono text-xs mt-1 text-[#ececed] flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${useAppStore.getState().rollingRoadEnabled ? 'bg-[#10b981] animate-pulse' : 'bg-[#71717a]'}`} />
            <span>{useAppStore.getState().rollingRoadEnabled ? `${velocityKmH} km/h · Ground Sync` : 'Static Floor'}</span>
          </div>
        </div>
        <div>
          <div className="label">Inlet Position (Z / X)</div>
          <div className="font-mono text-xs mt-1 text-[#ececed]">
            {inletDistance.toFixed(1)} m {smokeRakeX !== 0 ? `· X: ${smokeRakeX > 0 ? '+' : ''}${smokeRakeX.toFixed(2)}m` : '· Centered'}
          </div>
        </div>
        <div>
          <div className="label">Streamlines</div>
          <div className="font-mono text-xs mt-1 text-[#ececed] flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${streamlineRecalibrationEnabled ? 'bg-[#38bdf8] animate-pulse' : 'bg-[#71717a]'}`} />
            <span>{streamlineRecalibrationEnabled ? '1.0s Dynamic Sync' : 'Static Path'}</span>
          </div>
        </div>
        <div>
          <div className="label">Tunnel Audio</div>
          <button
            onClick={() => setWindAudioEnabled(!windAudioEnabled)}
            className="font-mono text-xs mt-1 text-[#ececed] flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            title="Toggle Wind Tunnel Aeroacoustics Audio"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${windAudioEnabled ? 'bg-[#38bdf8] animate-pulse' : 'bg-[#71717a]'}`} />
            <span>{windAudioEnabled ? 'Acoustic Synced' : 'Muted'}</span>
          </button>
        </div>
        <div>
          <div className="label">Wind Speed</div>
          <div className="font-mono text-xs mt-1 text-[#ececed]">{velocityKmH} km/h</div>
        </div>
        {yawAngleDeg !== 0 && (
          <div>
            <div className="label">Angle of Attack</div>
            <div className="font-mono text-xs mt-1 text-[#ececed]">{yawAngleDeg.toFixed(1)}°</div>
          </div>
        )}
      </div>

      {/* Bottom Center: Camera Navigation Bar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#141416] border border-[rgba(236,236,237,0.15)] p-1 flex items-center gap-0.5 rounded pointer-events-auto z-20 shadow-xl">
        <div className="flex items-center px-3 border-r border-[rgba(236,236,237,0.08)] mr-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        {camPresets.map((preset) => {
          const isActive = cameraPreset === preset;
          return (
            <button
              key={preset}
              onClick={() => setCameraPreset(preset)}
              className={`bg-transparent border-none py-2 px-4 text-[10px] font-mono uppercase cursor-pointer transition-all rounded-[2px] ${
                isActive
                  ? 'opacity-100 bg-[#0b0b0c] text-[#3b82f6] shadow-sm font-semibold'
                  : 'opacity-50 text-[#ececed] hover:opacity-80'
              }`}
            >
              {preset}
            </button>
          );
        })}
      </div>

      {/* Bottom Right: Pressure Legend (Shown after compute run) */}
      {hasRunSimulation && !isSimulating && (
        <div className="absolute bottom-10 right-10 w-[220px] pointer-events-none transition-opacity duration-500">
          <div className="label text-center mb-2">Surface Pressure Map ΔP</div>
          <div className="h-1 w-full bg-gradient-to-r from-[#2196F3] via-[#4CAF50] to-[#F44336] my-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]" />
          <div className="label flex justify-between opacity-30 text-[9px]">
            <span>Low P</span>
            <span>High P</span>
          </div>
        </div>
      )}
    </div>
  );
}

