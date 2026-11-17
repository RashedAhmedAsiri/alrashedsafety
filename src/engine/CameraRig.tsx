import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { LOCATIONS } from '../core/locations';
import { useStage, type CameraShot } from '../core/stage';
import { useApp } from '../core/store';
import { ease } from './abort';
import { clock } from './clock';
import { homePose, orbitLimits, rig } from './rig';

/**
 * The one camera controller (see the mode list in ./rig.ts):
 *  - travel fly and the opening fly-in drive the camera through rig.override;
 *  - scripted shots (useStage.shot) blend from the current view over `dur` with `ease`, then onDone;
 *  - while something plays without a shot, the camera holds still;
 *  - otherwise free look: OrbitControls (drag/pinch/wheel) around Alrashed with the location's
 *    orbit limits, the camera kept inside the room indoors, snapping softly back to the home view
 *    after 5 s without touch;
 *  - camera shake (useStage.shake) on top of scripted/held views.
 */

const SNAP_AFTER_MS = 5000;

type Mode = 'override' | 'shot' | 'hold' | 'free';

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useRef<OrbitControlsImpl>(null);
  const st = useRef({
    mode: 'hold' as Mode,
    shot: null as CameraShot | null,
    shotDone: false,
    shotStart: 0,
    from: { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50 },
    to: { pos: new THREE.Vector3(), look: new THREE.Vector3() },
    cutGen: -1,
    tmp: new THREE.Vector3(),
    shakeT: 0,
  });

  useFrame((_, dtRaw) => {
    rig.live = true;
    const dt = Math.min(dtRaw, 0.1);
    const s = st.current;
    const c = controls.current;
    const now = clock.now();
    const stage = useStage.getState();
    const app = useApp.getState();

    let mode: Mode;
    if (rig.override) mode = 'override';
    else if (stage.shot) mode = 'shot';
    else if (app.phase !== 'mode' || app.playing || app.traveling) mode = 'hold';
    else mode = 'free';

    // A shot that disappeared or got replaced before finishing still resolves its promise.
    if (s.shot && s.shot !== stage.shot) {
      if (!s.shotDone) s.shot.onDone?.();
      s.shot = null;
    }

    if (mode === 'override') {
      rig.override!(now);
    } else if (mode === 'shot') {
      const shot = stage.shot!;
      if (shot !== s.shot) {
        s.shot = shot;
        s.shotDone = false;
        s.shotStart = now;
        s.from.pos.copy(rig.pos);
        s.from.look.copy(rig.look);
        s.from.fov = rig.fov;
        s.to.pos.set(shot.pos[0], shot.pos[1], shot.pos[2]);
        s.to.look.set(shot.look[0], shot.look[1], shot.look[2]);
      }
      const f = shot.dur > 0 ? Math.min(1, (now - s.shotStart) / (shot.dur * 1000)) : 1;
      const e = ease(shot.ease, f);
      rig.pos.lerpVectors(s.from.pos, s.to.pos, e);
      rig.look.lerpVectors(s.from.look, s.to.look, e);
      rig.fov = s.from.fov + ((shot.fov || s.from.fov) - s.from.fov) * e;
      if (f >= 1 && !s.shotDone) {
        s.shotDone = true;
        shot.onDone?.();
      }
    } else if (mode === 'free' && c) {
      const enter = s.mode !== 'free' || s.cutGen !== rig.cutGen;
      if (enter) {
        // Hand the current view to the controls without a jump.
        camera.position.copy(rig.pos);
        c.target.copy(rig.look);
        camera.lookAt(rig.look);
        s.cutGen = rig.cutGen;
      }
      const home = homePose();
      const lim = orbitLimits();
      const homeDist = home.pos.distanceTo(home.look);
      c.minDistance = Math.min(lim.minDist, homeDist * 0.9);
      c.maxDistance = Math.max(lim.maxDist, homeDist * 1.1);
      const off = s.tmp.copy(home.pos).sub(home.look);
      const homePolar = Math.acos(THREE.MathUtils.clamp(off.y / Math.max(off.length(), 1e-6), -1, 1));
      c.minPolarAngle = Math.min(0.2, homePolar - 0.05);
      c.maxPolarAngle = Math.min(2.2, Math.max(1.52, homePolar + 0.05));
      const loc = LOCATIONS[app.location];
      if (loc.kind === 'inside') {
        const az = Math.atan2(off.x, off.z);
        c.minAzimuthAngle = az - 1.35;
        c.maxAzimuthAngle = az + 1.35;
      } else {
        c.minAzimuthAngle = -Infinity;
        c.maxAzimuthAngle = Infinity;
      }
      c.enablePan = false;
      if (!c.enabled) {
        c.enabled = true;
        c.update();
      }
      // The pivot follows Alrashed's home look point; after 5 s untouched the view glides home.
      c.target.lerp(home.look, 1 - Math.exp(-3 * dt));
      if (!rig.dragging && now - rig.lastTouch > SNAP_AFTER_MS) {
        camera.position.lerp(home.pos, 1 - Math.exp(-1.6 * dt));
        rig.fov += (home.fov - rig.fov) * (1 - Math.exp(-1.6 * dt));
      }
      if (loc.kind === 'inside') clampInsideRoom(camera.position, app.location);
      else camera.position.y = Math.max(camera.position.y, 0.35);
      rig.pos.copy(camera.position);
      rig.look.copy(c.target);
    }

    if (mode !== 'free' && c && c.enabled) {
      c.enabled = false;
      rig.dragging = false; // a drag cut short by a shot never sends 'end'
    }
    s.mode = mode;

    if (mode !== 'free') {
      camera.position.copy(rig.pos);
      // Shake on scripted / held views only (free look would accumulate it into the orbit).
      const sh = stage.shake;
      if (sh && now < sh.until) {
        s.shakeT += dt;
        const amp = sh.strength * Math.min(1, (sh.until - now) / 250);
        const t = s.shakeT;
        camera.position.x += amp * (Math.sin(t * 37.1) * 0.6 + Math.sin(t * 61.7) * 0.4);
        camera.position.y += amp * (Math.sin(t * 43.3 + 1.3) * 0.6 + Math.sin(t * 71.9) * 0.4);
        camera.position.z += amp * (Math.sin(t * 29.4 + 2.1) * 0.5 + Math.sin(t * 53.2) * 0.5);
      }
      camera.lookAt(rig.look);
    }
    if (Math.abs(camera.fov - rig.fov) > 1e-3) {
      camera.fov = rig.fov;
      camera.updateProjectionMatrix();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      enablePan={false}
      onStart={() => {
        rig.dragging = true;
        rig.lastTouch = clock.now();
      }}
      onChange={() => {
        if (rig.dragging) rig.lastTouch = clock.now();
      }}
      onEnd={() => {
        rig.dragging = false;
        rig.lastTouch = clock.now();
      }}
    />
  );
}

/** Keep the free camera inside the active room's box. */
function clampInsideRoom(p: THREE.Vector3, id: keyof typeof LOCATIONS) {
  const loc = LOCATIONS[id];
  const [ox, oy, oz] = loc.origin;
  const hx = loc.size[0] / 2 - 0.25;
  const hz = loc.size[1] / 2 - 0.25;
  p.x = THREE.MathUtils.clamp(p.x, ox - hx, ox + hx);
  p.z = THREE.MathUtils.clamp(p.z, oz - hz, oz + hz);
  p.y = THREE.MathUtils.clamp(p.y, oy + 0.4, oy + (loc.height ?? 3.4) - 0.25);
}
