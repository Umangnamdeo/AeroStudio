import * as THREE from 'three';
import { ModelEnvelope } from '@/store/useAppStore';

export interface StreamlineSeed {
  x: number;
  y: number;
  z: number;
  width: number;
  type: 'hood-roof' | 'flank' | 'mirror' | 'underbody';
}

/**
 * Samples the 3D surface profile of the active vehicle geometry at position (x, z).
 * Returns the local roof/hood/deck surface height, underbody floor height,
 * and whether (x, z) falls within the vehicle footprint.
 */
export function getEnvelopeHeight(
  env: ModelEnvelope,
  x: number,
  z: number
): { yTop: number; yBottom: number; isOverBody: boolean } {
  if (z < env.minZ || z > env.maxZ) {
    return { yTop: env.minY, yBottom: env.minY, isOverBody: false };
  }

  const centerX = env.centerX ?? 0;
  const relX = x - centerX;

  const slices = env.slices;
  if (!slices || slices.length === 0) {
    const progress = (z - env.minZ) / Math.max(0.001, env.maxZ - env.minZ);
    // Smooth aerodynamic cabin curve fallback
    const cabinH = env.minY + env.height * (progress > 0.15 && progress < 0.75 ? 0.95 : 0.55);
    const halfW = env.width * 0.48;
    return {
      yTop: cabinH,
      yBottom: env.minY + 0.1,
      isOverBody: Math.abs(relX) <= halfW,
    };
  }

  // Find adjacent slices along Z (slices ordered from front maxZ to rear minZ)
  let s1 = slices[0];
  let s2 = slices[slices.length - 1];

  for (let i = 0; i < slices.length - 1; i++) {
    if (z <= slices[i].z && z >= slices[i + 1].z) {
      s1 = slices[i];
      s2 = slices[i + 1];
      break;
    }
  }

  const dz = s1.z - s2.z;
  const t = Math.abs(dz) > 0.0001 ? (s1.z - z) / dz : 0;
  const clampT = Math.max(0, Math.min(1, t));

  const yTop = s1.yTop * (1 - clampT) + s2.yTop * clampT;
  const yBottom = s1.yBottom * (1 - clampT) + s2.yBottom * clampT;
  const halfWidth = Math.max(0.05, s1.halfWidth * (1 - clampT) + s2.halfWidth * clampT);

  const isOverBody = Math.abs(relX) <= halfWidth;

  // Realistic aerodynamic transverse curvature (camber / roof roll towards shoulder)
  const latRatio = Math.min(1.0, Math.abs(relX) / halfWidth);
  const curvedTop = yBottom + (yTop - yBottom) * (1.0 - 0.24 * latRatio * latRatio);

  return {
    yTop: Math.max(env.minY, curvedTop),
    yBottom: Math.max(env.minY, yBottom),
    isOverBody,
  };
}

/**
 * Evaluates the aerodynamic velocity field V(x, y, z) around the vehicle.
 * Dynamically conforms to any vehicle's bounding box and surface envelope with C1 continuity.
 */
export function getAerodynamicVelocity(
  x: number,
  y: number,
  z: number,
  yawRad: number = 0,
  turbulenceIntensity: number = 1.0,
  timeSec: number = 0,
  envelope: ModelEnvelope | null = null
): THREE.Vector3 {
  // Base incoming freestream unit velocity vector from the yawed generator:
  // In Three.js coordinate system (Y-up), rotating by yawRad around +Y produces
  // forward vector V = (-sin(yawRad), 0, -cos(yawRad)).
  const cosY = Math.cos(yawRad);
  const sinY = Math.sin(yawRad);

  let vx = -sinY;
  let vy = 0.0;
  let vz = -cosY;

  // Dynamic geometry dimensions
  const noseZ = envelope ? envelope.maxZ : 2.0;
  const tailZ = envelope ? envelope.minZ : -2.2;
  const roofY = envelope ? envelope.maxY : 1.35;
  const groundY = envelope ? envelope.minY : 0.05;
  const halfW = envelope ? envelope.width * 0.5 : 0.95;
  const length = envelope ? envelope.length : 4.2;
  const centerX = envelope?.centerX ?? 0;

  const dx = x - centerX;
  const distToCenterline = Math.abs(dx);

  // 1. UPSTREAM STAGNATION & BOW WAVE DEFLECTION (Ahead of noseZ)
  // Continuous smoothstep decay ensuring zero velocity derivative jump at boundary
  const noseStagnationZone = Math.max(1.2, length * 0.32);
  if (z > noseZ && z <= noseZ + noseStagnationZone) {
    const distFromNose = z - noseZ;
    const u = 1.0 - distFromNose / noseStagnationZone; // 0 at far boundary, 1 at nose
    // Smoothstep profile: S(0)=0, S(1)=1, S'(0)=0, S'(1)=0 (C1 continuous)
    const S = u * u * (3.0 - 2.0 * u);

    // Height and lateral proximity factors
    const heightFactor = Math.max(0, Math.min(1, 1.0 - (y - groundY) / Math.max(0.2, roofY - groundY)));
    const latFactor = Math.exp(-Math.pow(distToCenterline / (halfW * 1.15), 2));

    // Smooth upward flow loft over front bumper / splitter
    vy += S * heightFactor * latFactor * 0.34;
    // Smooth lateral split around front fenders
    vx += S * heightFactor * (dx / Math.max(0.2, halfW)) * 0.22;
    // Deceleration towards stagnation point
    vz *= 1.0 - S * heightFactor * latFactor * 0.45;
  }

  // 2. BODYWORK CONTOUR ACCELERATION & FLOW-FOLLOWING
  if (z >= tailZ && z <= noseZ) {
    if (distToCenterline < halfW * 1.18) {
      if (envelope) {
        const { yTop, isOverBody } = getEnvelopeHeight(envelope, x, z);
        if (isOverBody) {
          const h = y - yTop; // distance above local surface
          const decay = Math.exp(-Math.max(0, h) / 0.32);

          // Central finite difference to sample exact longitudinal slope dyTop/dz
          const dz = 0.08;
          const zAhead = Math.min(noseZ, z + dz);
          const zBehind = Math.max(tailZ, z - dz);
          const yAhead = getEnvelopeHeight(envelope, x, zAhead).yTop;
          const yBehind = getEnvelopeHeight(envelope, x, zBehind).yTop;
          const actualDz = zAhead - zBehind;
          const surfaceSlope = actualDz > 0.001 ? (yAhead - yBehind) / actualDz : 0;

          // Flow tangent follows surface slope (since flow moves towards -z, -vz * slope gives upwash/downwash)
          vy += decay * surfaceSlope * (-vz);

          // Soft aerodynamic repulsion cushion near surface to prevent penetration
          if (h < 0.06) {
            vy += 0.45 * Math.max(0, 1.0 - h / 0.06);
          }

          // Acceleration over hood & windshield crest (Bernoulli suction peak)
          if (h < 0.28) {
            vz *= 1.0 + 0.18 * Math.exp(-Math.max(0, h) / 0.15);
          }
        }
      } else {
        const progress = (z - tailZ) / Math.max(0.001, length);
        if (progress > 0.6) {
          vy += 0.35 * Math.sin(progress * Math.PI);
        } else if (progress < 0.35) {
          vy -= 0.35 * Math.sin((0.35 - progress) * Math.PI);
        }
      }
    }
  }

  // 3. FLANK & SIDE MIRROR VORTICES
  if (z >= tailZ + length * 0.45 && z <= tailZ + length * 0.75) {
    if (distToCenterline >= halfW * 0.8 && distToCenterline <= halfW * 1.3) {
      const mirrorSide = Math.sign(dx || 1);
      const mirrorY = groundY + (roofY - groundY) * 0.5;
      const mirrorYFactor = Math.exp(-Math.pow((y - mirrorY) / 0.25, 2));
      vx += mirrorSide * 0.22 * mirrorYFactor;
      if (turbulenceIntensity > 0) {
        vy += Math.sin(timeSec * 7.5 + z * 8.0) * 0.08 * turbulenceIntensity;
      }
    }
  }

  // 4. REAR BASE WAKE & TURBULENT RECIRCULATION (Behind tailZ)
  if (z < tailZ) {
    const wakeZone = Math.max(2.5, length * 0.8);
    const wakeDist = tailZ - z;
    const wakeProgress = Math.min(1.0, wakeDist / wakeZone);
    const decay = 1.0 - wakeProgress * 0.5;

    // Lateral wake shear layer expansion
    vx += Math.sign(dx || 1) * 0.14 * wakeProgress;

    // Underbody diffuser up-sweep plume vs upper roof downwash
    if (y < groundY + (roofY - groundY) * 0.35) {
      vy += 0.28 * decay;
    } else {
      vy -= 0.22 * decay;
    }

    // Wake turbulence perturbation
    if (turbulenceIntensity > 0) {
      const turb = turbulenceIntensity * 0.14 * (0.3 + wakeProgress * 0.7);
      vx += Math.sin(timeSec * 6.0 + z * 3.5 + y * 2.8) * turb;
      vy += Math.cos(timeSec * 5.2 + z * 3.0 + dx * 2.2) * turb;
    }
  }

  return new THREE.Vector3(vx, vy, vz).normalize();
}

/**
 * Traces a 3D streamline curve starting from seed position (x0, y0, z0)
 * using adaptive midpoint RK2 integration through the aerodynamic vector field.
 * Dynamically conforms to the vehicle's surface envelope so it never intersects bodywork.
 */
export function traceStreamline(
  seed: StreamlineSeed,
  yawRad: number = 0,
  stepSize: number = 0.05,
  maxSteps: number = 180,
  timeSec: number = 0,
  turbulence: number = 1.0,
  envelope: ModelEnvelope | null = null
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const current = new THREE.Vector3(seed.x, seed.y, seed.z);
  points.push(current.clone());

  const groundMinY = envelope ? envelope.minY + 0.02 : 0.05;
  const tailLimitZ = envelope ? envelope.minZ - Math.max(3.5, envelope.length * 0.8) : -5.5;

  for (let i = 0; i < maxSteps; i++) {
    // Keep above ground
    if (current.y < groundMinY) current.y = groundMinY;

    // Velocity evaluation at current point
    const v1 = getAerodynamicVelocity(current.x, current.y, current.z, yawRad, turbulence, timeSec, envelope);

    // Half-step midpoint RK2
    const midX = current.x + v1.x * (stepSize * 0.5);
    const midY = current.y + v1.y * (stepSize * 0.5);
    const midZ = current.z + v1.z * (stepSize * 0.5);
    const v2 = getAerodynamicVelocity(midX, midY, midZ, yawRad, turbulence, timeSec, envelope);

    current.x += v2.x * stepSize;
    current.y += v2.y * stepSize;
    current.z += v2.z * stepSize;

    // Smooth bodywork clearance: gently loft streamline without sharp kinks
    if (envelope && (seed.type === 'hood-roof' || seed.type === 'underbody')) {
      const { yTop, isOverBody } = getEnvelopeHeight(envelope, current.x, current.z);
      if (isOverBody) {
        const minClearance = yTop + 0.035;
        if (current.y < minClearance) {
          current.y = THREE.MathUtils.lerp(current.y, minClearance, 0.4);
        }
      }
    }

    points.push(current.clone());

    // Stop if past rear test section boundary
    if (current.z < tailLimitZ) break;
  }

  return points;
}

/**
 * Resamples a sequence of 3D streamline points to exactly `targetCount` points
 * uniformly distributed along the arc-length using a centripetal Catmull-Rom spline.
 * This guarantees uniform vertex density and enables seamless vertex morphing between periodic recalibrations.
 */
export function resampleStreamlinePoints(
  points: THREE.Vector3[],
  targetCount: number = 160
): THREE.Vector3[] {
  if (points.length < 2) {
    const result: THREE.Vector3[] = [];
    const fallback = points[0] || new THREE.Vector3(0, 0.8, 0);
    for (let i = 0; i < targetCount; i++) {
      result.push(fallback.clone());
    }
    return result;
  }

  // Remove duplicate adjacent points to prevent Catmull-Rom singularities
  const cleanPoints: THREE.Vector3[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (points[i].distanceToSquared(cleanPoints[cleanPoints.length - 1]) > 0.000001) {
      cleanPoints.push(points[i]);
    }
  }

  if (cleanPoints.length < 2) {
    const p0 = cleanPoints[0];
    const p1 = p0.clone().add(new THREE.Vector3(0, 0, -0.1));
    cleanPoints.push(p1);
  }

  const curve = new THREE.CatmullRomCurve3(cleanPoints, false, 'centripetal');
  return curve.getSpacedPoints(targetCount - 1);
}

/**
 * Computes 3D vertex positions for a flat ribbon mesh along resampled streamline points.
 * Generates vertexCount * 3 floats (2 vertices per point: left & right edge).
 */
export function computeRibbonPositions(
  curvePoints: THREE.Vector3[],
  ribbonWidth: number,
  outPositions?: Float32Array
): Float32Array {
  const n = curvePoints.length;
  const vertexCount = n * 2;
  const positions = outPositions || new Float32Array(vertexCount * 3);
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < n; i++) {
    const p = curvePoints[i];
    const prev = curvePoints[Math.max(0, i - 1)];
    const next = curvePoints[Math.min(n - 1, i + 1)];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    if (tangent.lengthSq() < 0.001) tangent.set(0, 0, -1);

    let side = new THREE.Vector3().crossVectors(tangent, up).normalize();
    if (side.lengthSq() < 0.001) side.set(1, 0, 0);

    const progress = i / Math.max(1, n - 1);
    const w = ribbonWidth * (0.85 + progress * 0.45);

    const pLeft = p.clone().addScaledVector(side, -w * 0.5);
    const pRight = p.clone().addScaledVector(side, w * 0.5);

    positions[i * 6 + 0] = pLeft.x;
    positions[i * 6 + 1] = pLeft.y;
    positions[i * 6 + 2] = pLeft.z;

    positions[i * 6 + 3] = pRight.x;
    positions[i * 6 + 4] = pRight.y;
    positions[i * 6 + 5] = pRight.z;
  }

  return positions;
}

/**
 * Generates aerodynamic streamline seed sets dynamically based on active generator geometry
 * (Turbofan Engine annular face vs Pipeline Manifold nozzles) and yaw angle.
 */
export function generateStreamlineSeeds(
  mode: 'rake' | 'centerline' | 'wake' | 'diffuser',
  inletType: 'pipeline' | 'fan' = 'fan',
  rakeY: number = 0.85,
  rakeWidth: number = 1.6,
  envelope: ModelEnvelope | null = null,
  inletDistance: number = 3.5,
  yawRad: number = 0,
  fanScale: number = 1.0,
  rakeX: number = 0
): StreamlineSeed[] {
  const seeds: StreamlineSeed[] = [];

  // Upstream location: generator turntable centered at [centerX, 0, rakeZ]
  const baseDistance = Math.max(1.2, inletDistance);
  const rakeZ = envelope ? envelope.maxZ + baseDistance : 2.2 + baseDistance;
  const centerX = (envelope?.centerX ?? 0) + rakeX;
  const groundY = envelope ? envelope.minY : 0.0;

  // Generator centerline height above wind tunnel floor (1:1 with UI slider)
  const generatorY = groundY + rakeY;

  // Transformation for nozzle local position (lx, ly, lz) relative to generator center [centerX, generatorY, rakeZ]
  // rotating by yawRad around +Y in Three.js coordinate system:
  // worldX = centerX + lx * cos(yawRad) + lz * sin(yawRad)
  // worldY = generatorY + ly
  // worldZ = rakeZ - lx * sin(yawRad) + lz * cos(yawRad)
  const cosY = Math.cos(yawRad);
  const sinY = Math.sin(yawRad);

  const addLocalSeed = (
    lx: number,
    ly: number,
    lz: number,
    type: StreamlineSeed['type'],
    width: number
  ) => {
    const seedX = centerX + lx * cosY + lz * sinY;
    const seedY = generatorY + ly;
    const seedZ = rakeZ - lx * sinY + lz * cosY;
    seeds.push({ x: seedX, y: seedY, z: seedZ, width, type });
  };

  if (inletType === 'fan') {
    // TURBOFAN ENGINE GENERATOR
    // Nacelle length = 0.85 * fanScale. Exit face (bellmouth lip) is at local Z = -0.425 * fanScale.
    // Duct inner radius = 0.58 * fanScale. Spinner hub radius = 0.16 * fanScale.
    const lz = -0.425 * fanScale;

    switch (mode) {
      case 'centerline':
        // 5 vertical centerline streams inside the fan annular throat
        [+0.28, +0.14, 0.0, -0.14, -0.28].forEach((yFrac) => {
          addLocalSeed(0, yFrac * fanScale, lz, 'hood-roof', 0.11);
        });
        break;

      case 'diffuser':
        // Lower duct streams concentrated towards splitter & floor
        [-0.32, -0.22, -0.12].forEach((yFrac) => {
          [-0.22, 0.0, 0.22].forEach((xFrac) => {
            addLocalSeed(xFrac * fanScale, yFrac * fanScale, lz, 'underbody', 0.10);
          });
        });
        break;

      case 'wake':
        // Upper duct streams concentrated towards roof and greenhouse
        [+0.12, +0.22, +0.32].forEach((yFrac) => {
          [-0.24, 0.0, 0.24].forEach((xFrac) => {
            addLocalSeed(xFrac * fanScale, yFrac * fanScale, lz, 'hood-roof', 0.10);
          });
        });
        break;

      case 'rake':
      default:
        // Full wind-tunnel annular flow array inside turbofan face
        // 1. Centerline column (hood crest, windshield, roof, nose, splitter)
        [+0.32, +0.16, 0.0, -0.16, -0.32].forEach((yFrac) => {
          addLocalSeed(0, yFrac * fanScale, lz, 'hood-roof', 0.10);
        });
        // 2. Lateral core streams (front fenders & shoulders)
        [-0.32, +0.32].forEach((xFrac) => {
          addLocalSeed(xFrac * fanScale, 0.0, lz, 'hood-roof', 0.10);
        });
        // 3. Upper annular quadrant streams
        [-0.22, +0.22].forEach((xFrac) => {
          addLocalSeed(xFrac * fanScale, +0.20 * fanScale, lz, 'hood-roof', 0.09);
        });
        // 4. Lower annular quadrant streams
        [-0.22, +0.22].forEach((xFrac) => {
          addLocalSeed(xFrac * fanScale, -0.20 * fanScale, lz, 'underbody', 0.09);
        });
        break;
    }
  } else {
    // PIPELINE MANIFOLD INJECTOR
    // Horizontal bar with discrete nozzles facing -Z at local Z = -0.065
    const lz = -0.065;
    const widthScale = envelope ? (envelope.width * 0.9) / 1.6 : 1.0;
    const effectiveWidth = rakeWidth * widthScale;

    switch (mode) {
      case 'centerline':
        [-0.14, 0.0, 0.14].forEach((xFrac) => {
          addLocalSeed(xFrac * effectiveWidth, 0, lz, 'hood-roof', 0.11);
        });
        break;

      case 'diffuser':
        [-0.35, -0.14, 0.0, 0.14, 0.35].forEach((xFrac) => {
          addLocalSeed(xFrac * effectiveWidth, -0.15, lz, 'underbody', 0.10);
        });
        break;

      case 'wake':
        [-0.35, -0.14, 0.0, 0.14, 0.35].forEach((xFrac) => {
          addLocalSeed(xFrac * effectiveWidth, +0.15, lz, 'hood-roof', 0.10);
        });
        break;

      case 'rake':
      default:
        // 7 precision nozzles across the manifold bar
        [-0.42, -0.28, -0.14, 0.0, 0.14, 0.28, 0.42].forEach((xFrac, idx) => {
          addLocalSeed(
            xFrac * effectiveWidth,
            idx % 2 === 0 ? 0.015 : -0.015,
            lz,
            'hood-roof',
            0.10
          );
        });
        break;
    }
  }

  return seeds;
}

