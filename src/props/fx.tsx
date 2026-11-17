// OWNER: props worker. Cheap GPU particles (one Points draw, animation in the vertex shader, no per-frame CPU
// work except one uniform) and the animated effects built on them: smoke, dust cloud, confetti, spray.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useApp } from '../core/store';
import { rng } from './geo';

export type ParticleMode = 'smoke' | 'dust' | 'confetti' | 'spray';

const VERT = /* glsl */ `
attribute vec4 aR;
attribute vec3 aC;
uniform float uT;
uniform float uH;
uniform float uMode;
uniform float uSize;
uniform float uParam;
uniform float uPeriod;
varying vec4 vCol;
varying float vSq;
void main() {
  vec3 p = vec3(0.0);
  float sz = 1.0;
  float al = 1.0;
  vec3 col = aC;
  float t = fract(uT / uPeriod + aR.x);
  vSq = 0.0;
  if (uMode < 0.5) {
    // smoke: rises, spreads and fades
    p = vec3((aR.y - 0.5) * 0.18 + (aR.z - 0.5) * 0.35 * t, t * 1.5, (aR.w - 0.5) * 0.18 + (aR.y - 0.5) * 0.3 * t);
    p.x += sin(t * 4.0 + aR.z * 6.0) * 0.06 * t;
    sz = 0.6 + 1.9 * t;
    al = smoothstep(0.0, 0.12, t) * (1.0 - t) * uParam * 0.75;
  } else if (uMode < 1.5) {
    // dust: puffs outward from the centre
    t = clamp(fract(uT / uPeriod) + aR.x * 0.1, 0.0, 1.0);
    vec3 d = normalize(vec3(aR.y - 0.5, (aR.z - 0.5) * 0.6, aR.w - 0.5) + 0.001);
    float e = 1.0 - pow(1.0 - t, 2.2);
    p = d * e * uParam * (0.5 + 0.5 * aR.x);
    p.y = abs(p.y) * 0.7 + e * 0.25;
    sz = 0.5 + 1.6 * t;
    al = (1.0 - t) * 0.65 * smoothstep(0.0, 0.05, t);
  } else if (uMode < 2.5) {
    // confetti: a burst that falls with a flutter
    vSq = 1.0;
    t = fract(uT / uPeriod);
    float tau = t * uPeriod * 0.9;
    vec3 v = normalize(vec3(aR.y - 0.5, 0.55 + aR.z * 0.6, aR.w - 0.5)) * (2.2 + aR.x * 2.6);
    p = v * tau * (1.0 - 0.18 * tau) + vec3(0.0, -2.4 * tau * tau * 0.5, 0.0);
    p.x += sin(tau * 6.0 + aR.x * 20.0) * 0.06 * tau;
    p.z += cos(tau * 5.0 + aR.y * 20.0) * 0.06 * tau;
    float onGround = step(p.y, 0.0);
    p.y = max(p.y, 0.0);
    sz = 0.7 + 0.5 * aR.z;
    al = 1.0 - smoothstep(0.82, 1.0, t) ;
    al *= 1.0 - 0.0 * onGround;
    p.y += 0.02;
  } else {
    // spray: a cone of powder along +Z
    float spread = 0.03 + t * 0.4;
    p = vec3((aR.y - 0.5) * 2.0 * spread, (aR.z - 0.5) * 2.0 * spread, t * uParam * (0.75 + 0.25 * aR.w));
    p.y -= t * t * 0.12;
    sz = 0.5 + 2.2 * t;
    al = (1.0 - t * 0.85) * 0.85 * smoothstep(0.0, 0.06, t);
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float px = uSize * sz * uH * 0.5 * projectionMatrix[1][1] / max(0.05, -mv.z);
  gl_PointSize = clamp(px, 1.0, 220.0);
  vCol = vec4(col, al);
}
`;

const FRAG = /* glsl */ `
varying vec4 vCol;
varying float vSq;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = vCol.a;
  if (vSq < 0.5) {
    float d = length(c) * 2.0;
    a *= smoothstep(1.0, 0.25, d);
  } else {
    if (abs(c.x) > 0.5 || abs(c.y) > 0.32) discard;
  }
  if (a < 0.01) discard;
  gl_FragColor = vec4(vCol.rgb, a);
}
`;

const MODE_ID: Record<ParticleMode, number> = { smoke: 0, dust: 1, confetti: 2, spray: 3 };

const geoCache = new Map<string, THREE.BufferGeometry>();
function particleGeo(count: number, palette: string[], seed: number) {
  const key = `${count}|${palette.join(',')}|${seed}`;
  let g = geoCache.get(key);
  if (g) return g;
  const r = rng(seed);
  const R = new Float32Array(count * 4);
  const C = new Float32Array(count * 3);
  const col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    R[i * 4] = i / count + r() * 0.01; // evenly staggered phases
    R[i * 4 + 1] = r();
    R[i * 4 + 2] = r();
    R[i * 4 + 3] = r();
    col.set(palette[i % palette.length]);
    const k = 0.9 + r() * 0.1;
    C[i * 3] = col.r * k;
    C[i * 3 + 1] = col.g * k;
    C[i * 3 + 2] = col.b * k;
  }
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aR', new THREE.BufferAttribute(R, 4));
  g.setAttribute('aC', new THREE.BufferAttribute(C, 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  geoCache.set(key, g);
  return g;
}

const QUALITY_K = { low: 0.4, medium: 0.7, high: 1 } as const;

export interface ParticlesProps {
  mode: ParticleMode;
  count: number;
  palette: string[];
  /** Point size in metres. */
  size: number;
  /** smoke: density 0..1; dust: radius; spray: length. */
  param: number;
  period: number;
  seed?: number;
  /** Fraction of the particles drawn (also scaled by quality). */
  fraction?: number;
  /** Restart the burst when mounted (confetti, dust). */
  restart?: boolean;
}

export function Particles({ mode, count, palette, size, param, period, seed = 1, fraction = 1, restart = false }: ParticlesProps) {
  const quality = useApp((s) => s.settings.quality);
  const { gl } = useThree();
  const geo = useMemo(() => {
    const base = particleGeo(count, palette, seed);
    const g = new THREE.BufferGeometry();
    for (const k of Object.keys(base.attributes)) g.setAttribute(k, base.attributes[k]);
    g.boundingSphere = base.boundingSphere;
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, palette.join(','), seed]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: { uT: { value: 0 }, uH: { value: 720 }, uMode: { value: MODE_ID[mode] }, uSize: { value: size }, uParam: { value: param }, uPeriod: { value: period } },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  mat.uniforms.uSize.value = size;
  mat.uniforms.uParam.value = param;
  mat.uniforms.uPeriod.value = period;
  const t0 = useRef<number | null>(null);
  const pts = useRef<THREE.Points>(null);
  const size2 = useMemo(() => new THREE.Vector2(), []);
  useFrame((st) => {
    if (t0.current === null) t0.current = st.clock.elapsedTime;
    mat.uniforms.uT.value = restart ? st.clock.elapsedTime - t0.current : st.clock.elapsedTime;
    gl.getDrawingBufferSize(size2);
    mat.uniforms.uH.value = size2.y;
    const p = pts.current;
    if (p) p.geometry.setDrawRange(0, Math.max(0, Math.floor(count * QUALITY_K[quality] * fraction)));
  });
  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} renderOrder={3} />;
}
