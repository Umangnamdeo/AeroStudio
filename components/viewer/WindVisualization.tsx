'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';

// Deterministic pseudo-random number generator to maintain pure rendering
function createPrng(seed = 12345) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function WindVisualization() {
  const { viewMode, geometryData, modelEnvelope, simQuality, velocityKmH, yawAngleDeg } = useAppStore();
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Scale particle count based on quality
  const particleCount = useMemo(() => {
    switch (simQuality) {
      case 'draft': return 800;
      case 'standard': return 1600;
      case 'high': return 3200;
      case 'extreme': return 5000;
      default: return 1600;
    }
  }, [simQuality]);

  // Store mutable simulation arrays in a ref to avoid React render mutability issues
  const particlesRef = useRef<{
    pos: Float32Array;
    spd: Float32Array;
    count: number;
  }>({
    pos: new Float32Array(0),
    spd: new Float32Array(0),
    count: 0,
  });

  // Reinitialize particles when count or vehicle bounds change
  useEffect(() => {
    const prng = createPrng(42);
    const pos = new Float32Array(particleCount * 3);
    const spd = new Float32Array(particleCount);

    const w = geometryData ? geometryData.width * 2.2 : 5.0;
    const h = geometryData ? geometryData.height * 2.0 : 3.0;
    const l = geometryData ? geometryData.length * 2.5 : 10.0;

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3 + 0] = (prng() - 0.5) * w;
      pos[i * 3 + 1] = 0.05 + prng() * h;
      pos[i * 3 + 2] = (prng() - 0.5) * l;
      spd[i] = 0.12 + prng() * 0.15;
    }

    particlesRef.current = {
      pos,
      spd,
      count: particleCount,
    };
  }, [particleCount, geometryData]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current || viewMode !== 'velocity') return;

    const particles = particlesRef.current;
    if (!particles || particles.count === 0) return;

    const { pos, spd, count } = particles;

    const carW = (geometryData?.width || 1.9) * 0.55;
    const carH = (geometryData?.height || 1.4);
    const carL = (geometryData?.length || 4.5) * 0.55;
    const centerX = modelEnvelope?.centerX ?? 0;
    const centerZ = modelEnvelope?.centerZ ?? 0;

    const tunnelHalfLen = (geometryData?.length || 4.5) * 1.5;
    const tunnelHalfWidth = (geometryData?.width || 2.0) * 1.4;
    const tunnelHeight = (geometryData?.height || 1.5) * 2.2;

    const speedFactor = (velocityKmH / 100) * 1.2;
    const yawRad = (yawAngleDeg * Math.PI) / 180;
    const cosYaw = Math.cos(yawRad);
    const sinYaw = Math.sin(yawRad);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let px = pos[idx + 0];
      let py = pos[idx + 1];
      let pz = pos[idx + 2];
      const baseSpd = spd[i] * speedFactor;

      // Advance along flow vector
      px -= sinYaw * baseSpd;
      pz -= cosYaw * baseSpd;

      // Obstacle deflection centered on vehicle coordinates
      const relX = px - centerX;
      const relZ = pz - centerZ;
      const inX = Math.abs(relX) < carW;
      const inZ = Math.abs(relZ) < carL;
      const inY = py < carH && py > 0;

      if (inX && inZ && inY) {
        const distFromCenter = Math.abs(relX) / carW;
        if (distFromCenter > 0.6) {
          px += Math.sign(relX || 1) * 0.08;
        } else {
          py += 0.07;
        }
      }

      // Wake downwash
      if (relZ < -carL && relZ > -carL * 2.2 && Math.abs(relX) < carW * 1.2 && py < carH * 1.2) {
        py -= 0.015;
        px = centerX + relX * 0.98;
      }

      // Recycle at tunnel boundary
      if (pz < -tunnelHalfLen) {
        pz = tunnelHalfLen + (i % 5) * 0.4;
        px = centerX + ((i % 17) / 17 - 0.5) * tunnelHalfWidth * 2;
        py = 0.05 + ((i % 13) / 13) * tunnelHeight;
      }

      pos[idx + 0] = px;
      pos[idx + 1] = py;
      pos[idx + 2] = pz;

      dummy.position.set(px, py, pz);
      dummy.scale.set(0.018, 0.018, Math.max(0.15, baseSpd * 2.5));
      dummy.rotation.set(0, yawRad, 0);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (viewMode !== 'velocity') return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#06b6d4" transparent opacity={0.65} />
    </instancedMesh>
  );
}
