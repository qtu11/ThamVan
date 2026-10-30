import * as THREE from 'three';
import { architecturalFacade } from './city-facade';

export const cityMaterials = () => {
  const materials = {
    ivory: new THREE.MeshStandardMaterial({ color: '#ebe3d2', roughness: 0.74 }),
    stone: new THREE.MeshStandardMaterial({ color: '#dcd5c3', roughness: 0.9 }),
    glass: architecturalFacade(
      new THREE.MeshStandardMaterial({ color: '#2b5850', roughness: 0.24, metalness: 0.36 }),
    ),
    jade: architecturalFacade(
      new THREE.MeshStandardMaterial({ color: '#215246', roughness: 0.25, metalness: 0.44 }),
    ),
    mint: architecturalFacade(
      new THREE.MeshStandardMaterial({ color: '#6b877f', roughness: 0.4, metalness: 0.22 }),
    ),
    concrete: architecturalFacade(
      new THREE.MeshStandardMaterial({ color: '#d2c9b8', roughness: 0.8 }),
    ),
    bronze: new THREE.MeshStandardMaterial({ color: '#c49645', roughness: 0.3, metalness: 0.65 }),
    roof: new THREE.MeshStandardMaterial({ color: '#b94f2d', roughness: 0.82 }),
    bark: new THREE.MeshStandardMaterial({ color: '#7d6852', roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#3b6e52', roughness: 0.9 }),
    leafLight: new THREE.MeshStandardMaterial({ color: '#628d64', roughness: 0.92 }),
    road: new THREE.MeshStandardMaterial({ color: '#b8b3a3', roughness: 0.96 }),
    paving: new THREE.MeshStandardMaterial({ color: '#e6dfd0', roughness: 0.9 }),
    marking: new THREE.MeshStandardMaterial({ color: '#f7f0de', roughness: 0.8 }),
    window: new THREE.MeshStandardMaterial({ color: '#3d6e60', roughness: 0.22, metalness: 0.38 }),
    lit: new THREE.MeshStandardMaterial({
      color: '#eed29c',
      emissive: '#c9953d',
      emissiveIntensity: 0.25,
      roughness: 0.42,
    }),
    dark: new THREE.MeshStandardMaterial({ color: '#1e3a31', roughness: 0.85 }),
    pool: new THREE.MeshStandardMaterial({
      color: '#25968d',
      roughness: 0.14,
      metalness: 0.42,
    }),
    tennis: new THREE.MeshStandardMaterial({ color: '#2e6658', roughness: 0.86 }),
    wood: new THREE.MeshStandardMaterial({ color: '#7a5638', roughness: 0.72 }),
    gold: new THREE.MeshStandardMaterial({ color: '#d8ab42', roughness: 0.28, metalness: 0.82 }),
    red: new THREE.MeshStandardMaterial({ color: '#b94f2d', roughness: 0.65 }),
    vinbus: new THREE.MeshStandardMaterial({ color: '#128d52', roughness: 0.38 }),
    curtainBlue: architecturalFacade(
      new THREE.MeshStandardMaterial({ color: '#244e58', roughness: 0.2, metalness: 0.54 }),
    ),
    ledCyan: new THREE.MeshStandardMaterial({
      color: '#a8ded8',
      emissive: '#43d8c9',
      emissiveIntensity: 0.18,
    }),
    ledPink: new THREE.MeshStandardMaterial({
      color: '#d4947a',
      emissive: '#e87a4d',
      emissiveIntensity: 0.14,
    }),
    ledWhite: new THREE.MeshStandardMaterial({
      color: '#f2ecdf',
      emissive: '#ffe9c2',
      emissiveIntensity: 0.16,
    }),
    ledGold: new THREE.MeshStandardMaterial({
      color: '#d8b468',
      emissive: '#ffb84d',
      emissiveIntensity: 0.22,
    }),
  };
  for (const [name, material] of Object.entries(materials)) material.name = name;
  return materials;
};
export type CityMaterial = keyof ReturnType<typeof cityMaterials>;
type Instance = { position: THREE.Vector3; scale: THREE.Vector3; rotation: THREE.Euler };
type Batch = { geometry: THREE.BufferGeometry; material: CityMaterial; instances: Instance[] };
const noShadow = new Set<CityMaterial>([
  'marking',
  'paving',
  'road',
  'window',
  'pool',
  'tennis',
  'lit',
  'ledCyan',
  'ledPink',
  'ledWhite',
  'ledGold',
]);

export class CityKit {
  readonly root = new THREE.Group();
  readonly materials = cityMaterials();
  private readonly batches = new Map<string, Batch>();
  private readonly geometries = new Map<string, THREE.BufferGeometry>();
  private readonly strokes = new Map<string, number[]>();

  instance(
    kind: string,
    geometry: () => THREE.BufferGeometry,
    material: CityMaterial,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    if (!this.geometries.has(kind)) this.geometries.set(kind, geometry());
    const key = `${kind}:${material}`;
    let batch = this.batches.get(key);
    if (!batch) {
      batch = { geometry: this.geometries.get(kind)!, material, instances: [] };
      this.batches.set(key, batch);
    }
    batch.instances.push({
      position: new THREE.Vector3(x, y, z),
      scale: new THREE.Vector3(sx, sy, sz),
      rotation: new THREE.Euler(rx, ry, rz),
    });
  }

  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: CityMaterial = 'ivory',
    yaw = 0,
  ) {
    this.instance('box', () => new THREE.BoxGeometry(1, 1, 1), material, x, y, z, w, h, d, 0, yaw);
  }
  cylinder(
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    material: CityMaterial,
    rx = 0,
    rz = 0,
  ) {
    this.instance(
      'cylinder',
      () => new THREE.CylinderGeometry(1, 1, 1, 10),
      material,
      x,
      y,
      z,
      r,
      h,
      r,
      rx,
      0,
      rz,
    );
  }
  crown(
    x: number,
    y: number,
    z: number,
    size: number,
    material: CityMaterial = 'leaf',
    height = size,
  ) {
    this.instance(
      'crown',
      () => new THREE.IcosahedronGeometry(1, 1),
      material,
      x,
      y,
      z,
      size,
      height,
      size,
    );
  }
  mesh(geometry: THREE.BufferGeometry, material: CityMaterial, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(geometry, this.materials[material]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.root.add(mesh);
    return mesh;
  }
  line(a: THREE.Vector3, b: THREE.Vector3, kind = 'facade') {
    if (!this.strokes.has(kind)) this.strokes.set(kind, []);
    this.strokes.get(kind)!.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }

  facade(x: number, z: number, w: number, h: number, d: number, base = 0.2, _floor = 0.42) {
    const front = z + d / 2 + 0.012,
      right = x + w / 2 + 0.012;
    void _floor;
    // Draw clean architectural cornice and corner accents without dense Moiré grid noise
    this.line(
      new THREE.Vector3(x - w / 2, base + h, front),
      new THREE.Vector3(x + w / 2, base + h, front),
    );
    this.line(
      new THREE.Vector3(right, base + h, z - d / 2),
      new THREE.Vector3(right, base + h, z + d / 2),
    );
    this.line(new THREE.Vector3(x - w / 2, base, front), new THREE.Vector3(x - w / 2, base + h, front));
    this.line(new THREE.Vector3(x + w / 2, base, front), new THREE.Vector3(x + w / 2, base + h, front));
    this.line(new THREE.Vector3(right, base, z + d / 2), new THREE.Vector3(right, base + h, z + d / 2));
  }

  tree(x: number, z: number, scale = 1, light = false, base = 0.16) {
    this.cylinder(x, base + 0.38 * scale, z, 0.055 * scale, 0.65 * scale, 'bark');
    this.crown(x, base + 0.85 * scale, z, 0.38 * scale, light ? 'leafLight' : 'leaf', 0.52 * scale);
    this.crown(x + 0.2 * scale, base + 0.7 * scale, z + 0.08 * scale, 0.27 * scale, 'leafLight');
  }

  palm(x: number, z: number, scale = 1, base = 0.15) {
    this.cylinder(x, base + 0.75 * scale, z, 0.045 * scale, 1.5 * scale, 'bark');
    this.instance(
      'palm',
      palmGeometry,
      'leaf',
      x,
      base + 1.5 * scale,
      z,
      scale,
      scale,
      scale,
      0,
      x * 0.3,
    );
    this.crown(x, base + 1.51 * scale, z, 0.1 * scale, 'leafLight');
  }

  finish() {
    const matrix = new THREE.Matrix4(),
      rotation = new THREE.Quaternion();
    for (const batch of this.batches.values()) {
      const mesh = new THREE.InstancedMesh(
        batch.geometry,
        this.materials[batch.material],
        batch.instances.length,
      );
      batch.instances.forEach((item, index) => {
        rotation.setFromEuler(item.rotation);
        matrix.compose(item.position, rotation, item.scale);
        mesh.setMatrixAt(index, matrix);
      });
      mesh.castShadow = !noShadow.has(batch.material);
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.root.add(mesh);
    }
    const colors: Record<string, string> = {
      facade: '#789985',
      paving: '#b9bfa7',
      water: '#b4cebd',
      wake: '#c2d4bf',
      brass: '#b79356',
      cable: '#e8edf2',
    };
    for (const [kind, vertices] of this.strokes) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      this.root.add(
        new THREE.LineSegments(
          geometry,
          Object.assign(
            new THREE.LineBasicMaterial({
              color: colors[kind] ?? colors.facade,
              transparent: true,
              opacity: kind === 'water' ? 0.2 : kind === 'wake' ? 0.42 : kind === 'cable' ? 0.88 : 0.58,
            }),
            { name: `stroke-${kind}` },
          ),
        ),
      );
    }
    return this.root;
  }
}

function palmGeometry() {
  const vertices: number[] = [];
  for (let leaf = 0; leaf < 8; leaf++) {
    const angle = (leaf / 8) * Math.PI * 2;
    for (let step = 0; step < 5; step++) {
      const point = (t: number, side: number) => {
        const width = Math.sin(t * Math.PI) * 0.12 * side;
        const length = t * 0.85;
        return [
          Math.cos(angle) * length - Math.sin(angle) * width,
          Math.sin(t * Math.PI * 0.8) * 0.26 - t * t * 0.38,
          Math.sin(angle) * length + Math.cos(angle) * width,
        ];
      };
      const t = step / 5,
        next = (step + 1) / 5;
      vertices.push(
        ...point(t, -1),
        ...point(t, 1),
        ...point(next, -1),
        ...point(t, 1),
        ...point(next, 1),
        ...point(next, -1),
      );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}
