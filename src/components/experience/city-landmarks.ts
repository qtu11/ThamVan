import * as THREE from 'three';
import { CityKit, type CityMaterial } from './city-kit';

// Photo-led silhouettes, composed for the miniature, not surveyed positions.

export function addLandmarks(kit: CityKit) {
  bitexco(kit);
  timesSquare(kit);
  hilton(kit);
  vietcombank(kit);
  hotelMajestic(kit);
  meLinhPoint(kit);
  benNhaRong(kit);
  doubleDeckerBuses(kit);
}

function bitexco(kit: CityKit) {
  const x = -17,
    z = -6,
    base = 0.3;
  kit.box(x, 0.25, z, 4, 0.3, 3.4, 'stone');
  // Floor rings and mullions share the elliptical, leaning surface.
  const surface = (height: number, angle: number) => {
    const t = Math.min(1, height / 26.2);
    const r =
      t < 0.62 ? 1.4 + Math.sin(((t / 0.62) * Math.PI) / 2) * 0.65 : 2.05 - (t - 0.62) * 3.6;
    return new THREE.Vector3(
      x + Math.cos(angle) * r + t * 0.5,
      base + height,
      z + Math.sin(angle) * r * 0.76,
    );
  };
  const vertices: number[] = [],
    indices: number[] = [];
  const levels = 70,
    sides = 48;
  for (let row = 0; row <= levels; row++) {
    for (let side = 0; side <= sides; side++) {
      const a = (side / sides) * Math.PI * 2;
      const height = (row / levels) * (25.45 + Math.cos(a) * 0.75);
      vertices.push(...surface(height, a).toArray());
      if (row < levels && side < sides) {
        const i = row * (sides + 1) + side;
        indices.push(i, i + sides + 1, i + 1, i + 1, i + sides + 1, i + sides + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  kit.mesh(geometry, 'glass', 0, 0, 0);
  for (let h = 0.4; h < 25.0; h += 0.38) {
    for (let side = 0; side < sides; side++) {
      const a = (side / sides) * Math.PI * 2,
        b = ((side + 1) / sides) * Math.PI * 2;
      const p = surface(h, a),
        q = surface(h, b);
      p.x += Math.cos(a) * 0.013;
      p.z += Math.sin(a) * 0.013;
      q.x += Math.cos(b) * 0.013;
      q.z += Math.sin(b) * 0.013;
      kit.line(p, q);
    }
  }
  for (let side = 0; side < 24; side++) {
    const a = (side / 24) * Math.PI * 2;
    for (let h = 0.3; h < 24.8; h += 0.45) kit.line(surface(h, a), surface(h + 0.45, a));
    if (side < 13) {
      const p = surface(24.2, a);
      kit.box(p.x, p.y, p.z, 0.025, 1.1 - (side % 3) * 0.2, 0.025, 'ledWhite');
    }
  }
  // Đỉnh tháp búp sen Bitexco 262m với kim thu lôi và đèn báo không
  kit.cylinder(x + 0.45, 26.6, z + 0.2, 0.04, 1.8, 'ivory');
  kit.box(x + 0.45, 27.6, z + 0.2, 0.08, 0.15, 0.08, 'red');

  const px = x - 2.1,
    pz = z + 1.3,
    py = 19.2;
  // Đài quan sát Saigon Skydeck (Tầng 49) rực sáng ấm áp
  kit.cylinder(x + 0.35, 18.0, z + 0.1, 1.52, 0.36, 'lit');
  // Hệ dầm thép консоl (Cantilever Steel Trusses) đỡ sân đỗ trực thăng Helipad tầng 52
  kit.box(x - 1.2, py - 0.09, z + 0.8, 2.5, 0.14, 1.15, 'ivory');
  for (const sz of [z + 0.45, z + 1.15]) {
    kit.line(new THREE.Vector3(x - 0.4, py - 1.45, sz), new THREE.Vector3(px - 0.55, py - 0.08, sz), 'brass');
    kit.line(new THREE.Vector3(x - 0.4, py - 0.95, sz), new THREE.Vector3(px - 0.15, py - 0.08, sz), 'brass');
  }
  kit.cylinder(px, py, pz, 1.32, 0.14, 'ivory');
  kit.cylinder(px, py + 0.08, pz, 1.2, 0.025, 'stone');
  const ring = kit.mesh(new THREE.TorusGeometry(1.04, 0.02, 4, 48), 'ledGold', px, py + 0.1, pz);
  ring.rotation.x = -Math.PI / 2;
  // Chữ H màu trắng phản quang trên sân đỗ trực thăng Helipad
  kit.box(px, py + 0.105, pz, 0.46, 0.01, 0.08, 'marking');
  kit.box(px - 0.22, py + 0.105, pz, 0.08, 0.01, 0.52, 'marking');
  kit.box(px + 0.22, py + 0.105, pz, 0.08, 0.01, 0.52, 'marking');
  // Đèn tín hiệu vành đai Helipad
  for (let i = 0; i < 8; i++) {
    const ha = (i / 8) * Math.PI * 2;
    kit.box(
      px + Math.cos(ha) * 1.24,
      py + 0.11,
      pz + Math.sin(ha) * 1.24,
      0.045,
      0.045,
      0.045,
      i % 2 === 0 ? 'red' : 'ledGold',
    );
  }
}

function timesSquare(kit: CityKit) {
  const x = -5,
    z = -5;
  kit.box(x, 1.15, z, 5.2, 2, 4.1, 'ivory');
  kit.facade(x, z, 5.2, 2, 4.1, 0.15, 0.4);
  for (const offset of [-0.9, 0.9]) {
    kit.box(x + offset, 9.2, z, 1.65, 14.1, 2.4, 'jade');
    kit.facade(x + offset, z, 1.65, 14.1, 2.4, 2.15, 0.38);
    kit.box(x + offset, 16.35, z, 1.72, 0.1, 2.5, 'dark');
  }
  const colors: CityMaterial[] = ['ledGold', 'ledPink', 'ledPink', 'ledCyan'];
  for (let col = 0; col < 12; col++) {
    const xx = x - 1.7 + col * 0.31;
    kit.box(xx, 9.2, z + 1.24, 0.045, 13.9, 0.03, colors[col % 4]);
    kit.box(xx, 9.2, z - 1.24, 0.045, 13.9, 0.03, colors[(col + 1) % 4]);
  }
  for (let i = 0; i < 8; i++)
    for (const side of [-1, 1])
      kit.box(x + side * 1.76, 9.2, z - 1.1 + i * 0.31, 0.03, 13.9, 0.045, colors[(i + 1) % 4]);
  kit.box(x, 16.5, z + 1.23, 2.35, 0.12, 0.05, 'ledGold');
  for (let i = 0; i < 6; i++) kit.box(x - 2.2 + i * 0.88, 1.1, z + 2.1, 0.5, 1.4, 0.04, 'lit');
}

function hilton(kit: CityKit) {
  const x = 3.2,
    z = -2.8;
  for (let tier = 0; tier < 4; tier++) {
    const h = [2.1, 1.4, 1.5, 10.4][tier];
    const base = [0.2, 2.3, 3.7, 5.2][tier];
    const w = [4.9, 4.5, 4.1, 3.7][tier],
      d = [3.2, 3, 2.8, 2.6][tier],
      r = 0.38;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -d / 2);
    shape.lineTo(w / 2 - r, -d / 2);
    shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
    shape.lineTo(w / 2, d / 2 - r);
    shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
    shape.lineTo(-w / 2 + r, d / 2);
    shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
    shape.lineTo(-w / 2, -d / 2 + r);
    shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: h,
      bevelEnabled: false,
      curveSegments: 5,
    });
    geometry.rotateX(-Math.PI / 2);
    kit.mesh(geometry, 'glass', x, base, z);
    for (let floor = 0.1; floor < h; floor += 0.38) {
      const yy = base + floor;
      kit.box(
        x,
        yy,
        z + d / 2 + 0.025,
        w - 0.45,
        0.025,
        0.045,
        floor > h - 0.5 ? 'ledGold' : 'ledCyan',
      );
      for (const side of [-1, 1])
        kit.box(x + side * (w / 2 + 0.015), yy, z, 0.025, 0.025, d - 0.55, 'ivory');
    }
    kit.facade(x, z, w - 0.38, h, d, base, 0.34);
  }
  kit.box(x, 15.7, z, 3.6, 0.18, 2.5, 'ivory');
  kit.box(x, 15.83, z, 3.5, 0.04, 2.4, 'ledCyan');
}

function vietcombank(kit: CityKit) {
  const x = 12.2,
    z = -2;
  kit.box(x, 0.45, z, 5.3, 0.6, 4.3, 'ivory');
  kit.box(x, 1.2, z, 4.7, 0.9, 3.7, 'glass');
  for (let i = -3; i <= 3; i++) kit.box(x + i * 0.67, 1.25, z + 2.0, 0.12, 1.7, 0.18, 'ivory');
  kit.box(x, 9.4, z, 4.23, 15.4, 3.01, 'glass');
  kit.facade(x, z, 4.23, 15.4, 3.01, 1.7, 0.45);
  // Unequal slabs form the stepped white crown seen from Bạch Đằng.
  for (const [dx, width, h] of [
    [-1.575, 1.05, 18.4],
    [-0.525, 1.05, 17.2],
    [0.525, 1.05, 16],
    [1.575, 1.05, 14.9],
  ]) {
    kit.box(x + dx, 1.7 + h / 2, z, width, h, 3, 'glass');
    kit.box(x + dx, h + 1.72, z, width + 0.04, 0.09, 3.04, 'ledWhite');
    for (let xx = -width / 2; xx <= width / 2 + 0.01; xx += 0.17) {
      kit.box(x + dx + xx, 1.7 + h / 2, z + 1.525, 0.018, h, 0.025, 'ivory');
      kit.box(x + dx + xx, 1.7 + h / 2, z - 1.525, 0.018, h, 0.025, 'ivory');
    }
    for (let yy = 2; yy < h + 1.5; yy += 0.45)
      kit.box(x + dx, yy, z + 1.53, width, 0.02, 0.025, 'ivory');
  }
  for (let yy = 2; yy < 16.5; yy += 0.45) kit.box(x + 2.13, yy, z, 0.025, 0.025, 3, 'ivory');
  kit.box(x - 1.85, 20.3, z - 0.5, 0.12, 0.6, 0.14, 'ledWhite');
  kit.box(x - 1.7, 18.5, z + 1.54, 0.14, 2.7, 0.03, 'ledGold');
}

export function hotelMajestic(kit: CityKit) {
  // Khách sạn cổ điển Pháp Hotel Majestic Saigon 1925 (Góc Đồng Khởi & Tôn Đức Thắng)
  const x = -11,
    z = -7;
  // Khối đế đá hoa cương & sảnh đón cổ điển
  kit.box(x, 0.25, z, 4.2, 0.3, 3.8, 'stone');
  kit.box(x, 1.8, z, 3.8, 2.8, 3.4, 'ivory');
  // Hàng cột vòm cổ điển Pháp dọc mặt tiền sông Sài Gòn
  for (let cx = x - 1.65; cx <= x + 1.65; cx += 0.55) {
    kit.box(cx, 1.65, z + 1.72, 0.08, 2.5, 0.08, 'stone');
  }
  // Mặt tiền vòm cong kiểu Pháp và các ô cửa sổ cổ điển ấm áp
  for (let y = 0.8; y <= 2.8; y += 0.65) {
    kit.box(x, y, z + 1.72, 3.5, 0.045, 0.09, 'gold');
    kit.box(x, y + 0.12, z + 1.75, 3.3, 0.12, 0.04, 'dark'); // Lan can hoa sắt
    kit.box(x, y + 0.28, z + 1.69, 3.1, 0.26, 0.03, 'lit'); // Khung cửa sổ vàng ấm
  }
  // Hai mái vòm tròn góc phố đặc trưng (French Classical Mansard Domes)
  for (const side of [-1.4, 1.4]) {
    kit.cylinder(x + side, 3.52, z + 1.2, 0.72, 0.68, 'roof');
    kit.cylinder(x + side, 3.96, z + 1.2, 0.16, 0.28, 'gold');
  }
  // Mái Mansard ngói đỏ dốc & M.Bar Rooftop Terrace
  kit.box(x, 3.35, z, 4.0, 0.35, 3.6, 'roof');
  kit.box(x, 3.62, z - 0.2, 2.4, 0.18, 1.8, 'lit');
  // Biển hiệu Hotel Majestic bằng đồng vàng
  kit.box(x, 2.1, z + 1.77, 1.85, 0.16, 0.04, 'ledGold');
}

function meLinhPoint(kit: CityKit) {
  // Cao ốc Me Linh Point Tower (Công trường Mê Linh) với mặt tiền bo cong màu đồng nâu và kính
  const x = 7.4,
    z = -6.2;
  kit.box(x, 0.9, z, 3.4, 1.5, 3.0, 'bronze');
  kit.box(x, 7.6, z, 2.8, 11.8, 2.5, 'bronze');
  kit.cylinder(x, 7.8, z + 1.15, 1.15, 12.2, 'glass');
  kit.facade(x, z, 2.8, 11.8, 2.5, 1.65, 0.42);
  kit.box(x, 13.7, z, 2.9, 0.16, 2.6, 'ivory');
  kit.box(x, 13.85, z, 2.95, 0.05, 2.65, 'ledGold');
}

function benNhaRong(kit: CityKit) {
  // Di tích lịch sử Bến Nhà Rồng - Bảo tàng Hồ Chí Minh (1863) tại ngã ba sông Sài Gòn - Bến Nghé
  const x = -25.2,
    z = -1.2;
  // Nền móng đá hoa cương và thềm bậc tam cấp
  kit.box(x, 0.22, z, 3.8, 0.22, 2.8, 'stone');
  // Thân tòa nhà kiến trúc Pháp - Á kết hợp (tường gạch hồng đất nung & hàng hiên cột vòm trắng)
  kit.box(x, 0.95, z, 3.2, 1.25, 2.2, 'roof');
  // Hàng cột vòm trắng (Veranda Colonnade) bao quanh tầng 1 & tầng 2
  for (let cx = x - 1.45; cx <= x + 1.45; cx += 0.48) {
    kit.box(cx, 0.95, z + 1.12, 0.09, 1.22, 0.09, 'ivory');
    kit.box(cx, 0.95, z - 1.12, 0.09, 1.22, 0.09, 'ivory');
  }
  for (const y of [0.38, 0.95, 1.52]) {
    kit.box(x, y, z, 3.38, 0.07, 2.38, 'ivory');
  }
  // Cửa sổ gỗ sáng đèn ấm áp bên trong bảo tàng
  kit.box(x, 0.95, z, 2.9, 0.95, 1.9, 'lit');
  // Mái ngói đỏ 2 tầng chồng diêm đặc trưng Á Đông
  kit.box(x, 1.72, z, 3.65, 0.26, 2.65, 'roof');
  kit.box(x, 2.02, z, 2.85, 0.24, 1.95, 'roof');
  // Đôi rồng chầu mặt nguyệt ("Lưỡng long chầu nguyệt") bằng gốm men xanh & vàng trên đỉnh nóc
  kit.box(x - 0.65, 2.24, z, 0.75, 0.14, 0.08, 'jade');
  kit.box(x + 0.65, 2.24, z, 0.75, 0.14, 0.08, 'jade');
  kit.cylinder(x, 2.28, z, 0.14, 0.16, 'ledGold');
}

export function doubleDeckerBuses(kit: CityKit) {
  // Xe buýt du lịch 2 tầng City Sightseeing Saigon màu đỏ rực rỡ
  const buses = [
    { x: -6, z: -4.5, yaw: 0 },
    { x: 14, z: -4.2, yaw: Math.PI },
  ];
  for (const b of buses) {
    // Tầng 1: Màu đỏ, cửa kính
    kit.box(b.x, 0.35, b.z, 0.42, 0.28, 1.35, 'red', b.yaw);
    kit.box(b.x, 0.45, b.z, 0.44, 0.14, 1.25, 'glass', b.yaw);
    // Tầng 2: Mui trần lộ thiên có lan can vàng
    kit.box(b.x, 0.65, b.z, 0.42, 0.22, 1.35, 'red', b.yaw);
    kit.box(b.x, 0.78, b.z, 0.44, 0.06, 1.37, 'gold', b.yaw);
    // Đèn pha trước & đèn hậu đỏ
    kit.box(b.x, 0.32, b.z + 0.69, 0.36, 0.05, 0.03, 'ledGold', b.yaw);
    kit.box(b.x, 0.32, b.z - 0.69, 0.36, 0.05, 0.03, 'red', b.yaw);
  }
}
