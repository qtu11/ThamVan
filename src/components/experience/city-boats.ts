import * as THREE from 'three';
import { cityMaterials } from './city-kit';

export interface DynamicBoat {
  group: THREE.Group;
  baseX: number;
  baseZ: number;
  speed: number;
  direction: number; // 1: đi xuôi (+x), -1: đi ngược (-x)
  amplitude: number;
  phase: number;
  minX: number;
  maxX: number;
  windows: THREE.Mesh[];
  wakes: THREE.Line[];
}

export function createCityBoats() {
  const root = new THREE.Group();
  root.name = 'city-dynamic-boats';
  const materials = cityMaterials();

  // Chia sẻ Geometry và Material chung cho toàn bộ đội thuyền để tối ưu Draw Calls & bộ nhớ
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-1.2, -0.32);
  hullShape.lineTo(0.95, -0.32);
  hullShape.quadraticCurveTo(1.4, -0.1, 1.5, 0);
  hullShape.quadraticCurveTo(1.4, 0.1, 0.95, 0.32);
  hullShape.lineTo(-1.2, 0.32);
  hullShape.closePath();

  const sharedHullGeom = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelSize: 0.03,
    bevelThickness: 0.03,
    bevelSegments: 1,
  });
  sharedHullGeom.rotateX(-Math.PI / 2);

  const sharedCabinBusGeom = new THREE.BoxGeometry(2.1, 0.35, 0.52);
  const sharedCabinSmallGeom = new THREE.BoxGeometry(1.4, 0.35, 0.52);
  const sharedRoofBusGeom = new THREE.BoxGeometry(2.25, 0.06, 0.62);
  const sharedRoofSmallGeom = new THREE.BoxGeometry(1.55, 0.06, 0.62);
  const sharedWinBusGeom = new THREE.BoxGeometry(1.8, 0.18, 0.02);
  const sharedWinSmallGeom = new THREE.BoxGeometry(1.15, 0.18, 0.02);
  const sharedLightGeom = new THREE.BoxGeometry(0.06, 0.06, 0.08);

  const sharedWakeMat = new THREE.LineBasicMaterial({
    color: '#e0f4ff',
    transparent: true,
    opacity: 0.45,
  });

  const sharedWakeGeomLeft = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.25, 0.03, -0.26),
    new THREE.Vector3(-3.8, 0.02, -0.95),
  ]);
  const sharedWakeGeomRight = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.25, 0.03, 0.26),
    new THREE.Vector3(-3.8, 0.02, 0.95),
  ]);

  function buildBoatModel(bus: boolean, colorName: 'bronze' | 'ivory' | 'jade' = 'bronze') {
    const group = new THREE.Group();

    // Hull mesh
    const hullMesh = new THREE.Mesh(sharedHullGeom, materials[colorName]);
    hullMesh.castShadow = true;
    group.add(hullMesh);

    // Cabin
    const cabinMesh = new THREE.Mesh(bus ? sharedCabinBusGeom : sharedCabinSmallGeom, materials.glass);
    cabinMesh.position.set(-0.1, 0.38, 0);
    group.add(cabinMesh);

    // Roof
    const roofMesh = new THREE.Mesh(
      bus ? sharedRoofBusGeom : sharedRoofSmallGeom,
      bus ? materials.bronze : materials.ivory,
    );
    roofMesh.position.set(-0.1, 0.58, 0);
    group.add(roofMesh);

    // Glowing window strips on both sides (chỉ 2 mesh thay vì 14 mesh để giảm draw calls)
    const windowMeshes: THREE.Mesh[] = [];
    const winGeom = bus ? sharedWinBusGeom : sharedWinSmallGeom;
    for (const side of [-1, 1]) {
      const winMesh = new THREE.Mesh(winGeom, materials.lit);
      winMesh.position.set(-0.1, 0.38, side * 0.27);
      group.add(winMesh);
      windowMeshes.push(winMesh);
    }

    // Headlight
    const lightMesh = new THREE.Mesh(sharedLightGeom, materials.ledGold);
    lightMesh.position.set(1.45, 0.22, 0);
    group.add(lightMesh);

    // Trailing wake lines
    const lineLeft = new THREE.Line(sharedWakeGeomLeft, sharedWakeMat);
    const lineRight = new THREE.Line(sharedWakeGeomRight, sharedWakeMat);
    group.add(lineLeft);
    group.add(lineRight);

    return { group, windows: windowMeshes, wakes: [lineLeft, lineRight] };
  }

  // 4 chiếc thuyền đại diện dọc theo chiều dài sông Sài Gòn
  const fleetConfigs = [
    {
      id: 'waterbus-1',
      bus: true,
      color: 'bronze' as const,
      baseX: -15,
      baseZ: 14.5,
      speed: 3.2,
      direction: 1, // Đi xuôi về phía Landmark 81
      minX: -32,
      maxX: 245,
      amplitude: 0.03,
      phase: 0,
    },
    {
      id: 'yacht-1',
      bus: false,
      color: 'ivory' as const,
      baseX: 80,
      baseZ: 18.0,
      speed: 2.6,
      direction: -1, // Đi ngược về phía Bến Bạch Đằng
      minX: -28,
      maxX: 240,
      amplitude: 0.025,
      phase: 1.8,
    },
    {
      id: 'waterbus-2',
      bus: true,
      color: 'bronze' as const,
      baseX: 160,
      baseZ: 28.0,
      speed: 3.0,
      direction: 1, // Đi xuôi qua Landmark 81
      minX: -20,
      maxX: 250,
      amplitude: 0.035,
      phase: 3.4,
    },
    {
      id: 'cruise-night',
      bus: false,
      color: 'jade' as const,
      baseX: 30,
      baseZ: 17.0,
      speed: 1.8,
      direction: 1, // Tàu du lịch ngắm cảnh
      minX: -25,
      maxX: 210,
      amplitude: 0.02,
      phase: 5.1,
    },
  ];

  const boats: DynamicBoat[] = fleetConfigs.map((cfg) => {
    const model = buildBoatModel(cfg.bus, cfg.color);
    model.group.position.set(cfg.baseX, 0.12, cfg.baseZ);
    if (cfg.direction < 0) {
      model.group.rotation.y = Math.PI;
    }
    root.add(model.group);

    return {
      group: model.group,
      baseX: cfg.baseX,
      baseZ: cfg.baseZ,
      speed: cfg.speed,
      direction: cfg.direction,
      amplitude: cfg.amplitude,
      phase: cfg.phase,
      minX: cfg.minX,
      maxX: cfg.maxX,
      windows: model.windows,
      wakes: model.wakes,
    };
  });

  let lastEmissiveDusk = -1;

  function update(dt: number, elapsedTime: number, duskFactor: number) {
    for (const b of boats) {
      // Forward cruising movement
      b.baseX += b.direction * b.speed * dt;

      // Wrap around seamlessly
      if (b.direction > 0 && b.baseX > b.maxX) {
        b.baseX = b.minX;
      } else if (b.direction < 0 && b.baseX < b.minX) {
        b.baseX = b.maxX;
      }

      // Smooth river curvature adjustment
      let riverZ = b.baseZ;
      if (b.baseX > 130) {
        const t = (b.baseX - 130) / 100;
        riverZ += t * 10;
      }

      // Wave bobbing, rolling & pitching
      const waveTime = elapsedTime * 2.2 + b.phase;
      const bobY = 0.12 + Math.sin(waveTime) * b.amplitude;
      const rollZ = Math.sin(waveTime * 0.9) * 0.035;
      const pitchX = Math.cos(waveTime * 1.1) * 0.02;

      b.group.position.set(b.baseX, bobY, riverZ);
      b.group.rotation.z = rollZ;
      b.group.rotation.x = pitchX;
      b.group.rotation.y = b.direction > 0 ? 0 : Math.PI;
    }

    // Wake ripple opacity animation
    const wakeOpacity = 0.35 + Math.sin(elapsedTime * 4.0) * 0.15;
    sharedWakeMat.opacity = wakeOpacity;

    // Window lighting update only when dusk progress changes significantly
    if (Math.abs(duskFactor - lastEmissiveDusk) > 0.02) {
      lastEmissiveDusk = duskFactor;
      materials.lit.emissiveIntensity = THREE.MathUtils.lerp(0.15, 2.2, duskFactor);
    }
  }

  function dispose() {
    sharedHullGeom.dispose();
    sharedCabinBusGeom.dispose();
    sharedCabinSmallGeom.dispose();
    sharedRoofBusGeom.dispose();
    sharedRoofSmallGeom.dispose();
    sharedWinBusGeom.dispose();
    sharedWinSmallGeom.dispose();
    sharedLightGeom.dispose();
    sharedWakeGeomLeft.dispose();
    sharedWakeGeomRight.dispose();
    sharedWakeMat.dispose();
  }

  return { root, update, dispose };
}
