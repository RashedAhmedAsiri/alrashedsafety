// OWNER: props worker. Renders every prop in the stage store by kind. Keep the export exactly.
// The list of props (id + kind) is the only subscription of the layer; each prop copies its position, rotation,
// scale and visibility from the store inside useFrame, and re-renders only when its params change.
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useStage } from '../core/stage';
import { useApp } from '../core/store';
import type { PropKind } from '../core/types';
import { CarModel } from './car';
import { BusModel } from './bus';
import { KIND_RENDERERS, type P } from './kinds';

const EMPTY: P = {};

function CarProp({ p }: { p: P }) {
  const weather = useApp((s) => s.weather);
  const lights = (p.lights as 'off' | 'head' | 'reverse' | 'brake' | undefined) ?? (weather === 'dust' ? 'head' : 'off');
  const wipers = typeof p.wipers === 'boolean' ? p.wipers : weather === 'rain';
  return (
    <CarModel
      color={p.color as string | undefined}
      lights={lights}
      wipers={wipers}
      driver={p.driver === true}
      seed={typeof p.seed === 'number' ? p.seed : 0}
      body={p.body as never}
      doors={(p.doors as never) ?? {}}
    />
  );
}

function BusProp({ p }: { p: P }) {
  const weather = useApp((s) => s.weather);
  return (
    <BusModel
      door={p.door === 'open' ? 'open' : 'closed'}
      stopArm={p.stopArm === true}
      interior={p.interior !== false}
      lights={typeof p.lights === 'boolean' ? p.lights : weather === 'dust'}
      openWindow={p.openWindow as never}
    />
  );
}

const Shell = memo(function Shell({ id, kind }: { id: string; kind: PropKind }) {
  const g = useRef<THREE.Group>(null);
  const raw = useStage((s) => s.props[id]?.params) ?? EMPTY;
  // cutscenes patch params with set({ params: {...} }): keep earlier keys (colour, seed) unless overridden
  const acc = useRef<P>({});
  const last = useRef<P | null>(null);
  if (last.current !== raw) {
    last.current = raw;
    acc.current = { ...acc.current, ...raw };
  }
  const params = acc.current;
  useFrame(() => {
    const o = g.current;
    if (!o) return;
    const s = useStage.getState().props[id];
    if (!s) {
      o.visible = false;
      return;
    }
    o.visible = s.visible && s.scale > 0.0001;
    o.position.set(s.pos[0], s.pos[1], s.pos[2]);
    o.rotation.y = s.rotY;
    const k = s.scale;
    o.scale.set(k, k, k);
  });
  let body: React.ReactNode = null;
  if (kind === 'car') body = <CarProp p={params} />;
  else if (kind === 'bus') body = <BusProp p={params} />;
  else {
    const R = KIND_RENDERERS[kind];
    if (R) body = <R p={params} />;
  }
  return <group ref={g}>{body}</group>;
});

export function PropLayer() {
  // Subscribe to the list only: a string of ids and kinds changes when props are added, removed or re-kinded.
  const key = useStage((s) => {
    let out = '';
    for (const id in s.props) out += `${id}\u0001${s.props[id].kind}\u0002`;
    return out;
  });
  const list = useMemo(
    () =>
      key
        .split('\u0002')
        .filter(Boolean)
        .map((e) => {
          const [id, kind] = e.split('\u0001');
          return { id, kind: kind as PropKind };
        }),
    [key],
  );
  return (
    <>
      {list.map((e) => (
        <Shell key={e.id} id={e.id} kind={e.kind} />
      ))}
    </>
  );
}
