import * as THREE from 'three';

// Windows are part of the surface shader, not bright cubes pasted onto glass.
// Coordinates remain stable across the instanced buildings and camera moves.
export function architecturalFacade(material: THREE.MeshStandardMaterial) {
  const dusk = { value: 0 };
  material.userData.cityDusk = dusk;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCityDusk = dusk;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `
      #include <common>
      varying vec3 vCityPosition;
      varying vec3 vCityNormal;
    `,
      )
      .replace(
        '#include <worldpos_vertex>',
        `
      #include <worldpos_vertex>
      vec4 cityPosition = vec4(transformed, 1.0);
      vec3 cityNormal = objectNormal;
      #ifdef USE_INSTANCING
        cityPosition = instanceMatrix * cityPosition;
        cityNormal = mat3(instanceMatrix) * cityNormal;
      #endif
      vCityPosition = (modelMatrix * cityPosition).xyz;
      vCityNormal = normalize(mat3(modelMatrix) * cityNormal);
    `,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `
      #include <common>
      uniform float uCityDusk;
      varying vec3 vCityPosition;
      varying vec3 vCityNormal;
    `,
      )
      .replace(
        '#include <color_fragment>',
        `
      #include <color_fragment>
      vec3 cityNormal = normalize(vCityNormal);
      float cityWall = 1.0 - smoothstep(0.45, 0.7, abs(cityNormal.y));
      float cityHorizontal = abs(cityNormal.z) > abs(cityNormal.x) ? vCityPosition.x : vCityPosition.z;
      vec2 cityGrid = vec2(cityHorizontal / 0.32, vCityPosition.y / 0.46);
      vec2 cityCell = floor(cityGrid);
      vec2 cityFract = fract(cityGrid);
      float cityPane = smoothstep(0.06, 0.12, cityFract.x) * (1.0 - smoothstep(0.88, 0.94, cityFract.x));
      cityPane *= smoothstep(0.12, 0.20, cityFract.y) * (1.0 - smoothstep(0.82, 0.90, cityFract.y));
      float cityNoise = fract(sin(dot(cityCell, vec2(12.9898, 78.233))) * 43758.5453);
      float cityRoom = step(0.72, cityNoise) * cityPane * cityWall;
      float cityBand = 0.88 + sin(vCityPosition.y * 0.15 + cityHorizontal * 0.08) * 0.08;
      diffuseColor.rgb *= mix(1.0, mix(0.35, cityBand, cityPane), cityWall);
    `,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `
      #include <emissivemap_fragment>
      vec3 cityWarm = mix(vec3(1.0, 0.76, 0.42), vec3(0.68, 0.85, 0.95), step(0.65, cityNoise));
      totalEmissiveRadiance += cityWarm * cityRoom * uCityDusk * 0.55;
    `,
      );
  };
  material.customProgramCacheKey = () => 'thamvan-architectural-facade-2';
  return material;
}
