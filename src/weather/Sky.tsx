// OWNER: weather worker. Sky dome (gradient, sun disc, cartoon clouds, haze), fog and the rainbow.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { cond, stepBlend, weatherBlend, WIND } from './blend';
import { NOISE_GLSL } from './glsl';

/* ================================================================== sky dome */

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // always on the far plane
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uFog;
uniform vec3 uSunDir; uniform vec3 uSunColor;
uniform vec3 uCloudLit; uniform vec3 uCloudShade;
uniform float uCover; uniform float uSunDisc; uniform float uHaze; uniform float uTime; uniform float uFlash;
uniform vec2 uWind;
varying vec3 vDir;
${NOISE_GLSL}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 sky = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.65, max(h, 0.0)), 0.8));
  // Below the horizon the dome shows the fog color so the world melts into it.
  sky = mix(sky, uFog, smoothstep(0.02, -0.06, h));

  float sd = max(dot(d, uSunDir), 0.0);
  sky += uSunColor * (pow(sd, 10.0) * 0.22 + pow(sd, 60.0) * 0.35) * uSunDisc;
  float disc = smoothstep(0.99935, 0.99955, sd);

  // Cartoon clouds on a flat layer above: threshold fbm with a soft rim, lit side toward the sun.
  float cloud = 0.0; vec3 cc = uCloudLit;
  if (h > -0.02) {
    float k = 1.0 / (max(h, 0.0) + 0.09);
    vec2 uv = d.xz * k * 0.55 + uWind * uTime * 0.012;
    float n = wFbm(uv);
    float n2 = wFbm(uv + uSunDir.xz * 0.12);
    float th = mix(0.78, 0.18, uCover);
    cloud = smoothstep(th, th + 0.07, n);
    // Overcast: fill the gaps with a flat grey deck.
    cloud = max(cloud, smoothstep(0.75, 1.0, uCover) * 0.85);
    float lit = smoothstep(-0.03, 0.05, n2 - n + 0.015);
    float body = smoothstep(th + 0.04, th + 0.3, n); // thicker centres are darker underneath
    cc = mix(uCloudShade, uCloudLit, clamp(lit * 0.75 + 0.35 - body * 0.35, 0.0, 1.0));
    cloud *= smoothstep(-0.02, 0.1, h);
    // Clouds near the horizon fade into the haze.
    cc = mix(cc, uHorizon, (1.0 - smoothstep(0.0, 0.25, h)) * 0.45);
  }
  sky = mix(sky, cc, cloud);
  disc *= (1.0 - cloud * 0.92);
  vec3 discCol = mix(vec3(1.0, 0.98, 0.9) * 1.25, uSunColor * 1.1 + 0.1, uHaze);
  sky = mix(sky, discCol, disc * uSunDisc);

  // Dust / rain haze: a lot of fog color near the horizon, some everywhere.
  float hz = uHaze * (0.45 + 0.55 * (1.0 - smoothstep(0.0, 0.55, max(h, 0.0))));
  sky = mix(sky, uFog, clamp(hz, 0.0, 0.92));

  sky += uFlash * vec3(0.55, 0.6, 0.72);
  gl_FragColor = vec4(sky, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function SkyDome() {
  const camera = useThree((s) => s.camera);
  const mesh = useRef<THREE.Mesh>(null);
  const { geo, mat } = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 48, 24);
    const mat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: cond.zenith },
        uHorizon: { value: cond.horizon },
        uFog: { value: cond.fog },
        uSunDir: { value: cond.sunDir },
        uSunColor: { value: cond.sun },
        uCloudLit: { value: cond.cloudLit },
        uCloudShade: { value: cond.cloudShade },
        uCover: { value: 0.3 },
        uSunDisc: { value: 1 },
        uHaze: { value: 0 },
        uTime: { value: 0 },
        uFlash: { value: 0 },
        uWind: { value: new THREE.Vector2(1, 0.3) },
      },
    });
    return { geo, mat };
  }, []);
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);

  useFrame((state, delta) => {
    stepBlend(state.clock.elapsedTime, delta);
    const m = mesh.current;
    if (!m) return;
    m.position.copy(camera.position);
    const far = (camera as THREE.PerspectiveCamera).far ?? 600;
    m.scale.setScalar(far * 0.9);
    const u = mat.uniforms;
    u.uCover.value = cond.cloudCover;
    u.uSunDisc.value = cond.sunDisc;
    u.uHaze.value = cond.haze;
    u.uTime.value = state.clock.elapsedTime * (1 + WIND.strength * 3);
    u.uFlash.value = cond.flash;
    (u.uWind.value as THREE.Vector2).copy(WIND.dir);
  });

  return <mesh ref={mesh} geometry={geo} material={mat} renderOrder={-100} frustumCulled={false} />;
}

/* ================================================================== fog */

function SceneFog() {
  const scene = useThree((s) => s.scene);
  const fog = useMemo(() => new THREE.Fog('#cfe6f6', 110, 520), []);
  useEffect(() => {
    const prev = scene.fog;
    scene.fog = fog;
    return () => {
      if (scene.fog === fog) scene.fog = prev && prev !== fog ? prev : null;
    };
  }, [scene, fog]);
  useFrame((state, delta) => {
    stepBlend(state.clock.elapsedTime, delta);
    fog.color.copy(cond.fog);
    if (cond.flash > 0) fog.color.lerp(FLASH_FOG, cond.flash * 0.35);
    // Overhead views (fly-in, overview) push the fog out so the whole school stays readable.
    const camY = state.camera.position.y;
    const lift = THREE.MathUtils.clamp((camY - 12) / 80, 0, 1) * (1 - weatherBlend.dust * 0.6);
    // High cameras see through a thicker slab of air: push the fog out with height.
    const up = Math.max(0, camY - 5);
    fog.near = cond.fogNear * (1 + lift * 1.5) + up * 0.9;
    fog.far = cond.fogFar * (1 + lift * 1.2) + up * 2.4;
  });
  return null;
}
const FLASH_FOG = new THREE.Color('#e8eefc');

/* ================================================================== rainbow */

const RB_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const RB_FRAG = /* glsl */ `
uniform float uAmt;
varying vec2 vUv;
vec3 band(float t) {
  // red outside -> violet inside
  vec3 c = vec3(0.0);
  c += vec3(1.0, 0.25, 0.25) * smoothstep(0.0, 0.17, t) * (1.0 - smoothstep(0.17, 0.34, t));
  c += vec3(1.0, 0.65, 0.2) * smoothstep(0.1, 0.27, t) * (1.0 - smoothstep(0.27, 0.44, t));
  c += vec3(1.0, 0.95, 0.35) * smoothstep(0.24, 0.41, t) * (1.0 - smoothstep(0.41, 0.58, t));
  c += vec3(0.35, 0.95, 0.4) * smoothstep(0.4, 0.57, t) * (1.0 - smoothstep(0.57, 0.74, t));
  c += vec3(0.3, 0.6, 1.0) * smoothstep(0.56, 0.73, t) * (1.0 - smoothstep(0.73, 0.88, t));
  c += vec3(0.6, 0.4, 1.0) * smoothstep(0.72, 0.88, t) * (1.0 - smoothstep(0.88, 1.0, t));
  return c;
}
void main() {
  vec2 p = vec2(vUv.x * 2.0 - 1.0, vUv.y); // bottom centre = (0,0), radius 1
  float r = length(p);
  float t = (1.0 - r) / 0.16; // band thickness 16% of radius
  if (t < 0.0 || t > 1.0) discard;
  float edge = sin(t * 3.14159);
  float foot = smoothstep(0.0, 0.45, p.y); // fade into the ground haze
  float a = uAmt * 0.42 * edge * foot;
  gl_FragColor = vec4(band(t), a);
  #include <colorspace_fragment>
}
`;

/** Faint rainbow over the park (south of the street, seen when looking south) after rain. */
function Rainbow() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RB_VERT,
        fragmentShader: RB_FRAG,
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: { uAmt: { value: 0 } },
      }),
    [],
  );
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(2, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);
  useFrame((state, delta) => {
    stepBlend(state.clock.elapsedTime, delta);
    const amt = weatherBlend.wet * (1 - weatherBlend.rain) * (1 - weatherBlend.dust);
    mat.uniforms.uAmt.value = amt;
    if (mesh.current) mesh.current.visible = amt > 0.01;
  });
  // Arc centred behind the park (park origin x -40, z 24), facing north toward the street.
  return <mesh ref={mesh} geometry={geo} material={mat} position={[-46, -14, 150]} rotation={[0, Math.PI, 0]} scale={[85, 85, 1]} renderOrder={-50} visible={false} />;
}

export function Sky() {
  return (
    <>
      <SkyDome />
      <SceneFog />
      <Rainbow />
    </>
  );
}
