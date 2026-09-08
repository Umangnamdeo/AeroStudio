import * as THREE from 'three';

/**
 * Creates the high-fidelity GT Sports Coupe 3D model with distinct automotive materials:
 * - Gloss metallic slate-charcoal paint
 * - Tinted aerodynamic cockpit glass
 * - Carbon fiber front splitter, side skirts & rear diffuser
 * - Glowing amber side-mirror turn signals & front DRLs (as in reference video)
 * - Full-width glowing red LED rear taillight bar (as in reference video)
 * - Detailed alloy wheels with rubber tires and red brake calipers
 */
export function createGTAeroCarDetailedGroup(): THREE.Group {
  const carGroup = new THREE.Group();
  carGroup.name = 'GTAeroCar_Detailed';

  // --- Automotive Materials ---
  // High-gloss deep metallic paint (catches wind-tunnel directional lights)
  const bodyPaintMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e2632,
    roughness: 0.28,
    metalness: 0.82,
    envMapIntensity: 1.2,
  });

  // Dark tinted automotive safety glass
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0f18,
    roughness: 0.08,
    metalness: 0.95,
    transparent: true,
    opacity: 0.88,
  });

  // Lightweight matte carbon composite
  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.65,
    metalness: 0.25,
  });

  // Emissive Amber for side mirror indicators & front corner markers (visible in video)
  const amberEmissiveMaterial = new THREE.MeshStandardMaterial({
    color: 0xffa000,
    emissive: 0xff8f00,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  // Emissive crisp white/cyan for front LED headlights & DRLs
  const headlightEmissiveMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0f7fa,
    emissive: 0x00e5ff,
    emissiveIntensity: 1.8,
    roughness: 0.1,
  });

  // Emissive Red for rear LED light bar (visible in video)
  const taillightEmissiveMaterial = new THREE.MeshStandardMaterial({
    color: 0xff1744,
    emissive: 0xf50057,
    emissiveIntensity: 2.8,
    roughness: 0.1,
  });

  // Wheels: Dark rubber tire
  const tireMaterial = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.85,
    metalness: 0.05,
  });

  // Wheels: Gunmetal alloy rim
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0x71717a,
    roughness: 0.25,
    metalness: 0.9,
  });

  // Brake Caliper: Racing Red
  const caliperMaterial = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.35,
    metalness: 0.4,
  });

  // Brake Rotor: Cast iron disc
  const rotorMaterial = new THREE.MeshStandardMaterial({
    color: 0xa1a1aa,
    roughness: 0.4,
    metalness: 0.85,
  });

  // High-visibility racing yellow tire sidewall speed marking (for optical spin illusion)
  const tireMarkingMaterial = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.4,
    metalness: 0.1,
  });

  // ================= 1. MAIN SCULPTED CHASSIS & HOOD =================
  const chassisGeom = new THREE.BoxGeometry(1.88, 0.46, 4.4, 12, 6, 20);
  const pos = chassisGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Front nose taper (Z > 0.8 is hood & front bumper)
    if (z > 0.8) {
      const t = (z - 0.8) / 1.4; // 0 to 1
      // Sloped hood profile
      y -= t * 0.18;
      // Lateral taper towards front nose
      x *= (1.0 - t * 0.14);
      // Front chin rounded curvature
      if (z > 1.8) {
        y *= (1.0 - (z - 1.8) * 0.4);
      }
    }

    // Sculpted side waistline channel (narrower at doors)
    if (z > -0.6 && z < 0.6) {
      const waistFactor = Math.cos((z / 0.6) * Math.PI * 0.5);
      if (Math.abs(x) > 0.6) {
        x -= Math.sign(x) * waistFactor * 0.07;
      }
    }

    // Rear diffuser kick-up and boat-tail taper (Z < -0.8)
    if (z < -0.8) {
      const rt = (-z - 0.8) / 1.4;
      y += rt * 0.12; // diffuser angle
      x *= (1.0 - rt * 0.12); // rear haunches taper
    }

    pos.setXYZ(i, x, y, z);
  }
  chassisGeom.translate(0, 0.44, 0);
  chassisGeom.computeVertexNormals();

  const chassisMesh = new THREE.Mesh(chassisGeom, bodyPaintMaterial);
  carGroup.add(chassisMesh);

  // ================= 2. COCKPIT / GREENHOUSE (GLASS) =================
  const cabinGeom = new THREE.BoxGeometry(1.36, 0.56, 2.15, 8, 6, 12);
  const cPos = cabinGeom.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    let x = cPos.getX(i);
    let y = cPos.getY(i);
    const z = cPos.getZ(i);

    // Windshield rake (Z > 0.2)
    if (z > 0.2 && y > -0.1) {
      const wf = (z - 0.2) / 0.85;
      y -= wf * 0.28;
      x *= (1.0 - wf * 0.22);
    }
    // Fastback rear glass slope (Z < -0.2)
    if (z < -0.2 && y > -0.1) {
      const rf = (-z - 0.2) / 0.85;
      y -= rf * 0.26;
      x *= (1.0 - rf * 0.18);
    }
    // Tumblehome (inward lean of side windows)
    if (y > 0) {
      x *= 0.86;
    }

    cPos.setXYZ(i, x, y, z);
  }
  cabinGeom.translate(0, 0.84, -0.12);
  cabinGeom.computeVertexNormals();

  const cabinMesh = new THREE.Mesh(cabinGeom, glassMaterial);
  carGroup.add(cabinMesh);

  // Cockpit roof cap (painted body color)
  const roofGeom = new THREE.BoxGeometry(1.12, 0.04, 1.25, 6, 1, 8);
  roofGeom.translate(0, 1.12, -0.12);
  const roofMesh = new THREE.Mesh(roofGeom, bodyPaintMaterial);
  carGroup.add(roofMesh);

  // ================= 3. AERODYNAMIC PACKAGE (CARBON FIBER) =================
  // Front splitter with winglets
  const splitterGeom = new THREE.BoxGeometry(1.92, 0.035, 0.45);
  splitterGeom.translate(0, 0.12, 2.15);
  const splitterMesh = new THREE.Mesh(splitterGeom, carbonMaterial);
  carGroup.add(splitterMesh);

  // Splitter endplates
  [-0.95, 0.95].forEach((sx) => {
    const endplate = new THREE.BoxGeometry(0.02, 0.12, 0.35);
    endplate.translate(sx, 0.16, 2.15);
    carGroup.add(new THREE.Mesh(endplate, carbonMaterial));
  });

  // Side skirts
  [-0.93, 0.93].forEach((sx) => {
    const sideSkirt = new THREE.BoxGeometry(0.04, 0.05, 2.6);
    sideSkirt.translate(sx, 0.14, 0);
    carGroup.add(new THREE.Mesh(sideSkirt, carbonMaterial));
  });

  // Rear aerodynamic diffuser
  const diffuserGeom = new THREE.BoxGeometry(1.78, 0.04, 0.65);
  diffuserGeom.rotateX(-0.15); // diffuser up-angle
  diffuserGeom.translate(0, 0.22, -2.1);
  carGroup.add(new THREE.Mesh(diffuserGeom, carbonMaterial));

  // Diffuser vertical strakes (4 fins)
  [-0.6, -0.2, 0.2, 0.6].forEach((fx) => {
    const strake = new THREE.BoxGeometry(0.02, 0.14, 0.55);
    strake.rotateX(-0.15);
    strake.translate(fx, 0.22, -2.1);
    carGroup.add(new THREE.Mesh(strake, carbonMaterial));
  });

  // Rear GT Wing / Ducktail assembly
  const wingMain = new THREE.BoxGeometry(1.68, 0.035, 0.36, 6, 1, 3);
  wingMain.translate(0, 1.12, -1.95);
  carGroup.add(new THREE.Mesh(wingMain, carbonMaterial));

  // Wing upright pylons
  [-0.52, 0.52].forEach((px) => {
    const pylon = new THREE.BoxGeometry(0.03, 0.38, 0.18);
    pylon.translate(px, 0.92, -1.95);
    carGroup.add(new THREE.Mesh(pylon, carbonMaterial));
  });

  // Wing endplates
  [-0.85, 0.85].forEach((ex) => {
    const endplate = new THREE.BoxGeometry(0.02, 0.24, 0.42);
    endplate.translate(ex, 1.12, -1.95);
    carGroup.add(new THREE.Mesh(endplate, carbonMaterial));
  });

  // ================= 4. AERODYNAMIC SIDE MIRRORS WITH AMBER GLOW =================
  // Left and Right mirrors (matching the glowing amber lights seen in the video!)
  [-0.86, 0.86].forEach((mx) => {
    const mirrorGroup = new THREE.Group();
    // Stalk
    const stalk = new THREE.BoxGeometry(0.025, 0.08, 0.04);
    stalk.rotateZ(mx > 0 ? -0.25 : 0.25);
    stalk.translate(mx * 0.95, 0.82, 0.55);
    mirrorGroup.add(new THREE.Mesh(stalk, carbonMaterial));

    // Mirror housing
    const housing = new THREE.BoxGeometry(0.18, 0.09, 0.14);
    housing.translate(mx * 1.05, 0.86, 0.52);
    mirrorGroup.add(new THREE.Mesh(housing, bodyPaintMaterial));

    // Amber LED indicator strip on mirror forward edge (visible in video!)
    const amberStrip = new THREE.BoxGeometry(0.16, 0.02, 0.02);
    amberStrip.translate(mx * 1.05, 0.86, 0.59);
    mirrorGroup.add(new THREE.Mesh(amberStrip, amberEmissiveMaterial));

    carGroup.add(mirrorGroup);
  });

  // ================= 5. LIGHTING: FRONT HEADLIGHTS & REAR RED LIGHT BAR =================
  // Front headlights (angular crisp white/cyan LED DRLs)
  [-0.68, 0.68].forEach((hx) => {
    const headlight = new THREE.BoxGeometry(0.24, 0.06, 0.08);
    headlight.rotateY(hx > 0 ? -0.2 : 0.2);
    headlight.translate(hx, 0.52, 2.12);
    carGroup.add(new THREE.Mesh(headlight, headlightEmissiveMaterial));
  });

  // Front lower air intake amber accent markers (visible in video frames 00:00 - 00:06)
  [-0.88, 0.88].forEach((ax) => {
    const amberMarker = new THREE.BoxGeometry(0.04, 0.08, 0.03);
    amberMarker.translate(ax, 0.42, 1.88);
    carGroup.add(new THREE.Mesh(amberMarker, amberEmissiveMaterial));
  });

  // Full-width rear red LED light bar (visible in video frame 00:08!)
  const taillightBar = new THREE.BoxGeometry(1.62, 0.05, 0.04);
  taillightBar.translate(0, 0.76, -2.18);
  carGroup.add(new THREE.Mesh(taillightBar, taillightEmissiveMaterial));

  // ================= 6. WHEEL ASSEMBLIES (TIRES, RIMS, ROTORS & CALIPERS) =================
  const wheelRadius = 0.35;
  const wheelWidth = 0.28;
  const wheelPositions = [
    [-0.88, wheelRadius, 1.4],   // Front Left
    [0.88, wheelRadius, 1.4],    // Front Right
    [-0.90, wheelRadius, -1.35], // Rear Left (wider stance)
    [0.90, wheelRadius, -1.35],  // Rear Right
  ];

  wheelPositions.forEach(([wx, wy, wz]) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, wy, wz);

    // Rotating assembly (spins around local X axis with rolling road)
    const rotatingHub = new THREE.Group();
    rotatingHub.name = 'WheelRotatingHub';

    // Tire
    const tireGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
    tireGeom.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeom, tireMaterial);
    rotatingHub.add(tireMesh);

    // High-visibility racing yellow sidewall speed stripes (creates visible spinning illusion)
    const sidewallX = (wheelWidth * 0.51) * (wx > 0 ? 1 : -1);
    for (let m = 0; m < 4; m++) {
      const markAngle = (m / 4) * Math.PI * 2;
      const markGeom = new THREE.BoxGeometry(0.012, wheelRadius * 0.22, 0.04);
      const markMesh = new THREE.Mesh(markGeom, tireMarkingMaterial);
      markMesh.position.set(
        sidewallX,
        Math.sin(markAngle) * wheelRadius * 0.82,
        Math.cos(markAngle) * wheelRadius * 0.82
      );
      markMesh.rotation.x = -markAngle;
      rotatingHub.add(markMesh);
    }

    // Rim outer lip
    const rimGeom = new THREE.CylinderGeometry(wheelRadius * 0.78, wheelRadius * 0.78, wheelWidth * 1.02, 24);
    rimGeom.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeom, rimMaterial);
    rotatingHub.add(rimMesh);

    // 5 Double-spokes
    for (let s = 0; s < 5; s++) {
      const angle = (s / 5) * Math.PI * 2;
      const spokeGeom = new THREE.BoxGeometry(wheelWidth * 0.4, wheelRadius * 0.68, 0.035);
      const spokeMesh = new THREE.Mesh(spokeGeom, rimMaterial);
      spokeMesh.rotation.x = angle;
      spokeMesh.position.set(wx > 0 ? 0.04 : -0.04, 0, 0);
      rotatingHub.add(spokeMesh);
    }

    // Center hub cap with emblem
    const hubCapGeom = new THREE.CylinderGeometry(wheelRadius * 0.22, wheelRadius * 0.22, wheelWidth * 1.05, 16);
    hubCapGeom.rotateZ(Math.PI / 2);
    rotatingHub.add(new THREE.Mesh(hubCapGeom, rimMaterial));

    // Brake Rotor disc (inside rim, spins with wheel)
    const rotorGeom = new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, 0.02, 20);
    rotorGeom.rotateZ(Math.PI / 2);
    rotatingHub.add(new THREE.Mesh(rotorGeom, rotorMaterial));

    wheelGroup.add(rotatingHub);

    // Stationary Racing Red Brake Caliper
    const caliperGeom = new THREE.BoxGeometry(0.06, 0.16, 0.1);
    const caliperMesh = new THREE.Mesh(caliperGeom, caliperMaterial);
    caliperMesh.position.set(wx > 0 ? -0.04 : 0.04, wheelRadius * 0.42, 0);
    wheelGroup.add(caliperMesh);

    carGroup.add(wheelGroup);
  });

  return carGroup;
}

/**
 * Merged single buffer geometry for CFD calculation & vertex pressure rendering
 */
export function createGTAeroCarGeometry(): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Chassis / lower body with contoured taper
  const chassisGeom = new THREE.BoxGeometry(1.88, 0.46, 4.4, 12, 6, 20);
  const pos = chassisGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    if (z > 0.8) {
      const t = (z - 0.8) / 1.4;
      y -= t * 0.18;
      x *= (1.0 - t * 0.14);
      if (z > 1.8) {
        y *= (1.0 - (z - 1.8) * 0.4);
      }
    }
    if (z < -0.8) {
      const rt = (-z - 0.8) / 1.4;
      y += rt * 0.12;
      x *= (1.0 - rt * 0.12);
    }
    pos.setXYZ(i, x, y, z);
  }
  chassisGeom.translate(0, 0.44, 0);
  geometries.push(chassisGeom);

  // Cabin / Greenhouse
  const cabinGeom = new THREE.BoxGeometry(1.36, 0.56, 2.15, 8, 6, 12);
  const cPos = cabinGeom.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    let x = cPos.getX(i);
    let y = cPos.getY(i);
    const z = cPos.getZ(i);

    if (z > 0.2 && y > -0.1) {
      const wf = (z - 0.2) / 0.85;
      y -= wf * 0.28;
      x *= (1.0 - wf * 0.22);
    }
    if (z < -0.2 && y > -0.1) {
      const rf = (-z - 0.2) / 0.85;
      y -= rf * 0.26;
      x *= (1.0 - rf * 0.18);
    }
    if (y > 0) x *= 0.86;

    cPos.setXYZ(i, x, y, z);
  }
  cabinGeom.translate(0, 0.84, -0.12);
  geometries.push(cabinGeom);

  // Front splitter
  const splitter = new THREE.BoxGeometry(1.92, 0.04, 0.45);
  splitter.translate(0, 0.12, 2.15);
  geometries.push(splitter);

  // Rear wing
  const wing = new THREE.BoxGeometry(1.68, 0.04, 0.36);
  wing.translate(0, 1.12, -1.95);
  geometries.push(wing);

  // Wing uprights
  [-0.52, 0.52].forEach((px) => {
    const pylon = new THREE.BoxGeometry(0.04, 0.38, 0.18);
    pylon.translate(px, 0.92, -1.95);
    geometries.push(pylon);
  });

  // Diffuser
  const diffuser = new THREE.BoxGeometry(1.78, 0.04, 0.65);
  diffuser.rotateX(-0.15);
  diffuser.translate(0, 0.22, -2.1);
  geometries.push(diffuser);

  // 4 Wheels
  const wheelRadius = 0.35;
  const wheelWidth = 0.28;
  const wheelPositions = [
    [-0.88, wheelRadius, 1.4],
    [0.88, wheelRadius, 1.4],
    [-0.90, wheelRadius, -1.35],
    [0.90, wheelRadius, -1.35],
  ];

  wheelPositions.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
    wheel.rotateZ(Math.PI / 2);
    wheel.translate(wx, wy, wz);
    geometries.push(wheel);
  });

  return mergeBufferGeometries(geometries);
}

/**
 * Generates an F1 / open-wheel aerodynamic wing assembly.
 */
export function createFormulaWingGeometry(): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Main aerofoil plane
  const mainPlane = new THREE.BoxGeometry(1.8, 0.05, 0.6, 8, 2, 6);
  mainPlane.translate(0, 0.35, 0);
  geometries.push(mainPlane);

  // Upper flap with high angle of attack
  const upperFlap = new THREE.BoxGeometry(1.75, 0.03, 0.4, 8, 2, 4);
  upperFlap.rotateX(0.25);
  upperFlap.translate(0, 0.52, -0.2);
  geometries.push(upperFlap);

  // Endplates
  const leftEndplate = new THREE.BoxGeometry(0.04, 0.65, 0.9);
  leftEndplate.translate(-0.9, 0.4, -0.05);
  geometries.push(leftEndplate);

  const rightEndplate = new THREE.BoxGeometry(0.04, 0.65, 0.9);
  rightEndplate.translate(0.9, 0.4, -0.05);
  geometries.push(rightEndplate);

  // Center pylon mount
  const pylon = new THREE.BoxGeometry(0.12, 0.7, 0.4);
  pylon.translate(0, 0.15, -0.15);
  geometries.push(pylon);

  return mergeBufferGeometries(geometries);
}

/**
 * Lightweight helper to combine buffer geometries without external packages.
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVertices = 0;
  geometries.forEach((g) => {
    const nonIndexed = g.index ? g.toNonIndexed() : g;
    totalVertices += nonIndexed.attributes.position.count;
  });

  const mergedPositions = new Float32Array(totalVertices * 3);
  let offset = 0;

  geometries.forEach((g) => {
    const nonIndexed = g.index ? g.toNonIndexed() : g;
    const pos = nonIndexed.attributes.position.array;
    mergedPositions.set(pos, offset);
    offset += pos.length;
  });

  const mergedGeometry = new THREE.BufferGeometry();
  mergedGeometry.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3));
  mergedGeometry.computeVertexNormals();
  mergedGeometry.computeBoundingBox();

  return mergedGeometry;
}
