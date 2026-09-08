'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SmokeColor } from '@/store/useAppStore';

interface TurbofanEngineProps {
  position: [number, number, number];
  yawAngleDeg: number;
  velocityKmH: number;
  smokeColor?: SmokeColor;
  scale?: number;
}

/**
 * Aerodynamic Jet Turbofan Engine Wind Tunnel Flow Generator
 * - Swivels dynamically along Y-axis matching yaw angle (user requested)
 * - Rotating turbofan rotor blades with RPM proportional to airspeed (user requested)
 * - Aerospace-grade titanium intake lip, composite nacelle cowl, spinner cone, stator vanes & floor gimbal pylon
 */
export function TurbofanEngine({
  position,
  yawAngleDeg,
  velocityKmH,
  smokeColor = 'cyan',
  scale = 1.0,
}: TurbofanEngineProps) {
  const rotorRef = useRef<THREE.Group>(null);
  const yawGroupRef = useRef<THREE.Group>(null);

  // Colors based on theme
  const accentColor = useMemo(() => {
    switch (smokeColor) {
      case 'emerald': return '#10b981';
      case 'electric': return '#818cf8';
      case 'white': return '#f8fafc';
      case 'cyan':
      default: return '#38bdf8';
    }
  }, [smokeColor]);

  // Smooth continuous fan rotation driven by wind speed
  useFrame((_, delta) => {
    if (rotorRef.current) {
      // Angular velocity scales directly with wind speed (km/h)
      // At 140 km/h: ~35 rad/s smooth high-speed rotation
      const rpmFactor = Math.max(0.5, (velocityKmH / 100) * 28.0);
      rotorRef.current.rotation.z += rpmFactor * delta;
    }
  });

  // Fan blade geometry: 18 wide-chord swept titanium turbofan blades
  const BLADE_COUNT = 18;
  const blades = useMemo(() => {
    const items = [];
    const bladeLen = 0.42 * scale;
    const hubRad = 0.16 * scale;

    for (let i = 0; i < BLADE_COUNT; i++) {
      const angle = (i / BLADE_COUNT) * Math.PI * 2;
      items.push({
        angle,
        x: Math.cos(angle) * hubRad,
        y: Math.sin(angle) * hubRad,
        rotZ: angle,
        rotY: 0.42, // aerodynamic blade pitch twist
      });
    }
    return items;
  }, [scale]);

  // 12 stationary outlet guide stator vanes
  const STATOR_COUNT = 12;
  const stators = useMemo(() => {
    const items = [];
    const hubRad = 0.16 * scale;
    for (let i = 0; i < STATOR_COUNT; i++) {
      const angle = (i / STATOR_COUNT) * Math.PI * 2;
      items.push({
        angle,
        x: Math.cos(angle) * hubRad,
        y: Math.sin(angle) * hubRad,
        rotZ: angle,
      });
    }
    return items;
  }, [scale]);

  const [px, py, pz] = position;
  const nacelleRadius = 0.62 * scale;
  const nacelleLength = 0.85 * scale;
  const pylonHeight = py; // extends from engine centerline down to floor Y=0

  return (
    <group position={[px, 0, pz]}>
      {/* 1. Floor Ground Turntable Gimbal Plate (At Tunnel Floor Y = 0) */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[nacelleRadius * 1.3, 32]} />
        <meshStandardMaterial color="#141416" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[nacelleRadius * 1.15, nacelleRadius * 1.25, 32]} />
        <meshBasicMaterial color="#3b82f6" opacity={0.4} transparent />
      </mesh>

      {/* 2. Swiveling Assembly (Responds directly to Y-axis Angle) */}
      <group ref={yawGroupRef} rotation={[0, (yawAngleDeg * Math.PI) / 180, 0]}>
        {/* Floor Swivel Base Ring */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[nacelleRadius * 0.75, nacelleRadius * 0.85, 0.06, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Structural Cantilever Pylon Pedestal (Extends to Engine Height) */}
        <group position={[0, py * 0.5, 0]}>
          <mesh>
            <boxGeometry args={[0.12 * scale, py * 0.92, 0.45 * scale]} />
            <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.3} />
          </mesh>
          {/* Hydraulic tilt reinforcement strut */}
          <mesh position={[0, -py * 0.15, 0.22 * scale]} rotation={[-0.35, 0, 0]}>
            <cylinderGeometry args={[0.025 * scale, 0.025 * scale, py * 0.6, 12]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>

        {/* 3. Turbofan Engine Nacelle (Centered at py) */}
        <group position={[0, py, 0]}>
          {/* Outer Composite Cowl Duct */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry
              args={[nacelleRadius, nacelleRadius * 0.96, nacelleLength, 32, 1, true]}
            />
            <meshStandardMaterial
              color="#111827"
              roughness={0.25}
              metalness={0.85}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Titanium Aerodynamic Intake Bellmouth Lip (Front Facing -Z) */}
          <mesh position={[0, 0, -nacelleLength * 0.5]} rotation={[0, 0, 0]}>
            <torusGeometry args={[nacelleRadius - 0.02 * scale, 0.045 * scale, 16, 48]} />
            <meshStandardMaterial
              color="#e2e8f0"
              metalness={0.96}
              roughness={0.12}
            />
          </mesh>

          {/* Stenciled Hazard / Aviation Safety Stripe Ring */}
          <mesh position={[0, 0, -nacelleLength * 0.35]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry
              args={[nacelleRadius + 0.002 * scale, nacelleRadius + 0.002 * scale, 0.05 * scale, 32, 1, true]}
            />
            <meshBasicMaterial color="#dc2626" />
          </mesh>

          {/* Engine Core Housing (Inner Body) */}
          <mesh position={[0, 0, 0.1 * scale]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18 * scale, 0.16 * scale, nacelleLength * 0.9, 24]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.25} />
          </mesh>

          {/* Exhaust Tailcone / Plug (Rear Facing +Z) */}
          <mesh position={[0, 0, nacelleLength * 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.16 * scale, 0.35 * scale, 24]} />
            <meshStandardMaterial color="#0f172a" metalness={0.95} roughness={0.2} />
          </mesh>

          {/* Stationary Outlet Guide Vanes (Stators) */}
          <group position={[0, 0, 0.08 * scale]}>
            {stators.map((s, idx) => (
              <mesh
                key={idx}
                position={[
                  Math.cos(s.angle) * (nacelleRadius * 0.58),
                  Math.sin(s.angle) * (nacelleRadius * 0.58),
                  0,
                ]}
                rotation={[0, 0, s.rotZ]}
              >
                <boxGeometry args={[0.015 * scale, nacelleRadius * 0.78, 0.08 * scale]} />
                <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
              </mesh>
            ))}
          </group>

          {/* 4. Smooth Rotating Turbofan Rotor Assembly */}
          {/* Positioned at intake throat (Z = -nacelleLength * 0.25) facing -Z */}
          <group position={[0, 0, -nacelleLength * 0.22]} ref={rotorRef}>
            {/* Center Bullet Spinner Nose Cone */}
            <mesh position={[0, 0, -0.16 * scale]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.16 * scale, 0.32 * scale, 24]} />
              <meshStandardMaterial color="#09090b" roughness={0.2} metalness={0.9} />
            </mesh>

            {/* Spinner Spiral Swirl Marking (Painted Graphic on Cone Tip) */}
            <mesh position={[0, 0, -0.28 * scale]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.05 * scale, 0.1 * scale, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>

            {/* Rotor Hub Cylinder */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.16 * scale, 0.16 * scale, 0.14 * scale, 24]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
            </mesh>

            {/* Wide-Chord Swept Titanium Fan Blades */}
            {blades.map((b, idx) => (
              <group
                key={idx}
                position={[
                  Math.cos(b.angle) * (nacelleRadius * 0.54),
                  Math.sin(b.angle) * (nacelleRadius * 0.54),
                  0,
                ]}
                rotation={[0, b.rotY, b.rotZ]}
              >
                {/* Cambered Aerodynamic Fan Blade */}
                <mesh>
                  <boxGeometry args={[0.018 * scale, nacelleRadius * 0.72, 0.11 * scale]} />
                  <meshStandardMaterial
                    color="#cbd5e1"
                    metalness={0.95}
                    roughness={0.15}
                  />
                </mesh>
              </group>
            ))}
          </group>

          {/* 5. Wind Thrust Cone & Luminous Flow Halo (Emanating towards vehicle) */}
          <mesh position={[0, 0, -nacelleLength * 0.55]} rotation={[0, 0, 0]}>
            <ringGeometry args={[nacelleRadius * 0.75, nacelleRadius * 0.94, 32]} />
            <meshBasicMaterial
              color={accentColor}
              opacity={0.22 * Math.min(1.5, velocityKmH / 100)}
              transparent
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
