// OWNER: engine worker. The real app: <Canvas> with the world + <Overlay/> + <ExamOverlay/>.
import { Component, Suspense, useEffect, useMemo, useRef, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import { COLORS } from '../core/theme';
import { LOCATIONS } from '../core/locations';
import { useApp } from '../core/store';
import { useStage } from '../core/stage';
import type { InsideLocationId } from '../core/types';
import { OUTDOOR_PARTS, ROOM_SETS } from '../world/registry';
import { GEO, PAL, mat } from '../world/kit';
import { Lighting, WeatherSystem } from '../weather';
import { Robot } from '../characters/Robot';
import { Human } from '../characters/Human';
import { PropLayer } from '../props/PropLayer';
import { AmbientTraffic } from '../props/AmbientTraffic';
import { Overlay } from '../ui/Overlay';
import { ExamOverlay } from '../exam/ExamOverlay';
import { StageDriver } from './StageDriver';
import { CameraRig } from './CameraRig';
import { autoPickQuality, dprFor } from './quality';
import { markLoaded, startLoading } from './loading';
import { installInputHooks } from './idle';
import { installDevApi } from './devApi';
import { FLY_START } from './travel';
import { rig } from './rig';
import { warmMatcher } from './warm';

/**
 * Layout:  <div fixed>  <Canvas/>  <FadeFallback/>  <Overlay/>  <ExamOverlay/>  </div>
 *
 * The 3D scene renders, by phase:
 *   loading  the outdoor world + the classroom (hidden under the loading screen, to compile shaders)
 *   flyin    the outdoor world (camera flight over the street into the classroom window)
 *   menu/mode  the active room inside <group position={origin}> (inside locations), or every
 *            outdoor part + AmbientTraffic (grounds/outside locations)
 * Every part sits in its own error boundary + Suspense so one broken or loading piece never
 * blanks the whole app.
 */

autoPickQuality();
rig.pos.set(...FLY_START.pos);
rig.look.set(...FLY_START.look);
rig.fov = FLY_START.fov;

/* ------------------------------------------------------------------------- boundaries */

class Guard extends Component<{ name: string; children?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(`[engine] "${this.props.name}" crashed and is hidden:`, error, info.componentStack?.split('\n').slice(0, 4).join('\n'));
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Part({ name, children }: { name: string; children?: ReactNode }) {
  return (
    <Guard name={name}>
      <Suspense fallback={null}>{children}</Suspense>
    </Guard>
  );
}

/* ------------------------------------------------------------------------------ world */

/** Stand-in for a room whose set is not built yet: floor and walls, so nothing floats in the void. */
function PlaceholderRoom({ id }: { id: InsideLocationId }) {
  const loc = LOCATIONS[id];
  const [w, d] = loc.size;
  const h = loc.height ?? 3.4;
  return (
    <group>
      <mesh geometry={GEO.box} material={mat(PAL.tile)} position={[0, -0.05, 0]} scale={[w, 0.1, d]} receiveShadow />
      <mesh geometry={GEO.box} material={mat(PAL.wall)} position={[0, h / 2, -d / 2 - 0.05]} scale={[w, h, 0.1]} />
      <mesh geometry={GEO.box} material={mat(PAL.wall)} position={[-w / 2 - 0.05, h / 2, 0]} scale={[0.1, h, d]} />
      <mesh geometry={GEO.box} material={mat(PAL.wall)} position={[w / 2 + 0.05, h / 2, 0]} scale={[0.1, h, d]} />
      <mesh geometry={GEO.box} material={mat(PAL.wallLow)} position={[0, 0.5, -d / 2 + 0.01]} scale={[w, 1, 0.02]} />
      <mesh geometry={GEO.box} material={mat(PAL.ceiling)} position={[0, h + 0.05, 0]} scale={[w, 0.1, d]} />
    </group>
  );
}

/** Stand-in ground while no outdoor part exists yet, so the fly-in and outdoor views are not empty sky. */
function PlaceholderGround() {
  return <mesh geometry={GEO.box} material={mat(PAL.grass)} position={[0, -0.06, -10]} scale={[260, 0.1, 200]} receiveShadow />;
}

function RoomView({ id }: { id: InsideLocationId }) {
  const Room = ROOM_SETS[id];
  return (
    <group position={LOCATIONS[id].origin}>
      {Room ? (
        <Part key={id} name={`room ${id}`}>
          <Room />
        </Part>
      ) : (
        <PlaceholderRoom id={id} />
      )}
    </group>
  );
}

function Actors() {
  const list = useStage(useShallow((s) => Object.values(s.actors).map((a) => `${a.kind === 'robot' ? 'r' : 'h'}:${a.id}`)));
  return (
    <>
      {list.map((k) => {
        const id = k.slice(2);
        return (
          <Part key={k} name={`actor ${id}`}>
            {k[0] === 'r' ? <Robot actorId={id} /> : <Human actorId={id} />}
          </Part>
        );
      })}
    </>
  );
}

/** Loading readiness: compile everything once mounted, count the first frames. */
function Warmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const frames = useRef(0);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        await gl.compileAsync(scene, camera);
      } catch (e) {
        console.warn('[engine] shader warm-up', e);
      }
      if (alive) markLoaded('compiled');
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [gl, scene, camera]);
  useFrame(() => {
    if (frames.current < 30) {
      frames.current++;
      markLoaded('frames', frames.current / 30);
    }
  });
  return null;
}

function Scene() {
  const phase = useApp((s) => s.phase);
  const location = useApp((s) => s.location);
  const traffic = useStage((s) => s.flags.traffic);
  const loc = LOCATIONS[location];
  const opening = phase === 'loading' || phase === 'flyin';
  const outdoor = opening || loc.kind !== 'inside';
  const roomId: InsideLocationId | null =
    phase === 'loading' ? 'classroom' : !opening && loc.kind === 'inside' ? (location as InsideLocationId) : null;
  return (
    <>
      <Part name="lighting">
        <Lighting indoor={!outdoor} />
      </Part>
      <Part name="weather">
        <WeatherSystem indoor={!outdoor} />
      </Part>
      {outdoor && OUTDOOR_PARTS.length === 0 && <PlaceholderGround />}
      {outdoor &&
        OUTDOOR_PARTS.map((P, i) => (
          <Part key={`o${i}`} name={`outdoor part ${P.displayName || P.name || i}`}>
            <P />
          </Part>
        ))}
      {outdoor && (
        <Part name="traffic">
          <AmbientTraffic enabled={traffic !== 'off' && traffic !== false} />
        </Part>
      )}
      {roomId && <RoomView key={roomId} id={roomId} />}
      <Actors />
      <Part name="props">
        <PropLayer />
      </Part>
      <StageDriver />
      <CameraRig />
      <Warmup />
    </>
  );
}

/* --------------------------------------------------------------------------------- DOM */

/** Paper-colored travel fade, under the UI. The UI may draw its own from `fade` too. */
function FadeFallback() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const apply = (f: number) => {
      const el = ref.current;
      if (!el) return;
      el.style.opacity = String(f);
      el.style.visibility = f > 0.001 ? 'visible' : 'hidden';
    };
    apply(useApp.getState().fade);
    return useApp.subscribe((s, prev) => {
      if (s.fade !== prev.fade) apply(s.fade);
    });
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      style={{ position: 'absolute', inset: 0, background: COLORS.paper, opacity: 0, visibility: 'hidden', pointerEvents: 'none' }}
    />
  );
}

export default function MainApp() {
  const quality = useApp((s) => s.settings.quality);
  const antialias = useMemo(() => useApp.getState().settings.quality !== 'low', []);

  useEffect(() => {
    installDevApi();
    const off = installInputHooks();
    const skip = import.meta.env.DEV && new URLSearchParams(location.search).get('skip') === '1';
    startLoading({ skip });
    let warmQueued = false;
    const unsub = useApp.subscribe((s) => {
      if (!warmQueued && (s.phase === 'menu' || s.phase === 'mode')) {
        warmQueued = true;
        setTimeout(warmMatcher, 1500);
      }
    });
    return () => {
      off();
      unsub();
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: COLORS.paper }}>
      <Canvas
        shadows={quality !== 'low'}
        dpr={dprFor(quality)}
        gl={{ antialias, powerPreference: 'high-performance' }}
        camera={{ fov: FLY_START.fov, near: 0.05, far: 700, position: FLY_START.pos }}
        frameloop="always"
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        onCreated={(s) => {
          s.camera.lookAt(...FLY_START.look);
          markLoaded('canvas');
        }}
      >
        <Scene />
      </Canvas>
      <FadeFallback />
      <Guard name="Overlay">
        <Overlay />
      </Guard>
      <Guard name="ExamOverlay">
        <ExamOverlay />
      </Guard>
    </div>
  );
}
