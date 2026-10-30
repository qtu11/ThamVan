import * as THREE from 'three';

// Procedural light impressions, not screen-space or physically traced reflections.
// One draw call and no reflection render target, including on mobile GPUs.
export function createRiver(
  bank: THREE.Vector3[],
  depth = 26,
  district = 0,
  fadeLeft = true,
  fadeRight = true,
) {
  const vertices: number[] = [];
  for (let i = 0; i < bank.length - 1; i++) {
    const a = bank[i],
      b = bank[i + 1];
    vertices.push(
      a.x,
      0.08,
      a.z,
      a.x,
      0.08,
      depth,
      b.x,
      0.08,
      b.z,
      b.x,
      0.08,
      b.z,
      a.x,
      0.08,
      depth,
      b.x,
      0.08,
      depth,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      dusk: { value: 1 },
      phase: { value: 0 },
      district: { value: district },
      extent: { value: new THREE.Vector2(Math.max(...bank.map((p) => Math.abs(p.x))), depth) },
      fadeEdges: { value: new THREE.Vector2(fadeLeft ? 1 : 0, fadeRight ? 1 : 0) },
    },
    vertexShader: `
      varying vec3 world;
      void main() {
        world = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float dusk;
      uniform float phase;
      uniform float district;
      uniform vec2 extent;
      uniform vec2 fadeEdges;
      varying vec3 world;
      float bankAt(float x) { return district < 0.5 ? 5.0 + 0.006*x*x : district < 1.5 ? 0.0 : 18.0 + 0.002*x*x; }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec3 lightTrail(float anchor, vec3 tint, float spread) {
        float distance = max(0.0, world.z - bankAt(world.x));
        float ripple = sin(world.z * 16.0 + phase + sin(world.x * 3.1)) * 0.22;
        float center = anchor + sin(world.z * 3.2 + phase) * 0.21;
        float width = spread + distance * 0.065;
        float streak = exp(-pow((world.x - center + ripple) / width, 2.0));
        float breaks = pow(max(0.0, sin(world.z * 27.0 + sin(world.x * 6.0) + phase)), 3.0);
        breaks *= smoothstep(0.25, 0.75, hash(floor(world.xz * vec2(4.0, 17.0))));
        return tint * streak * (0.07 + breaks * 0.85) * exp(-distance * 0.075);
      }
      void main() {
        // Sóng nước tự nhiên đa tầng mềm mại kèm phản chiếu bầu trời Fresnel chân thực
        float w1 = sin(world.z * 1.45 + sin(world.x * 0.42) * 1.25 + phase);
        float w2 = sin(world.x * 0.78 + world.z * 0.92 + phase * 1.32);
        float w3 = sin(world.z * 3.2 + world.x * 1.45 + phase * 1.75) * 0.32;
        float ripples = (w1 * 0.46 + w2 * 0.36 + w3);
        float grain = hash(floor(world.xz * vec2(10.0, 16.0))) * 0.012;
        float crest = pow(max(0.0, ripples * 0.5 + 0.5), 3.4);
        float fresnel = smoothstep(4.0, 38.0, max(0.0, world.z - bankAt(world.x)));

        vec3 day = mix(vec3(0.07, 0.27, 0.22), vec3(0.16, 0.38, 0.36), fresnel * 0.55) + (ripples * 0.018 + grain);
        day += vec3(0.26, 0.32, 0.22) * crest * 0.42;

        // Hoàng hôn sông Sài Gòn: nền ngọc lục bảo sâu thẳm phản chiếu ánh vàng hổ phách
        vec3 sunset = mix(vec3(0.06, 0.21, 0.19), vec3(0.24, 0.28, 0.26), fresnel * 0.45) + ripples * 0.022;
        sunset += vec3(0.62, 0.38, 0.14) * crest * 0.95;
        if(district > 0.5 && district < 1.5) {
          // Phản chiếu ánh vàng của Cầu Ba Son lúc hoàng hôn
          sunset += vec3(0.46, 0.28, 0.10) * exp(-abs(world.x) * 0.24) * (0.58 + ripples * 0.36);
        }
        
        vec3 night = vec3(0.015, 0.055, 0.085) + ripples * 0.01 + grain;
        if(district < 0.5) {
          night += lightTrail(-17.0, vec3(0.20, 0.55, 0.83), 0.6);
          night += lightTrail(-5.0, vec3(0.65, 0.06, 0.45), 0.9);
          night += lightTrail(3.2, vec3(0.05, 0.57, 0.63), 0.8);
          night += lightTrail(12.2, vec3(0.66, 0.70, 0.64), 0.85);
          night += lightTrail(-23.0, vec3(0.66, 0.29, 0.05), 0.4);
        } else if(district < 1.5) {
          // Vệt phản chiếu ánh đèn vàng nghệ thuật Cầu Ba Son trên mặt nước đêm
          night += lightTrail(0.0, vec3(0.90, 0.68, 0.28), 2.0);
          night += lightTrail(-12.0, vec3(0.25, 0.48, 0.65), 1.2);
          night += lightTrail(15.0, vec3(0.65, 0.42, 0.20), 1.3);
        } else {
          night += lightTrail(0.0, vec3(0.57, 0.68, 0.75), 1.5);
          night += lightTrail(-20.0, vec3(0.5, 0.3, 0.14), 1.3);
          night += lightTrail(23.0, vec3(0.4, 0.3, 0.18), 1.1);
        }
        float bankDistance = max(0.0, world.z - bankAt(world.x));
        night += vec3(0.32, 0.18, 0.035) * exp(-bankDistance * 2.5) * (0.45 + grain * 0.7);
        
        vec3 color;
        if (dusk < 0.5) {
          float t = dusk / 0.5;
          color = mix(day, sunset, smoothstep(0.0, 1.0, t));
        } else {
          float t = (dusk - 0.5) / 0.5;
          color = mix(sunset, night, smoothstep(0.0, 1.0, t));
        }
        // Fade the miniature into the surrounding sky at its open edges.
        float edge = smoothstep(extent.y-3.0, extent.y, world.z);
        if (fadeEdges.x > 0.5 && world.x < 0.0) {
          edge = max(edge, smoothstep(-extent.x + 3.0, -extent.x, world.x));
        }
        if (fadeEdges.y > 0.5 && world.x > 0.0) {
          edge = max(edge, smoothstep(extent.x - 3.0, extent.x, world.x));
        }
        gl_FragColor = vec4(color, 1.0 - edge);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(geometry, material);
}
