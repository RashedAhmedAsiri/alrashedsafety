/**
 * Main staircase: 8 x 10 m room, 8 m high (ground floor y 0, first floor y 4). Local x -4..4, z -5..5.
 * Flight 1 (x -3.9..-1.3) climbs north from z 0.1 to the landing (y 2, z -3.2..-5); flight 2 (x -1.1..1.5)
 * climbs south from the landing to the first floor at z 0.1 (y 4). 12 steps each. East of flight 2 is a solid wall mass.
 * The doorway to the corridor is on the south wall at x -0.2 (ground floor y 0, first floor y 4); the lift is at x -3.2.
 */
import { PAL } from '../../kit';
import type { Batch } from './batch';
import {
  AlarmBeacon,
  ElevatorCross,
  StaticRoom,
  TileFloor,
  WindowView,
  blob,
  ceiling,
  lightPanel,
  useRoomFlags,
  walls,
  windowFrame,
  type Kit4,
} from './common';
import { alarmButton, elevatorDoor, emergencyLamp, exitSign, potPlant, tube } from './parts';
import { drawEvacMap, drawKeepRight, drawPoster, drawSafetyRules } from './pictos';
import { STAIR } from './landmarks';

const W = 8;
const D = 10;
const H = 8;
const SLAB = 3.7;
const STEPS = 12;
const RISE = STAIR.riser;
const RUN = (STAIR.flight1.zBottom - STAIR.flight1.zTop) / STEPS;
const STEP_COL = '#D9CEBA';
const RISER_COL = '#C3B69E';
const RAIL = '#2D8CFF';
const POST = '#8E99A8';

/** One flight: steps are solid blocks from the floor; `dir` = -1 climbs north (z decreasing), +1 climbs south. */
function flight(s: Batch, x0: number, x1: number, zStart: number, y0: number, dir: 1 | -1) {
  const cx = (x0 + x1) / 2;
  const w = x1 - x0;
  for (let i = 0; i < STEPS; i++) {
    const zf = zStart + dir * i * RUN; // nosing (front) edge of step i
    const top = y0 + (i + 1) * RISE;
    const zc = zf + dir * (RUN / 2);
    s.box([cx, top / 2, zc], [w, top, RUN], STEP_COL);
    // darker riser face and yellow strip on the tread edge
    s.box([cx, top - RISE / 2, zf - dir * 0.002], [w, RISE, 0.004], RISER_COL);
    s.box([cx, top + 0.002, zf + dir * 0.04], [w, 0.008, 0.08], PAL.yellow);
  }
}

/** Handrails at child height (top 0.75 above the nosing line) on one side of a flight. */
function rails(s: Batch, x: number, zStart: number, y0: number, dir: 1 | -1) {
  const zEnd = zStart + dir * (STEPS - 1) * RUN;
  const yA = y0 + RISE;
  const yB = y0 + STEPS * RISE;
  tube(s, [x, yA + 0.75, zStart + dir * 0.0], [x, yB + 0.75, zEnd], 0.05, RAIL);
  tube(s, [x, yA + 0.38, zStart], [x, yB + 0.38, zEnd], 0.03, POST);
  for (let i = 0; i < STEPS; i += 3) {
    const zz = zStart + dir * i * RUN;
    const yy = y0 + (i + 1) * RISE;
    s.cyl([x, yy + 0.375, zz], [0.035, 0.75, 0.035], POST, undefined, true);
  }
  // end posts
  s.cyl([x, yB + 0.375, zEnd], [0.045, 0.75, 0.045], POST, undefined, true);
  // rounded end caps
  s.ball([x, yA + 0.75, zStart], [0.07, 0.07, 0.07], RAIL, undefined, true);
  s.ball([x, yB + 0.75, zEnd], [0.07, 0.07, 0.07], RAIL, undefined, true);
}

function buildStairs(k: Kit4) {
  const { s, e } = k;
  const f1 = STAIR.flight1;
  const f2 = STAIR.flight2;
  const L = STAIR.landing;
  const door = -0.2;
  walls(
    s,
    W,
    D,
    H,
    [
      { wall: 's', at: door, width: 2.4, height: 2.6 },
      { wall: 's', at: door, width: 2.4, height: 2.6, sill: 4 },
      { wall: 'n', at: -1.2, width: 2.4, height: 1.5, sill: 2.65 },
      { wall: 'n', at: -1.2, width: 2.4, height: 1.5, sill: 5.9 },
      { wall: 'w', at: 2.4, width: 1.8, height: 1.4, sill: 1.2 },
      { wall: 'w', at: 2.4, width: 1.8, height: 1.4, sill: 5.3 },
    ],
    { low: '#DCEFE9', rail: PAL.teal, lowH: 1.1 },
  );
  ceiling(k, W, D, H);
  // first-floor wall band (the walls() band only covers the ground floor)
  const band = (p: [number, number, number], sz: [number, number, number]) => {
    s.box(p, sz, '#DCEFE9');
  };
  band([0, 4.55, -D / 2 + 0.006], [W, 1.1, 0.012]);
  band([-W / 2 + 0.006, 4.55, 0], [0.012, 1.1, D]);
  band([W / 2 - 0.006, 4.55, 0.0], [0.012, 1.1, D]);
  band([-2.7, 4.55, D / 2 - 0.006], [2.6, 1.1, 0.012]);
  band([2.6, 4.55, D / 2 - 0.006], [3.6, 1.1, 0.012]);
  s.box([0, 5.12, -D / 2 + 0.014], [W, 0.07, 0.028], PAL.amber);
  s.box([-W / 2 + 0.014, 5.12, 0], [0.028, 0.07, D], PAL.amber);
  s.box([-2.7, 5.12, D / 2 - 0.014], [2.6, 0.07, 0.028], PAL.amber);
  s.box([2.6, 5.12, D / 2 - 0.014], [3.6, 0.07, 0.028], PAL.amber);

  // ---- floors: first-floor slab with its underside, east wall mass
  s.box([0, (SLAB + 4) / 2, 2.55], [W, 4 - SLAB, 4.9], '#EDE6D6');
  k.c.quad([0, SLAB - 0.004, 2.55], [W, 4.9], '#FBF8F2', [Math.PI / 2, 0, 0]);
  s.box([0, 3.85, 0.1], [W, 0.3, 0.012], '#DCD1BD'); // slab edge face band
  s.box([(1.5 + 4) / 2, 4, (-5 + 0.1) / 2], [2.5, 8, 5.1], '#F0E7D6'); // wall mass east of flight 2

  // ---- the two flights, landing and inner partition
  flight(s, f1.x0, f1.x1, f1.zBottom, 0, -1);
  flight(s, f2.x0, f2.x1, f2.zBottom, f1.yTop, 1);
  s.box([(L.x0 + L.x1) / 2, L.y / 2, (L.z0 + L.z1) / 2], [L.x1 - L.x0, L.y, L.z1 - L.z0], STEP_COL); // landing block
  s.box([(L.x0 + L.x1) / 2, L.y + 0.004, (L.z0 + L.z1) / 2], [L.x1 - L.x0, 0.008, L.z1 - L.z0], '#E4DACA');
  s.box([-1.2, 0.5, -1.55], [0.2, 1.0, 3.3], '#CFC4AE'); // partition between the flights (ground part)
  // yellow safety strips on the floor and on the landing edges
  s.quad([(f1.x0 + f1.x1) / 2, 0.005, f1.zBottom + 0.22], [f1.x1 - f1.x0, 0.28], PAL.yellow, [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 8; i++) s.quad([f1.x0 + 0.16 + i * 0.32, 0.006, f1.zBottom + 0.22], [0.14, 0.28], '#2B2F36', [-Math.PI / 2, 0, Math.PI / 4]);
  s.box([-1.2, L.y + 0.01, L.z1 - 0.1], [4.8, 0.012, 0.08], PAL.yellow);

  // ---- handrails (both sides of both flights; the wall rails are on the wall side)
  rails(s, f1.x0 + 0.04, f1.zBottom, 0, -1);
  rails(s, f1.x1 + 0.0, f1.zBottom, 0, -1);
  rails(s, f2.x0 - 0.02, f2.zBottom, f1.yTop, 1);
  rails(s, f2.x1 - 0.04, f2.zBottom, f1.yTop, 1);
  // slab-edge balustrade above flight 1 (first floor), glass-look panel + rails
  for (let x = f1.x0; x <= f1.x1 + 0.01; x += 0.5) s.cyl([x, 4.45, 0.12], [0.035, 0.9, 0.035], POST, undefined, true);
  tube(s, [f1.x0, 4.9, 0.12], [f1.x1 + 0.2, 4.9, 0.12], 0.05, RAIL);
  tube(s, [f1.x0, 4.45, 0.12], [f1.x1 + 0.2, 4.45, 0.12], 0.03, POST);
  tube(s, [f1.x0, 4.15, 0.12], [f1.x1 + 0.2, 4.15, 0.12], 0.03, POST);

  // ---- south wall: lift on both floors, exit signs, plants
  elevatorDoor(k, [-3.2, 0, D / 2], Math.PI);
  elevatorDoor(k, [-3.2, 4, D / 2], Math.PI);
  exitSign(k, [door, 2.95, D / 2 - 0.02], Math.PI, 0, 0.7);
  exitSign(k, [door, 6.95, D / 2 - 0.02], Math.PI, 0, 0.7);
  s.at([3.5, 0, 4.4], 0, () => potPlant(s, 1.5, '#E07A3F'));
  blob(k, 3.5, 4.4, 0.8, 0.8);
  s.at([-2.4, 4, 4.4], 0, () => potPlant(s, 1.3, '#14B8A6'));

  // ---- wall mass south face (ground): alarm button, keep-right, evac map; first floor copy of the signs
  alarmButton(k, [1.95, 1.4, 0.1], 0);
  s.sticker('stairs-keepright', [2.75, 1.65, 0.106], 0.5, 0.62, drawKeepRight, 0, 400);
  s.box([3.5, 1.65, 0.1], [0.56, 0.44, 0.02], '#1FAE5B');
  s.sticker('stairs-evac', [3.5, 1.65, 0.112], 0.52, 0.4, (ctx, w, h) => drawEvacMap(ctx, w, h, 4), 0, 420);
  s.sticker('stairs-rules', [0.2, 1.8, 0.108], 0.9, 1.2, drawSafetyRules, 0, 330);
  s.sticker('stairs-p1', [-0.66, 1.65, 0.108], 0.5, 0.66, (ctx, w, h) => drawPoster(ctx, w, h, 6), 0, 300);
  s.sticker('stairs-p2', [1.06, 1.65, 0.108], 0.5, 0.66, (ctx, w, h) => drawPoster(ctx, w, h, 4), 0, 300);
  s.sticker('stairs-keepright', [2.75, 5.65, 0.106], 0.5, 0.62, drawKeepRight, 0, 400);
  // keep-right arrows on the stair wall, and posters on the landing wall
  s.sticker('stairs-keepright', [-W / 2 + 0.01, 3.1, -1.3], 0.5, 0.62, drawKeepRight, Math.PI / 2, 400);
  s.sticker('stairs-p3', [-3.2, 3.25, -D / 2 + 0.012], 0.55, 0.72, (ctx, w, h) => drawPoster(ctx, w, h, 2), 0, 300);
  s.sticker('stairs-p4', [1.0, 3.25, -D / 2 + 0.012], 0.55, 0.72, (ctx, w, h) => drawPoster(ctx, w, h, 5), 0, 300);
  s.sticker('stairs-p5', [-3.2, 6.4, -D / 2 + 0.012], 0.55, 0.72, (ctx, w, h) => drawPoster(ctx, w, h, 7), 0, 300);
  s.sticker('stairs-p6', [1.0, 6.4, -D / 2 + 0.012], 0.55, 0.72, (ctx, w, h) => drawPoster(ctx, w, h, 0), 0, 300);

  // ---- windows frames
  s.at([-1.2, 3.4, -D / 2], 0, () => windowFrame(s, 2.4, 1.5, 1));
  s.at([-1.2, 6.65, -D / 2], 0, () => windowFrame(s, 2.4, 1.5, 1));
  s.at([-W / 2, 1.9, 2.4], Math.PI / 2, () => windowFrame(s, 1.8, 1.4, 1));
  s.at([-W / 2, 6.0, 2.4], Math.PI / 2, () => windowFrame(s, 1.8, 1.4, 1));

  // ---- green guide strips and emergency lamps
  e.box([door, 0.012, 3.0], [0.1, 0.012, 3.8], '#2BE07A');
  emergencyLamp(k, [-W / 2, 2.9, 0.3], Math.PI / 2);
  emergencyLamp(k, [-1.2, 5.2 + 3.0, -D / 2], 0);
  emergencyLamp(k, [-W / 2, 7.0, -2.5], Math.PI / 2);

  // ---- lights: under the slab, over the landing, pendants high up
  lightPanel(k, -2, SLAB, 2.5, 1.4, 0.7);
  lightPanel(k, 2, SLAB, 2.5, 1.4, 0.7);
  for (const [x, z] of [[-2.6, -1.5], [0.2, -3.4], [-1.0, 1.8]] as [number, number][]) {
    lightPanel(k, x, 6.9, z, 1.3, 0.4);
    s.cyl([x - 0.5, 7.45, z], [0.02, 1.1, 0.02], '#C9D1DA');
    s.cyl([x + 0.5, 7.45, z], [0.02, 1.1, 0.02], '#C9D1DA');
  }
  void f2;
}

export function Stairs() {
  const { flags } = useRoomFlags();
  const cross = flags.elevatorCross === true || flags.elevatorCross === 'true';
  return (
    <group>
      <TileFloor w={W + 0.4} d={D + 0.4} tile={0.6} base="#EFE8D8" lineColor="#DCD1BD" />
      <TileFloor w={W} d={4.9} p={[0, 4.003, 2.55]} tile={0.6} base="#E4EAF1" lineColor="#C9D3E0" />
      <StaticRoom id="stairs" build={buildStairs} />
      <ElevatorCross p={[-3.2, 1.15, D / 2 - 0.03]} rotY={Math.PI} show={cross} />
      <ElevatorCross p={[-3.2, 5.15, D / 2 - 0.03]} rotY={Math.PI} show={cross} />
      <AlarmBeacon p={[1.95, 2.45, 0.1]} />
      <WindowView p={[-1.2, 3.4, -D / 2]} w={2.4} h={1.5} view="back" depth={0.6} />
      <WindowView p={[-1.2, 6.65, -D / 2]} w={2.4} h={1.5} view="back" depth={0.6} />
      <WindowView p={[-W / 2, 1.9, 2.4]} rotY={Math.PI / 2} w={1.8} h={1.4} view="yard" depth={0.6} />
      <WindowView p={[-W / 2, 6.0, 2.4]} rotY={Math.PI / 2} w={1.8} h={1.4} view="yard" depth={0.6} />
    </group>
  );
}
