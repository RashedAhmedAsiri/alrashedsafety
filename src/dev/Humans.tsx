// OWNER: humans worker. Preview of people: ?dev=Humans&set=boys|adults|flags|crowd|heights|clips&cam=x,y,z&look=x,y,z&clip=<clip>
import type React from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Human, StaticPerson, Crowd } from '../characters/Human';
import { Robot } from '../characters/Robot';
import { useStage } from '../core/stage';
import type { CharacterKind, HumanClip, Vec3 } from '../core/types';

const q = new URLSearchParams(location.search);
const num3 = (s: string | null, d: Vec3): Vec3 => {
  const v = s?.split(',').map(Number);
  return v && v.length === 3 && v.every(Number.isFinite) ? (v as Vec3) : d;
};
const set = q.get('set') ?? 'boys';
const clip = (q.get('clip') ?? 'idle') as HumanClip;

const ADULTS: CharacterKind[] = ['teacher', 'counselor', 'guard', 'organizer', 'cleaner', 'stranger', 'parent'];

function Ready() {
  const { gl } = useThree();
  useEffect(() => {
    let n = 0;
    let raf = 0;
    const tick = () => {
      if (++n > 40) {
        (window as any).__ready = true;
        const el = document.getElementById('info');
        if (el) el.textContent = `calls ${gl.info.render.calls} tris ${gl.info.render.triangles}`;
      } else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gl]);
  return null;
}

function Scene() {
  useEffect(() => {
    const st = useStage.getState();
    st.upsertActor({ id: 'alrashed', kind: 'robot', pos: [-1.2, 0, 0], rotY: 0 });
    if (set === 'actor') {
      st.upsertActor({ id: 's3', kind: 'boy', pos: [0, 0, 0], rotY: 0, clip: 'idle', hold: 'umbrellaClosed', lookAt: [2, 1.2, 3] });
    }
  }, []);
  const out: React.ReactElement[] = [];
  if (set === 'boys') {
    for (let i = 0; i < 16; i++) out.push(<StaticPerson key={i} seed={i + 1} position={[(i % 8) * 0.9, 0, -Math.floor(i / 8) * 1.1]} clip={clip} />);
  } else if (set === 'heights') {
    (['small', 'medium', 'tall'] as const).forEach((h, i) => out.push(<StaticPerson key={h} seed={i + 4} spec={{ height: h }} position={[i * 0.8 + 0.3, 0, 0]} clip="idle" />));
    out.push(<StaticPerson key="t" kind="teacher" position={[3, 0, 0]} />);
    out.push(<StaticPerson key="g" kind="guard" position={[3.8, 0, 0]} />);
  } else if (set === 'adults') {
    ADULTS.forEach((k, i) => out.push(<StaticPerson key={k} kind={k} seed={i} position={[i * 1.0, 0, 0]} clip={k === 'cleaner' ? 'mop' : k === 'parent' ? 'drive' : clip} hold={k === 'cleaner' ? 'mop' : null} flags={k === 'parent' ? { seated: true } : undefined} />));
  } else if (set === 'flags') {
    const F: Record<string, boolean | number | string>[] = [{ seated: true, inBus: true, seatbelt: true }, { collarUp: true }, { umbrellaOpen: true }, { scrape: true }, { bandage: true }, { nosebleed: true }, { goggles: true, gloves: true }, { backpack: false }];
    F.forEach((f, i) => out.push(<StaticPerson key={i} seed={i + 2} position={[i * 0.9, 0, 0]} clip={i === 0 ? 'buckle' : 'idle'} flags={f} />));
  } else if (set === 'crowd') {
    const people = [];
    for (let i = 0; i < 40; i++) {
      const clips: HumanClip[] = ['idle', 'talk', 'laugh', 'cheer', 'wave', 'walk', 'clap', 'raiseHand'];
      const c = clips[i % clips.length];
      const x = (i % 10) * 1.5 - 6;
      const z = -Math.floor(i / 10) * 2;
      people.push(
        c === 'walk'
          ? { seed: i, kind: (i % 9 === 0 ? 'teacher' : 'boy') as CharacterKind, position: [x, 0, z] as Vec3, path: [[x, 0, z], [x + 3, 0, z], [x + 3, 0, z + 1.5], [x, 0, z + 1.5]] as Vec3[], speed: 1.3 }
          : { seed: i, position: [x, 0, z] as Vec3, rotY: (i % 5) * 0.3, clip: c },
      );
    }
    out.push(<Crowd key="c" people={people} />);
  } else if (set === 'actor') {
    out.push(<Human key="h" actorId="s3" />);
  }
  return <>{out}</>;
}

export default function HumansDev() {
  const cam = num3(q.get('cam'), [3, 1.5, 6]);
  const look = num3(q.get('look'), [3, 0.9, 0]);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <Canvas shadows dpr={1} camera={{ position: cam, fov: Number(q.get('fov') ?? 45), near: 0.05, far: 300 }} gl={{ preserveDrawingBuffer: true }}>
        <Ready />
        <color attach="background" args={['#a9d4f5']} />
        <hemisphereLight args={['#ffffff', '#b8aa90', 1.1]} />
        <directionalLight position={[4, 8, 6]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#d9cdb8" />
        </mesh>
        {q.get('robot') !== '0' && <Robot />}
        <Scene />
        <OrbitControls target={look} makeDefault />
      </Canvas>
      <div id="info" style={{ position: 'fixed', top: 6, left: 6, color: '#fff', font: '12px monospace', background: 'rgba(0,0,0,.5)', padding: 3 }} />
    </div>
  );
}
