// OWNER: weather worker. Everything that happens on the ground: wet look of registered surfaces,
// puddles (sky-reflecting, rippling), the flood water in the side-road dip, gutter streams, heat shimmer.
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WET_MATERIALS } from '../world/wet';
import { FLOOD_DIP, groundHeight, SIDE_ROAD_X, ROAD_HALF_W } from '../core/ground';
import type { Quality } from '../core/types';
import { LOCATIONS } from '../core/locations';
import { cond, stepBlend, weatherBlend } from './blend';
import { NOISE_GLSL, SKY_FN_GLSL } from './glsl';

/* ================================================================== wet look of registered materials */

const WET_TINT = new THREE.Color('#5d6a7c');
const DUST_TINT = new THREE.Color('#cfae80');
const _c = new THREE.Color();

/** A tiny sky-gradient cube map: wet surfaces reflect it (strength follows wetness). */
function makeSkyEnv() {
  const faces: HTMLCanvasElement[] = [];
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d')!;
    // +x -x +y -y +z -z ; side faces get a horizon-to-zenith gradient, top bright, bottom dark.
    if (i === 2) g.fillStyle = '#e8f1fb';
    else if (i === 3) g.fillStyle = '#4b5057';
    else {
      const gr = g.createLinearGradient(0, 0, 0, 32);
      gr.addColorStop(0, '#cfe3f6');
      gr.addColorStop(0.5, '#f4f8fb');
      gr.addColorStop(0.58, '#8c93a0');
      gr.addColorStop(1, '#4b5057');
      g.fillStyle = gr;
    }
    g.fillRect(0, 0, 32, 32);
    faces.push(c);
  }
  const t = new THREE.CubeTexture(faces);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export function WetSurfaces() {
  const env = useMemo(() => (typeof document === 'undefined' ? null : makeSkyEnv()), []);
  useEffect(() => () => env?.dispose(), [env]);
  let lastKey = -1;
  let lastCount = -1;
  useFrame((state, delta) => {
    stepBlend(state.clock.elapsedTime, delta);
    const w = cond.wetness * (weatherBlend.rain > weatherBlend.wet ? 1 : 0.85);
    const d = weatherBlend.dust;
    const key = Math.round((w * 1000 + d * 1e6) * 10) + weatherBlend.afternoon;
    if (key === lastKey && WET_MATERIALS.size === lastCount) return;
    lastKey = key;
    lastCount = WET_MATERIALS.size;
    for (const m of WET_MATERIALS) {
      const dry = m.userData.dry as { color: THREE.Color; roughness: number; metalness: number } | undefined;
      if (!dry) continue;
      if (env && m.envMap !== env) {
        m.envMap = env;
        m.needsUpdate = true;
      }
      // Wet: darker with a cool cast. Dust: dull and tan.
      _c.copy(dry.color).multiplyScalar(1 - 0.5 * w).lerp(WET_TINT, 0.1 * w);
      _c.lerp(DUST_TINT.clone().multiplyScalar(0.55 + 0.45 * luma(dry.color)), 0.28 * d);
      m.color.copy(_c);
      m.roughness = THREE.MathUtils.lerp(dry.roughness, 0.28, w * 0.92) + 0.1 * d;
      m.metalness = THREE.MathUtils.lerp(dry.metalness, 0.12, w);
      m.envMapIntensity = w * (0.2 + 0.5 * (1 - luma(dry.color)));
    }
  });
  return null;
}
const luma = (c: THREE.Color) => c.r * 0.3 + c.g * 0.59 + c.b * 0.11;

/* ================================================================== puddles */

interface Spot {
  x: number;
  z: number;
  rx: number;
  rz: number;
  rot: number;
  /** Amount of puddle weather at which this one appears (0..~0.9). */
  thr: number;
  seed: number;
}

function buildSpots(count: number): Spot[] {
  let s = 4242;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out: Spot[] = [];
  const add = (x: number, z: number, rx: number, rz: number) => {
    // Keep clear of the zebra crossing, the flood dip (it has its own water) and the compound gate walkway.
    if (Math.abs(x) < 4.8 && Math.abs(z) < 4.5) return;
    if (Math.abs(x - SIDE_ROAD_X) < ROAD_HALF_W + 0.5 && z > 12 && z < 28) return;
    out.push({ x, z, rx, rz, rot: rnd() * Math.PI, thr: rnd() * 0.75, seed: rnd() * 50 });
  };
  const n = count;
  // Street edges (along the gutters on both sides) and a few in the lanes.
  for (let i = 0; i < n * 0.26; i++) {
    const x = -125 + (i / (n * 0.26)) * 250 + (rnd() - 0.5) * 6;
    add(x, -2.7 + rnd() * 0.7, 0.9 + rnd() * 1.9, 0.35 + rnd() * 0.5);
    add(x + 4, 2.1 + rnd() * 0.9, 0.9 + rnd() * 1.9, 0.35 + rnd() * 0.5);
  }
  for (let i = 0; i < n * 0.06; i++) add((rnd() - 0.5) * 220, (rnd() - 0.5) * 4.2, 0.8 + rnd() * 1.2, 0.6 + rnd() * 0.8);
  // Sidewalks (north and south).
  for (let i = 0; i < n * 0.12; i++) add((rnd() - 0.5) * 230, -(4.4 + rnd() * 2.4), 0.5 + rnd() * 0.9, 0.4 + rnd() * 0.6);
  for (let i = 0; i < n * 0.12; i++) add((rnd() - 0.5) * 230, 4.4 + rnd() * 2.4, 0.5 + rnd() * 0.9, 0.4 + rnd() * 0.6);
  // School yard (paving) and the area in front of the gate.
  for (let i = 0; i < n * 0.2; i++) add(-20 + rnd() * 40, -34 + rnd() * 24, 0.7 + rnd() * 1.7, 0.6 + rnd() * 1.2);
  // Side road to the flood dip and the signal road.
  for (let i = 0; i < n * 0.06; i++) add(SIDE_ROAD_X + (rnd() - 0.5) * 5, 7 + rnd() * 6, 0.7 + rnd() * 1.2, 0.8 + rnd() * 1.6);
  for (let i = 0; i < n * 0.05; i++) add(-72 + (rnd() - 0.5) * 5, -30 + rnd() * 60, 0.7 + rnd() * 1.2, 0.8 + rnd() * 1.6);
  // A few puddles around every outdoor place so each default view has some to show.
  for (const l of Object.values(LOCATIONS)) {
    if (l.kind === 'inside') continue;
    for (let i = 0; i < 4; i++) {
      const a = rnd() * Math.PI * 2;
      const d = 2.2 + rnd() * 5;
      add(l.origin[0] + Math.cos(a) * d + l.robot[0] * 0.5, l.origin[2] + Math.sin(a) * d + l.robot[1] * 0.5, 0.7 + rnd() * 1.2, 0.5 + rnd() * 0.8);
    }
  }
  return out;
}

const PUD_VERT = /* glsl */ `
attribute vec4 aPud; // x = threshold, y = seed, z = rotation, w = unused
uniform float uAmt;
varying vec2 vUv; varying vec3 vWorld; varying float vSeed; varying float vGrow;
#include <fog_pars_vertex>
void main() {
  float g = smoothstep(aPud.x, aPud.x + 0.3, uAmt);
  vec3 p = position;
  p.xz *= g;
  vec4 wp = instanceMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vUv = uv * 2.0 - 1.0;
  vSeed = aPud.y;
  vGrow = g;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const PUD_FRAG = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunColor;
uniform float uTime; uniform float uRain; uniform float uAmt; uniform float uFlash;
varying vec2 vUv; varying vec3 vWorld; varying float vSeed; varying float vGrow;
${NOISE_GLSL}
${SKY_FN_GLSL}
#include <fog_pars_fragment>
void main() {
  if (vGrow < 0.01) discard;
  // Organic outline: a noisy radius.
  float ang = atan(vUv.y, vUv.x);
  float r = length(vUv);
  float edgeN = wNoise(vec2(ang * 1.6 + vSeed, vSeed * 1.7)) * 0.45 + wNoise(vec2(ang * 4.0 + vSeed * 3.0, 1.3)) * 0.12;
  float rad = 0.4 + edgeN * 0.62;
  float mask = 1.0 - smoothstep(rad - 0.1, rad, r);
  if (mask < 0.01) discard;

  vec3 V = normalize(vWorld - cameraPosition);
  vec3 R = vec3(V.x, abs(V.y), V.z);
  vec3 sky = wSky(R, uZenith, uHorizon);
  // Darker bands near the horizon suggest reflected buildings and trees.
  float band = smoothstep(0.02, 0.09, R.y) * (1.0 - smoothstep(0.09, 0.22, R.y));
  float blocks = step(0.5, wNoise(vec2(floor((R.x * 9.0 + R.z * 7.0 + vSeed) * 3.0), 3.0)));
  sky = mix(sky, sky * vec3(0.55, 0.6, 0.62), band * blocks * 0.8);
  float sun = pow(max(dot(R, uSunDir), 0.0), 220.0) * 6.0;
  sky += uSunColor * sun;
  float fres = 0.28 + 0.72 * pow(1.0 - clamp(abs(V.y), 0.0, 1.0), 2.5);
  vec3 deep = vec3(0.1, 0.13, 0.17);
  vec3 col = mix(deep, sky * (1.0 - 0.22 * uRain), clamp(fres * 1.05, 0.0, 1.0));

  // Ripples (rain): rings spawn in a world grid, expand and fade.
  float rip = 0.0;
  if (uRain > 0.01) {
    for (int k = 0; k < 2; k++) {
      vec2 q = vWorld.xz * (1.8 + float(k) * 1.1) + float(k) * 17.3;
      vec2 cell = floor(q);
      vec2 f = fract(q) - 0.5;
      float h = wHash(cell);
      float ph = fract(uTime * (0.6 + h * 0.4) + h * 7.0);
      vec2 c = (vec2(wHash(cell + 3.1), wHash(cell + 7.7)) - 0.5) * 0.5;
      float dd = length(f - c);
      float ring = smoothstep(0.035, 0.0, abs(dd - ph * 0.45)) * (1.0 - ph);
      rip += ring * step(0.45, h);
    }
  }
  col += vec3(0.9, 0.95, 1.0) * rip * 0.35 * uRain;
  col += uFlash * 0.4;

  float alpha = mask * (0.82 - (1.0 - fres) * 0.1) * vGrow;
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function Puddles({ quality }: { quality: Quality }) {
  const count = quality === 'low' ? 60 : quality === 'medium' ? 110 : 160;
  const { mesh, mat, geo } = useMemo(() => {
    const spots = buildSpots(count);
    const geo = new THREE.PlaneGeometry(2, 2);
    geo.rotateX(-Math.PI / 2);
    // PlaneGeometry after rotateX: lies in XZ; uv still maps. Instance attribute carries per-puddle data.
    const aPud = new Float32Array(spots.length * 4);
    const mat = new THREE.ShaderMaterial({
      vertexShader: PUD_VERT,
      fragmentShader: PUD_FRAG,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uZenith: { value: cond.zenith },
          uHorizon: { value: cond.horizon },
          uSunDir: { value: cond.sunDir },
          uSunColor: { value: cond.sun },
          uTime: { value: 0 },
          uRain: { value: 0 },
          uAmt: { value: 0 },
          uFlash: { value: 0 },
        },
      ]),
    });
    const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    spots.forEach((p, i) => {
      const y = groundHeight(p.x, p.z) + 0.022;
      e.set(0, p.rot, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(p.rx, 1, p.rz));
      mesh.setMatrixAt(i, m);
      aPud.set([p.thr, p.seed, p.rot, 0], i * 4);
    });
    geo.setAttribute('aPud', new THREE.InstancedBufferAttribute(aPud, 4));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    mesh.visible = false;
    return { mesh, mat, geo };
  }, [count]);
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);

  useFrame((state, delta) => {
    stepBlend(state.clock.elapsedTime, delta);
    const u = mat.uniforms;
    u.uAmt.value = cond.puddles;
    u.uRain.value = weatherBlend.rain;
    u.uTime.value = state.clock.elapsedTime;
    u.uFlash.value = cond.flash;
    mesh.visible = cond.puddles > 0.01;
  });
  return <primitive object={mesh} />;
}

/* ================================================================== flood water + gutter streams */

const FLOW_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vUv = uv;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FLOW_FRAG = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunColor;
uniform float uTime; uniform float uAmt; uniform vec2 uDir; uniform float uTint; uniform float uSoft; uniform float uFlash;
varying vec2 vUv; varying vec3 vWorld;
${NOISE_GLSL}
${SKY_FN_GLSL}
#include <fog_pars_fragment>
void main() {
  vec3 V = normalize(vWorld - cameraPosition);
  vec3 R = vec3(V.x, abs(V.y), V.z);
  // Flowing ripples: noise scrolled along the flow direction, stretched along it.
  vec2 fp = vWorld.xz;
  float along = dot(fp, uDir), across = dot(fp, vec2(-uDir.y, uDir.x));
  float n1 = wNoise(vec2(along * 0.9 - uTime * 1.3, across * 3.2));
  float n2 = wNoise(vec2(along * 1.9 - uTime * 2.1, across * 5.0 + 4.0));
  float streak = smoothstep(0.55, 0.9, n1 * 0.6 + n2 * 0.5);
  vec3 N = normalize(vec3((n1 - 0.5) * 0.35, 1.0, (n2 - 0.5) * 0.35));
  R = reflect(V, N); R.y = abs(R.y);
  vec3 sky = wSky(R, uZenith, uHorizon);
  sky += uSunColor * pow(max(dot(R, uSunDir), 0.0), 120.0) * 5.0;
  float fres = 0.3 + 0.7 * pow(1.0 - clamp(abs(V.y), 0.0, 1.0), 2.5);
  vec3 muddy = mix(vec3(0.16, 0.2, 0.24), vec3(0.34, 0.27, 0.19), uTint);
  vec3 col = mix(muddy, sky, clamp(fres, 0.0, 1.0) * 0.85);
  col += vec3(0.95) * streak * 0.2 + uFlash * 0.3;
  float edge = smoothstep(0.0, uSoft, vUv.y) * smoothstep(0.0, uSoft, 1.0 - vUv.y);
  float endFade = smoothstep(0.0, 0.03, vUv.x) * smoothstep(0.0, 0.03, 1.0 - vUv.x);
  gl_FragColor = vec4(col, uAmt * 0.88 * edge * mix(1.0, endFade, uTint * 0.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

function flowMaterial(dir: [number, number], tint: number, soft: number) {
  return new THREE.ShaderMaterial({
    vertexShader: FLOW_VERT,
    fragmentShader: FLOW_FRAG,
    transparent: true,
    depthWrite: false,
    fog: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uZenith: { value: cond.zenith },
        uHorizon: { value: cond.horizon },
        uSunDir: { value: cond.sunDir },
        uSunColor: { value: cond.sun },
        uTime: { value: 0 },
        uAmt: { value: 0 },
        uDir: { value: new THREE.Vector2(...dir) },
        uTint: { value: tint },
        uSoft: { value: soft },
        uFlash: { value: 0 },
      },
    ]),
  });
}

/**
 * Flood water filling the dip of the side road (x -17.5..-10.5, deepest at z = 20) and thin gutter
 * streams along the curbs of the main street. The flood level rises with rain / after rain; the
 * terrain pokes through it, so the shoreline follows the dip.
 */
export function Flood() {
  const { flood, gutters, floodMat, gutterMat, geos } = useMemo(() => {
    const floodMat = flowMaterial([0, -1], 1, 0.0);
    const gutterMat = flowMaterial([-1, 0], 0, 0.45);
    const fg = new THREE.PlaneGeometry(ROAD_HALF_W * 2, FLOOD_DIP.half * 2 + 3);
    fg.rotateX(-Math.PI / 2);
    const gg = new THREE.PlaneGeometry(250, 0.42);
    gg.rotateX(-Math.PI / 2);
    const flood = new THREE.Mesh(fg, floodMat);
    flood.position.set(SIDE_ROAD_X, -0.3, FLOOD_DIP.z);
    flood.renderOrder = 4;
    flood.frustumCulled = false;
    const gutters = [-1, 1].map((side) => {
      const m = new THREE.Mesh(gg, gutterMat);
      m.position.set(0, 0.018, side * 3.28);
      m.renderOrder = 4;
      m.frustumCulled = false;
      return m;
    });
    return { flood, gutters, floodMat, gutterMat, geos: [fg, gg] };
  }, []);
  useEffect(() => () => (geos.forEach((g) => g.dispose()), floodMat.dispose(), gutterMat.dispose()), [geos, floodMat, gutterMat]);

  useFrame((state, delta) => {
    stepBlend(state.clock.elapsedTime, delta);
    const { rain, wet } = weatherBlend;
    const level = Math.min(1, rain * 0.6 + wet);
    flood.visible = level > 0.03;
    flood.position.y = -0.36 + 0.3 * level;
    for (const m of [floodMat, gutterMat]) {
      const u = m.uniforms;
      u.uTime.value = state.clock.elapsedTime;
      u.uFlash.value = cond.flash;
    }
    floodMat.uniforms.uAmt.value = Math.min(1, level * 3);
    const g = Math.min(1, rain * 1.2 + wet * 0.45);
    gutterMat.uniforms.uAmt.value = g;
    gutters.forEach((m) => (m.visible = g > 0.03));
  });
  return (
    <>
      <primitive object={flood} />
      {gutters.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}

/* ================================================================== heat shimmer */

const SHIM_FRAG = /* glsl */ `
uniform float uTime; uniform float uAmt; uniform vec3 uCam;
varying vec2 vUv; varying vec3 vWorld;
${NOISE_GLSL}
void main() {
  vec3 V = normalize(vWorld - cameraPosition);
  float graze = pow(1.0 - clamp(abs(V.y), 0.0, 1.0), 3.0);
  vec2 p = vWorld.xz * vec2(0.22, 0.9);
  float n = wFbm(p + vec2(0.0, -uTime * 0.7));
  float n2 = wNoise(vec2(vWorld.x * 0.08 + uTime * 0.2, vWorld.z * 2.0 - uTime * 1.4));
  float band = smoothstep(0.42, 0.75, n) * (0.5 + 0.5 * n2);
  float d = distance(vWorld.xz, cameraPosition.xz);
  float fade = smoothstep(4.0, 14.0, d) * (1.0 - smoothstep(40.0, 70.0, d));
  float edge = smoothstep(0.0, 0.2, vUv.y) * smoothstep(0.0, 0.2, 1.0 - vUv.y);
  gl_FragColor = vec4(1.0, 0.97, 0.9, band * graze * fade * edge * uAmt * 0.32);
  #include <colorspace_fragment>
}
`;

/** A faint wavering sheen over the asphalt at sunny midday, brightest at grazing angles. */
export function HeatShimmer() {
  const camera = useThree((s) => s.camera);
  const { mesh, mat, geo } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(140, 7);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: FLOW_VERT.replace('#include <fog_pars_vertex>', '').replace('#include <fog_vertex>', ''),
      fragmentShader: SHIM_FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
      uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uCam: { value: new THREE.Vector3() } },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.04;
    mesh.renderOrder = 6;
    mesh.frustumCulled = false;
    return { mesh, mat, geo };
  }, []);
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);
  useFrame((state, delta) => {
    stepBlend(state.clock.elapsedTime, delta);
    const sunny = Math.max(0, 1 - weatherBlend.rain - weatherBlend.wet - weatherBlend.dust);
    const amt = sunny * (1 - weatherBlend.afternoon * 0.35) * (1 - THREE.MathUtils.smoothstep(camera.position.y, 8, 20));
    mat.uniforms.uAmt.value = amt;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mesh.visible = amt > 0.02;
    mesh.position.x = Math.round(camera.position.x / 10) * 10;
  });
  return <primitive object={mesh} />;
}

