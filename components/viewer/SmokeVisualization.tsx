'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, SmokeColor } from '@/store/useAppStore';
import {
  generateStreamlineSeeds,
  traceStreamline,
  resampleStreamlinePoints,
  computeRibbonPositions,
  getAerodynamicVelocity,
  StreamlineSeed,
} from '@/lib/aerodynamics/streamlines';
import { TurbofanEngine } from './TurbofanEngine';

/**
 * Generates an offscreen soft procedural smoke puff texture for volumetric wake eddies.
 * Emulates the authentic diffuse vaporized oil smoke in aerodynamic wind tunnels.
 */
function createVolumetricSmokeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 64;
  const cy = 64;

  // Multi-layered soft Gaussian radial falloff
  const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 64);
  radGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  radGrad.addColorStop(0.25, 'rgba(215, 245, 255, 0.65)');
  radGrad.addColorStop(0.55, 'rgba(100, 205, 255, 0.28)');
  radGrad.addColorStop(0.82, 'rgba(10, 140, 220, 0.08)');
  radGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Constructs a continuous 3D Ribbon Mesh (quad strip) along a streamline 3D curve.
 */
function createRibbonGeometry(curvePoints: THREE.Vector3[], ribbonWidth: number): THREE.BufferGeometry {
  const n = curvePoints.length;
  if (n < 2) return new THREE.BufferGeometry();

  const vertexCount = n * 2;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const normals = new Float32Array(vertexCount * 3);
  const indices: number[] = [];

  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < n; i++) {
    const p = curvePoints[i];
    // Tangent direction
    const prev = curvePoints[Math.max(0, i - 1)];
    const next = curvePoints[Math.min(n - 1, i + 1)];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    if (tangent.lengthSq() < 0.001) tangent.set(0, 0, -1);

    // Lateral binormal across the ribbon width
    let side = new THREE.Vector3().crossVectors(tangent, up).normalize();
    if (side.lengthSq() < 0.001) side.set(1, 0, 0);

    // Progressive width: narrow at nozzle, slightly broader in wake
    const progress = i / (n - 1);
    const w = ribbonWidth * (0.85 + progress * 0.45);

    // Left and right ribbon edges
    const pLeft = p.clone().addScaledVector(side, -w * 0.5);
    const pRight = p.clone().addScaledVector(side, w * 0.5);

    // Left vertex
    positions[i * 6 + 0] = pLeft.x;
    positions[i * 6 + 1] = pLeft.y;
    positions[i * 6 + 2] = pLeft.z;

    // Right vertex
    positions[i * 6 + 3] = pRight.x;
    positions[i * 6 + 4] = pRight.y;
    positions[i * 6 + 5] = pRight.z;

    // UVs
    uvs[i * 4 + 0] = progress;
    uvs[i * 4 + 1] = 0.0;
    uvs[i * 4 + 2] = progress;
    uvs[i * 4 + 3] = 1.0;

    // Normals (upward facing)
    normals[i * 6 + 0] = 0;
    normals[i * 6 + 1] = 1;
    normals[i * 6 + 2] = 0;
    normals[i * 6 + 3] = 0;
    normals[i * 6 + 4] = 1;
    normals[i * 6 + 5] = 0;

    // Triangle indices
    if (i < n - 1) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;
      indices.push(v0, v1, v2);
      indices.push(v1, v3, v2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();

  return geometry;
}

/**
 * Returns the color palette values for the selected smoke color mode
 */
function getSmokeColorValues(color: SmokeColor) {
  switch (color) {
    case 'electric':
      return {
        core: new THREE.Color('#eff6ff'), // Bright white-blue core
        edge: new THREE.Color('#2563eb'), // Deep electric blue
        halo: new THREE.Color('#1d4ed8'),
      };
    case 'emerald':
      return {
        core: new THREE.Color('#ecfdf5'), // Mint core
        edge: new THREE.Color('#10b981'), // Aerodynamic emerald
        halo: new THREE.Color('#047857'),
      };
    case 'white':
      return {
        core: new THREE.Color('#ffffff'), // Clean white core
        edge: new THREE.Color('#cbd5e1'), // Slate smoke
        halo: new THREE.Color('#64748b'),
      };
    case 'cyan':
    default:
      // Exact aesthetic from the wind tunnel video
      return {
        core: new THREE.Color('#e0f7fa'), // Luminous ice cyan core
        edge: new THREE.Color('#00e5ff'), // Electric glowing cyan edge
        halo: new THREE.Color('#0284c7'), // Deep blue aerodynamic haze
      };
  }
}

/**
 * Creates custom GLSL ShaderMaterial for continuous glowing aerodynamic smoke ribbons
 */
function createRibbonShaderMaterial(color: SmokeColor, density: number): THREE.ShaderMaterial {
  const pal = getSmokeColorValues(color);

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 1.0 },
      uColorCore: { value: pal.core },
      uColorEdge: { value: pal.edge },
      uDensity: { value: density },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSpeed;
      uniform vec3 uColorCore;
      uniform vec3 uColorEdge;
      uniform float uDensity;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        // Across ribbon width: 0.0 at left, 0.5 at center, 1.0 at right
        float distFromCenter = abs(vUv.y - 0.5) * 2.0;

        // Gaussian core glow (intense bright white-cyan center, matching video)
        float coreGlow = exp(-distFromCenter * distFromCenter * 5.5);
        // Soft outer vapor falloff
        float edgeHalo = exp(-distFromCenter * distFromCenter * 1.6) * 0.45;

        // Continuous high-speed flow advection wave along ribbon
        float flowWave = sin(vUv.x * 45.0 - uTime * uSpeed * 3.2);
        float flowPulse = 0.88 + 0.12 * flowWave;

        // Soft fade-in at the injector nozzle (Z upstream)
        float inletFade = smoothstep(0.0, 0.05, vUv.x);
        // Soft fade-out / dispersion as stream enters deep wake
        float wakeFade = smoothstep(1.0, 0.72, vUv.x);

        // Color blending: core glow is white-hot, edge is electric cyan
        vec3 color = mix(uColorEdge, uColorCore, coreGlow);

        float alpha = (coreGlow * 1.1 + edgeHalo) * flowPulse * inletFade * wakeFade * uDensity;

        gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function resetWakeParticle(
  i: number,
  s: {
    pos: Float32Array;
    vel: Float32Array;
    rot: Float32Array;
    rotSpeed: Float32Array;
    scale: Float32Array;
    life: Float32Array;
    maxLife: Float32Array;
  },
  emitters: { x: number; y: number; z: number }[],
  staggerProgress: boolean = false
) {
  // Pick random emitter separation point
  const origin = emitters[Math.floor(Math.random() * emitters.length)];
  const spreadX = (Math.random() - 0.5) * 0.18;
  const spreadY = (Math.random() - 0.5) * 0.12;
  const spreadZ = (Math.random() - 0.5) * 0.15;

  s.pos[i * 3 + 0] = origin.x + spreadX;
  s.pos[i * 3 + 1] = origin.y + spreadY;
  s.pos[i * 3 + 2] = origin.z + spreadZ;

  // Velocity: moving downstream with downwash and outward vortex spread
  s.vel[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
  s.vel[i * 3 + 1] = -0.35 + (Math.random() - 0.5) * 0.3; // downwash
  s.vel[i * 3 + 2] = -2.2 - Math.random() * 0.8; // downstream speed

  s.rot[i] = Math.random() * Math.PI * 2;
  s.rotSpeed[i] = (Math.random() - 0.5) * 1.5;
  s.scale[i] = 0.2 + Math.random() * 0.15; // starts compact
  s.maxLife[i] = 1.4 + Math.random() * 0.8;
  s.life[i] = staggerProgress ? Math.random() * s.maxLife[i] : 0;
}

/**
 * High-performance aerodynamic smoke visualization.
 * Matches the reference wind-tunnel video with:
 * 1. Continuous luminous streamline ribbons conforming to car contours.
 * 2. Billowing, swirling volumetric wake smoke clouds.
 * 3. Real-time airspeed scaling, crosswind deflection, and interactive rake controls.
 */
export function SmokeVisualization() {
  const {
    velocityKmH,
    yawAngleDeg,
    inletType,
    inletDistance,
    smokeMode,
    smokeColor,
    smokeDensity,
    turbulence,
    smokeRakeX,
    smokeRakeY,
    smokeRakeWidth,
    showWakeCloud,
    viewMode,
    modelEnvelope,
    streamlineRecalibrationEnabled,
    recalibrationIntervalSec,
    recalibrationTrigger,
  } = useAppStore();

  const ribbonsGroupRef = useRef<THREE.Group>(null);
  const wakeMeshRef = useRef<THREE.InstancedMesh>(null);

  // Speed factor normalized to ~1.0 at 140 km/h
  const speedFactor = Math.max(0.2, velocityKmH / 140);
  const yawRad = (yawAngleDeg * Math.PI) / 180;
  const effectiveInletDistance = inletDistance ?? 3.5;

  // Fixed number of uniformly spaced samples along each streamline ribbon.
  // Guarantees exact 1-to-1 vertex correspondence for smooth morphing across 1-second recalibrations.
  const FIXED_RIBBON_POINTS = 160;

  // Ref holding mutable streamline targets to enable smooth in-place GPU vertex updates without garbage collection
  const ribbonDataRef = useRef<{
    targetPositions: Float32Array[];
    seeds: StreamlineSeed[];
    lastRecalibrationTime: number;
  }>({
    targetPositions: [],
    seeds: [],
    lastRecalibrationTime: 0,
  });

  const prevTriggerRef = useRef(recalibrationTrigger);

  // Create smoke puff billboard texture safely with useMemo
  const smokeTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createVolumetricSmokeTexture();
  }, []);

  useEffect(() => {
    return () => {
      smokeTexture?.dispose();
    };
  }, [smokeTexture]);

  // 1. Generate Streamline Seeds & Uniformly-Sampled Ribbon Geometries dynamically conforming to Model Envelope
  const ribbonSetup = useMemo(() => {
    const fanScale = modelEnvelope ? Math.max(0.8, Math.min(1.35, modelEnvelope.height * 0.85)) : 1.0;
    const seeds = generateStreamlineSeeds(
      smokeMode,
      inletType,
      smokeRakeY,
      smokeRakeWidth,
      modelEnvelope,
      effectiveInletDistance,
      yawRad,
      fanScale,
      smokeRakeX
    );

    const geometries: THREE.BufferGeometry[] = [];
    const targets: Float32Array[] = [];

    seeds.forEach((seed) => {
      const rawPoints = traceStreamline(seed, yawRad, 0.05, 180, 0, turbulence, modelEnvelope);
      const resampled = resampleStreamlinePoints(rawPoints, FIXED_RIBBON_POINTS);
      const geom = createRibbonGeometry(resampled, seed.width);
      geometries.push(geom);

      // Initialize target buffer matching initial vertex positions
      const initialPos = geom.getAttribute('position').array as Float32Array;
      targets.push(new Float32Array(initialPos));
    });

    return { geometries, seeds, targets };
  }, [smokeMode, inletType, smokeRakeX, smokeRakeY, smokeRakeWidth, yawRad, turbulence, modelEnvelope, effectiveInletDistance]);

  const ribbonGeometries = ribbonSetup.geometries;

  // Synchronize mutable simulation refs outside of render
  useEffect(() => {
    ribbonDataRef.current = {
      targetPositions: ribbonSetup.targets,
      seeds: ribbonSetup.seeds,
      lastRecalibrationTime: 0,
    };
  }, [ribbonSetup]);

  // Ribbon material with custom shader
  const ribbonMaterial = useMemo(() => {
    return createRibbonShaderMaterial(smokeColor, smokeDensity);
  }, [smokeColor, smokeDensity]);

  // Clean up geometries & material on unmount / recreate
  useEffect(() => {
    return () => {
      ribbonGeometries.forEach((g) => g.dispose());
      ribbonMaterial.dispose();
    };
  }, [ribbonGeometries, ribbonMaterial]);

  // 2. Volumetric Wake Smoke Puff Particle Setup
  const PARTICLE_COUNT = 450;
  const particleState = useRef<{
    pos: Float32Array;
    vel: Float32Array;
    rot: Float32Array;
    rotSpeed: Float32Array;
    scale: Float32Array;
    life: Float32Array;
    maxLife: Float32Array;
  }>({
    pos: new Float32Array(PARTICLE_COUNT * 3),
    vel: new Float32Array(PARTICLE_COUNT * 3),
    rot: new Float32Array(PARTICLE_COUNT),
    rotSpeed: new Float32Array(PARTICLE_COUNT),
    scale: new Float32Array(PARTICLE_COUNT),
    life: new Float32Array(PARTICLE_COUNT),
    maxLife: new Float32Array(PARTICLE_COUNT),
  });

  // Dynamic separation line emitter origins positioned right at the vehicle trailing edges
  const emitterOrigins = useMemo(() => {
    if (modelEnvelope) {
      const { minY, maxY, minZ, width, height, length, centerX } = modelEnvelope;
      const cX = centerX ?? 0;
      return [
        // Roof trailing edge
        { x: cX - width * 0.18, y: maxY * 0.94, z: minZ + length * 0.3 },
        { x: cX, y: maxY * 0.96, z: minZ + length * 0.3 },
        { x: cX + width * 0.18, y: maxY * 0.94, z: minZ + length * 0.3 },
        // Rear deck / spoiler trailing edge
        { x: cX - width * 0.42, y: minY + height * 0.72, z: minZ },
        { x: cX - width * 0.2, y: minY + height * 0.7, z: minZ },
        { x: cX, y: minY + height * 0.7, z: minZ },
        { x: cX + width * 0.2, y: minY + height * 0.7, z: minZ },
        { x: cX + width * 0.42, y: minY + height * 0.72, z: minZ },
        // Side mirrors / flanks
        { x: cX - width * 0.52, y: minY + height * 0.55, z: minZ + length * 0.55 },
        { x: cX + width * 0.52, y: minY + height * 0.55, z: minZ + length * 0.55 },
        // Diffuser exit / lower bumper
        { x: cX - width * 0.35, y: minY + 0.14, z: minZ },
        { x: cX + width * 0.35, y: minY + 0.14, z: minZ },
        { x: cX, y: minY + 0.12, z: minZ },
      ];
    }
    return [
      // Fallback default
      { x: -0.3, y: 1.22, z: -0.6 },
      { x: 0.0, y: 1.25, z: -0.6 },
      { x: 0.3, y: 1.22, z: -0.6 },
      { x: -0.75, y: 1.15, z: -1.95 },
      { x: -0.35, y: 1.14, z: -1.95 },
      { x: 0.0, y: 1.14, z: -1.95 },
      { x: 0.35, y: 1.14, z: -1.95 },
      { x: 0.75, y: 1.15, z: -1.95 },
      { x: -0.92, y: 0.84, z: 0.52 },
      { x: 0.92, y: 0.84, z: 0.52 },
      { x: -0.85, y: 0.45, z: -1.5 },
      { x: 0.85, y: 0.45, z: -1.5 },
      { x: 0.0, y: 0.24, z: -2.1 },
    ];
  }, [modelEnvelope]);

  // Initialize wake particles
  useEffect(() => {
    const s = particleState.current;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      resetWakeParticle(i, s, emitterOrigins, true);
    }
  }, [emitterOrigins]);

  // Helper matrices for instanced mesh updates
  const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);
  const dummyPos = useMemo(() => new THREE.Vector3(), []);
  const dummyQuat = useMemo(() => new THREE.Quaternion(), []);
  const dummyScale = useMemo(() => new THREE.Vector3(), []);

  // Main Render Loop Animation
  useFrame((state, delta) => {
    const elapsedTime = state.clock.getElapsedTime();

    // 1. Recalibrate Streamlines every 1.0s or on user manual trigger
    const shouldRecalibrate =
      (streamlineRecalibrationEnabled && (elapsedTime - ribbonDataRef.current.lastRecalibrationTime >= recalibrationIntervalSec)) ||
      (recalibrationTrigger !== prevTriggerRef.current);

    if (shouldRecalibrate && ribbonDataRef.current.seeds.length > 0) {
      prevTriggerRef.current = recalibrationTrigger;
      ribbonDataRef.current.lastRecalibrationTime = elapsedTime;

      const seeds = ribbonDataRef.current.seeds;
      const targets = ribbonDataRef.current.targetPositions;

      for (let sIdx = 0; sIdx < seeds.length; sIdx++) {
        const seed = seeds[sIdx];
        const rawPoints = traceStreamline(seed, yawRad, 0.05, 180, elapsedTime, turbulence, modelEnvelope);
        const resampled = resampleStreamlinePoints(rawPoints, FIXED_RIBBON_POINTS);
        if (!targets[sIdx] || targets[sIdx].length !== FIXED_RIBBON_POINTS * 6) {
          targets[sIdx] = new Float32Array(FIXED_RIBBON_POINTS * 6);
        }
        computeRibbonPositions(resampled, seed.width, targets[sIdx]);
      }
    }

    // 2. Smoothly Relax/Morph Ribbon Vertices towards Recalibrated Flow Coordinates
    if (ribbonsGroupRef.current) {
      const targets = ribbonDataRef.current.targetPositions;
      const lerpAlpha = Math.min(1.0, delta * 3.8); // Fluid relaxation rate

      ribbonsGroupRef.current.children.forEach((child, idx) => {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry as THREE.BufferGeometry;
        const target = targets[idx];

        if (geom && target) {
          const posAttr = geom.getAttribute('position') as THREE.BufferAttribute | undefined;
          if (posAttr) {
            const curr = posAttr.array as Float32Array;
            if (curr.length === target.length) {
              let moved = false;
              for (let k = 0; k < curr.length; k++) {
                const diff = target[k] - curr[k];
                if (Math.abs(diff) > 0.00005) {
                  curr[k] += diff * lerpAlpha;
                  moved = true;
                }
              }
              if (moved) {
                posAttr.needsUpdate = true;
              }
            }
          }
        }

        // Animate Ribbon Shader (Time & Flow)
        const mat = mesh.material as THREE.ShaderMaterial;
        if (mat && mat.uniforms) {
          mat.uniforms.uTime.value = elapsedTime;
          mat.uniforms.uSpeed.value = speedFactor;
        }
      });
    }

    // 3. Animate Volumetric Wake Particles
    if (wakeMeshRef.current && showWakeCloud) {
      const s = particleState.current;
      const effectiveDt = Math.min(delta, 0.05) * speedFactor;
      const tailLimit = modelEnvelope ? modelEnvelope.minZ - Math.max(2.8, modelEnvelope.length * 0.75) : -4.8;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        s.life[i] += effectiveDt;

        if (s.life[i] >= s.maxLife[i] || s.pos[i * 3 + 2] < tailLimit) {
          resetWakeParticle(i, s, emitterOrigins, false);
        }

        const normAge = s.life[i] / s.maxLife[i];

        // Advect with velocity field conforming to active vehicle geometry
        const v = getAerodynamicVelocity(
          s.pos[i * 3 + 0],
          s.pos[i * 3 + 1],
          s.pos[i * 3 + 2],
          yawRad,
          turbulence,
          state.clock.getElapsedTime(),
          modelEnvelope
        );

        s.pos[i * 3 + 0] += v.x * effectiveDt * 2.2;
        s.pos[i * 3 + 1] += (v.y * 1.2 + s.vel[i * 3 + 1] * 0.5) * effectiveDt;
        s.pos[i * 3 + 2] += (v.z * 2.8 + s.vel[i * 3 + 2]) * effectiveDt;

        // Rotate particle slowly as it rolls
        s.rot[i] += s.rotSpeed[i] * effectiveDt;

        // Expansion: smoke puff balloons outward in the wake (as in video)
        const currentScale = (0.22 + normAge * 1.15) * (smokeDensity * 0.85);

        dummyPos.set(s.pos[i * 3 + 0], s.pos[i * 3 + 1], s.pos[i * 3 + 2]);
        dummyQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), s.rot[i]);
        dummyScale.set(currentScale, currentScale, currentScale);

        dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
        wakeMeshRef.current.setMatrixAt(i, dummyMatrix);
      }

      wakeMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  // Only render when in smoke or velocity view mode (or default)
  const isVisible = viewMode === 'smoke' || viewMode === 'velocity' || viewMode === 'solid';
  if (!isVisible) return null;

  const pal = getSmokeColorValues(smokeColor);

  // Compute dynamic rake coordinates matching streamline seeds with increased distance
  const groundY = modelEnvelope ? modelEnvelope.minY : 0.0;
  const generatorY = groundY + smokeRakeY;
  const rakeZ = modelEnvelope ? modelEnvelope.maxZ + effectiveInletDistance : 2.2 + effectiveInletDistance;
  const rakeCenterX = (modelEnvelope?.centerX ?? 0) + smokeRakeX;
  const effectiveRakeWidth = smokeRakeWidth * (modelEnvelope ? (modelEnvelope.width * 0.9) / 1.6 : 1.0);
  const fanScale = modelEnvelope ? Math.max(0.8, Math.min(1.35, modelEnvelope.height * 0.85)) : 1.0;

  return (
    <group>
      {/* 1. Luminous Aerodynamic Streamline Ribbons */}
      <group ref={ribbonsGroupRef}>
        {ribbonGeometries.map((geom, idx) => (
          <mesh
            key={idx}
            geometry={geom}
            material={ribbonMaterial}
            frustumCulled={false}
          />
        ))}
      </group>

      {/* 2. Aerodynamic Flow Generator: Jet Turbofan Engine vs Pipeline Injector */}
      {inletType === 'fan' ? (
        <TurbofanEngine
          position={[rakeCenterX, generatorY, rakeZ]}
          yawAngleDeg={yawAngleDeg}
          velocityKmH={velocityKmH}
          smokeColor={smokeColor}
          scale={fanScale}
        />
      ) : (
        <group position={[rakeCenterX, 0, rakeZ]} rotation={[0, (yawAngleDeg * Math.PI) / 180, 0]}>
          {/* Manifold Bar at generatorY */}
          <group position={[0, generatorY, 0]}>
            {/* Horizontal rake manifold bar (oriented along X) */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.02, 0.02, effectiveRakeWidth * 1.15, 16]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Support pylons extending down to floor Y = 0 */}
            <mesh position={[-effectiveRakeWidth * 0.52, -generatorY * 0.5, 0]}>
              <cylinderGeometry args={[0.016, 0.016, generatorY, 16]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[effectiveRakeWidth * 0.52, -generatorY * 0.5, 0]}>
              <cylinderGeometry args={[0.016, 0.016, generatorY, 16]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Precision injection nozzles facing -Z */}
            {[-0.42, -0.28, -0.14, 0.0, 0.14, 0.28, 0.42].map((frac, idx) => (
              <mesh key={idx} position={[frac * effectiveRakeWidth, 0, -0.035]} rotation={[-Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.007, 0.012, 0.06, 12]} />
                <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.6} metalness={0.8} roughness={0.2} />
              </mesh>
            ))}
            {/* Central Supply Plenum Pipe running backwards to wind tunnel wall */}
            <mesh position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 2.4, 16]} />
              <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
            </mesh>
          </group>
        </group>
      )}

      {/* 3. Volumetric Turbulent Wake Smoke Cloud (Billowing Eddies) */}
      {showWakeCloud && smokeTexture && (
        <instancedMesh
          ref={wakeMeshRef}
          args={[undefined, undefined, PARTICLE_COUNT]}
          frustumCulled={false}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={smokeTexture}
            color={pal.edge}
            transparent
            opacity={0.32 * Math.min(1.5, smokeDensity)}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}
    </group>
  );
}
