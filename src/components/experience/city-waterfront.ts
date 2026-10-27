import * as THREE from 'three';
import { CityKit } from './city-kit';
import { lamp, type RiverHeight } from './city-streets';

export function addWaterfront(kit: CityKit, samples: THREE.Vector3[], bank: RiverHeight) {
  // A park strip, promenade, stepped embankment and continuous warm light rail.
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i],
      b = samples[i + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const length = a.distanceTo(b) + 0.02,
      yaw = -Math.atan2(b.z - a.z, b.x - a.x);
    kit.box(mid.x, 0.17, mid.z - 1.1, length, 0.09, 2.15, 'leaf', yaw);
    kit.box(mid.x, 0.23, mid.z - 0.45, length, 0.09, 0.8, 'paving', yaw);
    kit.box(mid.x, 0.12, mid.z + 0.09, length, 0.12, 0.24, 'stone', yaw);
    kit.box(mid.x, 0.22, mid.z - 0.03, length, 0.035, 0.04, 'ledGold', yaw);
    kit.line(
      new THREE.Vector3(a.x, 0.4, a.z - 0.02),
      new THREE.Vector3(b.x, 0.4, b.z - 0.02),
      'brass',
    );
  }
  for (let x = -27.5; x < 28; x += 1.65) {
    const z = bank(x);
    kit.cylinder(x, 0.35, z - 0.02, 0.02, 0.3, 'bronze');
    kit.palm(x, z - 1.8, 0.65 + Math.sin(x * 2) * 0.1);
    lamp(kit, x + 0.55, z - 0.86, 0.2);
    kit.box(x - 0.35, 0.4, z - 0.8, 0.42, 0.06, 0.16, 'bark');
    kit.box(x - 0.35, 0.47, z - 0.88, 0.42, 0.13, 0.035, 'bark');
    person(kit, x + 0.17, z - 0.42, Math.round(x));
    if (Math.abs(x) > 9) kit.tree(x + 0.4, z - 2.1, 0.52, true);
  }
  // 2. Cột cờ Thủ Ngữ cổ kính (Thủ Ngữ Flagpole 1865) tại ngã ba rạch Bến Nghé
  const tx = -23.5,
    tz = bank(tx) - 1.6;
  kit.cylinder(tx, 0.22, tz, 2.2, 0.12, 'stone');
  kit.cylinder(tx, 0.32, tz, 1.8, 0.10, 'paving');
  // Nhà bát giác truyền thống mái ngói đỏ
  kit.cylinder(tx, 0.58, tz, 1.4, 0.42, 'ivory');
  kit.cylinder(tx, 0.92, tz, 1.7, 0.28, 'roof');
  kit.cylinder(tx, 1.15, tz, 0.45, 0.22, 'gold');
  // Cột cờ thép cao vút
  kit.cylinder(tx, 2.2, tz, 0.045, 2.3, 'gold');
  // Lá cờ đỏ sao vàng tung bay
  kit.box(tx + 0.32, 3.1, tz, 0.55, 0.35, 0.02, 'red');
  kit.box(tx + 0.32, 3.1, tz, 0.12, 0.12, 0.025, 'ledGold');

  // 3. Quảng trường Mê Linh & Tượng đài Trần Hưng Đạo chỉ tay ra sông Bạch Đằng
  const cx = 8,
    cz = bank(cx) - 1.7;
  // Vòng xuyến hoa hướng tâm hai tầng
  kit.cylinder(cx, 0.24, cz, 2.4, 0.08, 'paving');
  kit.cylinder(cx, 0.30, cz, 2.0, 0.06, 'leafLight');
  kit.cylinder(cx, 0.36, cz, 1.4, 0.08, 'stone');
  // Bệ tượng đài hoa cương đa giác vững chãi
  kit.box(cx, 0.85, cz, 0.65, 0.9, 0.65, 'stone');
  kit.box(cx, 1.35, cz, 0.55, 0.12, 0.55, 'gold');
  // Tượng đài Trần Hưng Đạo màu vàng đồng oai phong chỉ tay ra sông
  kit.cylinder(cx, 1.68, cz, 0.16, 0.55, 'gold');
  kit.crown(cx, 2.02, cz, 0.14, 'gold', 0.22); // Đầu và mũ cánh chuồn
  kit.box(cx, 1.72, cz + 0.22, 0.08, 0.08, 0.32, 'gold'); // Cánh tay chỉ thẳng ra sông Bạch Đằng
  // Vòng đài phun nước LED bao quanh tượng đài
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    kit.cylinder(cx + Math.cos(a) * 1.85, 0.34, cz + Math.sin(a) * 1.85, 0.025, 0.09, 'ledCyan');
    kit.cylinder(cx + Math.cos(a) * 1.15, 0.42, cz + Math.sin(a) * 1.15, 0.02, 0.14, 'ledGold');
  }

  // 4. Bến tàu thủy Saigon Waterbus Bạch Đằng (Waterbus Central Station)
  const px = -10,
    pz = bank(px) + 1.8;
  // Cầu tàu dẫn lát đá và gỗ
  kit.box(px, 0.26, pz - 1.2, 1.8, 0.12, 2.4, 'paving');
  kit.box(px, 0.22, pz + 0.6, 7.5, 0.14, 1.8, 'wood');
  kit.box(px, 0.28, pz + 1.45, 7.6, 0.03, 0.06, 'ledGold');
  // Mái che màng căng cánh buồm màu trắng ngà
  kit.box(px, 0.88, pz - 0.2, 4.2, 0.06, 2.2, 'ivory');
  kit.box(px, 0.98, pz - 0.2, 3.8, 0.04, 1.8, 'glass');
  kit.box(px, 1.05, pz - 0.2, 2.2, 0.08, 0.06, 'ledGold'); // Biển hiệu Saigon Waterbus
  for (const sx of [px - 1.8, px + 1.8]) {
    for (const sz of [pz - 1.0, pz + 0.6]) {
      kit.cylinder(sx, 0.55, sz, 0.04, 0.65, 'gold');
    }
  }
  // Tàu buýt sông Saigon Waterbus neo đậu tại bến (Màu vàng cam & trắng ngà)
  kit.box(px + 1.5, 0.26, pz + 1.8, 1.6, 0.26, 3.8, 'gold', Math.PI / 2);
  kit.box(px + 1.5, 0.44, pz + 1.8, 1.2, 0.18, 2.8, 'ivory', Math.PI / 2);
  kit.box(px + 1.5, 0.46, pz + 1.8, 1.25, 0.12, 2.6, 'glass', Math.PI / 2);
  // Lan can an toàn cầu tàu
  kit.line(new THREE.Vector3(px - 3.7, 0.42, pz + 1.45), new THREE.Vector3(px + 3.7, 0.42, pz + 1.45), 'brass');
  // Fine, irregular ripples break up the larger procedural light trails.
  for (let i = 0; i < 160; i++) {
    const x = Math.sin(i * 71.3) * 27,
      z = 10.5 + (i % 33) * 0.42;
    if (z < bank(x) + 0.5) continue;
    const length = 0.1 + Math.abs(Math.sin(i * 3.9)) * 0.5;
    kit.line(
      new THREE.Vector3(x, 0.095, z),
      new THREE.Vector3(x + length, 0.095, z + 0.012),
      'water',
    );
  }
}

function person(kit: CityKit, x: number, z: number, index: number) {
  kit.cylinder(x, 0.36, z, 0.035, 0.17, index % 3 ? 'roof' : 'jade');
  kit.crown(x, 0.49, z, 0.045, 'ivory');
}

