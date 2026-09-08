'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { STLLoader } from 'three-stdlib';
import { OBJLoader } from 'three-stdlib';
import { GLTFLoader } from 'three-stdlib';
import { useAppStore, ModelData, ViewMode, ModelEnvelope, ModelSlice } from '@/store/useAppStore';
import {
  createGTAeroCarGeometry,
  createGTAeroCarDetailedGroup,
  createFormulaWingGeometry,
} from '@/lib/sampleModels';

interface ModelRendererProps {
  data: ModelData;
}

/**
 * Computes aerodynamic surface pressure colors (Jet colormap) based on surface normals.
 * High pressure stagnation (front) = Red, Low pressure suction (roof, hood curve) = Blue/Cyan.
 */
function generatePressureColors(geometry: THREE.BufferGeometry): Float32Array {
  const normals = geometry.attributes.normal;
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);

  if (!normals) return colors;

  for (let i = 0; i < count; i++) {
    const nx = normals.getX(i);
    const ny = normals.getY(i);
    const nz = normals.getZ(i);

    // Wind inlet flows from +Z to -Z (head-on).
    // Facing forward (+Z): positive pressure (stagnation point)
    // Facing upward/sideways (+Y, +X): acceleration suction
    // Facing rearward (-Z): separated base wake
    const stagnation = nz; // ranges from -1 (rear) to +1 (front)
    
    // Approximate Cp from -0.8 to +1.0
    let cp = stagnation * 0.9;
    if (ny > 0.4 && nz > -0.2) {
      cp -= ny * 0.4; // roof/hood acceleration suction
    }

    // Map cp to Jet colormap (0.0 = deep blue, 0.5 = green/cyan, 1.0 = red)
    const t = Math.max(0, Math.min(1, (cp + 0.8) / 1.8));

    let r = Math.max(0, Math.min(1, 1.5 - Math.abs(t - 0.75) * 4));
    let g = Math.max(0, Math.min(1, 1.5 - Math.abs(t - 0.5) * 4));
    let b = Math.max(0, Math.min(1, 1.5 - Math.abs(t - 0.25) * 4));

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  return colors;
}

/**
 * Combines multiple geometries into a single unified BufferGeometry,
 * preserving transformed world vertex positions and computing unified normals.
 */
function combineGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geoms.length === 0) return new THREE.BufferGeometry();
  if (geoms.length === 1) return geoms[0];

  let totalVerts = 0;
  const nonIndexed: THREE.BufferGeometry[] = [];

  for (const g of geoms) {
    const ni = g.index ? g.toNonIndexed() : g;
    if (ni.attributes.position && ni.attributes.position.count > 0) {
      nonIndexed.push(ni);
      totalVerts += ni.attributes.position.count;
    }
  }

  if (totalVerts === 0) return new THREE.BufferGeometry();

  const mergedPos = new Float32Array(totalVerts * 3);
  let hasNormals = true;
  for (const g of nonIndexed) {
    if (!g.attributes.normal) {
      hasNormals = false;
      break;
    }
  }

  const mergedNorm = hasNormals ? new Float32Array(totalVerts * 3) : null;
  let offset = 0;

  for (const g of nonIndexed) {
    const posArr = g.attributes.position.array;
    mergedPos.set(posArr, offset * 3);
    if (mergedNorm && g.attributes.normal) {
      mergedNorm.set(g.attributes.normal.array, offset * 3);
    }
    offset += g.attributes.position.count;
  }

  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  if (mergedNorm) {
    result.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
  } else {
    result.computeVertexNormals();
  }
  return result;
}

/**
 * Computes longitudinal slices through the geometry to generate an exact
 * surface envelope profile for the aerodynamic simulation field.
 */
function computeModelEnvelope(geom: THREE.BufferGeometry): ModelEnvelope {
  geom.computeBoundingBox();
  const box = geom.boundingBox || new THREE.Box3();
  const minX = box.min.x;
  const maxX = box.max.x;
  const minY = box.min.y;
  const maxY = box.max.y;
  const minZ = box.min.z;
  const maxZ = box.max.z;
  const centerX = (minX + maxX) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;
  const width = Math.max(0.1, maxX - minX);
  const height = Math.max(0.1, maxY - minY);
  const length = Math.max(0.1, maxZ - minZ);

  const SLICE_COUNT = 45;
  const dz = length / (SLICE_COUNT - 1);
  const slices: ModelSlice[] = [];

  const positions = geom.attributes.position;
  const vertCount = positions.count;

  // Initialize slice bins from front maxZ to rear minZ
  for (let i = 0; i < SLICE_COUNT; i++) {
    const z = maxZ - i * dz;
    slices.push({
      z,
      yTop: minY + 0.05,
      yBottom: maxY,
      halfWidth: 0.05,
    });
  }

  const halfBin = dz * 0.75;
  // Sample vertices to find upper roof/hood profile and lateral extents relative to vehicle centerline
  const step = Math.max(1, Math.floor(vertCount / 12000));
  for (let v = 0; v < vertCount; v += step) {
    const vx = positions.getX(v);
    const vy = positions.getY(v);
    const vz = positions.getZ(v);

    for (let i = 0; i < SLICE_COUNT; i++) {
      const sz = slices[i].z;
      if (Math.abs(vz - sz) <= halfBin) {
        if (vy > slices[i].yTop) slices[i].yTop = vy;
        if (vy < slices[i].yBottom) slices[i].yBottom = vy;
        const absX = Math.abs(vx - centerX);
        if (absX > slices[i].halfWidth) slices[i].halfWidth = absX;
      }
    }
  }

  // Smooth slice profile and ensure ground-level consistency
  for (let i = 0; i < SLICE_COUNT; i++) {
    if (slices[i].yBottom > slices[i].yTop) {
      slices[i].yBottom = minY;
    }
    if (slices[i].halfWidth < 0.05) {
      slices[i].halfWidth = width * 0.45;
    }
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    centerX,
    centerZ,
    width,
    height,
    length,
    slices,
  };
}

export function ModelRenderer({ data }: ModelRendererProps) {
  const viewMode = useAppStore((state) => state.viewMode);
  const modelScale = useAppStore((state) => state.modelScale);
  const modelRotationYDeg = useAppStore((state) => state.modelRotationYDeg);
  const modelFlipZ = useAppStore((state) => state.modelFlipZ);

  const [baseGeometry, setBaseGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load and normalize model geometry
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        let geom: THREE.BufferGeometry | null = null;

        if (data.isBuiltIn) {
          if (data.builtInType === 'formula') {
            geom = createFormulaWingGeometry();
          } else {
            geom = createGTAeroCarGeometry();
          }
        } else {
          const extension = data.name.split('.').pop()?.toLowerCase();

          if (extension === 'stl') {
            const loader = new STLLoader();
            geom = await loader.loadAsync(data.url);
          } else if (extension === 'obj') {
            const loader = new OBJLoader();
            const group = await loader.loadAsync(data.url);
            group.updateWorldMatrix(true, true);
            
            const geoms: THREE.BufferGeometry[] = [];
            group.traverse((child) => {
              if (child instanceof THREE.Mesh && child.geometry) {
                const g = child.geometry.clone();
                g.applyMatrix4(child.matrixWorld);
                geoms.push(g);
              }
            });

            geom = combineGeometries(geoms);
          } else if (extension === 'glb' || extension === 'gltf') {
            const loader = new GLTFLoader();
            const gltf = await loader.loadAsync(data.url);
            gltf.scene.updateWorldMatrix(true, true);

            const geoms: THREE.BufferGeometry[] = [];
            gltf.scene.traverse((child) => {
              if (child instanceof THREE.Mesh && child.geometry) {
                const g = child.geometry.clone();
                g.applyMatrix4(child.matrixWorld);
                geoms.push(g);
              }
            });

            geom = combineGeometries(geoms);
          }
        }

        if (!active || !geom) return;

        // Ensure vertex normals exist
        geom.computeVertexNormals();
        geom.computeBoundingBox();

        let box = geom.boundingBox;
        if (box) {
          const rawSize = new THREE.Vector3();
          box.getSize(rawSize);

          // Check model orientation for uploaded CAD vehicles:
          // In wind tunnel simulation: Z is longitudinal length, Y is vertical height, X is lateral width.
          if (!data.isBuiltIn) {
            // Case 1: Length is along Y (Z-up coordinate system common in CAD exports)
            if (rawSize.y > rawSize.z * 1.25 && rawSize.y > rawSize.x * 1.1) {
              geom.rotateX(-Math.PI / 2);
              geom.computeBoundingBox();
              geom.computeVertexNormals();
              box = geom.boundingBox!;
              box.getSize(rawSize);
            }
            // Case 2: Length is along X (side-to-side orientation)
            if (rawSize.x > rawSize.z * 1.25 && rawSize.x > rawSize.y * 1.1) {
              geom.rotateY(Math.PI / 2);
              geom.computeBoundingBox();
              geom.computeVertexNormals();
              box = geom.boundingBox!;
              box.getSize(rawSize);
            }
            // Case 3: Car is taller than wide (rolled on side)
            if (rawSize.y > rawSize.x * 1.25 && rawSize.z > rawSize.x * 1.25) {
              geom.rotateZ(Math.PI / 2);
              geom.computeBoundingBox();
              geom.computeVertexNormals();
              box = geom.boundingBox!;
              box.getSize(rawSize);
            }
          }

          const length = rawSize.z;

          // Intelligent auto-scaling for uploaded vehicles
          let scaleFactor = 1.0;
          if (!data.isBuiltIn) {
            if (length > 1000) {
              scaleFactor = 0.001; // CAD mm -> meters (e.g. 4500mm -> 4.5m)
            } else if (length > 100) {
              scaleFactor = 0.01; // CAD cm -> meters (e.g. 450cm -> 4.5m)
            } else if (length > 15) {
              scaleFactor = 0.1; // dm / inches
            } else if (length < 1.0) {
              // Scale model (e.g. 0.25m scale) -> full-size automotive 4.4m
              scaleFactor = 4.4 / Math.max(0.01, length);
            } else if (length < 2.5 || length > 6.5) {
              // Normalize out-of-range dimensions to ~4.4m standard test car
              scaleFactor = 4.4 / Math.max(0.1, length);
            }

            if (scaleFactor !== 1.0) {
              geom.scale(scaleFactor, scaleFactor, scaleFactor);
              geom.computeBoundingBox();
              geom.computeVertexNormals();
              box = geom.boundingBox!;
            }
          }

          // Center model on X and Z, and place tires/chassis bottom on Y = 0 (ground plane)
          const newSize = new THREE.Vector3();
          box.getSize(newSize);
          const center = new THREE.Vector3();
          box.getCenter(center);

          geom.translate(-center.x, -box.min.y, -center.z);
          geom.computeBoundingBox();
          box = geom.boundingBox!;

          // Calculate aerodynamic metrics
          const width = newSize.x;
          const height = newSize.y;
          const finalLength = newSize.z;
          const frontalArea = width * height * 0.82;

          const vertexCount = geom.attributes.position.count;
          const triangleCount = geom.index ? geom.index.count / 3 : vertexCount / 3;

          // Attach vertex pressure colors
          const pressureColors = generatePressureColors(geom);
          geom.setAttribute('color', new THREE.BufferAttribute(pressureColors, 3));

          // Compute surface envelope for airflow simulation
          const envelope = computeModelEnvelope(geom);
          useAppStore.getState().setModelEnvelope(envelope);

          useAppStore.getState().setGeometryData({
            width,
            height,
            length: finalLength,
            frontalArea,
            vertexCount,
            triangleCount,
            scaleApplied: scaleFactor,
          });

          // Reset user transformation offsets for new model
          useAppStore.getState().resetModelTransform();

          // Trigger camera re-frame
          useAppStore.getState().triggerCameraReset();
        }

        setBaseGeometry(geom);
        setLoading(false);
      } catch (err) {
        console.error('Failed to parse 3D model:', err);
        setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [data]);

  // Dynamically update model envelope whenever user adjusts modelScale, rotation or flip
  useEffect(() => {
    if (!baseGeometry) return;

    const transformed = baseGeometry.clone();
    const rotRad = (modelRotationYDeg * Math.PI) / 180;
    if (rotRad !== 0) transformed.rotateY(rotRad);
    if (modelFlipZ) transformed.scale(1, 1, -1);
    if (modelScale !== 1.0) transformed.scale(modelScale, modelScale, modelScale);

    transformed.computeBoundingBox();
    const box = transformed.boundingBox!;
    // Keep bottom aligned on wind tunnel floor Y = 0 and strictly centered on X and Z
    const tCenter = new THREE.Vector3();
    box.getCenter(tCenter);
    transformed.translate(-tCenter.x, -box.min.y, -tCenter.z);
    transformed.computeBoundingBox();

    const env = computeModelEnvelope(transformed);
    useAppStore.getState().setModelEnvelope(env);

    transformed.dispose();
  }, [baseGeometry, modelScale, modelRotationYDeg, modelFlipZ]);

  // Materials for each aerodynamic view mode
  const material = useMemo(() => {
    switch (viewMode) {
      case 'wireframe':
        return new THREE.MeshBasicMaterial({
          color: '#06b6d4',
          wireframe: true,
        });

      case 'pressure':
        return new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.4,
          metalness: 0.1,
        });

      case 'velocity':
        return new THREE.MeshStandardMaterial({
          color: '#1e293b',
          roughness: 0.7,
          metalness: 0.1,
          transparent: true,
          opacity: 0.85,
        });

      case 'solid':
      default:
        return new THREE.MeshStandardMaterial({
          color: '#94a3b8',
          roughness: 0.35,
          metalness: 0.2,
        });
    }
  }, [viewMode]);

  // Detailed multi-part model for GT sports car (gloss paint, glass, wheels, glowing lights)
  const detailedGTGroup = useMemo(() => {
    if (data.builtInType === 'gt') {
      return createGTAeroCarDetailedGroup();
    }
    return null;
  }, [data.builtInType]);

  const velocityKmH = useAppStore((state) => state.velocityKmH);
  const rollingRoadEnabled = useAppStore((state) => state.rollingRoadEnabled);
  const wheelSpinEnabled = useAppStore((state) => state.wheelSpinEnabled);
  const chassisDynamicsEnabled = useAppStore((state) => state.chassisDynamicsEnabled);

  const carChassisRef = useRef<THREE.Group | null>(null);

  // Optical Running Illusion: High-speed wheel rotation and aerodynamic chassis vibration
  useFrame((state, delta) => {
    const speedMS = (velocityKmH * 1000) / 3600;

    // 1. Wheel Rotation (WDU Units)
    if (detailedGTGroup && rollingRoadEnabled && wheelSpinEnabled) {
      // Angular velocity omega = v / R (GT tire radius = 0.35m)
      const wheelRadius = 0.35 * modelScale;
      const omega = speedMS / wheelRadius;
      const dRot = omega * delta;

      detailedGTGroup.traverse((child) => {
        if (child.name === 'WheelRotatingHub') {
          // Rotating around local X axis so bottom contact patch moves towards -Z (matching belt)
          child.rotation.x -= dRot;
        }
      });
    }

    // 2. Aerodynamic suspension micro-dynamics (subtle chassis high-speed breathing)
    if (carChassisRef.current) {
      if (rollingRoadEnabled && chassisDynamicsEnabled && velocityKmH > 10) {
        const speedNorm = Math.min(2.0, velocityKmH / 140);
        const t = state.clock.elapsedTime;
        // Subtle micro-heave (0.35mm) and micro-pitch
        carChassisRef.current.position.y = Math.sin(t * 38.0) * 0.00035 * speedNorm;
        carChassisRef.current.rotation.x = Math.sin(t * 22.0) * 0.00015 * speedNorm;
      } else {
        carChassisRef.current.position.y = 0;
        carChassisRef.current.rotation.x = 0;
      }
    }
  });

  if (loading || !baseGeometry) {
    return (
      <group position={[0, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[1.5, 0.6, 3.5]} />
          <meshBasicMaterial color="#3f3f46" wireframe />
        </mesh>
      </group>
    );
  }

  const rotYRad = (modelRotationYDeg * Math.PI) / 180;
  const scaleZ = modelFlipZ ? -modelScale : modelScale;

  // If GT car in smoke, solid or velocity mode, render the rich detailed car assembly
  if (detailedGTGroup && (viewMode === 'smoke' || viewMode === 'solid' || viewMode === 'velocity')) {
    return (
      <group
        scale={[modelScale, modelScale, scaleZ]}
        rotation={[0, rotYRad, 0]}
      >
        <group ref={carChassisRef}>
          <primitive object={detailedGTGroup} />
        </group>
      </group>
    );
  }

  return (
    <group
      scale={[modelScale, modelScale, scaleZ]}
      rotation={[0, rotYRad, 0]}
    >
      <group ref={carChassisRef}>
        <mesh geometry={baseGeometry} material={material} />
      </group>
    </group>
  );
}
