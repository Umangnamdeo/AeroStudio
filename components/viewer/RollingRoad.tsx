'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '@/store/useAppStore';

/**
 * Custom GLSL Shader for the High-Speed Moving Ground Belt.
 * Simulates a realistic automotive wind-tunnel rolling road:
 * - Micro-textured composite/asphalt endless belt
 * - Moving speed dashes and lateral calibration hash marks moving at exact airspeed (m/s)
 * - Anti-aliased boundary safety warning stripes
 * - Dynamic anisotropic specular response under wind-tunnel lighting
 */
function createBeltShaderMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 0 }, // in m/s
      uCenterX: { value: 0 },
      uBeltWidth: { value: 2.8 },
      uActive: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uCenterX;
      uniform float uBeltWidth;
      uniform float uActive;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;

      void main() {
        // Base coordinate along Z traveling backwards towards -Z at speed uSpeed
        // Forward flow direction is from +Z to -Z, so ground moves toward -Z
        float zTravel = vWorldPosition.z + (uActive > 0.5 ? uTime * uSpeed : 0.0);
        float xRel = vWorldPosition.x - uCenterX;

        // 1. Micro-grain composite belt texture
        vec2 noiseCoord = vec2(floor(vUv.x * 160.0), floor((zTravel * 25.0)));
        float noise = fract(sin(dot(noiseCoord, vec2(12.9898, 78.233))) * 43758.5453);
        
        // Deep matte carbon/synthetic composite rubber base
        vec3 col = mix(vec3(0.075, 0.08, 0.09), vec3(0.11, 0.115, 0.125), noise * 0.35);

        // 2. High-contrast centerline speed dashes (Amber racing stripe)
        // Dashes spaced every 0.9m (0.45m dash, 0.45m gap)
        float dashCycle = fract(zTravel / 0.9);
        float isDash = step(0.48, dashCycle);
        float centerDist = abs(xRel);
        float isCenterLine = 1.0 - smoothstep(0.025, 0.035, centerDist);

        vec3 amberStripe = vec3(0.96, 0.65, 0.12);
        col = mix(col, amberStripe, isDash * isCenterLine * 0.95);

        // 3. Lateral speed calibration hash ticks along the sides
        // Hash ticks spaced every 0.35m along left and right tracks
        float lateralTickCycle = fract(zTravel / 0.35);
        float isLateralTick = step(0.65, lateralTickCycle);
        float leftTrack = 1.0 - smoothstep(0.015, 0.025, abs(xRel + uBeltWidth * 0.38));
        float rightTrack = 1.0 - smoothstep(0.015, 0.025, abs(xRel - uBeltWidth * 0.38));
        vec3 cyanTick = vec3(0.14, 0.72, 0.95);
        col = mix(col, cyanTick, isLateralTick * (leftTrack + rightTrack) * 0.85);

        // 4. Edge Caution Hazard Stripes (Outer 6cm of belt)
        float edgeDist = (uBeltWidth * 0.5) - abs(xRel);
        if (edgeDist < 0.065) {
          float hazardCycle = fract((zTravel + xRel * 1.5) / 0.25);
          float isHazardYellow = step(0.5, hazardCycle);
          vec3 hazardCol = isHazardYellow > 0.5 ? vec3(0.85, 0.75, 0.1) : vec3(0.08, 0.08, 0.08);
          col = mix(col, hazardCol, 0.9);
        }

        // 5. Subtle anisotropic top sheen (simulating high-speed belt friction reflection)
        float specular = pow(max(0.0, vNormal.y), 16.0) * 0.15;
        col += vec3(specular);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
}

/**
 * Rolling Road Moving Ground Plane (Treadmill) Component
 * Accurately models a professional automotive wind-tunnel rolling road system:
 * - Moving continuous carbon belt with GPU shader speed animation
 * - Front & rear precision steel tension rollers with synchronous rotary motion
 * - Leading-edge Boundary Layer Ingestion suction knife (suction scoop)
 * - Anodized containment apron & laser lane indicators
 */
export function RollingRoad() {
  const {
    rollingRoadEnabled,
    rollingRoadMode,
    velocityKmH,
    modelEnvelope,
  } = useAppStore();

  const beltMeshRef = useRef<THREE.Mesh | null>(null);
  const frontRollerRef = useRef<THREE.Mesh | null>(null);
  const rearRollerRef = useRef<THREE.Mesh | null>(null);

  // Speed in meters per second (140 km/h = 38.89 m/s)
  const speedMS = (velocityKmH * 1000) / 3600;

  // Compute rolling road dimensions conforming dynamically to model envelope
  const centerX = modelEnvelope?.centerX ?? 0;
  const modelLength = modelEnvelope ? modelEnvelope.length : 4.4;
  const modelWidth = modelEnvelope ? modelEnvelope.width : 1.9;

  // Length spans from ahead of front splitter to well behind rear diffuser
  const beltLength = Math.max(6.8, modelLength * 1.5);
  const beltFrontZ = modelEnvelope ? modelEnvelope.maxZ + 0.9 : 3.2;
  const beltRearZ = beltFrontZ - beltLength;
  const beltCenterZ = (beltFrontZ + beltRearZ) * 0.5;

  // Active belt width depending on selected mode
  const beltWidth = useMemo(() => {
    switch (rollingRoadMode) {
      case 'wide':
        return Math.max(2.6, modelWidth * 1.45);
      case 'five_belt':
        return 1.15; // center chassis belt (mini wheel belts rendered separately)
      case 'center_belt':
      default:
        return 1.35;
    }
  }, [rollingRoadMode, modelWidth]);

  // Persistent shader material
  const beltMaterial = useMemo(() => {
    return createBeltShaderMaterial();
  }, []);

  // Update uniforms and roller rotation on every frame
  useFrame((state, delta) => {
    const mat = beltMeshRef.current?.material as THREE.ShaderMaterial | undefined;
    if (mat && mat.uniforms) {
      mat.uniforms.uTime.value = state.clock.elapsedTime;
      mat.uniforms.uSpeed.value = speedMS;
      mat.uniforms.uCenterX.value = centerX;
      mat.uniforms.uBeltWidth.value = beltWidth;
      mat.uniforms.uActive.value = rollingRoadEnabled ? 1.0 : 0.0;
    }

    // Rollers rotate at angular velocity omega = v / R (roller radius = 0.08m)
    if (rollingRoadEnabled) {
      const rollerRadius = 0.08;
      const omega = speedMS / rollerRadius;
      // Rotating so top moves forward towards +Z or belt moves toward -Z
      const dRot = omega * delta;
      if (frontRollerRef.current) frontRollerRef.current.rotation.x -= dRot;
      if (rearRollerRef.current) rearRollerRef.current.rotation.x -= dRot;
    }
  });

  if (!rollingRoadEnabled) {
    return null;
  }

  return (
    <group position={[0, 0, 0]}>
      {/* ================= 1. RECESSED STRUCTURAL FOUNDATION APRON ================= */}
      {/* Anodized dark titanium pit apron sitting flush in the tunnel floor */}
      <mesh position={[centerX, 0.001, beltCenterZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[beltWidth + 0.35, beltLength + 0.45]} />
        <meshStandardMaterial color="#14161a" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Raised steel curb containment rails along left and right */}
      {[-1, 1].map((side) => (
        <group key={side} position={[centerX + side * (beltWidth * 0.5 + 0.06), 0.012, beltCenterZ]}>
          <mesh>
            <boxGeometry args={[0.08, 0.024, beltLength + 0.35]} />
            <meshStandardMaterial color="#262a32" roughness={0.3} metalness={0.85} />
          </mesh>
          {/* High-visibility active LED runner light strip */}
          <mesh position={[side * -0.038, 0.006, 0]}>
            <boxGeometry args={[0.008, 0.008, beltLength + 0.3]} />
            <meshBasicMaterial color="#0284c7" />
          </mesh>
        </group>
      ))}

      {/* ================= 2. MAIN HIGH-SPEED MOVING BELT ================= */}
      <mesh
        ref={beltMeshRef}
        position={[centerX, 0.004, beltCenterZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={beltMaterial}
      >
        <planeGeometry args={[beltWidth, beltLength, 2, 16]} />
      </mesh>

      {/* ================= 3. FRONT & REAR STEEL CYLINDRICAL DRIVE ROLLERS ================= */}
      {/* Front Drive Roller (At leading edge) */}
      <group position={[centerX, 0.003, beltFrontZ + 0.04]}>
        <mesh ref={frontRollerRef} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, beltWidth, 24]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.92} />
        </mesh>
      </group>

      {/* Rear Tension Roller (At trailing edge) */}
      <group position={[centerX, 0.003, beltRearZ - 0.04]}>
        <mesh ref={rearRollerRef} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, beltWidth, 24]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.92} />
        </mesh>
      </group>

      {/* ================= 4. BOUNDARY LAYER SUCTION SCOOP (SUCTION KNIFE) ================= */}
      {/* Leading edge boundary layer ingestion slot removing floor turbulence upstream of car */}
      <group position={[centerX, 0.006, beltFrontZ + 0.16]}>
        {/* Suction extraction grille */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[beltWidth * 1.05, 0.18]} />
          <meshStandardMaterial color="#0b0f17" roughness={0.6} metalness={0.5} />
        </mesh>
        {/* Micro-perforated stainless boundary layer knife edge */}
        <mesh position={[0, 0.004, -0.08]}>
          <boxGeometry args={[beltWidth * 1.05, 0.008, 0.02]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.8} metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* ================= 5. 5-BELT SYSTEM MINI WHEEL BELTS (IF IN 5-BELT MODE) ================= */}
      {rollingRoadMode === 'five_belt' && (
        <group>
          {[
            [-0.88, 1.4, 0.42, 1.1],   // Front Left
            [0.88, 1.4, 0.42, 1.1],    // Front Right
            [-0.90, -1.35, 0.44, 1.1], // Rear Left
            [0.90, -1.35, 0.44, 1.1],  // Rear Right
          ].map(([wx, wz, wWidth, wLen], idx) => (
            <group key={idx} position={[wx, 0.005, wz]}>
              {/* Surrounding steel border frame */}
              <mesh position={[0, -0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[wWidth + 0.08, wLen + 0.08]} />
                <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
              </mesh>
              {/* Individual Wheel Contact Belt */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} material={beltMaterial}>
                <planeGeometry args={[wWidth, wLen]} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ================= 6. LASER METRIC FIDUCIAL CALIBRATION RULER ================= */}
      {/* Etched meter calibration ticks along the apron curb */}
      {[-3, -2, -1, 0, 1, 2, 3].map((m) => (
        <mesh
          key={m}
          position={[centerX + beltWidth * 0.5 + 0.12, 0.015, m]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.04, 0.006]} />
          <meshBasicMaterial color="#64748b" />
        </mesh>
      ))}
    </group>
  );
}
