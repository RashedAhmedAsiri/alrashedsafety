// OWNER: props worker. Background cars on the main street (and the side road) that follow each other,
// slow for the crossing hump, wait at the signal and yield to people and parked/scripted cars on the road.
// Keep the export. Controls for cutscenes (stage flags): `traffic: 'off'` (MainApp unmounts us), `trafficSlow`: number
// 0..1 speed multiplier (0 = everything stops where it is).
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { groundHeight, SIDE_ROAD_X } from '../core/ground';
import { useStage } from '../core/stage';
import { useApp } from '../core/store';
import { CarModel, CAR_COLORS } from './car';
import { CAR_SPECS, carType } from './points';
import { rng } from './geo';
import { SIGNAL as SIGNAL_LAYOUT } from '../world/outside/street/layout';

type Lights = 'off' | 'head' | 'brake';

interface Lane {
  id: 'east' | 'west' | 'side';
  x0: number;
  z0: number;
  dx: number;
  dz: number;
  len: number;
}

const LANES: Record<Lane['id'], Lane> = {
  east: { id: 'east', x0: -140, z0: 1.75, dx: 1, dz: 0, len: 280 },
  west: { id: 'west', x0: 140, z0: -1.75, dx: -1, dz: 0, len: 280 },
  // side road at x = -14: northbound lane is the east half (x = -12.25)
  side: { id: 'side', x0: SIDE_ROAD_X + 1.75, z0: 44, dx: 0, dz: -1, len: 36 },
};

interface Sim {
  i: number;
  lane: Lane['id'];
  s: number;
  v: number;
  v0: number;
  L: number;
  wb: number;
  seed: number;
  color: string;
  wait: number; // seconds until (re)spawn, > 0 means hidden
  turn: number; // -1 none, else 0..1 while turning from the side road
  accel: number;
  lights: Lights;
}

const SIGNAL = { cycle: 44, green: 26, yellow: 3 };
// car FRONT stops just before the painted lines (west-bound -61.5 east of the crosswalk, east-bound -76.5)
const STOP_LINE = { east: SIGNAL_LAYOUT.stop.eastbound - 0.3, west: SIGNAL_LAYOUT.stop.westbound + 0.3 };
const HUMP = 3.5;
const T_HEAD = 1.3;
const MIN_GAP = 2.6;
const A_MAX = 2.0;
const B_COMF = 2.8;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function signalPhase(t: number): 'green' | 'yellow' | 'red' {
  const k = t % SIGNAL.cycle;
  if (k < SIGNAL.green) return 'green';
  if (k < SIGNAL.green + SIGNAL.yellow) return 'yellow';
  return 'red';
}

function makeCars(quality: 'low' | 'medium' | 'high'): Sim[] {
  const perLane = quality === 'low' ? 2 : quality === 'medium' ? 3 : 4;
  const side = quality === 'low' ? 0 : quality === 'medium' ? 1 : 2;
  const r = rng(2024);
  const out: Sim[] = [];
  let n = 0;
  const add = (lane: Lane['id'], s: number, wait = 0) => {
    const seed = 3 + n * 2 + Math.floor(r() * 3);
    const type = carType(seed);
    const spec = CAR_SPECS[type];
    out.push({
      i: n++,
      lane,
      s,
      v: wait > 0 ? 0 : 7 + r() * 4,
      v0: 8.5 + r() * 4.5,
      L: spec.L,
      wb: spec.wheelX[0] - spec.wheelX[1],
      seed,
      color: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)],
      wait,
      turn: -1,
      accel: 0,
      lights: 'off',
    });
  };
  for (const lane of ['east', 'west'] as const) {
    const spacing = LANES[lane].len / perLane;
    for (let k = 0; k < perLane; k++) add(lane, k * spacing + r() * spacing * 0.5);
  }
  for (let k = 0; k < side; k++) add('side', 2 + k * 18, k * 7);
  return out;
}

const _v = new THREE.Vector3();

export function AmbientTraffic({ enabled = true }: { enabled?: boolean }) {
  const quality = useApp((s) => s.settings.quality);
  const weather = useApp((s) => s.weather);
  const location = useApp((s) => s.location);
  const cars = useMemo(() => makeCars(quality), [quality]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  if (import.meta.env.DEV) (window as unknown as { __traffic?: Sim[] }).__traffic = cars;
  const [modes, setModes] = useState<Lights[]>(() => cars.map(() => 'off'));
  const modesRef = useRef<Lights[]>(modes);
  const clock = useRef(0);
  const weatherRef = useRef(weather);
  weatherRef.current = weather;
  const locRef = useRef(location);
  locRef.current = location;

  useEffect(() => {
    setModes(cars.map(() => 'off'));
    modesRef.current = cars.map(() => 'off');
  }, [cars]);

  useFrame((_, dtRaw) => {
    if (!enabled) return;
    const dt = Math.min(dtRaw, 0.05);
    const st = useStage.getState();
    const slow = typeof st.flags.trafficSlow === 'number' ? Math.max(0, Math.min(1, st.flags.trafficSlow)) : 1;
    clock.current += dt;
    const w = weatherRef.current;
    const speedK = (w === 'wet' || w === 'rain' ? 0.8 : w === 'dust' ? 0.85 : 1) * slow;
    const phase = signalPhase(clock.current);
    // lamps follow the same cycle the cars obey: cars red -> pedestrians green (flashing for the last 4 s)
    {
      const k = clock.current % SIGNAL.cycle;
      const redT = k - SIGNAL.green - SIGNAL.yellow;
      const ped = phase !== 'red' || redT < 1.5 ? 'red' : redT > SIGNAL.cycle - SIGNAL.green - SIGNAL.yellow - 4 ? 'greenFlash' : 'green';
      if (st.flags.carLight !== phase) st.setFlag('carLight', phase);
      if (st.flags.pedLight !== ped) st.setFlag('pedLight', ped);
    }
    const noSide = locRef.current === 'flood_dip';

    // obstacles on the carriageway: people and scripted vehicles
    const obst: { x: number; z: number; r: number }[] = [];
    for (const a of Object.values(st.actors)) {
      if (!a.visible) continue;
      if (Math.abs(a.pos[2]) < 3.2 && Math.abs(a.pos[0]) < 140) obst.push({ x: a.pos[0], z: a.pos[2], r: 1.1 });
    }
    for (const p of Object.values(st.props)) {
      if (!p.visible) continue;
      if (p.kind === 'car') obst.push({ x: p.pos[0], z: p.pos[2], r: 2.4 });
      else if (p.kind === 'bus') obst.push({ x: p.pos[0], z: p.pos[2], r: 5.5 });
      else if (p.kind === 'cone' || p.kind === 'ballCart') obst.push({ x: p.pos[0], z: p.pos[2], r: 0.6 });
    }

    // group cars per lane (sorted by s) to find leaders
    const byLane: Record<Lane['id'], Sim[]> = { east: [], west: [], side: [] };
    for (const c of cars) if (c.wait <= 0 && c.turn < 0) byLane[c.lane].push(c);
    for (const k of ['east', 'west', 'side'] as const) byLane[k].sort((a, b) => a.s - b.s);

    for (const c of cars) {
      const g = groups.current[c.i];
      if (c.wait > 0) {
        c.wait -= dt;
        if (g) g.visible = false;
        if (c.wait <= 0) {
          // respawn at the start of its lane, only if the entrance is free
          const lane = byLane[c.lane];
          if (c.lane === 'side' && noSide) c.wait = 3;
          else if (lane.length && lane[0].s < 14) c.wait = 0.8;
          else {
            c.s = 0;
            c.v = c.lane === 'side' ? 4 : 8;
            c.turn = -1;
            lane.unshift(c);
          }
        }
        continue;
      }
      const lane = LANES[c.lane];

      if (c.turn >= 0) {
        // right turn from the side road onto the eastbound lane (quadratic curve)
        c.turn += (dt * 3.4) / 11;
        const t = Math.min(1, c.turn);
        const p0x = lane.x0;
        const p0z = 8.4;
        const p2x = lane.x0 + 4.2;
        const p2z = LANES.east.z0;
        const p1x = p0x;
        const p1z = p2z;
        const mt = 1 - t;
        const x = mt * mt * p0x + 2 * mt * t * p1x + t * t * p2x;
        const z = mt * mt * p0z + 2 * mt * t * p1z + t * t * p2z;
        const tx = 2 * mt * (p1x - p0x) + 2 * t * (p2x - p1x);
        const tz = 2 * mt * (p1z - p0z) + 2 * t * (p2z - p1z);
        if (g) {
          g.visible = true;
          g.position.set(x, groundHeight(x, z), z);
          g.rotation.set(0, Math.atan2(-tz, tx), 0);
        }
        c.lights = 'off';
        if (t >= 1) {
          c.lane = 'east';
          c.s = p2x - LANES.east.x0;
          c.v = 3.4;
          c.turn = -1;
        }
        continue;
      }

      // leader
      const list = byLane[c.lane];
      const idx = list.indexOf(c);
      let gap = 1e4;
      let vl = c.v;
      const next = list[idx + 1];
      if (next) {
        gap = next.s - c.s - (c.L + next.L) / 2;
        vl = next.v;
      }
      const px = lane.x0 + lane.dx * c.s;
      const pz = lane.z0 + lane.dz * c.s;
      const front = c.s + c.L / 2;
      // people / scripted vehicles ahead in this lane
      for (const o of obst) {
        const ox = (o.x - lane.x0) * lane.dx + (o.z - lane.z0) * lane.dz;
        const lat = Math.abs((o.x - lane.x0) * -lane.dz + (o.z - lane.z0) * lane.dx);
        if (lat < 1.35 + o.r * 0.4 && ox > c.s) {
          const gg = ox - o.r - front;
          if (gg < gap) {
            gap = gg;
            vl = 0;
          }
        }
      }
      // signal (main street) / junction (side road)
      if (c.lane !== 'side') {
        const lineAlong = c.lane === 'east' ? STOP_LINE.east - lane.x0 : lane.x0 - STOP_LINE.west;
        const dist = lineAlong - front;
        if (phase !== 'green' && dist > -0.2) {
          const mustStop = phase === 'red' || dist > (c.v * c.v) / (2 * 3.5) + 1;
          if (mustStop && dist < gap) {
            gap = Math.max(0.01, dist);
            vl = 0;
          }
        }
      } else {
        const dist = lane.len - front;
        const mergeS = LANES.side.x0 + 4.2 - LANES.east.x0;
        const clear =
          !byLane.east.some((e) => e.s > mergeS - 45 && e.s < mergeS + 12) &&
          !obst.some((o) => Math.abs(o.z) < 3.2 && o.x > -30 && o.x < 2) &&
          phase !== 'yellow';
        if (!clear) {
          if (dist < gap) {
            gap = Math.max(0.01, dist);
            vl = 0;
          }
        } else if (dist < 2.5) {
          c.turn = 0;
          continue;
        }
      }
      // crossing hump cap
      const x = px;
      const ax = Math.abs(x);
      const cap = c.lane === 'side' ? 6 : 3.8 + (c.v0 - 3.8) * smooth(HUMP + 2, HUMP + 22, ax);
      const v0 = Math.min(c.v0 * speedK, Math.max(1.5, cap * (speedK > 0 ? 1 : 0)));
      // slow in the flood dip / on the side road
      const vTarget = speedK <= 0.001 ? 0 : v0;
      const dv = c.v - vl;
      const sStar = MIN_GAP + Math.max(0, c.v * T_HEAD + (c.v * dv) / (2 * Math.sqrt(A_MAX * B_COMF)));
      let acc = A_MAX * (1 - Math.pow(c.v / Math.max(0.1, vTarget), 4) - Math.pow(sStar / Math.max(0.05, gap), 2));
      if (vTarget === 0) acc = -4;
      acc = Math.max(-7, acc);
      c.accel = acc;
      c.v = Math.max(0, c.v + acc * dt);
      if (c.v < 0.02 && acc < 0) c.v = 0;
      c.s += c.v * dt;
      if (c.s > lane.len && c.lane !== 'side') {
        c.wait = 2 + (c.i % 3) * 2;
        c.s = 0;
        if (g) g.visible = false;
        continue;
      }
      // lights
      const braking = c.accel < -1.0 || (c.v < 0.4 && gap < 12);
      const wantLights: Lights = braking ? 'brake' : w === 'dust' ? 'head' : 'off';
      c.lights = wantLights;

      // place
      const hF = groundHeight(lane.x0 + lane.dx * (c.s + c.wb / 2), lane.z0 + lane.dz * (c.s + c.wb / 2));
      const hR = groundHeight(lane.x0 + lane.dx * (c.s - c.wb / 2), lane.z0 + lane.dz * (c.s - c.wb / 2));
      if (g) {
        g.visible = c.s > 0.2 || c.lane === 'side';
        g.position.set(lane.x0 + lane.dx * c.s, (hF + hR) / 2, lane.z0 + lane.dz * c.s);
        g.rotation.set(0, Math.atan2(-lane.dz, lane.dx), Math.atan2(hF - hR, c.wb));
      }
    }

    // push light changes to React (rare)
    let changed = false;
    const next = modesRef.current.slice();
    for (const c of cars) {
      let m: Lights = c.lights;
      if (m === 'off' && w === 'dust') m = 'head';
      if (next[c.i] !== m) {
        next[c.i] = m;
        changed = true;
      }
    }
    if (changed) {
      modesRef.current = next;
      setModes(next);
    }
    void _v;
  });

  if (!enabled) return null;
  const rain = weather === 'rain';
  return (
    <group>
      {cars.map((c) => (
        <group
          key={c.i}
          ref={(g) => {
            groups.current[c.i] = g;
            if (g && c.wait > 0) g.visible = false;
          }}
        >
          <CarModel color={c.color} seed={c.seed} lights={modes[c.i] ?? 'off'} wipers={rain} />
        </group>
      ))}
    </group>
  );
}
