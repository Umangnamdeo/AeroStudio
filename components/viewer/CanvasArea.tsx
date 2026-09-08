'use client';

import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { ModelRenderer } from './ModelRenderer';
import { SmokeVisualization } from './SmokeVisualization';
import { RollingRoad } from './RollingRoad';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { useAppStore, CameraPreset } from '@/store/useAppStore';
import { Upload, Compass, Eye, ShieldCheck, Zap } from 'lucide-react';

/**
 * Handles programmatic camera view presets (Isometric, Front, Side, Top, Rear)
 * and auto-frames the camera when a model is loaded.
 */
function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const { cameraPreset, cameraTrigger, geometryData } = useAppStore();

  useEffect(() => {
    // Model center target (resting on floor at y=0, center is around y = height/2)
    const targetY = geometryData ? geometryData.height * 0.45 : 0.6;
    const target = new THREE.Vector3(0, targetY, 0);

    const dist = geometryData 
      ? Math.max(3.5, Math.max(geometryData.length, geometryData.width) * 1.35)
      : 5.5;

    let newPos = new THREE.Vector3(dist, dist * 0.65, dist);

    switch (cameraPreset) {
      case 'front':
        newPos.set(0, targetY + 0.6, Math.max(dist * 1.45, 8.2));
        break;
      case 'side':
        newPos.set(dist * 1.2, targetY + 0.2, 0);
        break;
      case 'top':
        newPos.set(0, dist * 1.6, 0.001);
        break;
      case 'rear':
        newPos.set(0, targetY + 0.4, -dist * 1.1);
        break;
      case 'iso':
      default:
        newPos.set(dist * 0.9, dist * 0.65, dist * 0.9);
        break;
    }

    camera.position.copy(newPos);
    camera.lookAt(target);

    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
  }, [camera, cameraPreset, cameraTrigger, geometryData]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minDistance={0.5}
      maxDistance={40}
      dampingFactor={0.08}
      enableDamping
    />
  );
}

/**
 * Renders the virtual wind-tunnel environment:
 * Tunnel bounding lines, flow nozzle markers, ground grid, and direction compass.
 */
function WindTunnelStage() {
  const { yawAngleDeg, geometryData } = useAppStore();

  const tunnelLength = geometryData ? Math.max(22, geometryData.length * 3.8) : 22;
  const tunnelWidth = geometryData ? Math.max(8, geometryData.width * 2.8) : 9;
  const tunnelHeight = geometryData ? Math.max(4.5, geometryData.height * 3.0) : 5.5;

  return (
    <group>
      {/* Dark Wind Tunnel Reflective Boundary Layer Plate Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[tunnelWidth, tunnelLength]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.5} metalness={0.7} />
      </mesh>

      {/* Precision Engineering Floor Grid - matching VORTIX Studio aesthetic */}
      <Grid
        infiniteGrid={false}
        args={[tunnelWidth, tunnelLength]}
        cellSize={0.5}
        sectionSize={2.5}
        cellColor="#18181c"
        sectionColor="#303038"
        cellThickness={0.8}
        sectionThickness={1.5}
        position={[0, 0, 0]}
        fadeDistance={tunnelLength * 0.7}
        fadeStrength={1.5}
      />

      {/* High-Speed Moving Ground Plane Rolling Road (Treadmill System) */}
      <RollingRoad />

      {/* Plate Border Line */}
      <lineSegments position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(tunnelWidth, tunnelLength)]} />
        <lineBasicMaterial color="#232328" />
      </lineSegments>

      {/* Wind Inlet Direction Arrow (+Z to -Z) */}
      <group position={[0, 0.05, tunnelLength * 0.48]} rotation={[0, (yawAngleDeg * Math.PI) / 180, 0]}>
        <arrowHelper args={[new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 0), 1.5, 0x3b82f6, 0.4, 0.2]} />
      </group>
    </group>
  );
}

export function CanvasArea() {
  const { 
    modelData, 
    setModelData, 
    loadSampleModel,
    renderQuality,
    yawAngleDeg,
    setYawAngleDeg,
    velocityKmH,
    setVelocityKmH,
  } = useAppStore();

  // Keyboard navigation for wind speed & yaw angle directly from keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting when user is typing in form inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === '.') {
        setYawAngleDeg(Math.min(30, Math.round(yawAngleDeg + 1)));
      } else if (e.key === 'ArrowLeft' || e.key === ',') {
        setYawAngleDeg(Math.max(-30, Math.round(yawAngleDeg - 1)));
      } else if (e.key === '0') {
        setYawAngleDeg(0);
      } else if (e.key === '=' || e.key === '+' || e.key === ']') {
        setVelocityKmH(Math.min(320, velocityKmH + 10));
      } else if (e.key === '-' || e.key === '_' || e.key === '[') {
        setVelocityKmH(Math.max(20, velocityKmH - 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [yawAngleDeg, setYawAngleDeg, velocityKmH, setVelocityKmH]);

  const dpr = useMemo(() => {
    if (renderQuality === 'ultra') return [1, 2] as [number, number];
    if (renderQuality === 'performance') return 1;
    return [1, 1.5] as [number, number];
  }, [renderQuality]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModelData({ url, name: file.name });
    }
  }, [setModelData]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModelData({ url, name: file.name });
    }
  }, [setModelData]);

  return (
    <CanvasErrorBoundary>
      <div 
        className="relative w-full h-full bg-transparent flex items-center justify-center overflow-hidden select-none"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".stl,.obj,.glb,.gltf"
          className="hidden"
        />

        {/* Empty State / Quick Model Selection */}
        {!modelData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none p-6">
            <div className="w-96 max-w-full bg-[#141416]/95 backdrop-blur-md border border-[rgba(236,236,237,0.15)] rounded-[4px] p-6 flex flex-col items-center text-center shadow-2xl pointer-events-auto">
              <div className="w-12 h-12 rounded-[2px] bg-[#0b0b0c] border border-[rgba(236,236,237,0.15)] flex items-center justify-center mb-3 text-[#3b82f6]">
                <Upload className="w-5 h-5" />
              </div>
              
              <h3 className="font-semibold text-sm text-[#ececed] mb-1 font-syne">
                Virtual Wind Tunnel Ready
              </h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed font-sans">
                Drop your automotive 3D CAD model (.STL, .OBJ, .GLB) or select a built-in baseline vehicle.
              </p>

              <div className="w-full flex flex-col gap-2 mb-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 bg-[#3b82f6] hover:bg-blue-600 text-white text-xs font-semibold rounded-[2px] transition-colors font-mono uppercase tracking-wider"
                >
                  Browse Computer Files
                </button>

                <div className="flex items-center gap-2 my-1 text-zinc-500 text-[10px] uppercase font-mono">
                  <div className="flex-1 h-px bg-[rgba(236,236,237,0.1)]" />
                  <span>or load baseline</span>
                  <div className="flex-1 h-px bg-[rgba(236,236,237,0.1)]" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => loadSampleModel('gt')}
                    className="py-2 px-2 bg-[#0b0b0c] hover:border-[rgba(236,236,237,0.25)] text-[#ececed] text-xs rounded-[2px] border border-[rgba(236,236,237,0.12)] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#3b82f6]" />
                    <span>GT Coupe</span>
                  </button>
                  <button
                    onClick={() => loadSampleModel('formula')}
                    className="py-2 px-2 bg-[#0b0b0c] hover:border-[rgba(236,236,237,0.25)] text-[#ececed] text-xs rounded-[2px] border border-[rgba(236,236,237,0.12)] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#3b82f6]" />
                    <span>F1 Wing</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Auto unit normalization & WebGPU enabled</span>
              </div>
            </div>
          </div>
        )}

        {/* 3D WebGL Canvas with High Performance Three.js Setup */}
        <Canvas
          dpr={dpr}
          gl={{
            antialias: renderQuality !== 'performance',
            powerPreference: 'high-performance',
            precision: renderQuality === 'ultra' ? 'highp' : 'mediump',
            failIfMajorPerformanceCaveat: false,
          }}
          camera={{ position: [5, 3.5, 5], fov: 42 }}
        >
          <color attach="background" args={['#0b0b0c']} />

          {/* Moody Automotive Wind-Tunnel Studio Lighting */}
          <ambientLight intensity={0.55} color="#0c1a2e" />
          <directionalLight position={[5, 7, 5]} intensity={1.35} color="#f8fafc" />
          <directionalLight position={[-5, 4, 2]} intensity={0.45} color="#38bdf8" />
          <directionalLight position={[0, 6, -7]} intensity={1.6} color="#3b82f6" />
          <directionalLight position={[0, -3, 0]} intensity={0.25} color="#091322" />

          {/* Virtual Wind Tunnel Test Section */}
          <WindTunnelStage />

          {/* Loaded Vehicle Model */}
          {modelData && <ModelRenderer data={modelData} />}

          {/* Aerodynamic Wind-Tunnel Smoke Ribbons & Volumetric Wake */}
          {modelData && <SmokeVisualization />}

          {/* Interactive Orbit Camera Controls */}
          <CameraController />
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}
