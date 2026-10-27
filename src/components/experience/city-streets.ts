import * as THREE from 'three';
import { CityKit, type CityMaterial } from './city-kit';

export type RiverHeight = (x: number) => number;
const streetX = [-25, -12, 8, 23];
const streetZ = [-18, -11];

export function addStreets(kit: CityKit, bank: RiverHeight) {
  for (const x of streetX) {
    const end = bank(x) - 3.5;
    kit.box(x, 0.15, (-21 + end) / 2, 0.75, 0.035, end + 21, 'road');
    for (let z = -20.5; z < end; z += 0.9) kit.box(x, 0.177, z, 0.025, 0.008, 0.3, 'marking');
    for (const side of [-1, 1])
      kit.box(x + side * 0.55, 0.17, (-21 + end) / 2, 0.28, 0.07, end + 21, 'paving');
    for (let z = -20; z < end - 0.5; z += 2.7) {
      lamp(kit, x + 0.66, z);
      vehicle(kit, x - 0.19, z + 0.4, Math.round(x + z));
    }
  }
  for (const z of streetZ) {
    kit.box(0, 0.15, z, 57, 0.035, 0.8, 'road');
    for (let x = -28; x < 28; x += 0.9) kit.box(x, 0.177, z, 0.3, 0.008, 0.025, 'marking');
    for (const x of streetX)
      for (let i = -2; i <= 2; i++)
        kit.box(x + i * 0.12, 0.19, z + 0.65, 0.065, 0.008, 0.28, 'marking');
  }
  // The lit boulevard follows the bank, with a fine planted central reservation.
  for (let x = -28; x < 28; x += 0.45) {
    const z = bank(x) - 3.3,
      angle = -Math.atan(0.012 * x);
    kit.box(x, 0.16, z, 0.48, 0.06, 1.65, 'road', angle);
    kit.box(x, 0.2, z, 0.48, 0.06, 0.12, 'leaf', angle);
    if (Math.round(x * 100) % 3 === 0)
      kit.box(x, 0.195, z + 0.45, 0.18, 0.012, 0.025, 'marking', angle);
    for (const side of [-1, 1]) {
      const xx = x + 0.16 * side;
      kit.box(
        xx,
        0.2,
        z + side * 0.55,
        0.17,
        0.015,
        0.025,
        side === 1 ? 'ledGold' : 'ledPink',
        angle,
      );
    }
  }
  for (let x = -27; x < 28; x += 2) {
    const z = bank(x) - 3.3;
    lamp(kit, x, z - 1);
    vehicle(kit, x, z + 0.45, Math.round(x), Math.PI / 2 - Math.atan(0.012 * x));
  }
}

function vehicle(kit: CityKit, x: number, z: number, index: number, yaw = 0) {
  // Đội xe cộ Sài Gòn đa dạng: Taxi Mai Linh (vinbus), Taxi Vinasun (ivory+red), Sedan sang trọng, Bus
  let body: CityMaterial = 'ivory';
  const type = index % 7;
  let len = 0.54;
  let isTaxi = false;

  if (type === 0) {
    body = 'vinbus'; // Taxi Mai Linh xanh lá đặc trưng
    isTaxi = true;
  } else if (type === 1) {
    body = 'ivory'; // Taxi Vinasun trắng ngà
    isTaxi = true;
  } else if (type === 2) {
    body = 'curtainBlue'; // Sedan doanh nhân xanh sẫm
  } else if (type === 3) {
    body = 'red'; // Xe thể thao đỏ
    len = 0.48;
  } else if (type === 4) {
    body = 'bronze'; // SUV màu vàng đồng
    len = 0.58;
  } else if (type === 5) {
    body = 'dark'; // Xe sedan đen bóng
  } else {
    body = 'ivory'; // Xe buýt / van trung chuyển
    len = 0.95;
  }

  kit.box(x, 0.31, z, 0.25, 0.17, len, body, yaw);
  kit.box(x, 0.42, z, 0.22, 0.09, len * 0.58, 'glass', yaw);

  // Mào taxi trên nóc
  if (isTaxi) {
    kit.box(x, 0.49, z, 0.08, 0.04, 0.12, type === 0 ? 'ledGold' : 'red', yaw);
  }

  // Đèn pha trước (vàng ấm) và đèn hậu đỏ
  for (const side of [-1, 1]) {
    const pFront = new THREE.Vector3(side * 0.08, 0, len / 2 + 0.015).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yaw,
    );
    const pRear = new THREE.Vector3(side * 0.08, 0, -len / 2 - 0.015).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yaw,
    );
    kit.box(x + pFront.x, 0.31, z + pFront.z, 0.045, 0.035, 0.02, 'ledGold', yaw);
    kit.box(x + pRear.x, 0.31, z + pRear.z, 0.045, 0.035, 0.02, 'red', yaw);
  }
}

export function lamp(kit: CityKit, x: number, z: number, base = 0.15) {
  // Cột đèn chiếu sáng đô thị cổ điển kiểu Pháp bằng đồng đúc
  kit.cylinder(x, base + 0.57, z, 0.022, 1.15, 'bronze');
  kit.cylinder(x, base + 0.08, z, 0.05, 0.16, 'stone'); // Bệ đế chân cột đèn
  kit.box(x - 0.09, base + 1.14, z, 0.22, 0.04, 0.08, 'bronze');
  kit.box(x - 0.13, base + 1.11, z, 0.13, 0.03, 0.09, 'ledGold'); // Ánh sáng chao đèn vàng ấm
}

export function addNeighborhoods(kit: CityKit, bank: RiverHeight) {
  let seed = 20261027;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const reserved = [
    [-17, -6, 3.1, 2.8],
    [-11, -7, 3.2, 2.8], // Hotel Majestic Saigon
    [-5, -5, 3.3, 2.8],
    [3.2, -2.8, 2.7, 2.1],
    [12.2, -2, 3.2, 2.6],
  ];
  let index = 0;
  for (let x = -27.5; x < 28; x += 2.15) {
    for (let z = -20.8; z < bank(x) - 4.6; z += 2.05) {
      const w = 0.95 + random() * 0.7,
        d = 0.9 + random() * 0.6;
      if (
        streetX.some((xx) => Math.abs(x - xx) < w / 2 + 0.65) ||
        streetZ.some((zz) => Math.abs(z - zz) < d / 2 + 0.55)
      )
        continue;
      if (
        reserved.some(
          ([xx, zz, rw, rd]) => Math.abs(x - xx) < rw + w / 2 && Math.abs(z - zz) < rd + d / 2,
        )
      )
        continue;
      const front = z > -5;
      const height = front ? 1.2 + random() * 3 : 1.8 + random() ** 1.5 * 6.5;
      const material: CityMaterial =
        index % 5 === 0
          ? 'curtainBlue'
          : index % 4 === 0
            ? 'concrete'
            : index % 3 === 0
              ? 'jade'
              : index % 2
                ? 'glass'
                : 'mint';

      // 1. Thềm móng và vỉa hè riêng biệt cho từng tòa nhà
      kit.box(x, 0.24, z, w + 0.14, 0.2, d + 0.14, 'stone');

      // 2. Tầng trệt shophouse / sảnh đón có mái hiên và cửa kính
      kit.box(x, 0.65, z, w, 0.65, d, 'stone');
      kit.box(x, 0.65, z + d / 2 + 0.015, w * 0.85, 0.45, 0.04, 'glass'); // Cửa kính tầng trệt
      kit.box(x, 0.98, z + d / 2 + 0.08, w * 0.9, 0.04, 0.18, 'ivory'); // Mái hiên shop

      // 3. Thân tòa nhà cao tầng
      const bodyH = height - 0.7;
      kit.box(x, bodyH / 2 + 0.7, z, w, bodyH, d, material);
      kit.facade(x, z, w, bodyH, d, 0.7, 0.38);

      // Ban công kính hoặc gờ phân tầng
      if (height > 3.0) {
        for (let y = 1.6; y < height; y += 0.8) {
          kit.box(x, y, z + d / 2 + 0.025, w * 0.88, 0.03, 0.06, 'ivory');
        }
      }

      // 4. Mái tòa nhà và khối kỹ thuật
      kit.box(x, height + 0.18, z, w + 0.08, 0.12, d + 0.08, 'ivory');
      kit.box(x, height + 0.48, z, w * 0.5, 0.45, d * 0.5, 'stone');

      // Biển hiệu LED neon trên nóc các tòa nhà trung tâm
      if (index % 3 === 0 && height > 3.5) {
        const neonColor: CityMaterial = index % 6 === 0 ? 'ledCyan' : index % 2 ? 'ledGold' : 'ledPink';
        kit.box(x, height + 0.26, z + d / 2 + 0.04, w * 0.7, 0.05, 0.02, neonColor);
        // Đèn báo không đỉnh tháp
        kit.box(x, height + 0.85, z, 0.04, 0.2, 0.04, 'red');
      }

      // Cây xanh đô thị và bồn hoa tiểu cảnh
      if (index % 3 === 0) {
        kit.tree(x + w / 2 + 0.2, z + d / 2, 0.65);
      } else if (index % 5 === 0) {
        kit.palm(x - w / 2 - 0.2, z + d / 2, 0.62);
      }
      index++;
    }
  }

  // Dãy nhà phố thương mại kiểu Pháp (French Colonial Heritage Shophouses)
  for (const [x, z, w] of [
    [-22, 1, 4.4],
    [-15, 0.8, 3.8],
    [21, 2.2, 5],
  ]) {
    kit.box(x, 1.05, z, w, 1.7, 1.65, 'ivory');
    // Gờ phào chỉ tân cổ điển
    kit.box(x, 1.99, z, w + 0.25, 0.15, 1.85, 'stone');
    // Mái ngói đỏ dốc kiểu Pháp
    kit.box(x, 2.2, z, w * 0.9, 0.25, 1.45, 'roof');
    // Cửa sổ vòm gỗ và ban công sắt uốn nghệ thuật
    for (let dx = -w / 2 + 0.35; dx < w / 2; dx += 0.45) {
      kit.box(x + dx, 1.05, z + 0.84, 0.2, 0.95, 0.03, 'lit');
      kit.box(x + dx, 0.75, z + 0.88, 0.24, 0.25, 0.06, 'dark'); // Ban công hoa sắt
      kit.box(x + dx + 0.2, 1.05, z + 0.86, 0.04, 1.4, 0.08, 'ivory'); // Cột phân vị
    }
  }

  // Trạm dừng xe buýt thông minh (Smart Bus Shelter) trên đại lộ
  for (const bx of [-18, 16]) {
    kit.box(bx, 0.22, bank(bx) - 2.1, 1.8, 0.04, 0.7, 'paving');
    kit.box(bx, 0.65, bank(bx) - 2.4, 1.8, 0.04, 0.7, 'glass'); // Mái che kính
    kit.box(bx, 0.35, bank(bx) - 2.4, 1.4, 0.06, 0.18, 'wood'); // Ghế chờ gỗ
    kit.box(bx, 0.68, bank(bx) - 2.4, 0.8, 0.06, 0.04, 'ledCyan'); // Bảng điện tử thông minh
  }
}
