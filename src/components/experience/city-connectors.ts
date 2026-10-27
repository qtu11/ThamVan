import * as THREE from 'three';
import { CityKit } from './city-kit';
import { createRiver } from './city-river';
import { lamp } from './city-streets';

// Connector 01: Seamlessly connects Bach Dang (world x = 28) to Ba Son Bridge (world x = 62)
// Follows the historic Ba Son shipyard / Ton Duc Thang riverfront corridor.
export function buildBaSonConnector() {
  const kit = new CityKit();

  // Riverbank curve interpolates from z = 9.70 (Bach Dang) to z = 0.0 (Ba Son pylon bank)
  const bankZ = (x: number) => {
    const t = Math.max(0, Math.min(1, (x - 28) / (62 - 28)));
    const s = t * t * (3 - 2 * t);
    const z0 = 5 + 0.006 * 28 * 28; // 9.704
    return z0 * (1 - s) + 0.0 * s;
  };

  const count = 35;
  const bank: THREE.Vector3[] = [];
  for (let i = 0; i <= count; i++) {
    const x = 28 + (i * (62 - 28)) / count;
    bank.push(new THREE.Vector3(x, 0.08, bankZ(x)));
  }

  // Continuous river water without edge fading
  const river = createRiver(bank, 48, 0.5, false, false);
  kit.root.add(river);

  // Inland paving ground
  const land = new THREE.Shape();
  land.moveTo(28, 25);
  land.lineTo(62, 25);
  for (const p of [...bank].reverse()) {
    land.lineTo(p.x, -p.z);
  }
  land.closePath();

  const foundation = kit.mesh(
    new THREE.ExtrudeGeometry(land, { depth: 0.65, bevelEnabled: false, curveSegments: 1 }),
    'stone',
    0,
    -0.55,
    0,
  );
  foundation.rotation.x = -Math.PI / 2;

  const surface = kit.mesh(new THREE.ShapeGeometry(land), 'paving', 0, 0.12, 0);
  surface.rotation.x = -Math.PI / 2;

  // Embankment, promenade, brass handrail, and illuminated LED trim
  for (let i = 0; i < bank.length - 1; i++) {
    const a = bank[i],
      b = bank[i + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const length = a.distanceTo(b) + 0.03;
    const yaw = -Math.atan2(b.z - a.z, b.x - a.x);

    // Stepped stone edge and promenade
    kit.box(mid.x, 0.12, mid.z + 0.1, length, 0.12, 0.25, 'stone', yaw);
    kit.box(mid.x, 0.22, mid.z - 0.42, length, 0.08, 0.85, 'paving', yaw);
    kit.box(mid.x, 0.17, mid.z - 1.25, length, 0.08, 1.9, 'leaf', yaw);
    kit.box(mid.x, 0.22, mid.z - 0.02, length, 0.035, 0.04, 'ledGold', yaw);
    kit.line(
      new THREE.Vector3(a.x, 0.4, a.z - 0.02),
      new THREE.Vector3(b.x, 0.4, b.z - 0.02),
      'brass',
    );
  }

  // Palms, shade trees, lamps, and benches along the promenade
  for (let x = 30; x <= 60; x += 2.2) {
    const z = bankZ(x);
    kit.palm(x, z - 2.1, 0.72 + Math.sin(x * 1.5) * 0.1);
    lamp(kit, x + 0.6, z - 0.95, 0.2);
    kit.box(x - 0.3, 0.38, z - 0.9, 0.45, 0.06, 0.16, 'bark');
    if (x % 4.4 < 2.2) {
      kit.tree(x + 0.4, z - 2.8, 0.58, true);
    }
  }

  // Riverside avenue (Ton Duc Thang extension towards Ba Son approach)
  for (let x = 28.5; x <= 61.5; x += 1.2) {
    kit.box(x, 0.19, -8, 1.2, 0.035, 4.2, 'road');
    kit.box(x, 0.21, -8.05, 1.2, 0.008, 0.04, 'ledGold');
    kit.box(x, 0.21, -7.95, 1.2, 0.008, 0.04, 'ledGold');
    kit.box(x, 0.205, -6.6, 0.5, 0.006, 0.06, 'marking');
    kit.box(x, 0.205, -9.4, 0.5, 0.006, 0.06, 'marking');
  }

  // Đèn đường đại lộ Tôn Đức Thắng
  for (let x = 32; x <= 58; x += 6.5) {
    lamp(kit, x, -5.2, 0.25);
    lamp(kit, x, -10.8, 0.25);
  }

  // Dòng xe cộ lưu thông trên đại lộ nối Bạch Đằng - Ba Son
  const connCars = [
    { x: 33, z: -6.6, mat: 'vinbus' as const, dir: 1, taxi: true },
    { x: 42, z: -6.6, mat: 'curtainBlue' as const, dir: 1, taxi: false },
    { x: 52, z: -6.6, mat: 'ivory' as const, dir: 1, taxi: true },
    { x: 38, z: -9.4, mat: 'red' as const, dir: -1, taxi: false },
    { x: 48, z: -9.4, mat: 'dark' as const, dir: -1, taxi: false },
    { x: 57, z: -9.4, mat: 'bronze' as const, dir: -1, taxi: false },
  ];
  for (const c of connCars) {
    const len = 0.54;
    kit.box(c.x, 0.3, c.z, len, 0.16, 0.23, c.mat);
    kit.box(c.x + (c.dir > 0 ? -0.04 : 0.04), 0.41, c.z, len * 0.56, 0.08, 0.2, 'glass');
    if (c.taxi) kit.box(c.x, 0.48, c.z, 0.08, 0.04, 0.1, 'ledGold');
    const fX = c.dir > 0 ? c.x + len / 2 + 0.015 : c.x - len / 2 - 0.015;
    const rX = c.dir > 0 ? c.x - len / 2 - 0.015 : c.x + len / 2 + 0.015;
    kit.box(fX, 0.28, c.z - 0.07, 0.02, 0.04, 0.045, 'ledGold');
    kit.box(fX, 0.28, c.z + 0.07, 0.02, 0.04, 0.045, 'ledGold');
    kit.box(rX, 0.28, c.z - 0.07, 0.02, 0.04, 0.045, 'red');
    kit.box(rX, 0.28, c.z + 0.07, 0.02, 0.04, 0.045, 'red');
  }

  // Quảng trường công viên di sản Ba Son (Ba Son Heritage Plaza) lấp đầy khoảng đất trống ven sông
  kit.box(45, 0.16, -3.8, 30, 0.06, 3.8, 'paving');
  kit.box(45, 0.20, -3.8, 26, 0.04, 2.6, 'stone');
  // Đài phun nước trung tâm quảng trường 5 tia nước
  kit.cylinder(45, 0.26, -3.8, 1.8, 0.12, 'stone');
  kit.cylinder(45, 0.30, -3.8, 1.5, 0.08, 'pool');
  kit.cylinder(45, 0.34, -3.8, 1.5, 0.02, 'ledCyan');
  kit.cylinder(45, 0.52, -3.8, 0.35, 0.38, 'ivory');
  // Các bồn hoa cây xanh hình học và ghế ngồi dạo bộ
  for (const bx of [35, 40, 50, 55]) {
    kit.box(bx, 0.26, -3.8, 2.2, 0.12, 1.4, 'stone');
    kit.box(bx, 0.32, -3.8, 1.8, 0.08, 1.0, 'leaf');
    kit.tree(bx, -3.8, 0.65);
    kit.box(bx, 0.38, -2.5, 1.2, 0.06, 0.2, 'wood');
  }

  // Quần thể 5 tòa tháp Grand Marina Saigon thanh lịch ven sông (khoảng cách thoáng đãng, nhịp điệu hài hòa)
  const towers = [
    { x: 34, z: -16, w: 4.8, h: 20, d: 4.4, mat: 'curtainBlue' as const },
    { x: 41, z: -17, w: 5.2, h: 24, d: 4.6, mat: 'glass' as const },
    { x: 48, z: -15, w: 4.6, h: 19, d: 4.2, mat: 'mint' as const },
    { x: 55, z: -17, w: 5.0, h: 23, d: 4.5, mat: 'curtainBlue' as const },
    { x: 61, z: -16, w: 4.8, h: 21, d: 4.4, mat: 'glass' as const },
  ];

  for (const t of towers) {
    // Thềm đá granite và khối đế shophouse 3 tầng
    kit.box(t.x, 0.16, t.z, t.w + 1.2, 0.08, t.d + 1.2, 'stone');
    kit.box(t.x, 0.85, t.z, t.w + 0.3, 1.3, t.d + 0.3, 'stone');
    kit.box(t.x, 0.85, t.z + t.d / 2 + 0.18, t.w * 0.9, 0.9, 0.06, 'glass');
    kit.box(t.x, 1.45, t.z + t.d / 2 + 0.28, t.w * 0.85, 0.06, 0.35, 'ivory');

    // Thân tháp
    const bH = t.h - 1.5;
    kit.box(t.x, bH / 2 + 1.5, t.z, t.w, bH, t.d, t.mat);
    kit.facade(t.x, t.z, t.w, bH, t.d, 1.5, 0.42);

    // Ban công kính chạy ngang
    for (let y = 2.2; y < t.h; y += 0.85) {
      kit.box(t.x, y, t.z + t.d / 2 + 0.04, t.w * 0.9, 0.04, 0.14, 'ivory');
      kit.box(t.x, y + 0.06, t.z + t.d / 2 + 0.10, t.w * 0.86, 0.06, 0.02, 'glass');
    }

    // Đỉnh tháp với giàn lam nhôm pergola và dải LED vàng
    kit.box(t.x, t.h + 0.22, t.z, t.w + 0.14, 0.16, t.d + 0.14, 'ivory');
    kit.box(t.x, t.h + 0.32, t.z, t.w + 0.16, 0.03, t.d + 0.16, 'ledGold');
    kit.box(t.x, t.h + 0.7, t.z, t.w * 0.45, 0.6, t.d * 0.45, 'stone');
    kit.box(t.x, t.h + 1.1, t.z, 0.08, 0.35, 0.08, 'red');
  }

  // Far riverbank (Thu Thiem green parkway buffer across the river)
  kit.box(45, 0.08, 55, 36, 0.2, 20, 'leaf');
  for (let x = 29; x <= 61; x += 3.2) {
    kit.tree(x, 48 + (x % 5) * 1.5, 0.85);
    kit.palm(x + 1.2, 46.5, 0.78);
  }

  return { model: kit.finish(), water: river.material };
}

// Connector 12: Seamlessly connects Ba Son Bridge (world x = 138) to Landmark 81 (world x = 172)
// Follows the Nguyen Huu Canh waterfront & Saigon Pearl / Central Park continuous river bend.
export function buildLandmarkConnector() {
  const kit = new CityKit();

  // Riverbank curves from z = 0.0 (Ba Son Bridge pylon) to z = 21.2 (Landmark 81 park crescent)
  const bankZ = (x: number) => {
    const t = Math.max(0, Math.min(1, (x - 138) / (172 - 138)));
    const s = t * t * (3 - 2 * t);
    const z2 = 18 + 0.002 * (-40) * (-40); // 21.2
    return 0.0 * (1 - s) + z2 * s;
  };

  const count = 35;
  const bank: THREE.Vector3[] = [];
  for (let i = 0; i <= count; i++) {
    const x = 138 + (i * (172 - 138)) / count;
    bank.push(new THREE.Vector3(x, 0.08, bankZ(x)));
  }

  // Continuous river water without edge fading
  const river = createRiver(bank, 62, 1.5, false, false);
  kit.root.add(river);

  // Inland park & promenade ground
  const land = new THREE.Shape();
  land.moveTo(138, 30);
  land.lineTo(172, 30);
  for (const p of [...bank].reverse()) {
    land.lineTo(p.x, -p.z);
  }
  land.closePath();

  const foundation = kit.mesh(
    new THREE.ExtrudeGeometry(land, { depth: 0.65, bevelEnabled: false, curveSegments: 1 }),
    'stone',
    0,
    -0.55,
    0,
  );
  foundation.rotation.x = -Math.PI / 2;

  const surface = kit.mesh(new THREE.ShapeGeometry(land), 'leaf', 0, 0.12, 0);
  surface.rotation.x = -Math.PI / 2;

  // Curved waterfront promenade along the natural bend
  for (let i = 0; i < bank.length - 1; i++) {
    const a = bank[i],
      b = bank[i + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const length = a.distanceTo(b) + 0.03;
    const yaw = -Math.atan2(b.z - a.z, b.x - a.x);

    kit.box(mid.x, 0.12, mid.z + 0.1, length, 0.12, 0.25, 'stone', yaw);
    kit.box(mid.x, 0.22, mid.z - 0.45, length, 0.08, 0.9, 'paving', yaw);
    kit.box(mid.x, 0.18, mid.z - 1.4, length, 0.08, 1.8, 'leafLight', yaw);
    kit.box(mid.x, 0.22, mid.z - 0.02, length, 0.035, 0.04, 'ledGold', yaw);
    kit.line(
      new THREE.Vector3(a.x, 0.4, a.z - 0.02),
      new THREE.Vector3(b.x, 0.4, b.z - 0.02),
      'brass',
    );
  }

  // Park walking trails, lush shade trees, lamps, and tropical coconut palms
  for (let x = 140; x <= 170; x += 2.4) {
    const z = bankZ(x);
    kit.palm(x, z - 2.2, 0.8 + Math.sin(x * 1.8) * 0.12);
    lamp(kit, x + 0.5, z - 1.0, 0.2);
    kit.tree(x + 0.6, z - 3.2, 0.72);
    if (x % 4.8 < 2.4) {
      kit.box(x, 0.38, z - 1.0, 0.45, 0.06, 0.16, 'wood');
      kit.palm(x - 0.8, z - 4.5, 0.85);
    }
  }

  // Tuyến đại lộ Nguyễn Hữu Cảnh nối vào Vinhomes Central Park
  for (let x = 138.5; x <= 171.5; x += 1.2) {
    kit.box(x, 0.19, -15.5, 1.2, 0.035, 4.2, 'road');
    kit.box(x, 0.21, -15.55, 1.2, 0.008, 0.04, 'ledGold');
    kit.box(x, 0.21, -15.45, 1.2, 0.008, 0.04, 'ledGold');
    kit.box(x, 0.205, -14.1, 0.5, 0.006, 0.06, 'marking');
    kit.box(x, 0.205, -16.9, 0.5, 0.006, 0.06, 'marking');
  }

  // Xe cộ lưu thông trên đại lộ Nguyễn Hữu Cảnh
  const pearlCars = [
    { x: 142, z: -14.1, mat: 'vinbus' as const, dir: 1 },
    { x: 154, z: -14.1, mat: 'curtainBlue' as const, dir: 1 },
    { x: 166, z: -14.1, mat: 'ivory' as const, dir: 1 },
    { x: 148, z: -16.9, mat: 'red' as const, dir: -1 },
    { x: 160, z: -16.9, mat: 'dark' as const, dir: -1 },
  ];
  for (const c of pearlCars) {
    const len = c.mat === 'vinbus' ? 0.95 : 0.54;
    kit.box(c.x, 0.3, c.z, len, 0.16, 0.23, c.mat);
    kit.box(c.x + (c.dir > 0 ? -0.04 : 0.04), 0.41, c.z, len * 0.56, 0.08, 0.2, 'glass');
    const fX = c.dir > 0 ? c.x + len / 2 + 0.015 : c.x - len / 2 - 0.015;
    const rX = c.dir > 0 ? c.x - len / 2 - 0.015 : c.x + len / 2 + 0.015;
    kit.box(fX, 0.28, c.z - 0.07, 0.02, 0.04, 0.045, 'ledGold');
    kit.box(fX, 0.28, c.z + 0.07, 0.02, 0.04, 0.045, 'ledGold');
    kit.box(rX, 0.28, c.z - 0.07, 0.02, 0.04, 0.045, 'red');
    kit.box(rX, 0.28, c.z + 0.07, 0.02, 0.04, 0.045, 'red');
  }

  // Quần thể 5 tòa tháp Sunwah Pearl & Saigon Pearl thanh lịch (khoảng cách thoáng đạt, chiều cao hài hòa)
  const towers = [
    { x: 144, z: -23, w: 4.8, h: 20, d: 4.2, mat: 'curtainBlue' as const },
    { x: 151, z: -24, w: 5.2, h: 23, d: 4.5, mat: 'glass' as const },
    { x: 158, z: -22, w: 4.8, h: 21, d: 4.2, mat: 'mint' as const },
    { x: 165, z: -24, w: 5.0, h: 24, d: 4.4, mat: 'glass' as const },
    { x: 171, z: -23, w: 4.8, h: 22, d: 4.2, mat: 'curtainBlue' as const },
  ];

  for (const t of towers) {
    kit.box(t.x, 0.16, t.z, t.w + 1.2, 0.08, t.d + 1.2, 'stone');
    kit.box(t.x, 0.85, t.z, t.w + 0.3, 1.3, t.d + 0.3, 'stone');
    kit.box(t.x, 0.85, t.z + t.d / 2 + 0.18, t.w * 0.9, 0.9, 0.06, 'glass');

    const bH = t.h - 1.5;
    kit.box(t.x, bH / 2 + 1.5, t.z, t.w, bH, t.d, t.mat);
    kit.facade(t.x, t.z, t.w, bH, t.d, 1.5, 0.42);

    for (let y = 2.2; y < t.h; y += 0.85) {
      kit.box(t.x, y, t.z + t.d / 2 + 0.04, t.w * 0.9, 0.04, 0.14, 'ivory');
      kit.box(t.x, y + 0.06, t.z + t.d / 2 + 0.10, t.w * 0.86, 0.06, 0.02, 'glass');
    }

    kit.box(t.x, t.h + 0.22, t.z, t.w + 0.14, 0.16, t.d + 0.14, 'ivory');
    kit.box(t.x, t.h + 0.32, t.z, t.w + 0.16, 0.03, t.d + 0.16, 'ledGold');
    kit.box(t.x, t.h + 0.7, t.z, t.w * 0.45, 0.6, t.d * 0.45, 'stone');
    kit.box(t.x, t.h + 1.1, t.z, 0.08, 0.35, 0.08, 'ledCyan');
  }

  // Far riverbank (Thanh Da / Thu Thiem peninsula curved natural green buffer)
  kit.box(155, 0.08, 64, 36, 0.2, 22, 'leaf');
  for (let x = 139; x <= 171; x += 3.4) {
    kit.tree(x, 56 + (x % 4) * 2.0, 0.9);
    kit.palm(x + 1.4, 54.0, 0.82);
  }

  return { model: kit.finish(), water: river.material };
}
