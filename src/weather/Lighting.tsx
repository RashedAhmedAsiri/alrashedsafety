// OWNER: weather worker. Outdoor sun + sky light, indoor room light (lights off, alarm, robot glow).
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useApp } from '../core/store';
import { useStage } from '../core/stage';
import type { Quality } from '../core/types';
import { cond, stepBlend, weatherBlend } from './blend';

/** Shadow map size and half-extent of the shadow box (metres) per quality. */
const SHADOW: Record<Quality, { size: number; extent: number }> = {
  low: { size: 1024, extent: 18 },
  medium: { size: 2048, extent: 22 },
  high: { size: 4096, extent: 28 },
};

export function Lighting({ indoor }: { indoor: boolean }) {
  const gl = useThree((s) => s.gl);
  // Neutral tone mapping keeps the flat cartoon colors close to their authored hex values.
  useLayoutEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1;
  }, [gl]);
  return indoor ? <IndoorLights /> : <OutdoorLights />;
}

/* ================================================================== outdoor */

const _fwd = new THREE.Vector3();
const _c = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);
const FLASH_SKY = new THREE.Color('#dfe8ff');

function OutdoorLights() {
  const quality = useApp((s) => s.settings.quality);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const cfg = SHADOW[quality];
  const shadows = quality !== 'low';

  useEffect(() => {
    const l = sun.current;
    if (!l) return;
    l.target = target;
    l.shadow.mapSize.set(cfg.size, cfg.size);
    if (l.shadow.map) {
      l.shadow.map.dispose();
      (l.shadow as { map: THREE.WebGLRenderTarget | null }).map = null;
    }
    l.shadow.bias = -0.00025;
    l.shadow.normalBias = 0.035;
    l.shadow.radius = 2;
    const cam = l.shadow.camera;
    cam.near = 1;
    cam.far = 260;
  }, [cfg.size, target]);

  useFrame((state, delta) => {
    stepBlend(state.clock.elapsedTime, delta);
    const l = sun.current;
    const h = hemi.current;
    if (!l || !h) return;
    const flash = cond.flash;

    l.color.copy(cond.sun);
    l.intensity = cond.sunI;
    l.shadow.intensity = cond.shadow;
    h.color.copy(cond.hemiSky).lerp(FLASH_SKY, flash * 0.6);
    h.groundColor.copy(cond.hemiGround);
    h.intensity = cond.hemiI + flash * 2.2;
    state.gl.toneMappingExposure = cond.exposure;

    // Shadow box follows what the camera looks at: centre between the camera's foot point and
    // where its view ray meets the ground, grown when the camera is high (fly-in, overview).
    const camera = state.camera;
    camera.getWorldDirection(_fwd);
    const camY = camera.position.y;
    const extent = Math.min(110, cfg.extent + Math.max(0, camY - 6) * 0.55);
    let dist = extent;
    if (_fwd.y < -0.02) dist = Math.min(extent * 1.3, camY / -_fwd.y);
    _c.copy(camera.position).addScaledVector(_fwd, dist);
    _c.y = 0;
    _c.lerp(_up.set(camera.position.x, 0, camera.position.z), 0.4);

    // Snap the centre to shadow texels in light space so edges do not crawl as the camera moves.
    const d = cond.sunDir;
    _right.crossVectors(Y, d).normalize();
    _up.crossVectors(d, _right).normalize();
    const texel = (2 * extent) / cfg.size;
    const r = Math.round(_c.dot(_right) / texel) * texel;
    const u = Math.round(_c.dot(_up) / texel) * texel;
    const f = _c.dot(d);
    _c.copy(_right).multiplyScalar(r).addScaledVector(_up, u).addScaledVector(d, f);

    target.position.copy(_c);
    target.updateMatrixWorld();
    l.position.copy(_c).addScaledVector(d, 120);
    const sc = l.shadow.camera;
    if (sc.right !== extent) {
      sc.left = -extent;
      sc.right = extent;
      sc.top = extent;
      sc.bottom = -extent;
      sc.updateProjectionMatrix();
    }
  });

  return (
    <>
      <primitive object={target} />
      <hemisphereLight ref={hemi} args={['#d6ecff', '#d9c6a0', 1.25]} />
      <directionalLight ref={sun} intensity={2.6} castShadow={shadows} />
    </>
  );
}

/* ================================================================== indoor */

const IN_ON_SKY = new THREE.Color('#fffaf1');
const IN_ON_GROUND = new THREE.Color('#e9dfcd');
const IN_OFF_SKY = new THREE.Color('#8ea3c4');
const IN_OFF_GROUND = new THREE.Color('#5c6577');
const RAIN_TINT = new THREE.Color('#dfe7f2');
const _col = new THREE.Color();

function IndoorLights() {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const alarm = useRef<THREE.HemisphereLight>(null);
  const glowL = useRef<THREE.PointLight>(null);
  const off = useRef(useStage.getState().flags.lights === 'off' ? 1 : 0);
  const glowK = useRef(0);

  useFrame((state, delta) => {
    stepBlend(state.clock.elapsedTime, delta);
    const flags = useStage.getState().flags;
    const dt = Math.min(delta, 0.1);
    const wantOff = flags.lights === 'off' ? 1 : 0;
    // Lights snap off fast (power cut) and come back a little slower.
    off.current += (wantOff - off.current) * Math.min(1, dt * (wantOff ? 9 : 4));
    const k = off.current;
    state.gl.toneMappingExposure = 1;
    const rain = weatherBlend.rain;

    const h = hemi.current;
    if (h) {
      h.color.copy(IN_ON_SKY).lerp(RAIN_TINT, rain * 0.3).lerp(IN_OFF_SKY, k);
      h.groundColor.copy(IN_ON_GROUND).lerp(IN_OFF_GROUND, k);
      h.intensity = THREE.MathUtils.lerp(1.75 - 0.15 * rain, 0.32, k);
    }
    if (key.current) key.current.intensity = THREE.MathUtils.lerp(1.15 - 0.2 * rain, 0.1, k);

    // Alarm: slow red pulse (about one per 1.6 s), stronger in the dark.
    if (alarm.current) {
      const on = flags.alarm === true || flags.alarm === 'true';
      const p = on ? 0.5 - 0.5 * Math.cos((state.clock.elapsedTime * Math.PI * 2) / 1.6) : 0;
      alarm.current.intensity = p * (0.55 + 0.6 * k);
    }

    // Alrashed's screen lights the room when the lights are off: fully with `glow`, and still most of the
    // way with any other face (while he speaks the face changes per line, and the room must not go black).
    const pl = glowL.current;
    if (pl) {
      const want = useApp.getState().expression === 'glow' ? k : k * 0.7;
      glowK.current += (want - glowK.current) * Math.min(1, dt * 3);
      const g = glowK.current;
      pl.intensity = g * 9;
      pl.visible = true;
      const a = useStage.getState().actors.alrashed;
      if (a) {
        const fx = Math.sin(a.rotY);
        const fz = Math.cos(a.rotY);
        pl.position.set(a.pos[0] + fx * 0.45, a.pos[1] + 1.2, a.pos[2] + fz * 0.45);
      }
      _col.set('#bfeeff');
      pl.color.copy(_col);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#fffaf1', '#e9dfcd', 1.75]} />
      <directionalLight ref={key} position={[3, 10, 6]} intensity={1.15} />
      <hemisphereLight ref={alarm} args={['#ff2d2d', '#ff3b3b', 0]} />
      <pointLight ref={glowL} intensity={0} distance={8} decay={1.4} />
    </>
  );
}
