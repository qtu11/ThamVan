import * as THREE from 'three';

export type CityTime = 'dusk' | 'day' | 'sunset' | 'night';

// Bảng màu kiến trúc 3 pha: Day -> Sunset -> Night
const sunsetColors: Record<string, string> = {
  ivory: '#eed6ba',
  stone: '#c9b49e',
  glass: '#3b6460',
  jade: '#2e5d54',
  mint: '#6d857e',
  bronze: '#d89b48',
  roof: '#b94f2d',
  bark: '#755a48',
  leaf: '#3d6348',
  leafLight: '#5e7e52',
  road: '#8c8176',
  paving: '#cbbba8',
  marking: '#f7d9a3',
  window: '#4c6d64',
  dark: '#263832',
  concrete: '#ccb8a4',
};

const nightColors: Record<string, string> = {
  ivory: '#9fb0b8',
  stone: '#344c5c',
  glass: '#294c5c',
  jade: '#1f4950',
  mint: '#486672',
  bronze: '#ba924e',
  roof: '#7a463a',
  bark: '#464244',
  leaf: '#1d423a',
  leafLight: '#2c5848',
  road: '#243644',
  paving: '#3d515e',
  marking: '#bba982',
  window: '#2a4b5a',
  dark: '#162836',
  concrete: '#82929c',
};

export function cityLighting(
  scene: THREE.Scene,
  sun: THREE.DirectionalLight,
  sky: THREE.HemisphereLight,
  waters: THREE.ShaderMaterial[],
) {
  const materials = new Set<THREE.MeshStandardMaterial>();
  const strokes = new Set<THREE.LineBasicMaterial>();

  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial)
      materials.add(object.material);
    if (object instanceof THREE.Line && object.material instanceof THREE.LineBasicMaterial)
      strokes.add(object.material);
  });

  const originals = new Map(
    [...materials].map((m) => [m, { color: m.color.clone(), intensity: m.emissiveIntensity }]),
  );

  const sunsetColorMap = new Map<string, THREE.Color>();
  for (const [name, hex] of Object.entries(sunsetColors)) {
    sunsetColorMap.set(name, new THREE.Color(hex));
  }

  const nightColorMap = new Map<string, THREE.Color>();
  for (const [name, hex] of Object.entries(nightColors)) {
    nightColorMap.set(name, new THREE.Color(hex));
  }

  // Khởi tạo Dynamic Gradient DataTexture 1x64 cho bầu trời chuyển màu mượt mà, chân thực
  const skyRows = 64;
  const skyData = new Uint8Array(skyRows * 4);
  const skyTexture = new THREE.DataTexture(skyData, 1, skyRows);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  skyTexture.magFilter = THREE.LinearFilter;
  skyTexture.minFilter = THREE.LinearFilter;
  scene.background = skyTexture;

  // Điểm màu cho 3 pha bầu trời (Horizon -> Mid -> Zenith)
  // Day: [0: chân trời ấm #f6efe1, 1: giữa trời trong trẻo, 2: đỉnh trời xanh ngọc Sài Gòn]
  const skyDay = [
    [246, 239, 225], // Vàng kem di sản chân trời (#f6efe1)
    [206, 228, 234], // Lam ngọc nhạt thanh thoát
    [134, 184, 210], // Xanh da trời nhiệt đới dịu mắt đỉnh trời
  ];
  // Sunset: Hoàng hôn Cầu Ba Son rực rỡ nắng vàng hổ phách & xanh chiều sâu lắng
  const skySunset = [
    [255, 208, 142], // Vàng hổ phách ấm áp chân trời
    [232, 144, 102], // Cam đất nung hoàng hôn dịu mắt
    [66, 102, 126],  // Xanh chiều chạng vạng thanh lịch đỉnh trời
  ];
  // Night: Chạng vạng / Đêm hoa lệ Landmark 81
  const skyNight = [
    [46, 78, 96],    // Ánh sáng chân trời đô thị ngọc lục bảo
    [20, 42, 62],    // Xanh chàm chiều muộn
    [9, 20, 34],     // Xanh đêm sâu lắng
  ];

  // Màu sắc ánh sáng và sương mù
  const dayFogColor = new THREE.Color('#eae6dc');
  const sunsetFogColor = new THREE.Color('#e2ab84');
  const nightFogColor = new THREE.Color('#183040');

  const daySunColor = new THREE.Color('#fff8e8');
  const sunsetSunColor = new THREE.Color('#ffaf68');
  const nightSunColor = new THREE.Color('#a4c8f0');

  const daySkyColor = new THREE.Color('#fffdf8');
  const sunsetSkyColor = new THREE.Color('#ffd0a6');
  const nightSkyColor = new THREE.Color('#8ab0d8');

  const dayGroundColor = new THREE.Color('#5a6d5e');
  const sunsetGroundColor = new THREE.Color('#6b5046');
  const nightGroundColor = new THREE.Color('#1e3240');

  let currentSunY = 36;
  let lastAppliedFactor = -1;

  const setDuskProgress = (rawFactor: number) => {
    const factor = Math.max(0, Math.min(1, rawFactor));
    if (Math.abs(factor - lastAppliedFactor) < 0.002 && lastAppliedFactor >= 0) {
      return;
    }
    lastAppliedFactor = factor;

    // Tính toán tỷ lệ nội suy 3 pha:
    // Pha 1: Day (0.0) -> Sunset (0.5)
    // Pha 2: Sunset (0.5) -> Night (1.0)
    const isPhase1 = factor < 0.5;
    const p = isPhase1 ? factor / 0.5 : (factor - 0.5) / 0.5;
    const smoothP = THREE.MathUtils.smoothstep(p, 0, 1);

    // 1. Cập nhật Dynamic Sky Gradient DataTexture
    const stopsFrom = isPhase1 ? skyDay : skySunset;
    const stopsTo = isPhase1 ? skySunset : skyNight;

    for (let row = 0; row < skyRows; row++) {
      const t = (row / (skyRows - 1)) * 2;
      const fromIdx = Math.min(1, Math.floor(t));
      const stopMix = t - fromIdx;

      for (let c = 0; c < 3; c++) {
        const valA = THREE.MathUtils.lerp(stopsFrom[fromIdx][c], stopsFrom[fromIdx + 1][c], stopMix);
        const valB = THREE.MathUtils.lerp(stopsTo[fromIdx][c], stopsTo[fromIdx + 1][c], stopMix);
        skyData[row * 4 + c] = Math.round(THREE.MathUtils.lerp(valA, valB, smoothP));
      }
      skyData[row * 4 + 3] = 255;
    }
    skyTexture.needsUpdate = true;

    // 2. Sương mù (Fog)
    if (!(scene.fog instanceof THREE.Fog)) {
      scene.fog = new THREE.Fog('#e2edf5', 85, 160);
    }
    if (isPhase1) {
      scene.fog.color.lerpColors(dayFogColor, sunsetFogColor, smoothP);
      scene.fog.near = THREE.MathUtils.lerp(85, 75, smoothP);
      scene.fog.far = THREE.MathUtils.lerp(160, 190, smoothP);
    } else {
      scene.fog.color.lerpColors(sunsetFogColor, nightFogColor, smoothP);
      scene.fog.near = THREE.MathUtils.lerp(75, 95, smoothP);
      scene.fog.far = THREE.MathUtils.lerp(190, 240, smoothP);
    }

    // 3. Ánh sáng môi trường (Hemisphere light)
    if (isPhase1) {
      sky.color.lerpColors(daySkyColor, sunsetSkyColor, smoothP);
      sky.groundColor.lerpColors(dayGroundColor, sunsetGroundColor, smoothP);
      sky.intensity = THREE.MathUtils.lerp(1.3, 1.45, smoothP);
      scene.environmentIntensity = THREE.MathUtils.lerp(0.42, 0.45, smoothP);
    } else {
      sky.color.lerpColors(sunsetSkyColor, nightSkyColor, smoothP);
      sky.groundColor.lerpColors(sunsetGroundColor, nightGroundColor, smoothP);
      sky.intensity = THREE.MathUtils.lerp(1.45, 0.85, smoothP);
      scene.environmentIntensity = THREE.MathUtils.lerp(0.45, 0.28, smoothP);
    }

    // 4. Ánh sáng mặt trời / mặt trăng (Directional sun light)
    if (isPhase1) {
      sun.color.lerpColors(daySunColor, sunsetSunColor, smoothP);
      sun.intensity = THREE.MathUtils.lerp(3.2, 3.6, smoothP);
      currentSunY = THREE.MathUtils.lerp(36, 18, smoothP);
    } else {
      sun.color.lerpColors(sunsetSunColor, nightSunColor, smoothP);
      sun.intensity = THREE.MathUtils.lerp(3.6, 0.85, smoothP);
      currentSunY = THREE.MathUtils.lerp(18, 32, smoothP);
    }
    sun.position.y = currentSunY;

    // 5. Màu sắc vật liệu kiến trúc (Building Materials)
    for (const m of materials) {
      const original = originals.get(m)!;
      const sunsetCol = sunsetColorMap.get(m.name);
      const nightCol = nightColorMap.get(m.name);

      if (sunsetCol && nightCol) {
        if (isPhase1) {
          m.color.lerpColors(original.color, sunsetCol, smoothP);
        } else {
          m.color.lerpColors(sunsetCol, nightCol, smoothP);
        }
      } else {
        m.color.copy(original.color);
      }

      if (m.userData.cityDusk) {
        m.userData.cityDusk.value = factor;
      }

      // Cường độ phát sáng đèn LED & cửa sổ
      const targetEmissive =
        m.name === 'ledWhite'
          ? (isPhase1 ? THREE.MathUtils.lerp(0.1, 0.9, smoothP) : THREE.MathUtils.lerp(0.9, 1.8, smoothP))
          : m.name.startsWith('led')
            ? (isPhase1 ? THREE.MathUtils.lerp(0.1, 1.3, smoothP) : THREE.MathUtils.lerp(1.3, 2.8, smoothP))
            : m.name === 'lit'
              ? (isPhase1 ? THREE.MathUtils.lerp(0.05, 0.8, smoothP) : THREE.MathUtils.lerp(0.8, 1.9, smoothP))
              : original.intensity;
      m.emissiveIntensity = targetEmissive;
    }

    // 6. Màu đường nét, dây văng cầu Ba Son & vệt rẽ sóng
    for (const m of strokes) {
      const waterStroke = m.name === 'stroke-water' || m.name === 'stroke-wake';
      if (waterStroke) {
        if (isPhase1) {
          m.color.lerpColors(new THREE.Color('#d4ede3'), new THREE.Color('#ffc696'), smoothP);
          m.opacity = THREE.MathUtils.lerp(0.25, 0.45, smoothP);
        } else {
          m.color.lerpColors(new THREE.Color('#ffc696'), new THREE.Color('#64a4d4'), smoothP);
          m.opacity = THREE.MathUtils.lerp(0.45, 0.22, smoothP);
        }
      } else if (m.name === 'stroke-cable') {
        if (isPhase1) {
          m.color.lerpColors(new THREE.Color('#8fa4ad'), new THREE.Color('#ffad6b'), smoothP);
        } else {
          m.color.lerpColors(new THREE.Color('#ffad6b'), new THREE.Color('#d4e2ee'), smoothP);
        }
        m.opacity = 0.95;
      } else if (m.name === 'stroke-brass') {
        m.color.set('#c89e5c');
      } else {
        if (isPhase1) {
          m.color.lerpColors(new THREE.Color('#789985'), new THREE.Color('#94695b'), smoothP);
          m.opacity = THREE.MathUtils.lerp(0.22, 0.16, smoothP);
        } else {
          m.color.lerpColors(new THREE.Color('#94695b'), new THREE.Color('#688296'), smoothP);
          m.opacity = THREE.MathUtils.lerp(0.16, 0.12, smoothP);
        }
      }
    }

    // 7. Mặt sông Sài Gòn
    for (const water of waters) {
      water.uniforms.dusk.value = factor;
    }
  };

  const setTime = (time: CityTime) => {
    if (time === 'day') setDuskProgress(0.0);
    else if (time === 'sunset') setDuskProgress(0.5);
    else setDuskProgress(1.0);
  };

  return { setTime, setDuskProgress, dispose: () => skyTexture.dispose() };
}
