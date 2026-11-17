import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { LOCATIONS, cameraSpot, robotSpot } from '../core/locations';
import { useStage } from '../core/stage';
import { useApp } from '../core/store';
import type { Expression, HoldItem, HumanClip, LocationId, PropKind, RobotClip, TimeOfDay, Vec3, Weather, CharacterKind } from '../core/types';
import { ROOM_SETS, OUTDOOR_PARTS } from '../world/registry';
import { Lighting, WeatherSystem } from '../weather';
import { Robot } from '../characters/Robot';
import { Human } from '../characters/Human';
import { PropLayer } from '../props/PropLayer';
import { AmbientTraffic } from '../props/AmbientTraffic';
import { HoldItemMesh } from '../props/holdItems';

/**
 * Dev viewer for building and screenshotting parts in isolation (used by tools/shot.mjs).
 *
 *   ?view=<locationId>            one location with its default camera and Alrashed on his spot
 *       &cam=x,y,z&look=x,y,z     world camera override (or &lcam=dx,dy,dz&llook=... local offsets)
 *       &weather=rain&time=afternoon&flags=lights:off,board:logo
 *       &norobot=1               hide Alrashed
 *   ?view=characters&clip=walk&expr=happy   robot + every person kind in a row
 *   ?view=props                   every prop kind and hand item in a grid
 *   ?view=overview                the whole outdoor world from above
 *
 * When the scene has rendered a few frames, window.__ready becomes true.
 */

const q = new URLSearchParams(location.search);
const num3 = (s: string | null): Vec3 | null => {
  if (!s) return null;
  const v = s.split(',').map(Number);
  return v.length === 3 && v.every((n) => Number.isFinite(n)) ? (v as Vec3) : null;
};

function ReadySignal() {
  const { gl } = useThree();
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    const tick = () => {
      frames++;
      if (frames > 30) (window as any).__ready = true;
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    (window as any).__gl = gl;
    return () => cancelAnimationFrame(raf);
  }, [gl]);
  return null;
}

const ALL_PROPS: PropKind[] = [
  'car', 'bus', 'ball', 'cone', 'barrierTape', 'manhole', 'puddle', 'fire', 'smoke', 'extinguisherSpray', 'wetFloorSign',
  'umbrella', 'waterBottle', 'sodaCan', 'scissors', 'paperStar', 'beaker', 'brokenGlass', 'mat', 'ballCart', 'firstAidKit',
  'chair', 'stool', 'tray', 'lunchbox', 'trafficLight', 'speechBubbleIcon', 'arrowMarker', 'confetti', 'dustCloud', 'rainbow',
  'boardImage', 'sandwich', 'peanutSnack', 'cable', 'powerStrip', 'socketCover', 'goggles', 'gloves', 'bucket', 'leaf',
  'plasticBag', 'stopSign',
];
const ALL_HOLD: HoldItem[] = ['umbrella', 'umbrellaClosed', 'extinguisher', 'bandage', 'gauze', 'ball', 'scissors', 'waterBottle', 'sodaCan', 'clipboard', 'mask', 'backpack', 'pencil', 'sandwich', 'mop'];
const KINDS: CharacterKind[] = ['boy', 'boy', 'boy', 'boy', 'teacher', 'counselor', 'guard', 'organizer', 'cleaner', 'stranger', 'parent'];

function Setup() {
  const view = q.get('view')!;
  useEffect(() => {
    const st = useStage.getState();
    const app = useApp.getState();
    app.set({
      weather: (q.get('weather') as Weather) ?? 'sunny',
      time: (q.get('time') as TimeOfDay) ?? 'morning',
      expression: (q.get('expr') as Expression) ?? 'smile',
      mouth: Number(q.get('mouth') ?? 0),
    });
    for (const kv of (q.get('flags') ?? '').split(',').filter(Boolean)) {
      const [k, v] = kv.split(':');
      st.setFlag(k, v === 'true' ? true : v === 'false' ? false : Number.isFinite(Number(v)) ? Number(v) : v);
    }
    if (view === 'characters') {
      const clip = q.get('clip') ?? 'idle';
      st.upsertActor({ id: 'alrashed', kind: 'robot', pos: [0, 0, 0], rotY: 0, clip: clip as RobotClip, clipStart: performance.now() });
      KINDS.forEach((k, i) =>
        st.upsertActor({ id: `p${i}`, kind: k, pos: [(i + 1) * 1.1 - 0.2, 0, 0], rotY: 0, clip: clip as HumanClip, clipStart: performance.now() }),
      );
    } else if (view === 'props') {
      ALL_PROPS.forEach((k, i) =>
        st.upsertProp({ id: `prop${i}`, kind: k, pos: [(i % 8) * 3 - 10.5, 0, Math.floor(i / 8) * 3 - 6], params: k === 'speechBubbleIcon' ? { icon: 'check' } : {} }),
      );
    } else if (view in LOCATIONS) {
      const id = view as LocationId;
      const r = robotSpot(id);
      st.upsertActor({ id: 'alrashed', kind: 'robot', pos: r.pos, rotY: r.rotY, visible: q.get('norobot') !== '1' });
    }
  }, [view]);
  return null;
}

export default function Viewer() {
  const view = q.get('view')!;
  const loc = view in LOCATIONS ? LOCATIONS[view as LocationId] : null;
  const indoor = loc?.kind === 'inside';
  const cam = useMemo(() => {
    if (loc) {
      const s = cameraSpot(loc.id);
      const o = loc.origin;
      const lc = num3(q.get('lcam'));
      const ll = num3(q.get('llook'));
      const pos = num3(q.get('cam')) ?? (lc ? ([o[0] + lc[0], o[1] + lc[1], o[2] + lc[2]] as Vec3) : s.pos);
      const look = num3(q.get('look')) ?? (ll ? ([o[0] + ll[0], o[1] + ll[1], o[2] + ll[2]] as Vec3) : s.look);
      return { pos, look, fov: s.fov };
    }
    if (view === 'overview') return { pos: (num3(q.get('cam')) ?? [0, 140, 90]) as Vec3, look: (num3(q.get('look')) ?? [0, 0, -15]) as Vec3, fov: 50 };
    if (view === 'props') return { pos: [0, 9, 14] as Vec3, look: [0, 0, -1] as Vec3, fov: 50 };
    return { pos: (num3(q.get('cam')) ?? [6, 1.7, 9.5]) as Vec3, look: (num3(q.get('look')) ?? [6, 0.9, 0]) as Vec3, fov: 50 };
  }, [loc, view]);

  const Room = loc && indoor ? ROOM_SETS[loc.id as keyof typeof ROOM_SETS] : undefined;
  const actors = useStage((s) => s.actors);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <Canvas shadows dpr={1} camera={{ position: cam.pos, fov: cam.fov, near: 0.05, far: 600 }} gl={{ preserveDrawingBuffer: true }}>
        <Setup />
        <ReadySignal />
        <Lighting indoor={!!indoor} />
        <WeatherSystem indoor={!!indoor} />
        {loc && indoor && Room ? (
          <group position={loc.origin}>
            <Room />
          </group>
        ) : null}
        {(loc && !indoor) || view === 'overview' ? OUTDOOR_PARTS.map((P, i) => <P key={i} />) : null}
        {(loc && !indoor) || view === 'overview' ? <AmbientTraffic /> : null}
        {(view === 'characters' || view === 'props') && (
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#d9cdb8" />
          </mesh>
        )}
        {view === 'props' &&
          ALL_HOLD.map((h, i) => (
            <group key={h} position={[(i % 8) * 1.2 - 4.2, 1, 6 + Math.floor(i / 8) * 1.2]}>
              <HoldItemMesh item={h} />
            </group>
          ))}
        {Object.values(actors).map((a) => (a.kind === 'robot' ? <Robot key={a.id} actorId={a.id} /> : <Human key={a.id} actorId={a.id} />))}
        <PropLayer />
        <OrbitControls target={cam.look} makeDefault />
      </Canvas>
      <div style={{ position: 'fixed', top: 8, left: 8, color: '#fff', font: '12px monospace', background: 'rgba(0,0,0,.4)', padding: 4 }}>
        {view}
      </div>
    </div>
  );
}
