import * as THREE from 'three';
import type { RefObject } from 'react';
import { buildCity } from './city-model';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { cityLighting, type CityTime } from './city-lighting';
import { cityPlaces } from './city-places';
import { createCityBoats } from './city-boats';

export function createCityRenderer(
  host: HTMLElement,
  progress: RefObject<number>,
  onReady: () => void,
  onUnavailable: () => void,
) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'low-power',
    });
  } catch {
    onUnavailable();
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, innerWidth < 900 ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = innerWidth >= 900;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Light and geometry stay fixed while the camera travels. Reuse their shadow
  // map instead of rendering it again for every scroll frame.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const canvas = renderer.domElement;
  host.append(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f6efe1');
  scene.fog = new THREE.Fog('#f6efe1', 85, 160);
  const sky = new THREE.HemisphereLight('#fff6e2', '#445e4e', 1.28);
  scene.add(sky);
  // A small, generated studio environment gives glass a real reflected light
  // response without fetching HDR textures or third-party assets.
  let reflections: THREE.WebGLRenderTarget | undefined;
  if (innerWidth >= 900) {
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      reflections = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 128 });
      scene.environment = reflections.texture;
      scene.environmentIntensity = 0.48;
    } catch {
      // Image based lighting is optional on constrained GPUs.
    } finally {
      room.dispose();
      pmrem.dispose();
    }
  }
  const sun = new THREE.DirectionalLight('#ffe6ba', 3.35);
  sun.position.set(-28, 36, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, far: 118 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = 0.05;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const city = buildCity();
  scene.add(city.model);
  const boats = createCityBoats();
  scene.add(boats.root);
  const applyLighting = cityLighting(scene, sun, sky, city.waters);
  renderer.shadowMap.needsUpdate = true;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
  const cameraPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(10, 18, 65),
    new THREE.Vector3(-4, 15.5, 58),
    new THREE.Vector3(118, 17, 55),
    new THREE.Vector3(225, 24, 55),
    new THREE.Vector3(222, 23, 50),
  ]);
  const targetPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 10.5, -3),
    new THREE.Vector3(0, 10.5, -3),
    new THREE.Vector3(100, 8, 22),
    new THREE.Vector3(210, 25, -9),
    new THREE.Vector3(210, 28.5, -9),
  ]);
  const target = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const labels = cityPlaces.map((anchor) => ({
    element: host.querySelector<HTMLElement>(`[data-city-label="${anchor.id}"]`),
    point: new THREE.Vector3(...anchor.point),
    view: anchor.view,
  }));
  let disposed = false,
    visible = false,
    running = false,
    ready = false;
  let smoothed = progress.current,
    lastTime = 0;
  const pointer = new THREE.Vector2(),
    easedPointer = new THREE.Vector2();
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let shadowDistrict = -1;

  function tick(time: number) {
    if (disposed) return;
    // Keep normal frames smooth but let a delayed GPU frame catch up. Hidden
    // tabs reset lastTime in resume(), so their elapsed time never causes a jump.
    const dt = Math.min(0.25, lastTime ? (time - lastTime) / 1000 : 1 / 60);
    lastTime = time;
    // Chuyển cảnh camera chậm rãi, mượt mà đậm chất điện ảnh (~1.7 giây)
    const amount = 1 - Math.exp(-dt * 3.1);
    const pointerAmount = 1 - Math.exp(-dt * 3.5);
    smoothed = THREE.MathUtils.lerp(smoothed, progress.current, amount);
    easedPointer.lerp(pointer, pointerAmount);
    cameraPath.getPoint(smoothed, camera.position);
    targetPath.getPoint(smoothed, target);

    // Chuyển màu 3 pha mượt mà
    const duskFactor = Math.max(0, Math.min(1, smoothed));
    applyLighting.setDuskProgress(duskFactor);

    // Di chuyển đội thuyền sống động trên sông Sài Gòn
    boats.update(dt, time / 1000, duskFactor);

    const district = Math.round(smoothed * 2);
    const centres = [0, 100, 210];
    city.districts.forEach((group) => {
      group.visible = true;
    });
    if (district !== shadowDistrict) {
      shadowDistrict = district;
      sun.position.set(centres[district] - 28, 36, 20);
      sun.target.position.set(centres[district], 0, 0);
      sun.target.updateMatrixWorld();
      renderer.shadowMap.needsUpdate = true;
    }
    const idleDriftX = Math.sin(time * 0.00045) * 0.65;
    const idleDriftY = Math.cos(time * 0.00035) * 0.22;
    camera.position.x += easedPointer.x * 1.35 + idleDriftX;
    camera.position.y += easedPointer.y * 0.55 + idleDriftY;

    // Cache kích thước DOM một lần duy nhất ngoài vòng lặp để ngăn chặn Layout Thrashing
    const hostW = host.clientWidth;
    const hostH = host.clientHeight;
    const compact = hostH < 500;
    if (compact) target.y += 5 + smoothed * 3;
    camera.fov = compact ? 62 : hostW / hostH < 1.1 ? 51 : 42;
    camera.updateProjectionMatrix();
    camera.lookAt(target);
    camera.updateMatrixWorld();

    const placed: { x: number; y: number }[] = [];
    const activeView = Math.round(smoothed * 2);
    const topMargin = compact ? 64 : 88;
    const bottomMargin = compact ? 64 : 104;

    for (const label of labels) {
      if (!label.element) continue;
      if (label.view !== activeView) {
        if (label.element.style.opacity !== '0') label.element.style.opacity = '0';
        continue;
      }
      projected.copy(label.point).project(camera);
      const x = ((projected.x + 1) / 2) * hostW;
      const y = ((1 - projected.y) / 2) * hostH;
      const shown =
        x > 55 &&
        x < hostW - 55 &&
        y > topMargin &&
        y < hostH - bottomMargin &&
        projected.z < 1 &&
        !placed.some((p) => Math.abs(p.x - x) < 110 && Math.abs(p.y - y) < 32);
      if (shown) placed.push({ x, y });
      const nextOpacity = shown ? '1' : '0';
      if (label.element.style.opacity !== nextOpacity) {
        label.element.style.opacity = nextOpacity;
      }
      if (shown) {
        label.element.style.transform = `translate(${x}px, ${y - 12}px) translate(-50%, -100%)`;
      }
    }

    try {
      const wavePhase = (time / 1000) * 0.68 + smoothed * 2.4 + easedPointer.x * 0.18;
      for (const water of city.waters)
        water.uniforms.phase.value = wavePhase;
      renderer.render(scene, camera);
      host.dataset.cameraProgress = smoothed.toFixed(3);
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.triangles = String(renderer.info.render.triangles);
    } catch {
      onUnavailable();
      dispose();
      return;
    }
    if (!ready) {
      ready = true;
      onReady();
    }
  }
  function resume() {
    if (disposed || !visible || document.hidden || running) return;
    running = true;
    lastTime = 0;
    renderer.setAnimationLoop(tick);
  }
  function resize() {
    const width = Math.max(1, host.clientWidth),
      height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    resume();
  }
  function move(event: PointerEvent) {
    if (!finePointer.matches || event.pointerType === 'touch') return;
    const rect = host.getBoundingClientRect();
    pointer.set(
      (event.clientX - rect.left) / rect.width - 0.5,
      (event.clientY - rect.top) / rect.height - 0.5,
    );
    resume();
  }
  function leave() {
    pointer.set(0, 0);
    resume();
  }
  function visibility() {
    if (document.hidden || !visible) {
      renderer.setAnimationLoop(null);
      running = false;
    } else resume();
  }
  function lost(event: Event) {
    event.preventDefault();
    onUnavailable();
    dispose();
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visibility();
  });
  const resizeObserver = new ResizeObserver(resize);
  const progressTarget = host.closest('.city-visual') ?? host;
  function lighting() {
    const time: CityTime = progressTarget.getAttribute('data-city-time') === 'day' ? 'day' : 'dusk';
    host.dataset.lighting = time;
    resume();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    resizeObserver.disconnect();
    progressTarget.removeEventListener('city:progress', resume);
    progressTarget.removeEventListener('city:lighting', lighting);
    document.removeEventListener('visibilitychange', visibility);
    host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerleave', leave);
    canvas.removeEventListener('webglcontextlost', lost);
    renderer.setAnimationLoop(null);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          materials.add(material);
        if (object instanceof THREE.InstancedMesh) object.dispose();
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    boats.dispose();
    sun.shadow.dispose();
    reflections?.dispose();
    applyLighting.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    labels.forEach((label) => {
      if (label.element) label.element.style.opacity = '0';
    });
    delete host.dataset.cameraProgress;
    delete host.dataset.cameraTarget;
    delete host.dataset.drawCalls;
    delete host.dataset.triangles;
    delete host.dataset.lighting;
  }
  observer.observe(host);
  resizeObserver.observe(host);
  progressTarget.addEventListener('city:progress', resume);
  progressTarget.addEventListener('city:lighting', lighting);
  document.addEventListener('visibilitychange', visibility);
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerleave', leave);
  canvas.addEventListener('webglcontextlost', lost);
  lighting();
  resize();
  return dispose;
}
