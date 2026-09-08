import { create } from 'zustand';

export type ViewMode = 'smoke' | 'solid' | 'wireframe' | 'pressure' | 'velocity';
export type SimQuality = 'draft' | 'standard' | 'high' | 'extreme';
export type CameraPreset = 'iso' | 'front' | 'side' | 'top' | 'rear';
export type SmokeMode = 'rake' | 'centerline' | 'wake' | 'diffuser';
export type SmokeColor = 'cyan' | 'electric' | 'emerald' | 'white';
export type WindTunnelLighting = 'studio' | 'cad';
export type InletType = 'pipeline' | 'fan';
export type RollingRoadMode = 'wide' | 'five_belt' | 'center_belt';

export interface ModelData {
  url: string;
  name: string;
  isBuiltIn?: boolean;
  builtInType?: 'gt' | 'formula';
}

export interface GeometryData {
  width: number;
  height: number;
  length: number;
  frontalArea: number; // m^2 approximation
  vertexCount: number;
  triangleCount: number;
  scaleApplied: number;
}

export interface ModelSlice {
  z: number;
  yTop: number;
  yBottom: number;
  halfWidth: number;
}

export interface ModelEnvelope {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  width: number;
  height: number;
  length: number;
  slices: ModelSlice[];
}

export interface GpuInfo {
  renderer: string;
  vendor: string;
  isIntegratedOrSoftware: boolean;
  tier: 'software' | 'integrated' | 'discrete';
  maxTextureSize?: number;
}

export type RenderQuality = 'ultra' | 'balanced' | 'performance' | 'high-fps';

interface AppState {
  modelData: ModelData | null;
  setModelData: (data: ModelData | null) => void;
  
  geometryData: GeometryData | null;
  setGeometryData: (data: GeometryData | null) => void;

  modelEnvelope: ModelEnvelope | null;
  setModelEnvelope: (env: ModelEnvelope | null) => void;

  modelScale: number;
  setModelScale: (scale: number) => void;

  modelRotationYDeg: number;
  rotateModelYDeg: (delta: number) => void;
  setModelRotationYDeg: (deg: number) => void;

  modelFlipZ: boolean;
  toggleModelFlipZ: () => void;

  resetModelTransform: () => void;

  renderQuality: RenderQuality;
  setRenderQuality: (q: RenderQuality) => void;
  
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  simQuality: SimQuality;
  setSimQuality: (quality: SimQuality) => void;

  webGpuSupported: boolean | null; // null = checking
  setWebGpuSupported: (supported: boolean) => void;

  gpuInfo: GpuInfo | null;
  setGpuInfo: (info: GpuInfo) => void;

  isLowOverheadMode: boolean;
  setIsLowOverheadMode: (enabled: boolean) => void;

  velocityKmH: number;
  setVelocityKmH: (v: number) => void;

  yawAngleDeg: number;
  setYawAngleDeg: (yaw: number) => void;

  // Flow Generator / Wind Inlet Mode
  inletType: InletType;
  setInletType: (type: InletType) => void;
  inletDistance: number; // Distance in meters upstream from vehicle front (3.5m)
  setInletDistance: (dist: number) => void;

  // Smoke & Airflow Animation Controls (Matching Wind-Tunnel Video)
  smokeMode: SmokeMode;
  setSmokeMode: (mode: SmokeMode) => void;

  smokeColor: SmokeColor;
  setSmokeColor: (color: SmokeColor) => void;

  smokeDensity: number;
  setSmokeDensity: (density: number) => void;

  turbulence: number;
  setTurbulence: (turbulence: number) => void;

  smokeRakeX: number; // Lateral X-axis position traverse (-1.5m to +1.5m)
  setSmokeRakeX: (x: number) => void;

  smokeRakeY: number;
  setSmokeRakeY: (y: number) => void;

  smokeRakeWidth: number;
  setSmokeRakeWidth: (w: number) => void;

  // Streamline Unsteady Recalibration System (1.0s periodic cycle for ultra-smooth fluid conformity)
  streamlineRecalibrationEnabled: boolean;
  setStreamlineRecalibrationEnabled: (enabled: boolean) => void;
  recalibrationIntervalSec: number;
  setRecalibrationIntervalSec: (sec: number) => void;
  recalibrationTrigger: number;
  triggerRecalibration: () => void;

  showWakeCloud: boolean;
  setShowWakeCloud: (show: boolean) => void;

  windTunnelLighting: WindTunnelLighting;
  setWindTunnelLighting: (mode: WindTunnelLighting) => void;

  // Rolling Road / Moving Ground Plane System (Treadmill)
  rollingRoadEnabled: boolean;
  setRollingRoadEnabled: (enabled: boolean) => void;
  rollingRoadMode: RollingRoadMode;
  setRollingRoadMode: (mode: RollingRoadMode) => void;
  wheelSpinEnabled: boolean;
  setWheelSpinEnabled: (enabled: boolean) => void;
  chassisDynamicsEnabled: boolean;
  setChassisDynamicsEnabled: (enabled: boolean) => void;

  // Wind Tunnel Acoustic Simulation
  windAudioEnabled: boolean;
  setWindAudioEnabled: (enabled: boolean) => void;
  windAudioVolume: number; // 0.0 to 1.0
  setWindAudioVolume: (volume: number) => void;

  cameraPreset: CameraPreset;
  setCameraPreset: (preset: CameraPreset) => void;
  cameraTrigger: number;
  triggerCameraReset: () => void;
  
  isSimulating: boolean;
  setIsSimulating: (isSimulating: boolean) => void;
  hasRunSimulation: boolean;
  setHasRunSimulation: (hasRun: boolean) => void;
  simulationProgress: number;
  setSimulationProgress: (progress: number) => void;

  loadSampleModel: (type: 'gt' | 'formula') => void;
  clearModel: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  modelData: {
    url: 'builtin://gt',
    name: 'GT_Aero_Concept.stl',
    isBuiltIn: true,
    builtInType: 'gt',
  },
  setModelData: (data) => set({ modelData: data, hasRunSimulation: false, simulationProgress: 0 }),
  
  geometryData: null,
  setGeometryData: (data) => set({ geometryData: data }),

  modelEnvelope: null,
  setModelEnvelope: (modelEnvelope) => set({ modelEnvelope }),

  modelScale: 1.0,
  setModelScale: (modelScale) => set({ modelScale }),

  modelRotationYDeg: 0,
  rotateModelYDeg: (delta) => set((state) => ({ modelRotationYDeg: (state.modelRotationYDeg + delta) % 360 })),
  setModelRotationYDeg: (deg) => set({ modelRotationYDeg: deg % 360 }),

  modelFlipZ: false,
  toggleModelFlipZ: () => set((state) => ({ modelFlipZ: !state.modelFlipZ })),

  resetModelTransform: () => set({ modelScale: 1.0, modelRotationYDeg: 0, modelFlipZ: false }),

  renderQuality: 'ultra',
  setRenderQuality: (renderQuality) => set({ renderQuality }),
  
  viewMode: 'smoke', // Default directly to the stunning smoke animation mode
  setViewMode: (mode) => set({ viewMode: mode }),
  
  simQuality: 'standard',
  setSimQuality: (quality) => set({ simQuality: quality }),

  webGpuSupported: null,
  setWebGpuSupported: (supported) => set({ webGpuSupported: supported }),

  gpuInfo: null,
  setGpuInfo: (info) => set({ 
    gpuInfo: info,
    isLowOverheadMode: info.isIntegratedOrSoftware 
  }),

  isLowOverheadMode: false,
  setIsLowOverheadMode: (enabled) => set({ isLowOverheadMode: enabled }),

  velocityKmH: 140, // 140 km/h realistic wind-tunnel airspeed
  setVelocityKmH: (velocityKmH) => set({ velocityKmH }),

  yawAngleDeg: 0,
  setYawAngleDeg: (yawAngleDeg) => set({ yawAngleDeg }),

  inletType: 'pipeline',
  setInletType: (inletType) => set({ inletType }),
  inletDistance: 3.5,
  setInletDistance: (inletDistance) => set({ inletDistance }),

  // Smoke Simulation Default Settings (Tuned to match the video)
  smokeMode: 'rake',
  setSmokeMode: (smokeMode) => set({ smokeMode }),

  smokeColor: 'cyan', // Vibrant aerodynamic glowing cyan/teal as in video
  setSmokeColor: (smokeColor) => set({ smokeColor }),

  smokeDensity: 1.3,
  setSmokeDensity: (smokeDensity) => set({ smokeDensity }),

  turbulence: 1.2,
  setTurbulence: (turbulence) => set({ turbulence }),

  smokeRakeX: 0.0, // Centerline default
  setSmokeRakeX: (smokeRakeX) => set({ smokeRakeX }),

  smokeRakeY: 0.82,
  setSmokeRakeY: (smokeRakeY) => set({ smokeRakeY }),

  smokeRakeWidth: 1.6,
  setSmokeRakeWidth: (smokeRakeWidth) => set({ smokeRakeWidth }),

  streamlineRecalibrationEnabled: true,
  setStreamlineRecalibrationEnabled: (streamlineRecalibrationEnabled) => set({ streamlineRecalibrationEnabled }),
  recalibrationIntervalSec: 1.0,
  setRecalibrationIntervalSec: (recalibrationIntervalSec) => set({ recalibrationIntervalSec }),
  recalibrationTrigger: 0,
  triggerRecalibration: () => set((state) => ({ recalibrationTrigger: state.recalibrationTrigger + 1 })),

  showWakeCloud: true,
  setShowWakeCloud: (showWakeCloud) => set({ showWakeCloud }),

  windTunnelLighting: 'studio', // Dark moody wind tunnel like the video
  setWindTunnelLighting: (windTunnelLighting) => set({ windTunnelLighting }),

  // Rolling Road / Moving Ground Plane System (Treadmill) Defaults
  rollingRoadEnabled: true,
  setRollingRoadEnabled: (rollingRoadEnabled) => set({ rollingRoadEnabled }),
  rollingRoadMode: 'wide',
  setRollingRoadMode: (rollingRoadMode) => set({ rollingRoadMode }),
  wheelSpinEnabled: true,
  setWheelSpinEnabled: (wheelSpinEnabled) => set({ wheelSpinEnabled }),
  chassisDynamicsEnabled: true,
  setChassisDynamicsEnabled: (chassisDynamicsEnabled) => set({ chassisDynamicsEnabled }),

  // Wind Tunnel Acoustic Simulation Defaults
  windAudioEnabled: false,
  setWindAudioEnabled: (windAudioEnabled) => set({ windAudioEnabled }),
  windAudioVolume: 0.65,
  setWindAudioVolume: (windAudioVolume) => set({ windAudioVolume }),

  cameraPreset: 'iso',
  setCameraPreset: (cameraPreset) => set((state) => ({ cameraPreset, cameraTrigger: state.cameraTrigger + 1 })),
  cameraTrigger: 0,
  triggerCameraReset: () => set((state) => ({ cameraTrigger: state.cameraTrigger + 1 })),
  
  isSimulating: false,
  setIsSimulating: (isSimulating) => set({ isSimulating }),
  hasRunSimulation: false,
  setHasRunSimulation: (hasRunSimulation) => set({ hasRunSimulation }),
  simulationProgress: 0,
  setSimulationProgress: (simulationProgress) => set({ simulationProgress }),

  loadSampleModel: (type: 'gt' | 'formula') => {
    set({
      modelData: {
        url: `builtin://${type}`,
        name: type === 'gt' ? 'GT_Aero_Concept.stl' : 'F1_Downforce_Wing.stl',
        isBuiltIn: true,
        builtInType: type,
      },
      viewMode: 'smoke',
      hasRunSimulation: false,
      simulationProgress: 0,
    });
  },

  clearModel: () => set({ modelData: null, geometryData: null, hasRunSimulation: false, simulationProgress: 0 }),
}));
