import * as THREE from 'three';
import { CityKit } from './city-kit';
import { addLandmarks } from './city-landmarks';
import { addNeighborhoods, addStreets } from './city-streets';
import { addWaterfront } from './city-waterfront';
import { createRiver } from './city-river';
import { buildBaSon, buildLandmark81 } from './city-destinations';
import { buildBaSonConnector, buildLandmarkConnector } from './city-connectors';

export const riverbank = (x: number) => 5 + 0.006 * x * x;

// Bạch Đằng-inspired riverfront: a continuous urban bank and open water in front.
// All geometry is original and local; this is an illustration, not a GIS model.
export function buildCity() {
  const kit = new CityKit();
  const samples = Array.from({ length: 141 }, (_, i) => {
    const x = -29 + (i * 58) / 140;
    return new THREE.Vector3(x, 0.14, riverbank(x));
  });
  const land = new THREE.Shape();
  land.moveTo(-29, 22);
  land.lineTo(29, 22);
  for (const point of samples.toReversed()) land.lineTo(point.x, -point.z);
  land.closePath();
  const foundation = kit.mesh(
    new THREE.ExtrudeGeometry(land, {
      depth: 0.65,
      bevelEnabled: false,
      curveSegments: 1,
    }),
    'stone',
    0,
    -0.55,
    0,
  );
  foundation.rotation.x = -Math.PI / 2;
  const surface = kit.mesh(new THREE.ShapeGeometry(land), 'paving', 0, 0.12, 0);
  surface.rotation.x = -Math.PI / 2;
  const water = createRiver(samples, 26, 0, true, false);
  kit.root.add(water);
  addStreets(kit, riverbank);
  addNeighborhoods(kit, riverbank);
  addLandmarks(kit);
  addWaterfront(kit, samples, riverbank);
  const model = new THREE.Group();
  const district = kit.finish();
  const connector01 = buildBaSonConnector();
  const bridge = buildBaSon();
  const connector12 = buildLandmarkConnector();
  const landmark = buildLandmark81();

  model.add(district, connector01.model, bridge.model, connector12.model, landmark.model);
  return {
    model,
    districts: [district, connector01.model, bridge.model, connector12.model, landmark.model],
    waters: [water.material, connector01.water, bridge.water, connector12.water, landmark.water],
  };
}
