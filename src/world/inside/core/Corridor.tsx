/**
 * The main corridors (ground floor and first floor): 60 m long, 5 m wide, 3.6 m high.
 * Local coordinates: x -30..30 (west to east), z -2.5..2.5 (north wall at -2.5, south wall at +2.5), floor y = 0.
 * North doors lead to rooms toward the back, south doors to rooms facing the yard. The stairs open on the north wall.
 */
import { PAL } from '../../kit';
import type { Batch } from './batch';
import {
  AlarmBeacon,
  ElevatorCross,
  StaticRoom,
  TileFloor,
  WindowView,
  behindDoor,
  blob,
  ceiling,
  doorParts,
  lightPanel,
  useRoomFlags,
  walls,
  windowFrame,
  type Hole,
  type Kit4,
} from './common';
import {
  EmergencyHalos,
  ExtinguisherInCabinet,
  WetFloorSet,
  alarmButton,
  bench,
  bin,
  elevatorDoor,
  emergencyLamp,
  exitSign,
  extinguisherCabinet,
  fountain,
  handSink,
  paperBin,
  potPlant,
  tube,
} from './parts';
import { drawArtBoard, drawDoorSign, drawEmblem, drawFloorArrow, drawFloorMedallion, drawKeepRight, drawPoster, fillRR, kidDrawing, text } from './pictos';
import { CORRIDOR, CORRIDOR_FIRST_DOORS, CORRIDOR_GROUND_DOORS, type CorridorDoor } from './landmarks';

const W = 60;
const D = 5;
const H = 3.6;
const HD = D / 2;

/** Stairs opening on the north wall, and the little stair hall behind it. */
const OPEN = { x0: 17.9, x1: 23.9 };
const OPEN_C = (OPEN.x0 + OPEN.x1) / 2;
const HALL = { depth: 9.4, bottomZ: -8.3, steps: 10, tread: 0.3, riser: 0.17 };

interface Fixture {
  x: number;
  side: 'n' | 's';
  half: number;
}

function sideZ(side: 'n' | 's') {
  return side === 'n' ? -HD : HD;
}
/** Run `fn` with the frame of a wall (origin on the floor at the wall face, +Z into the corridor). */
function onWall(b: Batch, side: 'n' | 's', x: number, y: number, fn: () => void) {
  b.at([x, y, sideZ(side)], side === 'n' ? 0 : Math.PI, fn);
}

/* ------------------------------------------------------------------ build */

function buildCorridor(k: Kit4, first: boolean) {
  const { s, g, e } = k;
  const doors: CorridorDoor[] = first ? CORRIDOR_FIRST_DOORS : CORRIDOR_GROUND_DOORS;
  const fx = first ? CORRIDOR.first : CORRIDOR.ground;
  const rail = first ? '#FFAA1F' : PAL.teal;
  const fixtures: Fixture[] = [];

  // ---- walls with holes
  const holes: Hole[] = doors.map((d) => ({ wall: d.side, at: d.x, width: d.width + 0.2, height: 2.3 }));
  holes.push({ wall: 'n', at: OPEN_C, width: OPEN.x1 - OPEN.x0, height: 2.9 });
  fixtures.push({ x: OPEN_C, side: 'n', half: 3.4 });
  if (first) {
    for (const wx of CORRIDOR.first.windows) {
      holes.push({ wall: 's', at: wx, width: 2.2, height: 1.4, sill: 1.0 });
      fixtures.push({ x: wx, side: 's', half: 1.4 });
    }
    holes.push({ wall: 'n', at: -18, width: 3.6, height: 1.5, sill: 1.0 });
    fixtures.push({ x: -18, side: 'n', half: 2.3 });
  } else {
    const lo = CORRIDOR.ground.lobbyOpening;
    holes.push({ wall: 's', at: (lo.x0 + lo.x1) / 2, width: lo.x1 - lo.x0, height: 2.9 });
    fixtures.push({ x: (lo.x0 + lo.x1) / 2, side: 's', half: 2.0 });
  }
  for (const d of doors) fixtures.push({ x: d.x, side: d.side, half: d.width / 2 + 1.0 });
  walls(s, W, D, H, holes, { low: first ? '#EAF0F7' : '#DCEFE9', rail, lowH: 1.1 });
  ceiling(k, W, D, H);
  // cornice
  s.box([0, H - 0.04, -HD + 0.03], [W, 0.08, 0.06], '#EFE6D6');
  s.box([0, H - 0.04, HD - 0.03], [W, 0.08, 0.06], '#EFE6D6');

  // ---- doors with sign plates
  for (const d of doors) {
    onWall(s, d.side, d.x, 0, () => {
      doorParts(s, d.width, 2.2, d.color, { double: d.double, glass: true });
      const sw = d.double ? 1.5 : 1.0;
      s.box([0, 2.62, 0.005], [sw + 0.1, 0.34, 0.02], '#FFFFFF');
      s.sticker(`door-${d.room}`, [0, 2.62, 0.02], sw, 0.3, (ctx, w, h) => drawDoorSign(ctx, w, h, d.name, d.num, d.color), 0, 420);
    });
  }

  // ---- end doors (painted), exit signs over them, plants beside them
  for (const sx of [-1, 1]) {
    s.at([sx * (W / 2), 0, 0], sx > 0 ? -Math.PI / 2 : Math.PI / 2, () => {
      doorParts(s, 2.2, 2.3, '#D4DBE3', { double: true, glass: true, frame: '#B9C3CF' });
      for (const i of [-1, 1]) s.box([i * 0.18, 1.0, 0.04], [0.04, 0.5, 0.04], PAL.metal);
      s.box([0, 0.5, 0.06], [2.0, 0.03, 0.02], '#F7C531');
      s.box([0, 1.5, 0.06], [2.0, 0.03, 0.02], '#F7C531');
    });
    exitSign(k, [sx * (W / 2 - 0.1), 2.85, 0], sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0.8);
    s.at([sx * (W / 2 - 0.5), 0, -1.85], 0, () => potPlant(s, 1.4, '#E07A3F'));
    s.at([sx * (W / 2 - 0.5), 0, 1.85], 0, () => potPlant(s, 1.1, '#2D8CFF'));
    blob(k, sx * (W / 2 - 0.5), -1.85, 0.8, 0.8);
    blob(k, sx * (W / 2 - 0.5), 1.85, 0.8, 0.8);
  }

  // ---- openings: lobby (ground) and the stairs hall
  if (!first) {
    const lo = CORRIDOR.ground.lobbyOpening;
    const cx = (lo.x0 + lo.x1) / 2;
    s.at([cx, 0, HD], Math.PI, () => {
      behindDoor(s, lo.x1 - lo.x0, 2.9, 3.4, '#F0E6D2');
      // the lobby seen through the opening: school sign, emblem and the floor medallion on the far wall / floor
      s.sticker('lobby-name', [0, 2.25, -3.43], 2.2, 0.38, (ctx, w, h) => {
        fillRR(ctx, 0, 0, w, h, h * 0.2, '#14B8A6');
        fillRR(ctx, h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12, h * 0.16, '#FFFFFF');
        text(ctx, 'مدرسة الراشد', w / 2, h * 0.54, h * 0.62, '#1F5E8C', 700, w * 0.8);
      }, 0, 260);
      s.sticker('lobby-emblem', [-1.3, 2.25, -3.43], 0.5, 0.5, drawEmblem, 0, 200);
      s.sticker('lobby-emblem', [1.3, 2.25, -3.43], 0.5, 0.5, drawEmblem, 0, 200);
      s.sticker('lobby-medallion', [0, 0.012, -2.2], 1.8, 1.8, drawFloorMedallion, [-Math.PI / 2, 0, 0], 120);
      s.rbox([-0.9, 0.45, -3.2], [0.5, 0.9, 0.3], '#E07A3F', 0.05); // plant pot in the lobby
      s.ball([-0.9, 1.2, -3.2], [0.7, 0.7, 0.7], '#3E9B4F');
    });
    exitSign(k, [cx, 3.05, HD - 0.02], Math.PI, 0, 0.7);
  }
  buildStairHall(k, first);

  // ---- window frames and views (first floor), sports-hall window onto the hall
  if (first) {
    for (const wx of CORRIDOR.first.windows) s.at([wx, 1.7, HD], Math.PI, () => windowFrame(s, 2.2, 1.4, 1));
    s.at([-18, 1.75, -HD], 0, () => windowFrame(s, 3.6, 1.5, 3));
  }

  // ---- floor: centre line (dashes), keep-right arrows
  for (let x = -29; x < 29; x += 1.2) s.quad([x, 0.004, 0], [0.7, 0.07], '#F7C531', [-Math.PI / 2, 0, 0]);
  for (let x = -26; x <= 26; x += 8) {
    s.at([x, 0.005, CORRIDOR.laneEastZ], -Math.PI / 2, () => s.sticker('floor-arrow', [0, 0, 0], 0.4, 0.85, (ctx, w, h) => drawFloorArrow(ctx, w, h), [-Math.PI / 2, 0, 0], 260));
    s.at([x + 4, 0.005, CORRIDOR.laneWestZ], Math.PI / 2, () => s.sticker('floor-arrow', [0, 0, 0], 0.4, 0.85, (ctx, w, h) => drawFloorArrow(ctx, w, h), [-Math.PI / 2, 0, 0], 260));
  }

  // ---- fire equipment (north wall, near the stairs)
  extinguisherCabinet(k, [fx.extinguisherCabinet[0], 0, -HD], 0);
  alarmButton(k, [fx.fireAlarmButton[0], fx.fireAlarmButton[1], -HD], 0);
  elevatorDoor(k, [fx.elevatorDoor[0], 0, -HD], 0);
  fixtures.push({ x: fx.extinguisherCabinet[0], side: 'n', half: 0.8 }, { x: fx.fireAlarmButton[0], side: 'n', half: 0.5 }, { x: fx.elevatorDoor[0], side: 'n', half: 1.6 });

  // ---- drinking fountain (+ hand sink on the ground floor)
  if (first) {
    onWall(s, 'n', fx.fountain[0], 0, () => fountain(s));
    blob(k, fx.fountain[0], -HD + 0.3, 1.0, 0.6);
    fixtures.push({ x: fx.fountain[0], side: 'n', half: 0.9 });
  } else {
    const gf = CORRIDOR.ground;
    onWall(s, 's', gf.fountain[0], 0, () => fountain(s));
    onWall(s, 's', gf.sink[0], 0, () => handSink(s));
    blob(k, gf.fountain[0], HD - 0.3, 1.0, 0.6);
    blob(k, gf.sink[0], HD - 0.3, 0.8, 0.6);
    fixtures.push({ x: gf.fountain[0], side: 's', half: 1.0 }, { x: gf.sink[0], side: 's', half: 0.8 });
    // paper bin (the bin fire happens here) + a blue recycling bin beside it
    s.at([gf.paperBin[0], 0, gf.paperBin[2]], 0, () => paperBin(s));
    blob(k, gf.paperBin[0], gf.paperBin[2], 0.55, 0.55);
    s.at([gf.paperBin[0] + 0.5, 0, gf.paperBin[2] + 0.05], 0, () => bin(s, '#22B573'));
    fixtures.push({ x: gf.paperBin[0], side: 's', half: 0.7 });
  }

  // ---- benches and bins along the walls
  const benches: [number, 'n' | 's'][] = first ? [[-10, 'n'], [-2, 's'], [3, 's'], [26.8, 'n']] : [[-10, 'n'], [-4, 's'], [13.6, 's'], [27, 'n']];
  for (const [x, side] of benches) {
    s.at([x, 0, sideZ(side) + (side === 'n' ? 0.2 : -0.2)], side === 'n' ? 0 : Math.PI, () => bench(s, 1.8, first ? '#8EC5E8' : '#D9A46B'));
    blob(k, x, sideZ(side) + (side === 'n' ? 0.4 : -0.4), 2.0, 0.7);
    fixtures.push({ x, side, half: 1.3 });
  }
  const bins: [number, 'n' | 's'][] = first ? [[-14, 'n'], [8, 's'], [14, 's']] : [[-6, 'n'], [3, 'n'], [-21, 's']];
  for (const [x, side] of bins) {
    s.at([x, 0, sideZ(side) + (side === 'n' ? 0.25 : -0.25)], 0, () => bin(s, '#2D8CFF'));
    fixtures.push({ x, side, half: 0.4 });
  }

  // ---- shoe-high green guide strips (split around doors)
  const gaps = doors.map((d) => ({ side: d.side, a: d.x - d.width / 2 - 0.15, b: d.x + d.width / 2 + 0.15 }));
  gaps.push({ side: 'n', a: OPEN.x0, b: OPEN.x1 });
  if (!first) gaps.push({ side: 's', a: CORRIDOR.ground.lobbyOpening.x0, b: CORRIDOR.ground.lobbyOpening.x1 });
  for (const side of ['n', 's'] as const) {
    const g2 = gaps.filter((q) => q.side === side).sort((a, b) => a.a - b.a);
    let cur = -W / 2 + 0.3;
    const strip = (a: number, b: number) => {
      if (b - a > 0.2) onWall(e, side, (a + b) / 2, 0.135, () => e.box([0, 0, 0.034], [b - a, 0.022, 0.01], '#2BE07A'));
    };
    for (const q of g2) {
      strip(cur, q.a);
      cur = q.b;
    }
    strip(cur, W / 2 - 0.3);
  }

  // ---- emergency lamps on the walls
  const lamps: { x: number; side: 'n' | 's' }[] = [];
  for (let x = -26; x <= 26; x += 13) lamps.push({ x: x + 3, side: x % 26 === 0 ? 'n' : 's' });
  lamps.forEach((l) => emergencyLamp(k, [l.x, 2.95, sideZ(l.side)], l.side === 'n' ? 0 : Math.PI));

  // ---- exit signs on the walls (arrow = direction of travel toward the nearest exit)
  const wallExit = (x: number, side: 'n' | 's', worldDir: -1 | 1) => onWall(e, side, x, 2.62, () => exitSign(k, [0, 0, 0], 0, (side === 'n' ? worldDir : -worldDir) as -1 | 1));
  if (first) {
    wallExit(-10, 's', -1);
    wallExit(-27, 's', -1);
    wallExit(12, 's', 1);
  } else {
    wallExit(3, 'n', 1);
    wallExit(11, 'n', 1);
    wallExit(-6.5, 's', -1);
    wallExit(-19.5, 'n', -1);
  }
  // keep-right sign by the stairs (picture only)
  onWall(s, 'n', OPEN.x1 + 1.1, 1.6, () => s.sticker('keepright', [0, 0, 0.006], 0.5, 0.62, drawKeepRight, 0, 400));
  fixtures.push({ x: OPEN.x1 + 1.1, side: 'n', half: 0.6 });

  // ---- posters, kids' artwork
  const avoid = (side: 'n' | 's', x: number, half: number) => fixtures.some((f) => f.side === side && Math.abs(f.x - x) < f.half + half);
  let pk = first ? 3 : 0;
  for (const side of ['n', 's'] as const) {
    for (let x = -27.6; x < 28; x += 2.35 + ((pk * 7) % 3) * 0.25) {
      const wide = pk % 4 === 2;
      const half = wide ? 1.25 : 0.4;
      if (!avoid(side, x, half)) {
        onWall(s, side, x, 0, () => {
          if (wide) s.sticker(`art${pk % 2}`, [0, 1.62, 0.012], 2.0, 0.8, (ctx, w, h) => (pk % 2 ? drawArtBoard(ctx, w, h) : kidDrawing(ctx, pk, w, h)), 0, 220);
          else s.sticker(`poster${pk % 8}`, [0, 1.62, 0.012], 0.62, 0.82, (ctx, w, h) => drawPoster(ctx, w, h, pk % 8), 0, 260);
        });
      }
      pk++;
    }
  }

  // ---- ceiling lights and cove
  for (let x = -28; x <= 28; x += 4) lightPanel(k, x, H, 0, 1.4, 0.7);
  // hanging pipe along the ceiling (details)
  tube(s, [-W / 2, H - 0.12, -HD + 0.18], [W / 2, H - 0.12, -HD + 0.18], 0.06, '#DDE3EA');
  // floor shadow strips under benches etc. are above; soft edge shadow along both walls
  blob(k, 0, -HD + 0.12, W, 0.35, 0.003);
  blob(k, 0, HD - 0.12, W, 0.35, 0.003);

  // ---- hanging ceiling sign for the nearest exit toward the stairs (first floor: stairs down)
  void g;
}

/** A small stair hall behind the stairs opening: seen from the corridor it shows the flight going up (ground) or down (first floor). */
function buildStairHall(k: Kit4, first: boolean) {
  const { s } = k;
  const w = OPEN.x1 - OPEN.x0;
  const z0 = -HD;
  const z1 = z0 - HALL.depth;
  const wallC = '#F4EBDD';
  // side walls and back wall
  s.box([OPEN.x0 - 0.1, H / 2 + (first ? 0 : 0), (z0 + z1) / 2], [0.2, H, HALL.depth], wallC);
  s.box([OPEN.x1 + 0.1, H / 2, (z0 + z1) / 2], [0.2, H, HALL.depth], wallC);
  s.box([OPEN.x0 - 0.1 + 0.105, 0.55, (z0 + z1) / 2], [0.01, 1.1, HALL.depth], '#DCEFE9');
  s.box([OPEN.x1 + 0.1 - 0.105, 0.55, (z0 + z1) / 2], [0.01, 1.1, HALL.depth], '#DCEFE9');
  // back wall with a window (view painted separately)
  const wy = first ? 1.6 : 2.2;
  s.box([OPEN_C, (wy - 0.7) / 2 - (first ? 0.5 : 0), z1 - 0.1], [w + 0.4, wy - 0.7 + (first ? 1.0 : 0), 0.2], wallC);
  s.box([OPEN_C, (wy + 0.7 + H) / 2, z1 - 0.1], [w + 0.4, H - wy - 0.7, 0.2], wallC);
  s.box([OPEN_C - w / 2 + 0.55, wy, z1 - 0.1], [1.1, 1.4, 0.2], wallC);
  s.box([OPEN_C + w / 2 - 0.55, wy, z1 - 0.1], [1.1, 1.4, 0.2], wallC);
  s.at([OPEN_C, wy, z1], 0, () => windowFrame(s, w - 2.2, 1.4, 2));
  // floor and ceiling
  const tile = first ? '#E3E8EF' : '#EADFC9';
  s.quad([OPEN_C, 0.002, (z0 + HALL.bottomZ) / 2], [w, HALL.bottomZ - z0 < 0 ? z0 - HALL.bottomZ : 1], tile, [-Math.PI / 2, 0, 0]);
  k.c.quad([OPEN_C, H, (z0 + z1) / 2], [w + 0.4, HALL.depth], '#FBF8F2', [Math.PI / 2, 0, 0]);
  lightPanel(k, OPEN_C, H, -5.2, 1.4, 0.7);
  lightPanel(k, OPEN_C, H, -9.2, 1.4, 0.7);
  // steps: 10 solid blocks, yellow nosing on each
  const sw = w - 1.0; // 5 m wide minus rails
  const sx = OPEN_C;
  for (let i = 0; i < HALL.steps; i++) {
    const zf = HALL.bottomZ - i * HALL.tread; // front edge of the step i
    const top = first ? -(i + 1) * HALL.riser : (i + 1) * HALL.riser;
    const bottom = first ? top - 1.6 : 0;
    // block from the front edge toward the back (north)
    const zLen = HALL.tread;
    s.box([sx, (top + bottom) / 2, zf - zLen / 2], [sw, top - bottom, zLen], '#D8CDB9');
    s.box([sx, top - 0.01, zf - 0.035], [sw, 0.022, 0.07], '#F7C531');
    if (first) {
      // riser face (visible from the corridor as a dark band)
      s.box([sx, top + HALL.riser / 2, zf + 0.001], [sw, HALL.riser * 0.01, 0.002], '#B7AA92');
    }
  }
  // flat landing after the flight (ground: raised; first floor: bottom wall)
  if (!first) {
    const zEnd = HALL.bottomZ - HALL.steps * HALL.tread;
    s.box([sx, HALL.steps * HALL.riser / 2, (zEnd + z1) / 2], [sw, HALL.steps * HALL.riser, zEnd - z1], '#D8CDB9');
  } else {
    // front lip of the stair head
    s.box([sx, 0.0, HALL.bottomZ + 0.03], [sw, 0.01, 0.06], '#F7C531');
  }
  // side stringers and handrails at child height (0.75 above the nosing), both sides
  const rise = HALL.steps * HALL.riser * (first ? -1 : 1);
  const zA = HALL.bottomZ;
  const zB = HALL.bottomZ - HALL.steps * HALL.tread;
  for (const sxs of [OPEN.x0 + 0.35, OPEN.x1 - 0.35]) {
    s.box([sxs, rise / 2 - (first ? 0.8 : 0) + (first ? 0 : 0), (zA + zB) / 2], [0.08, Math.abs(rise) + 0.2, zA - zB], '#CFC4AE');
    for (let i = 0; i <= 3; i++) {
      const t = i / 3;
      const zz = zA + (zB - zA) * t;
      const yy = rise * t;
      s.cyl([sxs, (Math.min(yy, 0) + 0.75 + yy) / 2 + (yy < 0 ? 0 : 0), zz], [0.035, 0.75, 0.035], '#8E99A8', undefined, true);
    }
    tube(s, [sxs, 0.75, zA], [sxs, 0.75 + rise, zB], 0.05, '#2D8CFF');
    tube(s, [sxs, 0.35, zA], [sxs, 0.35 + rise, zB], 0.03, '#8E99A8');
  }
  // keep-right sign on the back wall low and a plant at the corner
  s.sticker('stairhall-sign', [OPEN_C - w / 2 + 0.7, 1.5, z1 + 0.012], 0.5, 0.62, drawKeepRight, 0, 300);
}

/* ------------------------------------------------------------------ room */

function Corridor({ first }: { first: boolean }) {
  const { flags } = useRoomFlags();
  const cross = flags.elevatorCross === true || flags.elevatorCross === 'true';
  const fx = first ? CORRIDOR.first : CORRIDOR.ground;
  const gf = CORRIDOR.ground;
  const lampPts: { p: [number, number, number]; rotY: number }[] = [];
  for (let x = -26; x <= 26; x += 13) {
    const north = x % 26 === 0;
    lampPts.push({ p: [x + 3, 2.9, north ? -HD + 0.4 : HD - 0.4], rotY: north ? 0 : Math.PI });
  }
  return (
    <group>
      <TileFloor w={W + 0.4} d={D + 0.4} tile={0.6} base={first ? '#E4EAF1' : '#EFE8D8'} lineColor={first ? '#C9D3E0' : '#DCD1BD'} />
      <StaticRoom id={first ? 'corridor_first' : 'corridor_ground'} build={(k) => buildCorridor(k, first)} />
      <ExtinguisherInCabinet p={[fx.extinguisherCabinet[0], 0, -HD]} rotY={0} />
      <AlarmBeacon p={[fx.alarmLight[0], fx.alarmLight[1], -HD]} />
      <ElevatorCross p={[fx.elevatorDoor[0], 1.15, -HD + 0.03]} show={cross} />
      <EmergencyHalos points={lampPts} />
      {first ? (
        <>
          {CORRIDOR.first.windows.map((wx) => (
            <WindowView key={wx} p={[wx, 1.7, HD]} rotY={Math.PI} w={2.2} h={1.4} view="yard" />
          ))}
          <WindowView p={[-18, 1.75, -HD]} rotY={0} w={3.6} h={1.5} view="hall" depth={0.6} />
          <WindowView p={[OPEN_C, 1.6, -HD - HALL.depth]} rotY={0} w={OPEN.x1 - OPEN.x0 - 2.2} h={1.4} view="back" />
        </>
      ) : (
        <>
          <WindowView p={[OPEN_C, 2.2, -HD - HALL.depth]} rotY={0} w={OPEN.x1 - OPEN.x0 - 2.2} h={1.4} view="back" />
          <WetFloorSet patch={gf.wetPatch} sign={gf.wetSign} cart={gf.cleanerCart} />
        </>
      )}
    </group>
  );
}

export const CorridorGround = () => <Corridor first={false} />;
export const CorridorFirst = () => <Corridor first />;
