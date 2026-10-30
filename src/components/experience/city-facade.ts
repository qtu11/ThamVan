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
      vec2 cityGrid = vec2(cityHorizontal / 0.54, vCityPosition.y / 0.68);
      vec2 cityCell = floor(cityGrid);
      vec2 cityFract = fract(cityGrid);
      float cityPane = smoothstep(0.09, 0.21, cityFract.x) * (1.0 - smoothstep(0.79, 0.91, cityFract.x));
      cityPane *= smoothstep(0.14, 0.27, cityFract.y) * (1.0 - smoothstep(0.73, 0.86, cityFract.y));
      float spandrelBand = 1.0 - smoothstep(0.0, 0.14, cityFract.y) * (1.0 - smoothstep(0.86, 1.0, cityFract.y));
      float cityNoise = fract(sin(dot(cityCell, vec2(12.9898, 78.233))) * 43758.5453);
      float cityRoom = step(0.62, cityNoise) * cityPane * cityWall;
      float skySheen = clamp(vCityPosition.y * 0.022, 0.0, 0.24);
      float cityBand = 0.92 + skySheen + sin(vCityPosition.y * 0.14 + cityHorizontal * 0.07) * 0.05;
      float frameShade = mix(0.78, 0.68, spandrelBand);
      diffuseColor.rgb *= mix(1.0, mix(frameShade, cityBand, cityPane), cityWall);
    `,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `
      #include <emissivemap_fragment>
      vec3 cityWarm = mix(vec3(1.0, 0.82, 0.48), vec3(0.84, 0.93, 0.99), step(0.74, cityNoise));
      float floorDim = 0.65 + 0.35 * fract(cityNoise * 7.13);
      totalEmissiveRadiance += cityWarm * cityRoom * floorDim * (0.08 + uCityDusk * 0.78);
    `,
      );
  };
  material.customProgramCacheKey = () => 'thamvan-architectural-facade-4';
  return material;
}
