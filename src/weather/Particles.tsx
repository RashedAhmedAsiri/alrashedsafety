// OWNER: weather worker. Instanced particle fields: rain streaks, splashes, roof drips, dust streaks and motes.
// Every field is ONE draw call: an InstancedBufferGeometry whose per-instance random vec4 is turned into a
// world position in the vertex shader (wrapped around the camera), so nothing is updated on the CPU.
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useApp } from '../core/store';
import type { Quality } from '../core/types';
import { stepBlend, weatherBlend, WIND } from './blend';

const COUNTS: Record<Quality, { rain: number; splash: number; dustStreak: number; mote: number; drip: number }> = {
  low: { rain: 700, splash: 110, dustStreak: 70, mote: 200, drip: 40 },
  medium: { rain: 1500, splash: 220, dustStreak: 130, mote: 450, drip: 90 },
  high: { rain: 2400, splash: 340, dustStreak: 200, mote: 800, drip: 140 },
};

function randomAttr(count: number, seed: number) {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const a = new Float32Array(count * 4);
  for (let i = 0; i < a.length; i++) a[i] = rnd();
  return new THREE.InstancedBufferAttribute(a, 4);
}

function makeGeometry(count: number, seed: number, name = 'aRand') {
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.index = quad.index;
  g.setAttribute('position', quad.getAttribute('position'));
  g.setAttribute('uv', quad.getAttribute('uv'));
  g.setAttribute(name, randomAttr(count, seed));
  g.instanceCount = count;
  return g;
}

const _fwd = new THREE.Vector3();
/** Field centre: a little ahead of the camera so most particles are in view. */
function fieldCenter(camera: THREE.Camera, ahead: number, out: THREE.Vector3) {
  camera.getWorldDirection(_fwd);
  _fwd.y = 0;
  if (_fwd.lengthSq() > 1e-4) _fwd.normalize();
  out.set(camera.position.x + _fwd.x * ahead, camera.position.y, camera.position.z + _fwd.z * ahead);
}

/* ================================================================== streak / mote field */

const STREAK_VERT = /* glsl */ `
attribute vec4 aRand;
uniform vec3 uCenter; uniform vec3 uBox; uniform vec3 uVel;
uniform float uLen; uniform float uWidth; uniform float uTime; uniform float uAmt; uniform float uY0;
uniform float uFade; uniform float uSpeedVar; uniform float uSizeVar;
varying float vA; varying vec2 vUv;
void main() {
  float rank = fract(aRand.x * 13.7 + aRand.z * 7.3 + aRand.y * 3.1);
  float sp = 1.0 + (aRand.w - 0.5) * uSpeedVar;
  vec3 p0 = aRand.xyz * uBox + uVel * sp * uTime;
  vec3 w;
  w.xz = uCenter.xz + (mod(p0.xz - uCenter.xz, uBox.xz) - uBox.xz * 0.5);
  w.y = uY0 + mod(p0.y - uY0, uBox.y);
  vec3 ax = normalize(uVel);
  vec3 toCam = w - cameraPosition;
  float d = length(toCam);
  vec3 side = normalize(cross(ax, toCam));
  float sz = mix(1.0, 0.4 + aRand.w * 1.3, uSizeVar);
  vec3 pos = w + ax * position.y * uLen * sz + side * position.x * uWidth * sz;
  vUv = uv;
  float edge = smoothstep(0.0, 0.12, (w.y - uY0) / uBox.y) * (1.0 - smoothstep(0.88, 1.0, (w.y - uY0) / uBox.y));
  vA = (1.0 - smoothstep(uFade * 0.45, uFade, d)) * smoothstep(0.9, 3.2, d) * step(rank, uAmt) * edge;
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}
`;

const STREAK_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uAlpha; uniform float uRound;
varying float vA; varying vec2 vUv;
void main() {
  if (vA < 0.01) discard;
  float a;
  if (uRound > 0.5) {
    float r = length(vUv - 0.5) * 2.0;
    a = (1.0 - smoothstep(0.2, 1.0, r));
  } else {
    float across = 1.0 - smoothstep(0.35, 1.0, abs(vUv.x - 0.5) * 2.0);
    a = across * smoothstep(0.0, 0.85, vUv.y) * (0.35 + 0.65 * vUv.y);
  }
  gl_FragColor = vec4(uColor, a * uAlpha * vA);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

interface FieldProps {
  count: number;
  seed: number;
  box: [number, number, number];
  len: number;
  width: number;
  color: string;
  alpha: number;
  fade: number;
  ahead: number;
  round?: boolean;
  speedVar?: number;
  sizeVar?: number;
  /** Per frame: set uniforms (velocity, amount, y0). */
  update: (u: Record<string, THREE.IUniform>, camera: THREE.Camera) => void;
}

function StreakField(p: FieldProps) {
  const camera = useThree((s) => s.camera);
  const { geo, mat, mesh } = useMemo(() => {
    const geo = makeGeometry(p.count, p.seed);
    const mat = new THREE.ShaderMaterial({
      vertexShader: STREAK_VERT,
      fragmentShader: STREAK_FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
      uniforms: {
        uCenter: { value: new THREE.Vector3() },
        uBox: { value: new THREE.Vector3(...p.box) },
        uVel: { value: new THREE.Vector3(0, -1, 0) },
        uLen: { value: p.len },
        uWidth: { value: p.width },
        uTime: { value: 0 },
        uAmt: { value: 0 },
        uY0: { value: 0 },
        uFade: { value: p.fade },
        uSpeedVar: { value: p.speedVar ?? 0.2 },
        uSizeVar: { value: p.sizeVar ?? 0 },
        uColor: { value: new THREE.Color(p.color) },
        uAlpha: { value: p.alpha },
        uRound: { value: p.round ? 1 : 0 },
      },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 20;
    mesh.visible = false;
    return { geo, mat, mesh };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.count]);
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);

  useFrame((state, delta) => {
    stepBlend(state.clock.elapsedTime, delta);
    const u = mat.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    p.update(u, camera);
    mesh.visible = u.uAmt.value > 0.005;
    if (mesh.visible) fieldCenter(camera, p.ahead, u.uCenter.value as THREE.Vector3);
  });
  return <primitive object={mesh} />;
}

/** Camera height gate: particles are for ground-level views; hidden for fly-over cameras. */
const heightGate = (camY: number) => 1 - THREE.MathUtils.smoothstep(camY, 22, 45);

export function Rain({ quality }: { quality: Quality }) {
  return (
    <StreakField
      count={COUNTS[quality].rain}
      seed={11}
      box={[34, 16, 34]}
      len={0.85}
      width={0.038}
      color="#e3edf8"
      alpha={0.85}
      fade={30}
      ahead={9}
      speedVar={0.25}
      update={(u, cam) => {
        const slant = WIND.strength * 5;
        (u.uVel.value as THREE.Vector3).set(WIND.dir.x * slant, -15, WIND.dir.y * slant);
        u.uAmt.value = weatherBlend.rain * heightGate(cam.position.y);
        u.uY0.value = THREE.MathUtils.clamp(cam.position.y - 7, 0, 40);
      }}
    />
  );
}

export function Dust({ quality }: { quality: Quality }) {
  const c = COUNTS[quality];
  return (
    <>
      <StreakField
        count={c.dustStreak}
        seed={23}
        box={[46, 9, 46]}
        len={5.5}
        width={0.09}
        color="#f1d2a2"
        alpha={0.42}
        fade={40}
        ahead={12}
        speedVar={0.5}
        sizeVar={1}
        update={(u, cam) => {
          const sp = 10 + WIND.strength * 16;
          (u.uVel.value as THREE.Vector3).set(WIND.dir.x * sp, -0.35, WIND.dir.y * sp);
          u.uAmt.value = weatherBlend.dust * heightGate(cam.position.y);
          u.uY0.value = THREE.MathUtils.clamp(cam.position.y - 3, 0, 40);
        }}
      />
      <StreakField
        count={c.mote}
        seed={37}
        box={[34, 8, 34]}
        len={0.1}
        width={0.1}
        color="#ecc48f"
        alpha={0.6}
        fade={26}
        ahead={8}
        round
        speedVar={0.7}
        sizeVar={1}
        update={(u, cam) => {
          const sp = 6 + WIND.strength * 9;
          (u.uVel.value as THREE.Vector3).set(WIND.dir.x * sp, 0.18, WIND.dir.y * sp);
          u.uAmt.value = weatherBlend.dust * heightGate(cam.position.y);
          u.uY0.value = THREE.MathUtils.clamp(cam.position.y - 2.5, 0, 40);
        }}
      />
    </>
  );
}

/* ================================================================== ground splashes */

/** GLSL twin of core/ground.ts groundHeight (approximate: sidewalks, crossing, side roads). */
const GROUND_H_GLSL = /* glsl */ `
float wGroundH(vec2 p) {
  float az = abs(p.y);
  if (az < 3.5) { float ax = abs(p.x); return ax <= 2.5 ? 0.15 : (ax < 3.5 ? 0.15 * (1.0 - (ax - 2.5)) : 0.0); }
  if (abs(p.x + 72.0) <= 3.5) return 0.0;
  if (abs(p.x + 14.0) <= 3.5 && p.y > 0.0 && p.y < 44.0) return 0.0;
  if (az <= 7.5 && abs(p.x) < 130.0) {
    if (p.y < 0.0 && p.x > -50.0 && p.x < -16.0) return 0.0;
    if (p.y < 0.0 && p.x > 60.0 && p.x < 66.0) return 0.0;
    return 0.15;
  }
  return 0.0;
}
`;

const SPLASH_VERT = /* glsl */ `
attribute vec4 aRand;
uniform vec3 uCenter; uniform vec3 uBox; uniform float uTime; uniform float uAmt; uniform float uPeriod;
varying vec2 vUv; varying float vA; varying float vPh;
${GROUND_H_GLSL}
void main() {
  float t = uTime / uPeriod + aRand.w * 7.0;
  float idx = floor(t);
  float ph = fract(t);
  vec2 h = fract(sin(vec2(dot(aRand.xy + idx * 0.37, vec2(12.9898, 78.233)), dot(aRand.zw + idx * 0.71, vec2(39.3468, 11.135)))) * 43758.5453);
  vec2 base = h * uBox.xz;
  vec2 wp = uCenter.xz + (mod(base - uCenter.xz, uBox.xz) - uBox.xz * 0.5);
  float rad = 0.04 + ph * 0.2 * (0.6 + aRand.x * 0.8);
  vec3 pos = vec3(wp.x + position.x * 2.0 * rad, wGroundH(wp) + 0.03, wp.y - position.y * 2.0 * rad);
  float d = distance(vec2(pos.x, pos.z), cameraPosition.xz);
  vA = pow(1.0 - ph, 1.4) * step(fract(aRand.z * 5.3 + aRand.x * 2.1), uAmt) * (1.0 - smoothstep(10.0, 18.0, d)) * smoothstep(0.4, 1.2, d);
  vPh = ph;
  vUv = position.xy * 2.0;
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}
`;

const SPLASH_FRAG = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv; varying float vA; varying float vPh;
void main() {
  if (vA < 0.01) discard;
  float r = length(vUv);
  float ring = smoothstep(0.5, 0.78, r) * (1.0 - smoothstep(0.84, 1.0, r));
  float crown = (1.0 - smoothstep(0.0, 0.5, r)) * (1.0 - smoothstep(0.0, 0.25, vPh)) * 0.8;
  gl_FragColor = vec4(uColor, (ring * 0.7 + crown) * vA);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function Splashes({ quality }: { quality: Quality }) {
  const camera = useThree((s) => s.camera);
  const { geo, mat, mesh } = useMemo(() => {
    const geo = makeGeometry(COUNTS[quality].splash, 71);
    const mat = new THREE.ShaderMaterial({
      vertexShader: SPLASH_VERT,
      fragmentShader: SPLASH_FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      uniforms: {
        uCenter: { value: new THREE.Vector3() },
        uBox: { value: new THREE.Vector3(24, 1, 24) },
        uTime: { value: 0 },
        uAmt: { value: 0 },
        uPeriod: { value: 0.55 },
        uColor: { value: new THREE.Color('#eef5fb') },
      },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 8;
    mesh.visible = false;
    return { geo, mat, mesh };
  }, [quality]);
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);
  useFrame((state, delta) => {
    stepBlend(state.clock.elapsedTime, delta);
    const u = mat.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uAmt.value = weatherBlend.rain * (1 - THREE.MathUtils.smoothstep(camera.position.y, 10, 22));
    mesh.visible = u.uAmt.value > 0.005;
    if (mesh.visible) fieldCenter(camera, 7, u.uCenter.value as THREE.Vector3);
  });
  return <primitive object={mesh} />;
}

/* ================================================================== roof drips (after rain) */

/** Roof edges, canopies and shelters where water drips: x0..x1 at depth z and height y. */
const DRIP_LINES: { x0: number; x1: number; z: number; y: number; w: number }[] = [
  { x0: -36, x1: -9.5, z: -37.85, y: 4.05, w: 3 },
  { x0: 3.5, x1: 24, z: -37.85, y: 4.05, w: 3 },
  { x0: -22, x1: -4, z: -13.4, y: 5.2, w: 2 },
  { x0: -22, x1: -4, z: -33.6, y: 5.2, w: 1.4 },
  { x0: -4.9, x1: 4.9, z: -6.95, y: 3.7, w: 2 },
  { x0: -47, x1: -19, z: -7.7, y: 2.95, w: 2 },
  { x0: 30, x1: 35.4, z: -5.7, y: 2.75, w: 1.2 },
];

const DRIP_VERT = /* glsl */ `
attribute vec4 aSrc;   // xyz = drip point, w = random
attribute vec4 aRand;
uniform float uTime; uniform float uAmt;
varying float vA; varying vec2 vUv;
void main() {
  float cycle = 1.1 + aSrc.w * 2.3;
  float t = fract(uTime / cycle + aRand.x) * cycle;
  float tf = sqrt(aSrc.y / 6.0);
  float y = aSrc.y - 6.0 * t * t;
  vec3 w = vec3(aSrc.x, y, aSrc.z);
  float live = step(t, tf) * step(aRand.y, uAmt);
  vec3 toCam = w - cameraPosition;
  vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  float grow = smoothstep(0.0, 0.12, t); // a drop swells before it falls
  vec3 pos = w + vec3(0.0, 1.0, 0.0) * position.y * 0.28 * grow + side * position.x * 0.03 * grow;
  float d = length(toCam);
  vA = live * (1.0 - smoothstep(30.0, 60.0, d));
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}
`;

const DRIP_FRAG = /* glsl */ `
varying float vA; varying vec2 vUv;
void main() {
  if (vA < 0.01) discard;
  float across = 1.0 - smoothstep(0.3, 1.0, abs(vUv.x - 0.5) * 2.0);
  gl_FragColor = vec4(vec3(0.84, 0.92, 1.0), across * 0.8 * vA);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function Drips({ quality }: { quality: Quality }) {
  const { geo, mat, mesh } = useMemo(() => {
    const total = COUNTS[quality].drip;
    const weights = DRIP_LINES.reduce((s, l) => s + l.w, 0);
    const src = new Float32Array(total * 4);
    let s = 91;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    let n = 0;
    for (const l of DRIP_LINES) {
      const cnt = Math.max(2, Math.round((total * l.w) / weights));
      for (let i = 0; i < cnt && n < total; i++, n++) {
        const x = l.x0 + ((i + rnd() * 0.8) / cnt) * (l.x1 - l.x0);
        src.set([x, l.y, l.z, rnd()], n * 4);
      }
    }
    const geo = makeGeometry(total, 53);
    geo.setAttribute('aSrc', new THREE.InstancedBufferAttribute(src, 4));
    geo.instanceCount = n;
    const mat = new THREE.ShaderMaterial({
      vertexShader: DRIP_VERT,
      fragmentShader: DRIP_FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uAmt: { value: 0 } },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 21;
    mesh.visible = false;
    return { geo, mat, mesh };
  }, [quality]);
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);
  useFrame((state, delta) => {
    stepBlend(state.clock.elapsedTime, delta);
    // After rain only (during rain the roofs run with water everywhere, streaks dominate).
    const a = weatherBlend.wet * (1 - weatherBlend.rain) + weatherBlend.rain * 0.35;
    mat.uniforms.uAmt.value = a;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mesh.visible = a > 0.01;
  });
  return <primitive object={mesh} />;
}

/** Quality hook used by the system (rare change). */
export function useQuality(): Quality {
  return useApp((s) => s.settings.quality);
}

