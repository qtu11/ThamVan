import * as THREE from 'three';
import { CityKit } from './city-kit';
import { createRiver } from './city-river';
import { lamp } from './city-streets';

export function buildBaSon() {
  const kit = new CityKit();
  kit.root.position.x = 100;

  // 1. Địa hình đa tầng Ba Son (District 1) & Công viên bờ sông Thủ Thiêm (Thủ Đức)
  // Móng nền đá chịu lực
  kit.box(0, -0.2, -18, 80, 0.4, 38, 'stone');
  // Bờ kè đá granite đa tầng dọc sông
  kit.box(0, 0.12, 0.35, 80, 0.18, 0.7, 'stone');
  // Đường đi dạo lát đá hoa cương ven sông Ba Son Riverfront Promenade
  kit.box(0, 0.22, -1.3, 80, 0.08, 2.6, 'paving');
  // Dải viền LED vàng hổ phách dọc mép bờ kè phản chiếu xuống sông
  kit.box(0, 0.27, -0.01, 80, 0.035, 0.04, 'ledGold');
  // Lan can đồng bảo vệ dọc suốt bờ sông
  kit.line(new THREE.Vector3(-39.5, 0.42, 0.0), new THREE.Vector3(39.5, 0.42, 0.0), 'brass');
  // Thảm cỏ xanh công viên Ba Son River Park
  kit.box(0, 0.20, -3.8, 80, 0.06, 2.4, 'leaf');

  // Bờ sông phía bên kia (Thủ Thiêm Parkway)
  kit.box(0, 0.08, 57, 80, 0.2, 24, 'leaf');
  kit.box(0, 0.16, 45.8, 80, 0.08, 2.2, 'paving');
  for (let x = -38; x <= 38; x += 3.2) {
    kit.palm(x, 47.2, 0.75);
    kit.tree(x + 1.2, 53.5, 0.85);
  }

  // Dòng sông Sài Gòn
  const bank = Array.from({ length: 81 }, (_, i) => new THREE.Vector3(i - 40, 0.08, 0));
  const river = createRiver(bank, 52, 1, false, false);
  kit.root.add(river);

  // 2. Bến Du thuyền Ba Son Marina (Luxury Marina Pier & Pontoons)
  // Cầu tàu chính bằng composite vươn dài ra sông tại x = -24
  kit.box(-24, 0.22, 5.2, 1.8, 0.14, 10.4, 'ivory');
  kit.box(-24, 0.28, 5.2, 1.6, 0.02, 10.2, 'bark');
  // Cầu tàu nổi chữ T ngang (Floating pontoon)
  kit.box(-24, 0.16, 10.6, 11, 0.13, 1.8, 'paving');
  kit.box(-24, 0.22, 10.6, 11.1, 0.03, 0.06, 'ledGold');
  // Cột hoa tiêu bến thuyền với đèn hải đăng mini
  kit.cylinder(-24, 0.52, 11.4, 0.05, 0.65, 'ivory');
  kit.box(-24, 0.88, 11.4, 0.08, 0.08, 0.08, 'ledCyan');
  // Ca nô sang trọng và du thuyền catamaran neo đậu tại bến
  // Ca nô 1 (Màu trắng ngà - kính đen)
  kit.box(-27.5, 0.24, 10.6, 1.5, 0.22, 3.2, 'ivory', Math.PI / 2);
  kit.box(-27.5, 0.38, 10.6, 1.1, 0.16, 1.6, 'glass', Math.PI / 2);
  // Ca nô 2 (Màu xanh ngọc - mui kính)
  kit.box(-20.5, 0.24, 10.6, 1.6, 0.22, 3.0, 'jade', Math.PI / 2);
  kit.box(-20.5, 0.38, 10.6, 1.2, 0.16, 1.5, 'glass', Math.PI / 2);
  kit.box(-20.5, 0.49, 10.6, 1.3, 0.04, 1.6, 'ivory', Math.PI / 2);

  // 3. Hệ thống cây xanh, đèn đường và tiện ích bờ kè Ba Son
  for (let x = -38; x <= 38; x += 2.4) {
    if (Math.abs(x) < 4.5 || (x >= -26 && x <= -22)) continue; // Chừa lối cầu và bến du thuyền
    kit.palm(x, -2.4, 0.78);
    lamp(kit, x, -0.65, 0.25);
    kit.box(x + 0.8, 0.35, -0.85, 0.45, 0.06, 0.16, 'bark');
    if (x % 4.8 < 2.4) {
      kit.tree(x + 0.3, -4.2, 0.72, true);
    }
  }

  // 4. Đại lộ Tôn Đức Thắng (6 làn xe ven sông) & Nhánh cầu dẫn
  kit.box(0, 0.21, -8.2, 80, 0.035, 5.6, 'road');
  // Vạch tim đường kép màu vàng
  kit.box(0, 0.23, -8.25, 80, 0.008, 0.04, 'ledGold');
  kit.box(0, 0.23, -8.15, 80, 0.008, 0.04, 'ledGold');
  // Vạch đứt đoạn phân làn
  for (let x = -38; x <= 38; x += 1.8) {
    for (const lane of [-9.6, -6.8]) {
      kit.box(x, 0.23, lane, 0.8, 0.006, 0.06, 'marking');
    }
  }
  // Vạch vôi đi bộ sang đường (Zebra Crossing)
  for (let z = -10.8; z <= -5.6; z += 0.45) {
    kit.box(-14, 0.23, z, 0.28, 0.006, 0.32, 'marking');
    kit.box(14, 0.23, z, 0.28, 0.006, 0.32, 'marking');
  }
  // Đèn đường đại lộ Tôn Đức Thắng
  for (let x = -36; x <= 36; x += 6.5) {
    if (Math.abs(x) < 5) continue;
    lamp(kit, x, -5.2, 0.3);
    lamp(kit, x, -11.2, 0.3);
  }

  // Nhánh dốc cầu dẫn (Approach Flyover Ramp) từ Tôn Đức Thắng lên mặt Cầu Ba Son
  for (let z = -15; z < 0; z += 1.2) {
    const t = (z + 15) / 15;
    const rampY = 0.22 + t * 1.83; // Nâng từ mặt đất lên cao độ cầu 2.05m
    kit.box(0, rampY, z, 2.7, 0.22, 1.25, 'ivory');
    kit.box(0, rampY + 0.12, z, 2.45, 0.02, 1.25, 'road');
    for (const s of [-1, 1]) {
      kit.box(s * 1.34, rampY + 0.26, z, 0.035, 0.22, 1.25, 'ivory');
      kit.box(s * 1.36, rampY + 0.38, z, 0.03, 0.03, 1.25, 'ledGold');
    }
  }

  // 5. Cầu Ba Son (Cầu Thủ Thiêm 2) - Cung đàn dây văng tuyệt mỹ
  // Kết cấu mặt cầu chính 6 làn xe
  kit.box(0, 2.05, 26, 2.9, 0.28, 54, 'ivory');
  kit.box(0, 2.205, 26, 2.55, 0.025, 54, 'road');
  // Dải phân cách giữa cầu
  kit.box(0, 2.27, 26, 0.14, 0.14, 54, 'ivory');
  kit.box(0, 2.35, 26, 0.05, 0.03, 54, 'ledGold');

  for (const side of [-1, 1]) {
    // Vỉa hè đi bộ ngắm cảnh (pedestrian promenade)
    kit.box(side * 1.39, 2.26, 26, 0.22, 0.08, 54, 'paving');
    // Lan can thành cầu
    kit.box(side * 1.48, 2.38, 26, 0.035, 0.22, 54, 'ivory');
    // Dải đèn LED chiếu sáng nghệ thuật mép thành cầu
    kit.box(side * 1.50, 2.50, 26, 0.035, 0.035, 54, 'ledGold');
    // Vạch kẻ làn xe trên cầu
    for (let z = 0; z < 53; z += 0.85) {
      for (const lane of [0.48, 0.88]) {
        kit.box(side * lane, 2.227, z, 0.025, 0.008, 0.3, 'marking');
      }
    }
  }

  // Trụ cầu bê tông vững chắc dưới nước với đệm chống va tàu
  for (const z of [-3, 14, 34, 48]) {
    kit.box(0, 0.98, z, 1.1, 2.05, 1.3, 'stone');
    kit.box(0, 1.82, z, 2.55, 0.25, 1.5, 'ivory');
    // Đèn tín hiệu hàng hải (xanh mạn phải, đỏ mạn trái)
    kit.box(-1.35, 1.85, z, 0.06, 0.06, 0.06, 'red');
    kit.box(1.35, 1.85, z, 0.06, 0.06, 0.06, 'ledCyan');
  }

  // Tháp cầu vòm cong (Pylon)
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 24),
    new THREE.Vector3(0, 3.5, 24.1),
    new THREE.Vector3(0, 7.5, 25.5),
    new THREE.Vector3(0, 11.5, 28.8),
  ]);
  const vertices: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= 32; row++) {
    const t = row / 32,
      p = curve.getPoint(t);
    const w = THREE.MathUtils.lerp(0.85, 0.28, t),
      d = THREE.MathUtils.lerp(1.55, 0.45, t);
    for (const [sx, sz] of [
      [-1, -1],
      [-1, 1],
      [1, 1],
      [1, -1],
    ])
      vertices.push(p.x + (sx * w) / 2, p.y, p.z + (sz * d) / 2);
    if (row < 32)
      for (let side = 0; side < 4; side++) {
        const a = row * 4 + side,
          b = row * 4 + ((side + 1) % 4);
        indices.push(a, b, a + 4, b, b + 4, a + 4);
      }
  }
  indices.push(0, 2, 1, 0, 3, 2, 128, 129, 130, 128, 130, 131);
  const pylon = new THREE.BufferGeometry();
  pylon.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  pylon.setIndex(indices);
  pylon.computeVertexNormals();
  kit.mesh(pylon, 'ivory', 0, 0, 0);

  // Đèn LED chiếu sáng nghệ thuật chạy dọc sống lưng vòm cong của tháp cầu (Pylon Spine Lighting)
  for (let row = 0; row <= 32; row++) {
    const t = row / 32;
    const p = curve.getPoint(t);
    // Dải LED vàng hổ phách rực rỡ ở lưng sau tháp
    kit.box(0, p.y, p.z + 0.28, 0.08, 0.25, 0.08, 'ledGold');
    // Đèn LED trắng ở mặt trước tháp
    kit.box(0, p.y, p.z - 0.28, 0.06, 0.25, 0.06, 'ledWhite');
  }

  // Dây văng tỏa như phím đàn
  for (let i = 0; i < 24; i++) {
    const top = curve.getPoint(0.38 + (i / 23) * 0.6);
    for (const side of [-1, 1]) {
      kit.line(
        new THREE.Vector3(side * 0.17, top.y, top.z),
        new THREE.Vector3(side * 0.14, 2.3, 21 - i * 1.25),
        'cable',
      );
      kit.line(
        new THREE.Vector3(side * 0.17, top.y, top.z),
        new THREE.Vector3(side * 0.14, 2.3, 28 + i * 0.72),
        'cable',
      );
    }
  }

  // Dòng xe cộ lưu thông sống động trên Cầu Ba Son (Xe hơi, taxi, xe buýt)
  const cars = [
    // Làn xuôi về Thủ Thiêm (z tăng dần, đèn pha ledGold chiếu về +z, đèn hậu ledRed ở -z)
    { z: -10, lane: 0.65, mat: 'ivory' as const, bus: false },
    { z: -4, lane: 0.65, mat: 'bronze' as const, bus: false },
    { z: 3, lane: 0.65, mat: 'jade' as const, bus: true },
    { z: 12, lane: 0.65, mat: 'ivory' as const, bus: false },
    { z: 19, lane: 0.65, mat: 'roof' as const, bus: false },
    { z: 27, lane: 0.65, mat: 'glass' as const, bus: false },
    { z: 35, lane: 0.65, mat: 'jade' as const, bus: true },
    { z: 44, lane: 0.65, mat: 'ivory' as const, bus: false },
    // Làn ngược về Quận 1 (z giảm dần, đèn pha ledGold chiếu về -z, đèn hậu ledRed ở +z)
    { z: -8, lane: -0.65, mat: 'roof' as const, bus: false },
    { z: -1, lane: -0.65, mat: 'ivory' as const, bus: false },
    { z: 7, lane: -0.65, mat: 'glass' as const, bus: false },
    { z: 16, lane: -0.65, mat: 'bronze' as const, bus: true },
    { z: 24, lane: -0.65, mat: 'jade' as const, bus: false },
    { z: 32, lane: -0.65, mat: 'ivory' as const, bus: false },
    { z: 41, lane: -0.65, mat: 'roof' as const, bus: false },
    { z: 49, lane: -0.65, mat: 'glass' as const, bus: false },
  ];

  for (const c of cars) {
    const len = c.bus ? 0.95 : 0.52;
    const w = 0.22;
    const h = c.bus ? 0.24 : 0.16;
    kit.box(c.lane, 2.22 + h / 2, c.z, w, h, len, c.mat);
    kit.box(c.lane, 2.22 + h + 0.04, c.z - 0.02, w * 0.85, 0.08, len * 0.55, 'glass');
    if (c.lane > 0) {
      // Đèn pha trước chiếu về hướng Thủ Thiêm
      kit.box(c.lane - 0.07, 2.24, c.z + len / 2 + 0.02, 0.05, 0.04, 0.02, 'ledGold');
      kit.box(c.lane + 0.07, 2.24, c.z + len / 2 + 0.02, 0.05, 0.04, 0.02, 'ledGold');
      // Đèn hậu đỏ
      kit.box(c.lane - 0.07, 2.25, c.z - len / 2 - 0.02, 0.05, 0.04, 0.02, 'ledPink');
      kit.box(c.lane + 0.07, 2.25, c.z - len / 2 - 0.02, 0.05, 0.04, 0.02, 'ledPink');
    } else {
      // Đèn pha trước chiếu về hướng Quận 1
      kit.box(c.lane - 0.07, 2.24, c.z - len / 2 - 0.02, 0.05, 0.04, 0.02, 'ledGold');
      kit.box(c.lane + 0.07, 2.24, c.z - len / 2 - 0.02, 0.05, 0.04, 0.02, 'ledGold');
      // Đèn hậu đỏ
      kit.box(c.lane - 0.07, 2.25, c.z + len / 2 + 0.02, 0.05, 0.04, 0.02, 'ledPink');
      kit.box(c.lane + 0.07, 2.25, c.z + len / 2 + 0.02, 0.05, 0.04, 0.02, 'ledPink');
    }
  }

  // 6. Quần thể cao ốc hiện đại Ba Son (Grand Marina Saigon & Vinhomes Golden River)
  // Khối đế thương mại Podium 3 tầng đa khối
  kit.box(-18, 1.2, -18, 38, 2.0, 11, 'ivory');
  kit.box(18, 1.2, -18, 36, 2.0, 11, 'ivory');
  // Mặt kính thương mại tầng trệt & sảnh đón canopy
  kit.box(-18, 1.2, -12.4, 36, 1.6, 0.1, 'glass');
  kit.box(18, 1.2, -12.4, 34, 1.6, 0.1, 'glass');

  // Quần thể 8 tòa tháp cao tầng hiện đại Ba Son (Grand Marina & Aqua Residences)
  const towers = [
    // Cụm phía Tây Cầu Ba Son (Grand Marina Prime)
    { x: -32, z: -19, w: 4.8, h: 22, d: 4.5, mat: 'jade' as const, helipad: false },
    { x: -24, z: -17, w: 5.4, h: 28, d: 4.8, mat: 'glass' as const, helipad: true },
    { x: -16, z: -21, w: 5.0, h: 24, d: 4.4, mat: 'mint' as const, helipad: false },
    { x: -9, z: -18, w: 4.6, h: 21, d: 4.2, mat: 'concrete' as const, helipad: false },
    // Cụm phía Đông Cầu Ba Son (Aqua & Luxury Residences)
    { x: 9, z: -18, w: 4.8, h: 23, d: 4.4, mat: 'glass' as const, helipad: false },
    { x: 17, z: -21, w: 5.6, h: 30, d: 5.0, mat: 'jade' as const, helipad: true },
    { x: 25, z: -17, w: 5.0, h: 25, d: 4.5, mat: 'mint' as const, helipad: false },
    { x: 33, z: -19, w: 4.6, h: 19, d: 4.2, mat: 'glass' as const, helipad: false },
  ];

  for (const t of towers) {
    // Khối thân tháp
    kit.box(t.x, t.h / 2 + 0.2, t.z, t.w, t.h, t.d, t.mat);
    kit.facade(t.x, t.z, t.w, t.h, t.d, 0.2, 0.42);
    // Mái che tầng thượng giật cấp
    kit.box(t.x, t.h + 0.28, t.z, t.w + 0.12, 0.16, t.d + 0.12, 'ivory');
    kit.box(t.x, t.h + 0.38, t.z, t.w + 0.16, 0.04, t.d + 0.16, 'ledGold');
    // Khối kỹ thuật và hồ bơi vô cực / đài ngắm cảnh
    kit.box(t.x, t.h + 0.65, t.z, t.w * 0.5, 0.6, t.d * 0.5, 'stone');
    // Hồ bơi vô cực mini trên tầng mái
    kit.box(t.x, t.h + 0.32, t.z + t.d * 0.3, t.w * 0.6, 0.05, t.d * 0.25, 'window');

    if (t.helipad) {
      // Sân đỗ trực thăng Helipad trên nóc tòa tháp trung tâm
      kit.cylinder(t.x, t.h + 1.0, t.z, t.w * 0.32, 0.08, 'dark');
      kit.box(t.x, t.h + 1.05, t.z, t.w * 0.18, 0.02, 0.04, 'marking');
      kit.box(t.x, t.h + 1.05, t.z, 0.04, 0.02, t.w * 0.18, 'marking');
      // Đèn báo không ban đêm (Aviation beacon)
      kit.box(t.x, t.h + 1.45, t.z, 0.08, 0.7, 0.08, 'ivory');
      kit.box(t.x, t.h + 1.85, t.z, 0.12, 0.12, 0.12, 'ledPink');
    }
  }

  // Nhà ga ngầm Metro Tuyến số 1 Ba Son (Ba Son Metro Station Portal)
  kit.box(-11, 0.22, -9.5, 5.2, 0.08, 3.2, 'stone');
  kit.box(-11, 0.65, -9.5, 4.6, 0.75, 2.8, 'glass');
  kit.box(-11, 1.08, -9.5, 5.0, 0.12, 3.0, 'jade');
  kit.box(-11, 1.16, -9.5, 5.0, 0.04, 0.04, 'ledCyan');

  // 7. Cụm Biệt thự sinh thái ven sông Ba Son (The Victoria Villas)
  // Các căn biệt thự 3 tầng sang trọng có mái ngói đỏ terra-cotta đan xen công viên
  const villas = [
    { x: -4.5, z: -14 },
    { x: -1.8, z: -15 },
    { x: 1.8, z: -15 },
    { x: 4.5, z: -14 },
  ];
  for (const v of villas) {
    kit.box(v.x, 0.65, v.z, 2.2, 0.9, 2.0, 'ivory');
    kit.box(v.x, 0.65, v.z + 1.02, 1.8, 0.6, 0.05, 'glass'); // Cửa kính ban công
    kit.box(v.x, 1.25, v.z, 2.4, 0.35, 2.2, 'roof'); // Mái ngói đỏ dốc
    kit.tree(v.x + 1.3, v.z - 0.2, 0.55);
  }

  return { model: kit.finish(), water: river.material };
}

export function buildLandmark81() {
  const kit = new CityKit();
  kit.root.position.x = 210;

  // 1. Dòng sông Sài Gòn uốn lượn quanh bán đảo Bình Thạnh
  const bank = Array.from({ length: 101 }, (_, i) => {
    const x = -40 + i * 0.8;
    return new THREE.Vector3(x, 0.08, 18 + 0.002 * x * x);
  });
  const river = createRiver(bank, 56, 2, false, true);
  kit.root.add(river);

  // 2. Móng nền đá và địa hình công viên ven sông Vinhomes Central Park
  const land = new THREE.Shape();
  land.moveTo(-40, 36);
  land.lineTo(40, 36);
  for (const p of [...bank].reverse()) land.lineTo(p.x, -p.z);
  land.closePath();

  const foundation = kit.mesh(
    new THREE.ExtrudeGeometry(land, { depth: 0.55, bevelEnabled: false, curveSegments: 1 }),
    'stone',
    0,
    -0.45,
    0,
  );
  foundation.rotation.x = -Math.PI / 2;

  const ground = kit.mesh(new THREE.ShapeGeometry(land), 'leaf', 0, 0.12, 0);
  ground.rotation.x = -Math.PI / 2;

  // 3. Bờ kè đá granite & Đường dạo bộ ven sông Central Park Promenade
  for (let i = 0; i < bank.length - 1; i += 2) {
    const p1 = bank[i],
      p2 = bank[i + 1] ?? p1;
    const midX = (p1.x + p2.x) / 2;
    const midZ = (p1.z + p2.z) / 2;
    // Bậc đá granite mép nước
    kit.box(midX, 0.14, midZ + 0.25, 1.65, 0.14, 0.6, 'stone');
    // Đường đi dạo lát đá hoa cương
    kit.box(midX, 0.22, midZ - 0.9, 1.65, 0.08, 2.0, 'paving');
    // Dải thảm cỏ xanh đan xen
    kit.box(midX, 0.18, midZ - 2.2, 1.65, 0.06, 1.2, 'leafLight');
    // Viền LED vàng phản chiếu lung linh xuống sông
    kit.box(midX, 0.26, midZ - 0.02, 1.65, 0.035, 0.04, 'ledGold');
    // Lan can bảo vệ bằng đồng
    kit.line(new THREE.Vector3(p1.x, 0.42, p1.z - 0.02), new THREE.Vector3(p2.x, 0.42, p2.z - 0.02), 'brass');
  }

  // 4. Bến Du thuyền Central Park Marina vươn dài ra sông
  kit.box(14, 0.22, 23.5, 2.2, 0.14, 10.5, 'ivory');
  kit.box(14, 0.28, 23.5, 1.9, 0.02, 10.2, 'wood');
  kit.box(14, 0.16, 29.5, 14, 0.13, 2.2, 'paving');
  kit.box(14, 0.22, 29.5, 14.1, 0.03, 0.06, 'ledGold');
  // Cột hoa tiêu và hải đăng bến thuyền
  kit.cylinder(14, 0.65, 30.6, 0.06, 0.85, 'ivory');
  kit.box(14, 1.1, 30.6, 0.1, 0.1, 0.1, 'ledCyan');
  // Ca nô sang trọng và du thuyền catamaran neo đậu
  kit.box(9.5, 0.25, 29.5, 1.7, 0.24, 3.6, 'ivory', Math.PI / 2);
  kit.box(9.5, 0.42, 29.5, 1.2, 0.18, 1.9, 'glass', Math.PI / 2);
  kit.box(18.5, 0.25, 29.5, 1.6, 0.22, 3.2, 'curtainBlue', Math.PI / 2);
  kit.box(18.5, 0.40, 29.5, 1.1, 0.16, 1.7, 'glass', Math.PI / 2);
  kit.box(18.5, 0.51, 29.5, 1.2, 0.04, 1.8, 'ivory', Math.PI / 2);

  // 5. Khu nghỉ dưỡng Resort Pool & Sân thể thao Central Park
  // Hồ bơi vô cực ngoài trời uốn lượn (Resort Infinity Pool)
  kit.box(7.5, 0.15, 6.5, 7.8, 0.06, 4.2, 'stone');
  kit.box(7.5, 0.17, 6.5, 7.2, 0.08, 3.6, 'pool');
  kit.box(7.5, 0.19, 6.5, 7.2, 0.02, 0.04, 'ledCyan');
  // Sàn gỗ tếch (Teak Wood Deck) bao quanh hồ bơi
  kit.box(7.5, 0.19, 9.0, 7.8, 0.05, 1.2, 'wood');
  kit.box(7.5, 0.19, 4.0, 7.8, 0.05, 1.2, 'wood');
  // Hàng ghế tắm nắng & dù che màu trắng ngà
  for (let gx = 4.5; gx <= 10.5; gx += 1.5) {
    kit.box(gx, 0.24, 9.0, 0.45, 0.06, 0.7, 'wood');
    kit.cylinder(gx, 0.45, 9.0, 0.02, 0.4, 'ivory');
    kit.crown(gx, 0.68, 9.0, 0.25, 'ivory', 0.1);
  }

  // Sân thể thao đẳng cấp (Tennis / Pickleball Court)
  kit.box(19.5, 0.16, 7.0, 8.5, 0.05, 5.5, 'stone');
  kit.box(19.5, 0.18, 7.0, 8.0, 0.02, 5.0, 'tennis');
  // Vạch kẻ sân tennis trắng tinh
  kit.box(19.5, 0.195, 7.0, 6.8, 0.006, 0.04, 'marking');
  kit.box(19.5, 0.195, 7.0, 0.04, 0.006, 4.2, 'marking');
  kit.box(16.5, 0.195, 7.0, 0.04, 0.006, 4.2, 'marking');
  kit.box(22.5, 0.195, 7.0, 0.04, 0.006, 4.2, 'marking');
  // Lưới thi đấu tennis
  kit.box(19.5, 0.28, 7.0, 0.02, 0.18, 4.6, 'dark');

  // 6. Hồ cảnh quan Central Lake & Vườn Nhật Zen Garden
  kit.cylinder(-14, 0.16, 9.5, 5.2, 0.06, 'pool');
  kit.cylinder(-14, 0.14, 9.5, 5.6, 0.04, 'stone');
  kit.cylinder(-14, 0.18, 9.5, 5.2, 0.02, 'ledCyan');
  // Đài phun nước trung tâm hồ
  kit.cylinder(-14, 0.35, 9.5, 0.45, 0.35, 'ivory');
  kit.box(-14, 0.62, 9.5, 0.2, 0.3, 0.2, 'ledCyan');
  // Cầu đi bộ vòm cong màu đỏ phong cách Nhật Bản (The Red Bridge)
  for (let i = -5; i <= 5; i++) {
    const t = i / 5;
    const archY = 0.24 + (1 - t * t) * 0.55;
    kit.box(-14 + i * 1.0, archY, 9.5, 1.05, 0.06, 0.95, 'red');
    kit.box(-14 + i * 1.0, archY + 0.2, 10.0, 1.05, 0.18, 0.035, 'red');
    kit.box(-14 + i * 1.0, archY + 0.2, 9.0, 1.05, 0.18, 0.035, 'red');
    kit.box(-14 + i * 1.0, archY + 0.3, 10.0, 1.05, 0.03, 0.04, 'gold');
    kit.box(-14 + i * 1.0, archY + 0.3, 9.0, 1.05, 0.03, 0.04, 'gold');
  }

  // Chòi nghỉ chân vọng cảnh phong cách Zen Garden
  kit.cylinder(-21, 0.24, 11, 1.6, 0.14, 'paving');
  kit.cylinder(-21, 0.95, 11, 1.8, 0.35, 'roof');
  kit.cylinder(-21, 1.25, 11, 0.5, 0.25, 'gold');
  for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const px = -21 + Math.cos(angle) * 1.25;
    const pz = 11 + Math.sin(angle) * 1.25;
    kit.box(px, 0.55, pz, 0.09, 0.65, 0.09, 'wood');
  }

  // 7. Đại quảng trường Landmark Plaza & Lối đón xe Grand Drop-off
  // Thềm đá granite đa tầng rộng lớn phía trước Landmark 81
  kit.box(0, 0.16, 0.5, 22, 0.06, 9.5, 'paving');
  kit.box(0, 0.20, 0.5, 18, 0.04, 7.5, 'stone');
  // Bậc tam cấp hoa cương dẫn lên đại sảnh
  for (let s = 1; s <= 3; s++) {
    kit.box(0, 0.20 + s * 0.04, -2.5 - s * 0.3, 14 + s * 0.8, 0.04, 0.35, 'paving');
  }
  // Đại đài phun nước tròn Landmark Grand Fountain
  kit.cylinder(0, 0.24, 2.8, 3.2, 0.14, 'stone');
  kit.cylinder(0, 0.28, 2.8, 2.8, 0.09, 'pool');
  kit.cylinder(0, 0.32, 2.8, 2.8, 0.02, 'ledCyan');
  kit.cylinder(0, 0.52, 2.8, 0.55, 0.45, 'ivory');
  kit.box(0, 0.85, 2.8, 0.25, 0.45, 0.25, 'ledWhite');
  // Cột cờ và hàng đèn hoa cương quảng trường
  for (const s of [-4.5, 4.5]) {
    kit.cylinder(s, 0.85, 4.2, 0.03, 1.4, 'gold');
    kit.box(s + 0.15, 1.35, 4.2, 0.35, 0.22, 0.02, 'red');
  }

  // 8. Tuyến đường nội bộ Central Park Ring Road & Dàn xe buýt điện VinBus
  kit.box(0, 0.19, -3.2, 36, 0.03, 2.8, 'road');
  kit.box(0, 0.21, -3.2, 36, 0.006, 0.04, 'marking');
  // Vạch kẻ đi bộ sang đường (Zebra Crossing) trước sảnh Vincom
  for (let z = -4.4; z <= -2.0; z += 0.4) {
    kit.box(-4.5, 0.21, z, 0.35, 0.006, 0.25, 'marking');
    kit.box(4.5, 0.21, z, 0.35, 0.006, 0.25, 'marking');
  }

  // Dàn xe buýt điện VinBus xanh lá & Xe hơi hạng sang đón khách
  // VinBus 1 đậu tại trạm đón sảnh Vincom
  kit.box(-6.5, 0.38, -3.2, 1.6, 0.32, 0.42, 'vinbus');
  kit.box(-6.5, 0.44, -3.2, 1.55, 0.16, 0.44, 'glass');
  kit.box(-7.32, 0.32, -3.2, 0.04, 0.06, 0.38, 'ledGold');
  kit.box(-5.68, 0.32, -3.2, 0.04, 0.06, 0.38, 'red');
  // Xe sedan hạng sang đậu trước sảnh đón
  kit.box(2.2, 0.30, -3.0, 0.65, 0.16, 0.28, 'curtainBlue');
  kit.box(2.2, 0.40, -3.0, 0.38, 0.09, 0.26, 'glass');
  kit.box(1.85, 0.27, -3.0, 0.04, 0.04, 0.24, 'ledGold');
  kit.box(2.55, 0.27, -3.0, 0.04, 0.04, 0.24, 'red');

  // Mạng lưới cây xanh, đèn chiếu sáng cảnh quan công viên
  for (let i = 0; i < 80; i++) {
    const x = -36 + i * 0.9;
    const zProm = 17 + 0.002 * x * x;
    if (i % 3 === 0) {
      kit.palm(x, zProm - 2.2, 0.85);
      lamp(kit, x, zProm - 0.95, 0.25);
      kit.box(x + 0.4, 0.35, zProm - 0.95, 0.45, 0.06, 0.16, 'wood');
    }
    const pathZ = 5.2 + Math.sin(x * 0.16) * 2.2;
    kit.box(x, 0.18, pathZ, 0.95, 0.04, 1.1, 'paving');
    if (i % 2 === 0) kit.tree(x, pathZ + 1.8, 0.82 + Math.abs(Math.sin(i)) * 0.25);
    if (i % 4 === 0) kit.tree(x, pathZ - 1.8, 0.95);
  }

  // 9. Đại lộ Nguyễn Hữu Cảnh & Dòng xe cộ phía sau
  kit.box(0, 0.18, -17.5, 80, 0.035, 5.2, 'road');
  kit.box(0, 0.20, -17.55, 80, 0.008, 0.04, 'ledGold');
  kit.box(0, 0.20, -17.45, 80, 0.008, 0.04, 'ledGold');
  for (let x = -38; x <= 38; x += 1.8) {
    kit.box(x, 0.20, -18.8, 0.8, 0.006, 0.06, 'marking');
    kit.box(x, 0.20, -16.2, 0.8, 0.006, 0.06, 'marking');
  }
  for (let x = -36; x <= 36; x += 7.0) {
    lamp(kit, x, -14.6, 0.3);
    lamp(kit, x, -20.4, 0.3);
  }

  // 10. KHỐI ĐẾ TRUNG TÂM THƯƠNG MẠI VINCOM CENTER LANDMARK 81 (PODIUM 6 TẦNG)
  // Khối đế tầng trệt và lửng (tầng 1-2): Đá hoa cương & vách kính thương mại
  kit.box(0, 0.55, -9, 14.2, 0.9, 11.2, 'stone');
  kit.box(0, 0.55, -9, 14.3, 0.65, 11.3, 'glass');
  // Khối trung tâm thương mại 6 tầng (tầng 3-6)
  kit.box(0, 1.6, -9, 13.6, 1.3, 10.6, 'curtainBlue');
  kit.facade(0, -9, 13.6, 2.2, 10.6, 0.2, 0.38);
  kit.box(0, 2.35, -9, 13.9, 0.25, 10.9, 'ivory');
  // Màn hình LED quảng cáo ngoài trời khổng lồ Vincom (Giant Outdoor LED Screen)
  kit.box(0, 1.55, -3.6, 5.2, 0.95, 0.06, 'ledCyan');
  kit.box(0, 2.1, -3.6, 3.8, 0.14, 0.07, 'gold'); // Bảng hiệu Vincom Center chữ vàng

  // Mái sảnh đón vòm cong khổng lồ vươn ra (Grand Canopy)
  kit.box(0, 1.25, -2.8, 7.2, 0.08, 3.4, 'glass');
  kit.box(0, 1.31, -2.8, 7.3, 0.04, 3.5, 'gold');
  for (const cx of [-3.2, -1.1, 1.1, 3.2]) {
    kit.cylinder(cx, 0.62, -1.2, 0.07, 1.25, 'gold');
    kit.cylinder(cx, 0.62, -4.4, 0.07, 1.25, 'gold');
  }
  // Vườn trên mái khối đế (Podium Sky Garden)
  kit.box(0, 2.52, -9, 12.8, 0.08, 9.8, 'leaf');
  kit.box(0, 2.62, -9, 13.0, 0.14, 10.0, 'glass'); // Lan can kính sân thượng

  // 11. TÒA THÁP BIỂU TƯỢNG LANDMARK 81 (ATKINS BUNDLED BAMBOO TUBES - CAO 461.2M)
  // 9 Bó tháp tre giật cấp Atkins:
  const shafts = [
    [-1.34, -1.34, 25],
    [0, -1.34, 32],
    [1.34, -1.34, 27],
    [-1.34, 0, 32.5],
    [0, 0, 38.5], // Trụ lõi trung tâm cao nhất
    [1.34, 0, 34],
    [-1.34, 1.34, 21],
    [0, 1.34, 29],
    [1.34, 1.34, 24.5],
  ];

  for (const [x, dz, h] of shafts) {
    const shaftX = x * 1.32;
    const z = -9 + dz * 1.32;
    const shaftW = 1.72;
    const shaftD = 1.72;

    // Mặt kính xanh sâu sang trọng của thân tháp
    kit.box(shaftX, 2.4 + h / 2, z, shaftW, h, shaftD, 'curtainBlue');
    kit.facade(shaftX, z, shaftW, h, shaftD, 2.4, 0.44);

    // Hệ lam nhôm và nẹp kính dọc (Vertical Architectural Fins / Mullions)
    // Chạy suốt từ chân lên đỉnh tháp, tạo hiệu ứng vươn cao thanh thoát của chùm tre Việt Nam
    for (const sx of [-0.65, -0.22, 0.22, 0.65]) {
      kit.box(shaftX + sx, 2.4 + h / 2, z + shaftD / 2 + 0.02, 0.035, h, 0.03, 'ivory');
      kit.box(shaftX + sx, 2.4 + h / 2, z - shaftD / 2 - 0.02, 0.035, h, 0.03, 'ivory');
    }
    for (const sz of [-0.65, -0.22, 0.22, 0.65]) {
      kit.box(shaftX + shaftW / 2 + 0.02, 2.4 + h / 2, z + sz, 0.03, h, 0.035, 'ivory');
      kit.box(shaftX - shaftW / 2 - 0.02, 2.4 + h / 2, z + sz, 0.03, h, 0.035, 'ivory');
    }

    // Viền đỉnh mỗi bậc giật cấp
    kit.box(shaftX, h + 2.46, z, shaftW + 0.06, 0.14, shaftD + 0.06, 'ivory');
    kit.box(shaftX, h + 2.54, z, shaftW + 0.08, 0.04, shaftD + 0.08, 'ledGold');

    // Dải đèn LED nghệ thuật chạy dọc 4 góc cạnh của từng bó tháp (Skyline LED Edge Strips)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const edgeX = shaftX + sx * (shaftW / 2 + 0.015);
        const edgeZ = z + sz * (shaftD / 2 + 0.015);
        // Cột gờ hợp kim nhôm
        kit.box(edgeX, 2.4 + h / 2, edgeZ, 0.045, h, 0.045, 'ivory');
        // Dải LED vàng phát sáng rực rỡ ban đêm
        kit.box(edgeX, 2.4 + h / 2, edgeZ, 0.035, h, 0.035, 'ledGold');
      }
    }

    // Vườn treo Sky Garden trên nóc các bậc giật cấp
    if (h < 38) {
      kit.box(shaftX, h + 2.58, z, shaftW - 0.2, 0.08, shaftD - 0.2, 'wood');
      kit.box(shaftX, h + 2.65, z, shaftW - 0.4, 0.06, shaftD - 0.4, 'leaf');
      kit.crown(shaftX + 0.25, h + 2.85, z + 0.25, 0.26, 'leafLight');
      // Lan can kính trong suốt bao quanh vườn treo
      kit.box(shaftX, h + 2.80, z, shaftW, 0.28, shaftD, 'glass');
    }
  }

  // 12. ĐÀI QUAN SÁT LANDMARK 81 SKYVIEW (TẦNG 79 - 81) & VƯƠNG MIỆN CROWN
  // Khối lồng kính đài quan sát SkyView nhô ra khỏi tháp
  kit.box(0, 41.2, -9, 1.82, 2.4, 1.82, 'glass');
  kit.box(0, 41.2, -9, 1.76, 2.3, 1.76, 'window');
  // Cầu kính SkyTouch nhô ra không gian
  kit.box(0, 40.2, -7.8, 0.95, 0.08, 0.75, 'glass');
  kit.box(0, 40.35, -7.8, 0.95, 0.24, 0.75, 'ledCyan');

  // Đèn LED neon vương miện đỉnh tháp (Luminous Crown Lighting)
  for (const side of [-1, 1]) {
    for (const zSide of [-1, 1]) {
      kit.box(side * 0.45, 42.8, -9 + zSide * 0.45, 0.05, 3.8, 0.05, 'ledWhite');
    }
  }
  for (let y = 41.5; y < 44.5; y += 0.38) {
    kit.box(0, y, -9, 1.15, 0.03, 1.15, 'ivory');
    kit.box(0, y + 0.16, -9, 1.18, 0.02, 1.18, 'ledGold');
  }

  // 13. HỆ GIÀN THÉP KHÔNG GIAN VÀ TRỤ ĂNG-TEN KIM THU LÔI (SPACE TRUSS MAST - 461.2M)
  // Tầng 1 của giàn kim thu lôi: 4 chân giàn thép thu nhọn (Tapered Quad-leg Truss)
  for (let level = 0; level < 4; level++) {
    const yBase = 44.5 + level * 0.95;
    const rBase = 0.42 - level * 0.08;
    const rTop = 0.42 - (level + 1) * 0.08;
    // Sàn công tác kỹ thuật
    kit.box(0, yBase, -9, rBase * 2.1, 0.04, rBase * 2.1, 'stone');
    kit.box(0, yBase + 0.03, -9, rBase * 2.15, 0.02, rBase * 2.15, 'ledWhite');
    // 4 chân giàn thép
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        kit.cylinder(sx * ((rBase + rTop) / 2), yBase + 0.48, -9 + sz * ((rBase + rTop) / 2), 0.03, 0.95, 'ivory');
      }
    }
  }
  // Trụ ăng-ten chính vươn lên độ cao tối thượng
  kit.cylinder(0, 48.8, -9, 0.065, 2.4, 'ivory');
  kit.cylinder(0, 50.1, -9, 0.035, 1.2, 'ivory');
  // Đèn cảnh báo hàng không nhấp nháy đỏ chớp sáng trên đỉnh cao nhất (Aviation Obstacle Beacon)
  kit.cylinder(0, 50.8, -9, 0.045, 0.35, 'red');
  kit.box(0, 50.95, -9, 0.1, 0.1, 0.1, 'ledPink');
  // Đèn pha rọi bầu trời (Sky Searchlight)
  kit.box(0, 51.05, -9, 0.08, 0.12, 0.08, 'ledWhite');

  // 14. QUẦN THỂ 10 KHỐI THÁP CĂN HỘ VINHOMES CENTRAL PARK (QUY HOẠCH HÀI HÒA, THOÁNG ĐÃNG)
  const apartmentTowers = [
    // Cụm The Central (bên trái đại sảnh Landmark 81)
    { x: -28, z: -19, w: 5.2, h: 23, d: 4.6, mat: 'curtainBlue' as const, name: 'Central 1' },
    { x: -20, z: -20, w: 5.4, h: 25, d: 4.8, mat: 'glass' as const, name: 'Central 2' },
    { x: -12, z: -18, w: 4.8, h: 21, d: 4.4, mat: 'mint' as const, name: 'Central 3' },

    // Dãy tháp The Park (ven sông, chừa khoảng hở rộng lớn ở giữa nhìn ra sông)
    { x: -22, z: -7, w: 4.8, h: 19, d: 4.2, mat: 'curtainBlue' as const, name: 'Park 1' },
    { x: -15, z: -6, w: 4.8, h: 21, d: 4.2, mat: 'glass' as const, name: 'Park 2' },
    { x: 15, z: -6, w: 4.8, h: 21, d: 4.2, mat: 'curtainBlue' as const, name: 'Park 3' },
    { x: 22, z: -7, w: 4.8, h: 19, d: 4.2, mat: 'mint' as const, name: 'Park 4' },

    // Cụm The Landmark (bên phải đại sảnh Landmark 81)
    { x: 12, z: -18, w: 4.8, h: 22, d: 4.4, mat: 'mint' as const, name: 'Landmark 1' },
    { x: 20, z: -20, w: 5.4, h: 26, d: 4.8, mat: 'glass' as const, name: 'Landmark 2' },
    { x: 28, z: -19, w: 5.2, h: 23, d: 4.6, mat: 'curtainBlue' as const, name: 'Landmark 3' },
  ];

  for (const t of apartmentTowers) {
    // 1. Thềm vỉa hè riêng biệt lát đá granite cho từng tòa tháp
    kit.box(t.x, 0.16, t.z, t.w + 1.4, 0.08, t.d + 1.4, 'stone');
    kit.box(t.x, 0.22, t.z, t.w + 0.9, 0.06, t.d + 0.9, 'paving');

    // 2. Khối đế shophouse 3 tầng (Commercial Podium)
    kit.box(t.x, 0.95, t.z, t.w + 0.4, 1.4, t.d + 0.4, 'stone');
    kit.box(t.x, 0.95, t.z + t.d / 2 + 0.22, t.w, 0.95, 0.08, 'glass'); // Kính trưng bày shophouse
    kit.box(t.x, 1.55, t.z + t.d / 2 + 0.35, t.w * 0.85, 0.08, 0.45, 'ivory'); // Mái hiên shophouse
    kit.box(t.x, 1.62, t.z + t.d / 2 + 0.38, t.w * 0.7, 0.06, 0.04, 'ledGold'); // Biển hiệu phát sáng

    // 3. Thân tháp căn hộ cao cấp
    const towerH = t.h - 1.6;
    kit.box(t.x, towerH / 2 + 1.6, t.z, t.w, towerH, t.d, t.mat);
    kit.facade(t.x, t.z, t.w, towerH, t.d, 1.6, 0.42);

    // 4. Ban công kính bo quanh mặt trước và mặt sau từng tầng
    for (let y = 2.2; y < t.h; y += 0.85) {
      // Ban công mặt trước (hướng ra sông/quảng trường)
      kit.box(t.x, y, t.z + t.d / 2 + 0.06, t.w * 0.92, 0.05, 0.18, 'ivory');
      kit.box(t.x, y + 0.08, t.z + t.d / 2 + 0.14, t.w * 0.88, 0.08, 0.03, 'glass');
      // Ban công mặt sau
      kit.box(t.x, y, t.z - t.d / 2 - 0.06, t.w * 0.92, 0.05, 0.18, 'ivory');
      kit.box(t.x, y + 0.08, t.z - t.d / 2 - 0.14, t.w * 0.88, 0.08, 0.03, 'glass');
    }

    // 5. Nóc tháp (Architectural Crown & Penthouse): Giàn lam nhôm che kỹ thuật & Helipad
    kit.box(t.x, t.h + 0.22, t.z, t.w + 0.18, 0.18, t.d + 0.18, 'ivory');
    kit.box(t.x, t.h + 0.35, t.z, t.w + 0.22, 0.04, t.d + 0.22, 'ledGold'); // Viền LED mái
    // Khối penthouse kỹ thuật
    kit.box(t.x, t.h + 0.75, t.z, t.w * 0.6, 0.8, t.d * 0.6, 'stone');
    // Giàn lam nhôm che nắng (Architectural Louvers)
    for (let lx = -t.w * 0.28; lx <= t.w * 0.28; lx += 0.35) {
      kit.box(t.x + lx, t.h + 1.25, t.z, 0.04, 0.08, t.d * 0.65, 'ivory');
    }
    // Đèn báo không đỉnh tháp
    kit.box(t.x, t.h + 1.45, t.z, 0.08, 0.25, 0.08, 'red');
    kit.box(t.x, t.h + 1.6, t.z, 0.12, 0.12, 0.12, 'ledPink');
  }

  // 15. KHU BIỆT THỰ SINH THÁI THE VILLAS VINHOMES CENTRAL PARK (4 CĂN VEN CÔNG VIÊN)
  const centralVillas = [
    { x: -8, z: -8 },
    { x: -4, z: -9 },
    { x: 4, z: -9 },
    { x: 8, z: -8 },
  ];
  for (const v of centralVillas) {
    kit.box(v.x, 0.16, v.z, 3.2, 0.06, 2.8, 'paving');
    kit.box(v.x, 0.65, v.z, 2.4, 0.9, 2.2, 'ivory');
    kit.box(v.x, 1.35, v.z, 2.6, 0.45, 2.4, 'roof');
    kit.box(v.x, 0.65, v.z + 1.12, 1.9, 0.6, 0.05, 'glass');
    kit.box(v.x, 0.25, v.z + 1.35, 0.7, 0.05, 0.4, 'wood');
    kit.tree(v.x + 1.5, v.z - 0.2, 0.65);
    kit.tree(v.x - 1.5, v.z + 0.2, 0.55);
  }

  // 16. HỆ THỐNG TIỆN ÍCH LẤP ĐẦY KHÔNG GIAN CÔNG VIÊN
  // Sân Pickleball thứ 2
  kit.box(25.5, 0.16, 7.0, 4.5, 0.05, 5.5, 'stone');
  kit.box(25.5, 0.18, 7.0, 4.2, 0.02, 5.0, 'pool');
  kit.box(25.5, 0.195, 7.0, 3.8, 0.006, 0.04, 'marking');
  kit.box(25.5, 0.28, 7.0, 0.02, 0.16, 4.4, 'dark');

  // Sân chơi trẻ em (Kids Adventure Playground) với thảm cao su màu cam và cầu trượt
  kit.box(-26.5, 0.16, 7.5, 6.5, 0.04, 5.0, 'paving');
  kit.box(-26.5, 0.18, 7.5, 6.0, 0.02, 4.5, 'gold');
  kit.cylinder(-26.5, 0.45, 7.5, 0.45, 0.55, 'red');
  kit.crown(-26.5, 0.78, 7.5, 0.55, 'roof', 0.25);

  // Bãi đỗ xe cây xanh (Eco Parking Lot) ven đại lộ Nguyễn Hữu Cảnh
  kit.box(0, 0.19, -13.5, 34, 0.02, 3.2, 'stone');
  for (let px = -15; px <= 15; px += 2.5) {
    kit.box(px, 0.205, -13.5, 0.04, 0.006, 2.8, 'marking');
    if (Math.abs(px) % 5 === 0) {
      kit.box(px + 1.25, 0.3, -13.5, 0.5, 0.15, 0.24, 'curtainBlue');
      kit.box(px + 1.25, 0.38, -13.5, 0.32, 0.08, 0.22, 'glass');
      kit.tree(px + 1.25, -11.5, 0.65);
    }
  }

  return { model: kit.finish(), water: river.material };
}
