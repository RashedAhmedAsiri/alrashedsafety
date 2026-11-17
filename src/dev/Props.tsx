// OWNER: props worker. Preview of vehicles and props:
//   ?dev=Props&set=bus|cars|doors|holds|pick&cam=x,y,z&look=x,y,z[&door=open&arm=1&win=1]
//   set=pick&kinds=fire,smoke,...  shows only those prop kinds in a row (params via &p=<json>)
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { BusModel, CarModel } from '../props/models';
import { HoldItemMesh } from '../props/holdItems';
import { PropLayer } from '../props/PropLayer';
import { useStage } from '../core/stage';
import { StaticPerson } from '../characters/Human';
import { Robot } from '../characters/Robot';
import { BUS, busSeat } from '../props/points';
import type { HoldItem, PropKind, Vec3 } from '../core/types';

const q = new URLSearchParams(location.search);
const num3 = (s: string | null, d: Vec3): Vec3 => {
  const v = s?.split(',').map(Number);
  return v && v.length === 3 && v.every(Number.isFinite) ? (v as Vec3) : d;
};
const set = q.get('set') ?? 'bus';

function Ready() {
  const { gl } = useThree();
  useEffect(() => {
    let n = 0;
    let raf = 0;
    const tick = () => {
      if (++n > 45) {
        (window as any).__ready = true;
        const el = document.getElementById('info');
        if (el) el.textContent = `${set} calls ${gl.info.render.calls} tris ${gl.info.render.triangles}`;
      } else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gl]);
  return null;
}

const HOLDS: HoldItem[] = ['umbrella', 'umbrellaClosed', 'extinguisher', 'bandage', 'gauze', 'ball', 'scissors', 'waterBottle', 'sodaCan', 'clipboard', 'mask', 'backpack', 'pencil', 'brush', 'sandwich', 'mop'];

function DriverRobot() {
  useEffect(() => {
    useStage.getState().upsertActor({ id: 'alrashed', kind: 'robot', pos: [BUS.driver[0], BUS.driver[1], BUS.driver[2]], rotY: Math.PI / 2, clip: 'sitDrive', clipStart: performance.now(), flags: { seated: true, inBus: true, seatH: 0.42 } });
  }, []);
  return <Robot />;
}

function HoldRobot({ item, clip }: { item: HoldItem; clip: string }) {
  useEffect(() => {
    useStage.getState().upsertActor({ id: 'alrashed', kind: 'robot', pos: [0, 0, 0], rotY: 0, clip: clip as never, clipStart: performance.now(), hold: item });
  }, [item, clip]);
  return <Robot />;
}

function Scene() {
  useEffect(() => {
    if (set !== 'pick') return;
    const kinds = (q.get('kinds') ?? '').split(',').filter(Boolean) as PropKind[];
    const params = JSON.parse(q.get('p') ?? '{}');
    kinds.forEach((k, i) => useStage.getState().upsertProp({ id: `k${i}`, kind: k, pos: [i * Number(q.get('gap') ?? 1.5), 0, 0], params: params[k] ?? {}, scale: Number(q.get('scale') ?? 1) }));
  }, []);
  if (set === 'bus') {
    return (
      <>
        <BusModel door={q.get('door') === 'closed' ? 'closed' : 'open'} stopArm={q.get('arm') === '1'} interior lights={q.get('lights') === '1'} openWindow={q.get('win') ? [1, 1] : undefined} />
      </>
    );
  }
  if (set === 'busppl') {
    const rows: [number, -1 | 1, -1 | 0 | 1][] = [[0, -1, 0], [0, 1, -1], [0, 1, 1], [1, -1, -1], [1, 1, 0], [2, -1, 1], [3, 1, 0], [4, -1, 0]];
    return (
      <>
        <BusModel door={q.get('door') === 'closed' ? 'closed' : 'open'} stopArm={q.get('arm') === '1'} interior />
        {rows.map(([r, side, slot], i) => (
          <StaticPerson key={i} seed={20 + i} position={busSeat(r, side, slot)} rotY={Math.PI / 2} clip="sit" flags={{ seated: true, inBus: true, seatbelt: i % 2 === 0 }} />
        ))}
        <StaticPerson kind="boy" seed={90} position={[BUS.doorTop[0], BUS.doorTop[1], BUS.doorTop[2]]} rotY={Math.PI / 2} clip="idle" />
        <StaticPerson kind="boy" seed={91} position={[BUS.steps[1][0], BUS.steps[1][1], BUS.steps[1][2]]} rotY={Math.PI / 2} clip="idle" />
        <StaticPerson kind="teacher" seed={92} position={[3.5, 0.15, BUS.outZ]} rotY={Math.PI / 2} clip="idle" />
        <DriverRobot />
      </>
    );
  }
  if (set === 'cars') {
    const L = ['off', 'head', 'brake', 'reverse'] as const;
    return (
      <>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <group key={i} position={[(i % 4) * 5.6 - 8.4, 0, Math.floor(i / 4) * -3.6]}>
            <CarModel seed={i} lights={L[i % 4]} wipers={q.get('wipers') === '1'} driver={q.get('driver') === '1'} />
          </group>
        ))}
      </>
    );
  }
  if (set === 'doors') {
    return (
      <>
        {[0, 2, 5].map((s, i) => (
          <group key={s} position={[i * 5.8 - 5.8, 0, 0]}>
            <CarModel seed={s} driver doors={{ fr: 1, rr: 1, fl: 0.6, rl: 0 }} />
          </group>
        ))}
      </>
    );
  }
  if (set === 'holdppl') {
    return (
      <>
        {HOLDS.map((h, i) => (
          <StaticPerson key={h} kind={h === 'mop' ? 'cleaner' : 'boy'} seed={i + 3} position={[(i % 8) * 0.95 - 3.3, 0, -Math.floor(i / 8) * 1.4]} clip={h === 'mop' ? 'mop' : 'idle'} hold={h} />
        ))}
      </>
    );
  }
  if (set === 'holdbot') {
    return <HoldRobot item={(q.get('item') ?? 'extinguisher') as HoldItem} clip={q.get('clip') ?? 'extinguisher'} />;
  }
  if (set === 'holds') {
    return (
      <>
        {HOLDS.map((h, i) => (
          <group key={h} position={[(i % 8) * 0.6 - 2.1, 1.0 - Math.floor(i / 8) * 0.0, -Math.floor(i / 8) * 1.4]}>
            <HoldItemMesh item={h} />
            <mesh position={[0, 0, 0]} scale={[0.02, 0.02, 0.02]}>
              <sphereGeometry />
              <meshBasicMaterial color="red" />
            </mesh>
          </group>
        ))}
      </>
    );
  }
  return null;
}

export default function PropsDev() {
  const cam = num3(q.get('cam'), [10, 4, 12]);
  const look = num3(q.get('look'), [0, 1.2, 0]);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <Canvas shadows dpr={1} camera={{ position: cam, fov: Number(q.get('fov') ?? 45), near: 0.05, far: 300 }} gl={{ preserveDrawingBuffer: true }}>
        <Ready />
        <color attach="background" args={['#a9d4f5']} />
        <hemisphereLight args={['#ffffff', '#b8aa90', 1.1]} />
        <directionalLight position={[6, 9, 5]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color={q.get('ground') ?? '#8E9198'} />
        </mesh>
        <Scene />
        <PropLayer />
        <OrbitControls target={look} makeDefault />
      </Canvas>
      <div id="info" style={{ position: 'fixed', top: 6, left: 6, color: '#fff', font: '12px monospace', background: 'rgba(0,0,0,.5)', padding: 3 }} />
    </div>
  );
}
