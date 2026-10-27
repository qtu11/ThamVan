import * as THREE from 'three';

export type CityTime = 'dusk' | 'day' | 'sunset' | 'night';

// Bảng màu kiến trúc 3 pha: Day -> Sunset -> Night
const sunsetColors: Record<string, string> = {
  ivory: '#e4b89b',
  stone: '#523a48',
  glass: '#7b6875',
  jade: '#4a6566',
  mint: '#72767c',
  bronze: '#d48843',
  roof: '#9c4d4b',
  bark: '#634444',
  leaf: '#3b4e3a',
  leafLight: '#5b7048',
  road: '#3a2d38',
  paving: '#635355',
  marking: '#f3c788',
  window: '#6a5255',
  dark: '#2e2532',
  concrete: '#ba9e95',
};

const nightColors: Record<string, string> = {
  ivory: '#8895a3',
  stone: '#1b2c42',
  glass: '#385568',
  jade: '#264f58',
  mint: '#455f70',
  bronze: '#a27c44',
  roof: '#5f444c',
  bark: '#3f3a40',
  leaf: '#123130',
  leafLight: '#234a3d',
  road: '#142232',
  paving: '#2f3b46',
  marking: '#a59775',
  window: '#253f52',
  dark: '#112030',
  concrete: '#737c88',
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

  // Khởi tạo Dynamic Gradient DataTexture 1x32 cho bầu trời chuyển màu mượt mà
  const skyRows = 32;
  const skyData = new Uint8Array(skyRows * 4);
  const skyTexture = new THREE.DataTexture(skyData, 1, skyRows);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  skyTexture.magFilter = THREE.LinearFilter;
  skyTexture.minFilter = THREE.LinearFilter;
  scene.background = skyTexture;

  // Điểm màu cho 3 pha bầu trời (Top, Mid, Horizon)
  // Day: [0: chân trời, 1: giữa trời, 2: đỉnh trời]
  const skyDay = [
    [246, 240, 227], // Vàng be sáng chân trời
    [195, 222, 245], // Xanh dịu nhẹ
    [120, 175, 230], // Xanh thanh khiết đỉnh trời
  ];
  // Sunset: Hoàng hôn Cầu Ba Son rực rỡ sắc cam đỏ hổ phách & tím thạch anh
  const skySunset = [
    [255, 145, 50],  // Cam vàng hổ phách chói lọi chân trời lặn
    [190, 65, 60],   // Ráng chiều cam đỏ rực rỡ
    [45, 30, 68],    // Tím thạch anh đỉnh trời hoàng hôn
  ];
  // Night: Đêm hoa lệ Landmark 81
  const skyNight = [
    [26, 48, 80],    // Ánh sáng chân trời đô thị lung linh
    [14, 30, 56],    // Xanh chàm huyền bí
    [6, 14, 28],     // Xanh đen dạ yến sâu thẳm
  ];

  // Màu sắc ánh sáng và sương mù
  const dayFogColor = new THREE.Color('#e2edf5');
  const sunsetFogColor = new THREE.Color('#c56a52'); // Sương chiều hoàng hôn nhuộm màu cam hồng
  const nightFogColor = new THREE.Color('#0c192d');

  const daySunColor = new THREE.Color('#fff9eb');
  const sunsetSunColor = new THREE.Color('#ff7e36'); // Nắng hoàng hôn cam đỏ rực rỡ
  const nightSunColor = new THREE.Color('#8cb6f8'); // Ánh trăng xanh bàng bạc dịu mát

  const daySkyColor = new THREE.Color('#ffffff');
  const sunsetSkyColor = new THREE.Color('#ffa66f');
  const nightSkyColor = new THREE.Color('#789ed4');

  const dayGroundColor = new THREE.Color('#506657');
  const sunsetGroundColor = new THREE.Color('#5e3240');
  const nightGroundColor = new THREE.Color('#162335');

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
          m.opacity = THREE.MathUtils.lerp(0.4, 0.3, smoothP);
        } else {
          m.color.lerpColors(new THREE.Color('#94695b'), new THREE.Color('#688296'), smoothP);
          m.opacity = THREE.MathUtils.lerp(0.3, 0.18, smoothP);
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
