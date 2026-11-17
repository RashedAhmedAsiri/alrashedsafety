/**
 * Everything static in the street set, described as parts for the Builder (see build.ts).
 * WORLD coordinates. Heights follow src/core/ground.ts.
 */
import * as THREE from 'three';
import { PAL } from '../../kit';
import { Builder, Frame, U, flatShape } from './build';
import { cellUV, type AtlasCell } from './atlas';
import { WORKS } from '../neighborhood/layout';
import {
  BENCHES_SOUTH,
  BOLLARD_X,
  BUS_STOP,
  CURB_W,
  EDGE_W,
  ELECTRIC_CABINET,
  HALF,
  LAYBY,
  MANHOLES,
  MOSQUE,
  PALMS,
  PARKING,
  PICKUP_BENCH_X,
  PICKUP_CANOPY,
  PICKUP_SPOTS,
  ORGANIZER_SPOT,
  SIGNAL,
  SIGNS,
  SPEED_BUMPS,
  STREET_LIGHTS,
  SW_H,
  SW_OUT,
  X_MAX,
  X_MIN,
  ZEBRA,
} from './layout';

/* ------------------------------------------------------------------ colors */

export const C = {
  asphalt: PAL.asphalt,
  curb: '#C9C2B4',
  curbBlack: PAL.curbBlack,
  curbYellow: PAL.curbYellow,
  edge: '#BDB3A0',
  white: PAL.laneWhite,
  yellow: PAL.laneYellow,
  pole: '#A7B0BA',
  poleDark: '#4A5563',
  metal: '#8E98A4',
  concrete: '#D8D2C6',
  teal: PAL.teal,
  cream: '#F3EAD8',
  creamDark: '#E4D6BC',
  wood: PAL.wood,
  planter: PAL.villaWhite,
  soil: '#7A5A3A',
  trunk: PAL.palmTrunk,
  trunkRing: '#86623B',
  leaf: PAL.palmLeaf,
  leaf2: '#4CAF5A',
  dates: '#C58B3A',
  glass: '#BFE3F5',
  green: PAL.mosqueGreen,
  gold: '#E7C873',
};

const atlas = (b: Builder | Frame, cell: AtlasCell, p: [number, number, number], s: [number, number], r?: [number, number, number]) =>
  b.add('atlas', U.plane, p, [s[0], s[1], 1], '#FFFFFF', { uv: cellUV(cell), r });

/** Flat decal (atlas) lying on a surface at height y; rotY turns the picture's top (initially -Z). */
const decal = (b: Builder, cell: AtlasCell, x: number, y: number, z: number, w: number, d: number, rotY = 0) =>
  b.add('atlas', U.floor, [x, y, z], [w, 1, d], '#FFFFFF', { uv: cellUV(cell), r: [0, rotY, 0] });

/** Split [a, b] into pieces no longer than len. */
function pieces(a: number, b: number, len = 20): [number, number][] {
  const out: [number, number][] = [];
  const n = Math.max(1, Math.ceil((b - a) / len));
  for (let i = 0; i < n; i++) out.push([a + ((b - a) * i) / n, a + ((b - a) * (i + 1)) / n]);
  return out;
}

/** Remove the given gaps from [a, b]. */
function minus(a: number, b: number, gaps: [number, number][]): [number, number][] {
  let segs: [number, number][] = [[a, b]];
  for (const [g0, g1] of gaps) {
    const next: [number, number][] = [];
    for (const [s0, s1] of segs) {
      if (g1 <= s0 || g0 >= s1) next.push([s0, s1]);
      else {
        if (g0 > s0) next.push([s0, g0]);
        if (g1 < s1) next.push([g1, s1]);
      }
    }
    segs = next;
  }
  return segs.filter(([s0, s1]) => s1 - s0 > 0.01);
}

/* ------------------------------------------------------------------- roads */

function roads(b: Builder) {
  const A = C.asphalt;
  // main street, both sides of the hump
  for (const [x0, x1] of [...pieces(X_MIN, -ZEBRA.rampTo), ...pieces(ZEBRA.rampTo, X_MAX)]) b.rect('flat', x0, x1, -HALF, HALF, 0, A);
  // raised zebra table
  b.add('flat', U.hump, [0, 0, 0], [1, 1, HALF * 2], A);
  // north-south signal road (whole map), minus the main street square
  for (const [z0, z1] of [...pieces(-130, -HALF, 25), ...pieces(HALF, 130, 25)]) b.rect('flat', SIGNAL.road.x0, SIGNAL.road.x1, z0, z1, 0, A);
  // pick-up lay-by lane
  b.rect('flat', LAYBY.x0, LAYBY.x1, LAYBY.zLane0, LAYBY.zLane1, 0, A);
  // parking lot + driveway
  const L = PARKING.lot;
  for (const [z0, z1] of pieces(L.z0, L.z1, 12)) b.rect('flat', PARKING.walkway.x1, L.x1, z0, z1, 0, A);
  b.rect('flat', PARKING.driveway.x0, PARKING.driveway.x1, -SW_OUT, -HALF, 0, A);
  // (the side road south of z = 3.5, including its mouth through the south sidewalk, is the neighborhood set's)
}

/* --------------------------------------------------------------- sidewalks */

/** A sidewalk strip: tiled top at 0.15 with a curb on the road side(s) and an edge stone outside. */
function sidewalk(
  b: Builder,
  x0: number,
  x1: number,
  zRoad: number,
  zOut: number,
  opts: { curbEnds?: [boolean, boolean]; painted?: (x: number) => boolean; outerEdge?: boolean; cut?: { x0: number; x1: number; z0: number; z1: number } } = {},
) {
  const dir = Math.sign(zOut - zRoad); // +1 when the sidewalk extends to +z of the curb
  const zc = zRoad + dir * CURB_W;
  const zo = opts.outerEdge === false ? zOut : zOut - dir * EDGE_W;
  const [endW, endE] = opts.curbEnds ?? [false, false];
  const tx0 = endW ? x0 + CURB_W : x0;
  const tx1 = endE ? x1 - CURB_W : x1;
  // tiles
  const zl = Math.min(zc, zo);
  const zh = Math.max(zc, zo);
  const tile = (a: number, c: number, z0: number, z1: number) => {
    if (c - a > 1e-6 && z1 - z0 > 1e-6) b.rect('tiles', a, c, z0, z1, SW_H, '#FFFFFF', { worldUV: 1 });
  };
  for (const [a, c] of pieces(tx0, tx1, 20)) {
    const k = opts.cut;
    if (!k || c <= k.x0 || a >= k.x1) tile(a, c, zl, zh);
    else {
      // the roadworks trench is cut out of the paving (neighborhood/layout.ts WORKS.pit)
      tile(a, k.x0, zl, zh);
      tile(k.x1, c, zl, zh);
      tile(Math.max(a, k.x0), Math.min(c, k.x1), zl, k.z0);
      tile(Math.max(a, k.x0), Math.min(c, k.x1), k.z1, zh);
    }
  }
  // road curb (long), painted black/yellow where requested
  curbRun(b, x0, x1, Math.min(zRoad, zc), Math.max(zRoad, zc), opts.painted);
  // end curbs facing cross roads
  const zA = Math.min(zc, zOut);
  const zB = Math.max(zc, zOut);
  if (endW) curbRunZ(b, x0, x0 + CURB_W, zA, zB, opts.painted?.(x0) ?? false);
  if (endE) curbRunZ(b, x1 - CURB_W, x1, zA, zB, opts.painted?.(x1) ?? false);
  // outer edge stones
  if (opts.outerEdge !== false)
    for (const [a, c] of pieces(tx0, tx1, 20)) b.boxMinMax('wet', [a, -0.02, Math.min(zo, zOut)], [c, SW_H, Math.max(zo, zOut)], C.edge);
}

/** Curb stones along x (from x0 to x1), z band [z0, z1]. */
function curbRun(b: Builder, x0: number, x1: number, z0: number, z1: number, painted?: (x: number) => boolean) {
  let x = x0;
  let k = Math.floor(x0);
  while (x < x1 - 0.001) {
    const nx = Math.min(x1, Math.floor(x) + 1);
    const paint = painted?.((x + nx) / 2);
    const color = paint ? (k % 2 === 0 ? C.curbBlack : C.curbYellow) : C.curb;
    // merge long unpainted runs into one stone row
    if (!paint) {
      let ex = nx;
      while (ex < x1 - 0.001 && !painted?.(ex + 0.5) && ex - x < 20) ex = Math.min(x1, ex + 1);
      b.boxMinMax('wet', [x, -0.02, z0], [ex, SW_H, z1], C.curb);
      x = ex;
      k = Math.floor(ex);
      continue;
    }
    b.boxMinMax('wet', [x, -0.02, z0], [nx, SW_H, z1], color);
    x = nx;
    k++;
  }
}

/** Curb stones along z (end of a sidewalk), x band [x0, x1]. */
function curbRunZ(b: Builder, x0: number, x1: number, z0: number, z1: number, painted: boolean) {
  if (!painted) return b.boxMinMax('wet', [x0, -0.02, z0], [x1, SW_H, z1], C.curb);
  let z = z0;
  let k = 0;
  while (z < z1 - 0.001) {
    const nz = Math.min(z1, z + 1);
    b.boxMinMax('wet', [x0, -0.02, z], [x1, SW_H, nz], k % 2 ? C.curbYellow : C.curbBlack);
    z = nz;
    k++;
  }
}

function sidewalks(b: Builder) {
  const school = (x: number) => x >= -56 && x <= 56;
  const N = -HALF;
  const S = HALF;
  // north sidewalk
  sidewalk(b, X_MIN, SIGNAL.road.x0, N, -SW_OUT, { curbEnds: [false, true] });
  sidewalk(b, SIGNAL.road.x1, LAYBY.x0, N, -SW_OUT, { curbEnds: [true, true], painted: school });
  sidewalk(b, LAYBY.x1, PARKING.driveway.x0, N, -SW_OUT, { curbEnds: [true, true], painted: school });
  sidewalk(b, PARKING.driveway.x1, X_MAX, N, -SW_OUT, { curbEnds: [true, false] });
  // pick-up sidewalk behind the lay-by (its curb faces the lay-by lane at z = -7.5)
  sidewalk(b, LAYBY.x0, LAYBY.x1, LAYBY.zLane0, LAYBY.zBack, { painted: () => true, outerEdge: false });
  // south sidewalk
  sidewalk(b, X_MIN, SIGNAL.road.x0, S, SW_OUT, { curbEnds: [false, true] });
  sidewalk(b, SIGNAL.road.x1, -17.5, S, SW_OUT, { curbEnds: [true, true], cut: WORKS.pit });
  sidewalk(b, -10.5, X_MAX, S, SW_OUT, { curbEnds: [true, false] });

  // tactile paving at the gate crossing landings (both sides)
  for (const z of [-4.15, 4.15]) for (let x = -2.4; x < 2.41; x += 0.6) decal(b, 'tactile', x + 0.3 - 0.3, SW_H + 0.004, z, 0.6, 0.6);
  // tactile paving at the signal crossing
  for (const z of [-4.15, 4.15]) for (let x = SIGNAL.crosswalk.x0 + 0.2; x < SIGNAL.crosswalk.x1 - 0.1; x += 0.6) decal(b, 'tactile', x + 0.3, SW_H + 0.004, z, 0.6, 0.6);
}

/* ---------------------------------------------------------------- markings */

function markings(b: Builder) {
  const y = 0.006;
  const P = 'paint' as const;
  // centre line: dashed, solid near crossings
  const solid: [number, number][] = [
    [-20, -ZEBRA.rampTo],
    [ZEBRA.rampTo, 20],
    [SIGNAL.stop.eastbound - 14, SIGNAL.road.x0],
    [SIGNAL.road.x1, SIGNAL.stop.westbound + 14],
  ];
  const noLine: [number, number][] = [
    [-ZEBRA.rampTo, ZEBRA.rampTo],
    [SIGNAL.road.x0, SIGNAL.road.x1],
    [SIGNAL.crosswalk.x0 - 0.3, SIGNAL.stop.westbound + 0.3],
  ];
  for (const [a, c] of minus(X_MIN, X_MAX, [...noLine, ...solid])) {
    for (let x = Math.ceil(a / 6) * 6; x + 3 <= c; x += 6) b.rect(P, x, x + 3, -0.075, 0.075, y, C.white);
  }
  for (const [a, c] of minus(X_MIN, X_MAX, noLine)) {
    if (solid.some(([s0, s1]) => a >= s0 - 0.01 && c <= s1 + 0.01)) b.rect(P, a, c, -0.075, 0.075, y, C.white);
  }
  for (const [s0, s1] of solid) for (const [a, c] of minus(s0, s1, noLine)) b.rect(P, a, c, -0.075, 0.075, y, C.white);

  // yellow edge lines
  const northGaps: [number, number][] = [
    [-ZEBRA.rampTo, ZEBRA.rampTo],
    [SIGNAL.road.x0, SIGNAL.road.x1],
    [SIGNAL.crosswalk.x0 - 0.3, SIGNAL.crosswalk.x1 + 0.3],
    [LAYBY.x0, LAYBY.x1],
    [PARKING.driveway.x0, PARKING.driveway.x1],
    [BUS_STOP.box.x0, BUS_STOP.box.x1],
  ];
  const southGaps: [number, number][] = [
    [-ZEBRA.rampTo, ZEBRA.rampTo],
    [SIGNAL.road.x0, SIGNAL.road.x1],
    [SIGNAL.crosswalk.x0 - 0.3, SIGNAL.crosswalk.x1 + 0.3],
    [-17.5, -10.5],
  ];
  for (const [a, c] of minus(X_MIN, X_MAX, northGaps)) for (const [p, q] of pieces(a, c, 20)) b.rect(P, p, q, -3.35, -3.2, y, C.yellow);
  for (const [a, c] of minus(X_MIN, X_MAX, southGaps)) for (const [p, q] of pieces(a, c, 20)) b.rect(P, p, q, 3.2, 3.35, y, C.yellow);
  // lay-by separation: white dashes along the lay-by mouth
  for (let x = LAYBY.x0 + 0.5; x + 1 <= LAYBY.x1; x += 2) b.rect(P, x, x + 1, -3.62, -3.48, y, C.white);

  // gate crossing: zebra stripes on the table top, white triangles on both ramps
  for (const z of ZEBRA.stripes) b.rect(P, -ZEBRA.stripeLen / 2, ZEBRA.stripeLen / 2, z - ZEBRA.stripeW / 2, z + ZEBRA.stripeW / 2, SW_H + 0.006, C.white);
  const tri = flatShape([
    [0, -0.35],
    [0.7, 0],
    [0, 0.35],
  ]);
  const slope = Math.atan2(SW_H, 1);
  for (const side of [-1, 1]) {
    for (const z of [-2.9, -2.0, -1.1, 1.1, 2.0, 2.9]) {
      // triangle pointing towards the table, lying on the ramp
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(side * 3.35, 0.022 + 0.004, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, side > 0 ? Math.PI : 0, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), slope)),
        new THREE.Vector3(1, 1, 1),
      );
      b.addMatrix(P, tri, m, C.white);
    }
  }
  // school zone pictograms painted on both approach lanes
  decal(b, 'roadKids', -26, y + 0.002, 1.75, 2.4, 2.4, -Math.PI / 2);
  decal(b, 'roadKids', 46, y + 0.002, -1.75, 2.4, 2.4, Math.PI / 2);

  // speed bumps: yellow/black blocks across the street
  for (const x of SPEED_BUMPS) {
    for (let i = 0; i < 14; i++) {
      const z0 = -HALF + i * 0.5;
      b.add('wet', U.bump, [x, 0, z0 + 0.25], [0.9, 0.075, 0.5], i % 2 ? C.curbBlack : C.yellow);
    }
  }

  // signal crosswalk stripes + stop lines
  const cw = SIGNAL.crosswalk;
  for (let z = -3; z <= 3; z += 1) b.rect(P, cw.x0 + 0.2, cw.x1 - 0.2, z - 0.25, z + 0.25, y, C.white);
  b.rect(P, SIGNAL.stop.westbound - 0.2, SIGNAL.stop.westbound + 0.2, -3.3, -0.1, y, C.white);
  b.rect(P, SIGNAL.stop.eastbound - 0.2, SIGNAL.stop.eastbound + 0.2, 0.1, 3.3, y, C.white);
  b.rect(P, SIGNAL.road.x0 + 0.2, SIGNAL.x - 0.1, SIGNAL.stop.southbound - 0.2, SIGNAL.stop.southbound + 0.2, y, C.white);
  b.rect(P, SIGNAL.x + 0.1, SIGNAL.road.x1 - 0.2, SIGNAL.stop.northbound - 0.2, SIGNAL.stop.northbound + 0.2, y, C.white);
  // north-south road centre line
  for (const [a, c] of [
    [-130, SIGNAL.stop.southbound - 0.4],
    [SIGNAL.stop.northbound + 0.4, 130],
  ] as [number, number][]) {
    for (let z = a; z + 3 <= c; z += 6) b.rect(P, SIGNAL.x - 0.075, SIGNAL.x + 0.075, z, z + 3, y, C.white);
  }
  // lane arrows before the intersection
  decal(b, 'arrow', SIGNAL.stop.westbound + 8, y + 0.002, -1.75, 0.6, 2.4, Math.PI / 2);
  decal(b, 'arrow', SIGNAL.stop.eastbound - 8, y + 0.002, 1.75, 0.6, 2.4, -Math.PI / 2);

  // bus stop box (yellow dashed) + bus pictogram
  const bx = BUS_STOP.box;
  for (let x = bx.x0; x + 0.8 <= bx.x1 + 0.01; x += 1.4) {
    b.rect(P, x, x + 0.8, bx.z0 - 0.07, bx.z0 + 0.07, y, C.yellow);
    b.rect(P, x, x + 0.8, bx.z1 - 0.07, bx.z1 + 0.07, y, C.yellow);
  }
  for (const x of [bx.x0, bx.x1]) for (let z = bx.z0; z + 0.6 <= bx.z1 + 0.01; z += 1.1) b.rect(P, x - 0.07, x + 0.07, z, z + 0.6, y, C.yellow);
  decal(b, 'roadBus', 30, y + 0.002, -1.8, 4.2, 2.1, 0);

  // pick-up lay-by: numbered spots
  for (const s of PICKUP_SPOTS) {
    b.rect(P, s.x0 - 0.06, s.x0 + 0.06, -7.35, -5.0, y, C.white);
    decal(b, `road${s.n}` as AtlasCell, s.cx, y + 0.002, -4.35, 1.1, 1.1, Math.PI);
  }
  b.rect(P, PICKUP_SPOTS[4].x1 - 0.06, PICKUP_SPOTS[4].x1 + 0.06, -7.35, -5.0, y, C.white);
  b.rect(P, PICKUP_SPOTS[0].x0, PICKUP_SPOTS[4].x1, -5.06, -4.94, y, C.white);
  decal(b, 'arrow', -17.6, y + 0.002, -5.6, 0.55, 2.0, Math.PI / 2);
  decal(b, 'arrow', -48.6, y + 0.002, -5.6, 0.55, 2.0, Math.PI / 2);

  // bus stop waiting line + footprints (sidewalk paint)
  b.rect(P, BUS_STOP.line.x0, BUS_STOP.line.x1, BUS_STOP.lineZ - 0.07, BUS_STOP.lineZ + 0.07, SW_H + 0.006, C.yellow);
  for (const f of BUS_STOP.footprints) decal(b, 'footprints', f[0], SW_H + 0.008, f[2], 0.55, 0.55, Math.PI);
  // traffic organizer's spot
  decal(b, 'organizer', ORGANIZER_SPOT[0], SW_H + 0.008, ORGANIZER_SPOT[2], 1.1, 1.1, Math.PI);

  // parking: bay lines, walkway edge, wheel stops, arrows
  const PK = PARKING;
  const westDiv = [-14.2, -16.9, -19.6, -22.3, -25.0, -27.7, -30.4];
  const eastDiv = [-11.5, -14.2, -16.9, -19.6, -22.3, -25.0, -27.7, -30.4];
  for (const z of westDiv) b.rect(P, 59.6, 64.8, z - 0.06, z + 0.06, y, C.white);
  for (const z of eastDiv) b.rect(P, 71.6, 76.8, z - 0.06, z + 0.06, y, C.white);
  b.rect(P, 64.74, 64.86, -30.4, -14.2, y, C.white);
  b.rect(P, 71.54, 71.66, -30.4, -11.5, y, C.white);
  b.rect(P, PK.walkway.x1 - 0.12, PK.walkway.x1, PK.lot.z0, -7.6, y, C.yellow);
  for (const r of PK.west) b.add('wet', U.rbox, [60.3, 0.075, r.z], [0.22, 0.15, 1.6], '#D8D2C6');
  for (const r of PK.east) b.add('wet', U.rbox, [76.1, 0.075, r.z], [0.22, 0.15, 1.6], '#D8D2C6');
  for (const r of [...PK.west, ...PK.east]) {
    const x = r.rotY === 0 ? 76.1 : 60.3;
    b.boxMinMax('paint', [x - 0.115, 0.15, r.z - 0.5], [x + 0.115, 0.152, r.z - 0.2], C.yellow);
    b.boxMinMax('paint', [x - 0.115, 0.15, r.z + 0.2], [x + 0.115, 0.152, r.z + 0.5], C.yellow);
  }
  decal(b, 'arrow', 66.8, y + 0.002, -10.5, 0.6, 2.2, 0);
  decal(b, 'arrow', 69.6, y + 0.002, -12.5, 0.6, 2.2, Math.PI);
  // parking walkway paving (flush, at grade)
  for (const [z0, z1] of pieces(PK.lot.z0, -7.6, 12)) b.rect('tiles', PK.walkway.x0, PK.walkway.x1 - 0.12, z0, z1, 0.004, '#FFFFFF', { worldUV: 1 });

  // drain grates along both curbs
  for (let x = -124; x <= 124; x += 12) {
    for (const z of [-3.32, 3.32]) {
      const gx = x + (z > 0 ? 6 : 0);
      const blocked =
        Math.abs(gx) < 5 ||
        (gx > SIGNAL.road.x0 - 1 && gx < SIGNAL.crosswalk.x1 + 1) ||
        (z < 0 && gx > LAYBY.x0 - 1 && gx < LAYBY.x1 + 1) ||
        (z < 0 && gx > PARKING.driveway.x0 - 1 && gx < PARKING.driveway.x1 + 1) ||
        (z > 0 && gx > -19 && gx < -9) ||
        SPEED_BUMPS.some((s) => Math.abs(gx - s) < 1.5);
      if (!blocked) decal(b, 'grate', gx, y + 0.003, z, 0.9, 0.42, 0);
    }
  }
  // manhole covers in the road (heavy_rain: 'a manhole cover' near the gate crossing)
  for (const [x, z] of MANHOLES) decal(b, 'manhole', x, y + 0.003, z, 0.9, 0.9, 0);
  // lay-by drains along its back curb
  for (const x of [-44.5, -32.5, -20.5]) decal(b, 'grate', x, y + 0.003, -7.32, 0.9, 0.42, 0);
}

/* ---------------------------------------------------------------- furniture */

function palm(b: Builder, x: number, z: number, seed: number, base = SW_H, planter = true) {
  const f = new Frame(b, [x, base, z], seed * 1.37);
  let y0 = 0;
  if (planter) {
    f.add('wet', U.rbox, [0, 0.3, 0], [1.3, 0.6, 1.3], C.planter);
    f.box('solid', [0, 0.605, 0], [1.1, 0.02, 1.1], C.soil);
    y0 = 0.6;
  }
  const h = 4.2 + ((seed * 0.731) % 1) * 1.2;
  const lean = 0.06 + ((seed * 0.37) % 1) * 0.06;
  const t = f.child([0, y0, 0], 0);
  // trunk leans slightly along local x
  const trunkM = (yy: number): [number, number, number] => [Math.sin(lean) * yy, yy, 0];
  t.add('solid', U.cyl8, trunkM(h / 2), [0.34, h, 0.34], C.trunk, { r: [0, 0, -lean] });
  for (let i = 0; i < 5; i++) t.add('solid', U.cyl8, trunkM((h / 5) * i + 0.4), [0.42, 0.12, 0.42], C.trunkRing, { r: [0, 0, -lean] });
  const top = trunkM(h);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + seed;
    const leafFrame = t.child(top, a);
    leafFrame.add('solid', U.sphereLo, [1.05, -0.28, 0], [2.3, 0.1, 0.55], i % 2 ? C.leaf : C.leaf2, { r: [0, 0, -0.42] });
  }
  t.add('solid', U.sphereLo, [top[0], top[1] - 0.1, 0], [0.6, 0.48, 0.6], C.dates);
}

function bench(b: Builder, x: number, y: number, z: number, rotY: number, color = C.teal) {
  const f = new Frame(b, [x, y, z], rotY);
  // seat (facing local +Z)
  f.add('wet', U.rbox, [0, 0.45, 0], [1.7, 0.08, 0.46], color);
  f.add('wet', U.rbox, [0, 0.78, -0.22], [1.7, 0.36, 0.07], color, { r: [-0.12, 0, 0] });
  for (const sx of [-0.7, 0.7]) {
    f.box('solid', [sx, 0.22, 0], [0.07, 0.44, 0.4], C.poleDark);
    f.box('solid', [sx, 0.6, -0.2], [0.06, 0.5, 0.06], C.poleDark);
  }
}


/** Street bin: teal drum with a lid, a pale band and a dark rim. */
function bin(b: Builder, x: number, y: number, z: number) {
  b.add('solid', U.cyl12, [x, y + 0.4, z], [0.46, 0.8, 0.46], C.teal);
  b.add('solid', U.cyl12, [x, y + 0.5, z], [0.475, 0.1, 0.475], C.cream);
  b.add('solid', U.cyl12, [x, y + 0.83, z], [0.5, 0.07, 0.5], C.poleDark);
  b.add('solid', U.cyl12, [x, y + 0.04, z], [0.4, 0.08, 0.4], C.poleDark);
}

/** Low rounded shrub in a little planter bed: three leaf-green clumps, a few blossoms. */
function shrub(b: Builder, x: number, y: number, z: number, seed: number, wide = 1.2) {
  const k = (n: number) => ((seed * 12.9898 + n * 78.233) % 1 + 1) % 1;
  b.add('wet', U.rbox, [x, y + 0.12, z], [wide + 0.3, 0.24, 0.9], C.planter);
  b.add('solid', U.box, [x, y + 0.245, z], [wide + 0.1, 0.02, 0.7], C.soil);
  for (let i = 0; i < 3; i++) {
    const t = (i - 1) * (wide * 0.32);
    b.add('solid', U.sphereLo, [x + t, y + 0.5, z + (k(i) - 0.5) * 0.12], [0.7 + k(i + 3) * 0.2, 0.55 + k(i + 5) * 0.15, 0.62], i === 1 ? '#3F8F47' : '#4CAF5A');
  }
  for (let i = 0; i < 3; i++) b.add('solid', U.sphereLo, [x + (k(i + 9) - 0.5) * wide, y + 0.62 + k(i + 11) * 0.12, z + 0.3], [0.13, 0.13, 0.13], i % 2 ? '#E0479E' : '#F5C542');
}

function streetLight(b: Builder, x: number, z: number, armDir: number, arm = 1.8) {
  const f = new Frame(b, [x, z < -7.5 ? SW_H : SW_H, z], 0);
  f.add('solid', U.cyl8, [0, 0.25, 0], [0.3, 0.5, 0.3], C.poleDark);
  f.add('solid', U.cyl8, [0, 3.85, 0], [0.15, 7.2, 0.15], C.pole);
  // curved arm (two segments) towards the road
  f.add('solid', U.box, [0, 7.35, armDir * arm * 0.45], [0.09, 0.09, arm * 0.95], C.pole, { r: [armDir * 0.18, 0, 0] });
  f.add('solid', U.rbox, [0, 7.42, armDir * arm], [0.34, 0.16, 0.7], C.poleDark);
  f.add('glow', U.box, [0, 7.33, armDir * arm], [0.26, 0.03, 0.58], '#FFFFFF');
}

function bollard(b: Builder, x: number, z: number, y = SW_H, color: string = C.yellow) {
  b.add('solid', U.cyl12, [x, y + 0.28, z], [0.17, 0.56, 0.17], color);
  b.add('solid', U.sphere, [x, y + 0.56, z], [0.17, 0.12, 0.17], color);
  b.add('glow', U.cyl12, [x, y + 0.44, z], [0.175, 0.07, 0.175], '#F4F4F0');
  b.add('solid', U.cyl12, [x, y + 0.02, z], [0.24, 0.04, 0.24], C.poleDark);
}

/** Pole with a two-faced sign. cell = front art, back = silhouette cell. rotY: front faces (sin, cos). */
function signPost(
  b: Builder,
  x: number,
  z: number,
  rotY: number,
  items: { cell: AtlasCell; back: AtlasCell | null; w: number; h: number; y: number; twoSided?: boolean }[],
  poleH: number,
) {
  const f = new Frame(b, [x, SW_H, z], rotY);
  f.add('solid', U.cyl8, [0, poleH / 2, -0.06], [0.08, poleH, 0.08], C.pole);
  f.add('solid', U.sphereLo, [0, poleH, -0.06], [0.1, 0.06, 0.1], C.pole);
  for (const it of items) {
    atlas(f, it.cell, [0, it.y, 0.0], [it.w, it.h]);
    if (it.twoSided) atlas(f, it.cell, [0, it.y, -0.12], [it.w, it.h], [0, Math.PI, 0]);
    else if (it.back) atlas(f, it.back, [0, it.y, -0.012], [it.w, it.h], [0, Math.PI, 0]);
    if (it.twoSided) f.box('solid', [0, it.y, -0.06], [0.06, it.h * 0.6, 0.11], C.pole);
  }
}

function furniture(b: Builder) {
  for (const l of STREET_LIGHTS) streetLight(b, l.x, l.z, l.z < 0 ? 1 : -1, l.z < -7.5 ? 2.4 : 1.8);
  PALMS.forEach(([x, z], i) => palm(b, x, z, i + 1));
  for (const x of BENCHES_SOUTH) bench(b, x, SW_H, 6.85, Math.PI);
  // corner planters around the signal crossing (open land, ground 0)
  palm(b, -59.5, -9.6, 31, 0);
  palm(b, -65.5, -9.8, 32, 0);
  palm(b, -66.0, 9.6, 33, 0);

  // bins beside the south benches, and bins + planter shrubs along the school fence (clear of the gate, bus stop, lay-by and cabinet)
  for (const x of BENCHES_SOUTH) bin(b, x + 1.35, SW_H, 6.95);
  for (const x of [-12, 11, 42, 81, -58, 101]) bin(b, x, SW_H, -6.95);
  [-56, -9, 8, 20.5, 48, 70, 90].forEach((x, i) => shrub(b, x, SW_H, -6.95, i + 1));

  // bollards at the gate crossing
  for (const s of [-1, 1]) for (const x of BOLLARD_X) for (const z of [-3.95, 3.95]) bollard(b, s * x, z);

  // school zone + speed limit signs (faces turned a little towards the sidewalk so shots can read them)
  signPost(b, SIGNS.schoolZoneNorth[0], SIGNS.schoolZoneNorth[1], Math.PI / 2 - 0.45, [
    { cell: 'schoolZone', back: 'silPentagon', w: 0.8, h: 0.8, y: 2.55 },
    { cell: 'schoolZonePlate', back: 'silRect', w: 1.0, h: 0.25, y: 2.0 },
  ], 2.95);
  signPost(b, SIGNS.speedNorth[0], SIGNS.speedNorth[1], Math.PI / 2 - 0.45, [{ cell: 'speed30', back: 'silCircle', w: 0.75, h: 0.75, y: 2.35 }], 2.75);
  signPost(b, SIGNS.schoolZoneSouth[0], SIGNS.schoolZoneSouth[1], -Math.PI / 2 - 0.45, [
    { cell: 'schoolZone', back: 'silPentagon', w: 0.8, h: 0.8, y: 2.55 },
    { cell: 'schoolZonePlate', back: 'silRect', w: 1.0, h: 0.25, y: 2.0 },
  ], 2.95);
  signPost(b, SIGNS.speedSouth[0], SIGNS.speedSouth[1], -Math.PI / 2 - 0.45, [{ cell: 'speed30', back: 'silCircle', w: 0.75, h: 0.75, y: 2.35 }], 2.75);
  // pedestrian crossing signs (two-faced, beacons are dynamic)
  signPost(b, SIGNS.pedNorth[0], SIGNS.pedNorth[1], Math.PI / 2 + 0.5, [{ cell: 'pedCross', back: null, w: 0.85, h: 0.85, y: 2.45, twoSided: true }], 3.25);
  signPost(b, SIGNS.pedSouth[0], SIGNS.pedSouth[1], -Math.PI / 2 + 0.5, [{ cell: 'pedCross', back: null, w: 0.85, h: 0.85, y: 2.45, twoSided: true }], 3.25);
  // beacon housings (lenses are dynamic)
  for (const [sx, sz, rot] of [
    [SIGNS.pedNorth[0], SIGNS.pedNorth[1], Math.PI / 2 + 0.5],
    [SIGNS.pedSouth[0], SIGNS.pedSouth[1], -Math.PI / 2 + 0.5],
  ] as const) {
    const f = new Frame(b, [sx, SW_H, sz], rot);
    f.box('solid', [0, 3.1, -0.06], [0.95, 0.07, 0.07], C.poleDark);
    for (const lx of [-0.36, 0.36]) {
      f.add('solid', U.cyl12, [lx, 3.1, -0.06], [0.24, 0.2, 0.24], C.poleDark, { r: [Math.PI / 2, 0, 0] });
    }
  }
  // parking sign
  signPost(b, SIGNS.parking[0], SIGNS.parking[1], 0.55, [{ cell: 'parkingSign', back: 'silRect', w: 0.8, h: 0.8, y: 2.3 }], 2.7);

  // electrical cabinet against the school fence
  {
    const [x, y, z] = ELECTRIC_CABINET;
    const f = new Frame(b, [x, y, z], 0);
    f.box('solid', [0, 0.06, 0], [1.25, 0.12, 0.55], C.concrete);
    f.add('solid', U.rbox, [0, 0.8, 0], [1.15, 1.36, 0.46], '#9DB0A6');
    f.box('solid', [0, 1.5, 0.02], [1.27, 0.06, 0.56], '#7E9188');
    atlas(f, 'cabinetDoor', [-0.28, 0.82, 0.235], [0.5, 1.12]);
    atlas(f, 'cabinetDoor', [0.28, 0.82, 0.235], [0.5, 1.12]);
  }
}

/* ---------------------------------------------------------------- bus stop */

function busStop(b: Builder) {
  const S = BUS_STOP.shelter;
  const W = S.x1 - S.x0;
  const cx = (S.x0 + S.x1) / 2;
  const f = new Frame(b, [cx, SW_H, 0], 0);
  // posts
  for (const px of [-W / 2 + 0.1, W / 2 - 0.1]) {
    f.add('solid', U.box, [px, 1.35, S.zBack + 0.05], [0.1, 2.7, 0.1], '#FFFFFF');
    f.add('solid', U.box, [px, 1.35, S.zFront + 0.25], [0.1, 2.7, 0.1], '#FFFFFF');
  }
  // roof: teal slab with white fascia carrying the stop name
  f.add('wet', U.rbox, [0, S.roofY, (S.zBack + S.zFront) / 2], [W + 0.4, 0.16, S.zFront - S.zBack + 0.5], C.teal);
  f.box('solid', [0, S.roofY - 0.16, S.zFront + 0.24], [W + 0.3, 0.3, 0.06], '#FFFFFF');
  atlas(f, 'busStopStrip', [0, S.roofY - 0.16, S.zFront + 0.275], [1.6, 0.3]);
  // back glass panel with frame
  f.box('solid', [0, 1.3, S.zBack + 0.05], [W - 0.2, 1.7, 0.04], C.glass);
  f.box('solid', [0, 0.42, S.zBack + 0.05], [W - 0.2, 0.06, 0.08], '#FFFFFF');
  f.box('solid', [0, 2.18, S.zBack + 0.05], [W - 0.2, 0.06, 0.08], '#FFFFFF');
  // west side panel: route map, both faces
  f.box('solid', [-W / 2 + 0.1, 1.45, (S.zBack + S.zFront) / 2 + 0.1], [0.05, 1.4, 1.2], '#FFFFFF');
  atlas(f, 'shelterMap', [-W / 2 + 0.07, 1.45, (S.zBack + S.zFront) / 2 + 0.1], [1.1, 1.1], [0, -Math.PI / 2, 0]);
  atlas(f, 'shelterMap', [-W / 2 + 0.13, 1.45, (S.zBack + S.zFront) / 2 + 0.1], [1.1, 1.1], [0, Math.PI / 2, 0]);
  // bench
  const B = BUS_STOP.bench;
  f.add('wet', U.rbox, [(B.x0 + B.x1) / 2 - cx, 0.45, B.z], [B.x1 - B.x0, 0.08, 0.42], C.wood);
  f.add('wet', U.rbox, [(B.x0 + B.x1) / 2 - cx, 0.78, B.z - 0.24], [B.x1 - B.x0, 0.3, 0.06], C.wood);
  for (const bx of [B.x0 + 0.3, (B.x0 + B.x1) / 2, B.x1 - 0.3]) f.box('solid', [bx - cx, 0.22, B.z], [0.06, 0.44, 0.36], C.poleDark);
  // bin at the east end
  f.add('solid', U.cyl12, [W / 2 + 0.45, 0.42, -5.6], [0.42, 0.84, 0.42], '#2E9E6A');
  f.add('solid', U.cyl12, [W / 2 + 0.45, 0.86, -5.6], [0.46, 0.06, 0.46], C.poleDark);
  // bus stop sign (two-faced, perpendicular to the street but turned so both sidewalk and road can read it)
  signPost(b, BUS_STOP.sign[0], BUS_STOP.sign[1], Math.PI / 2 - 0.6, [{ cell: 'busStop', back: null, w: 0.6, h: 0.9, y: 2.25, twoSided: true }], 2.8);
}

/* ------------------------------------------------------------ pick-up area */

function pickup(b: Builder) {
  const P = PICKUP_CANOPY;
  const len = P.x1 - P.x0;
  const cx = (P.x0 + P.x1) / 2;
  const f = new Frame(b, [cx, SW_H, 0], 0);
  const nPosts = 6;
  for (let i = 0; i < nPosts; i++) {
    const px = -len / 2 + (len * i) / (nPosts - 1);
    f.add('solid', U.cyl12, [px, P.h / 2, P.zBack], [0.18, P.h, 0.18], '#FFFFFF');
    f.add('solid', U.cyl12, [px, 0.05, P.zBack], [0.32, 0.1, 0.32], C.poleDark);
    // cantilever beam forward + diagonal brace
    f.add('solid', U.box, [px, P.h - 0.05, (P.zBack + P.zFront) / 2], [0.12, 0.14, P.zFront - P.zBack + 0.1], '#FFFFFF');
    f.add('solid', U.box, [px, P.h - 0.55, P.zBack + 0.6], [0.08, 0.08, 1.4], '#FFFFFF', { r: [0.62, 0, 0] });
  }
  // shade sails: alternating teal / sunny yellow panels sloping towards the lay-by
  const panels = nPosts - 1;
  for (let i = 0; i < panels; i++) {
    const px = -len / 2 + (len * (i + 0.5)) / panels;
    f.add('wet', U.box, [px, P.h + 0.12, (P.zBack + P.zFront) / 2], [len / panels - 0.05, 0.06, P.zFront - P.zBack + 0.35], i % 2 ? PAL.yellow : C.teal, { r: [0.09, 0, 0] });
  }
  // front beam with the area sign above and spot numbers hanging below
  f.add('solid', U.box, [0, P.h - 0.05, P.zFront], [len + 0.2, 0.14, 0.12], '#FFFFFF');
  f.box('solid', [0, P.h + 0.48, P.zFront + 0.02], [2.7, 0.66, 0.06], '#FFFFFF');
  atlas(f, 'pickupSign', [0, P.h + 0.48, P.zFront + 0.06], [2.6, 0.62]);
  for (const s of PICKUP_SPOTS) {
    const sx = s.cx - cx;
    f.box('solid', [sx, P.h - 0.32, P.zFront], [0.03, 0.42, 0.03], C.poleDark);
    f.add('solid', U.cyl20, [sx, P.h - 0.78, P.zFront], [0.62, 0.04, 0.62], '#FFFFFF', { r: [Math.PI / 2, 0, 0] });
    atlas(f, `num${s.n}` as AtlasCell, [sx, P.h - 0.78, P.zFront + 0.025], [0.6, 0.6]);
    atlas(f, `num${s.n}` as AtlasCell, [sx, P.h - 0.78, P.zFront - 0.025], [0.6, 0.6], [0, Math.PI, 0]);
  }
  // benches facing the lay-by
  for (const x of PICKUP_BENCH_X) bench(b, x, SW_H, -9.85, 0);
  // water cooler + bin at the west end
  f.add('solid', U.rbox, [-len / 2 + 0.5, 0.55, -9.95], [0.5, 1.1, 0.45], '#E8EEF2');
  f.add('solid', U.cyl12, [-len / 2 + 0.5, 1.25, -9.95], [0.32, 0.3, 0.32], '#7CC4FA');
  f.add('solid', U.cyl12, [len / 2 - 0.4, 0.42, -9.95], [0.42, 0.84, 0.42], '#2E9E6A');
}

/* ----------------------------------------------------------------- parking */

function parking(b: Builder) {
  const PK = PARKING;
  // low walls on the east and north edges of the lot with a few palms
  b.boxMinMax('wet', [77.85, 0, -32.3], [78.25, 0.75, -7.6], C.cream);
  b.boxMinMax('wet', [77.8, 0.75, -32.35], [78.3, 0.85, -7.55], C.creamDark);
  b.boxMinMax('wet', [56.2, 0, -32.4], [78.25, 0.75, -32.0], C.cream);
  b.boxMinMax('wet', [56.15, 0.75, -32.45], [78.3, 0.85, -31.95], C.creamDark);
  for (const z of [-28, -20, -12]) palm(b, 80.4, z, 40 + z, 0, true);
  // shrub beds along the inside of the north wall, a bin at the walkway, two palms behind the wall
  [60, 65, 69, 75].forEach((x, i) => shrub(b, x, 0, -31.35, 20 + i, 1.5));
  bin(b, 57.0, SW_H, -9.4);
  for (const x of [62, 70]) palm(b, x, -34.2, 60 + x, 0, true);
  // bollards between the walkway and the west bays
  for (const z of [-14.2, -16.9, -19.6, -22.3, -25.0, -27.7, -30.4]) bollard(b, 59.55, z, 0.004);
  // a light pole in the lot
  streetLight(b, 71.6, -31.5, 1, 1.4);
  // shade structure over the east row (typical Saudi car shade)
  const zs = [-30.6, -11.3];
  for (const z of [-30.4, -23.65, -16.9, -11.5]) {
    b.add('solid', U.cyl12, [77.3, 1.3, z], [0.14, 2.6, 0.14], '#FFFFFF');
  }
  b.add('wet', U.box, [74.3, 2.62, (zs[0] + zs[1]) / 2], [6.0, 0.08, zs[1] - zs[0]], '#F5F1E8', { r: [0, 0, -0.07] });
  b.add('solid', U.box, [77.3, 2.55, (zs[0] + zs[1]) / 2], [0.14, 0.14, zs[1] - zs[0]], '#FFFFFF');
  void PK;
}

/* ------------------------------------------------------------------ mosque */

function mosque(b: Builder) {
  const M = MOSQUE;
  const P = M.plot;
  const wallH = 1.8;
  const wallT = 0.3;
  // courtyard paving
  b.rect('flat', P.x0 + wallT, P.x1 - wallT, P.z0 + wallT, P.z1 - wallT, 0.004, '#E6DCC8');
  // boundary wall with Najdi crenellations
  const wall = (x0: number, z0: number, x1: number, z1: number) => {
    b.boxMinMax('wet', [x0, 0, z0], [x1, wallH, z1], C.cream);
    b.boxMinMax('wet', [x0 - 0.04, wallH, z0 - 0.04], [x1 + 0.04, wallH + 0.1, z1 + 0.04], C.creamDark);
    const alongX = x1 - x0 > z1 - z0;
    const L = alongX ? x1 - x0 : z1 - z0;
    const n = Math.floor(L / 0.7);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const px = alongX ? x0 + L * t : (x0 + x1) / 2;
      const pz = alongX ? (z0 + z1) / 2 : z0 + L * t;
      b.add('wet', U.cone8, [px, wallH + 0.3, pz], [0.34, 0.4, 0.34], C.cream);
    }
  };
  wall(P.x0, P.z0, P.x1, P.z0 + wallT); // north
  wall(P.x0, P.z0, P.x0 + wallT, P.z1); // west
  wall(P.x1 - wallT, P.z0, P.x1, P.z1 - 3.4); // east (minaret sits at the SE corner)
  wall(P.x0, P.z1 - wallT, M.gate.x0, P.z1); // south, west of the gate
  wall(M.gate.x1, P.z1 - wallT, P.x1 - 3.4, P.z1); // south, east of the gate
  // gate: two pillars and an arch with the name plate
  for (const gx of [M.gate.x0 - 0.25, M.gate.x1 + 0.25]) {
    b.boxMinMax('wet', [gx - 0.35, 0, P.z1 - 0.45], [gx + 0.35, 3.2, P.z1 + 0.15], C.cream);
    b.add('wet', U.cone8, [gx, 3.45, P.z1 - 0.15], [0.5, 0.5, 0.5], C.creamDark);
  }
  b.boxMinMax('wet', [M.gate.x0 - 0.6, 2.9, P.z1 - 0.4], [M.gate.x1 + 0.6, 3.2, P.z1 + 0.1], C.cream);
  atlas(b, 'mosqueName', [(M.gate.x0 + M.gate.x1) / 2, 2.55, P.z1 + 0.13], [2.6, 0.62]);
  // open green gate leaves folded against the inside of the wall
  for (const [gx, rot] of [
    [M.gate.x0 + 0.1, -1.35],
    [M.gate.x1 - 0.1, 1.35],
  ] as const) {
    const g = new Frame(b, [gx, 0, P.z1 - 0.2], rot);
    for (let i = 0; i < 6; i++) g.box('solid', [0.08, 1.0, -0.15 - i * 0.32], [0.04, 1.9, 0.05], C.green);
    g.box('solid', [0.08, 1.9, -0.95], [0.05, 0.08, 1.95], C.green);
    g.box('solid', [0.08, 0.15, -0.95], [0.05, 0.08, 1.95], C.green);
  }

  // prayer hall
  const H = M.hall;
  const hx = (H.x0 + H.x1) / 2;
  const hz = (H.z0 + H.z1) / 2;
  b.boxMinMax('wet', [H.x0, 0, H.z0], [H.x1, H.h, H.z1], C.cream);
  b.boxMinMax('wet', [H.x0 - 0.15, 0, H.z0 - 0.15], [H.x1 + 0.15, 0.35, H.z1 + 0.15], C.creamDark);
  // roof parapet + merlons
  b.boxMinMax('wet', [H.x0 - 0.1, H.h, H.z0 - 0.1], [H.x1 + 0.1, H.h + 0.12, H.z1 + 0.1], C.creamDark);
  const hallSides: [number, number, number, number][] = [
    [H.x0, H.z0, H.x1, H.z0],
    [H.x0, H.z1, H.x1, H.z1],
    [H.x0, H.z0, H.x0, H.z1],
    [H.x1, H.z0, H.x1, H.z1],
  ];
  for (const [x0, z0, x1, z1] of hallSides) {
    const L = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.floor(L / 0.8);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      b.add('wet', U.cone8, [x0 + (x1 - x0) * t, H.h + 0.38, z0 + (z1 - z0) * t], [0.42, 0.5, 0.42], C.cream);
    }
  }
  // geometric frieze band near the top on all four sides
  const band = (x: number, z: number, rot: number, along: number) => {
    const n = Math.round(along / 1.2);
    const f = new Frame(b, [x, 0, z], rot);
    for (let i = 0; i < n; i++) atlas(f, 'pattern', [-along / 2 + (i + 0.5) * (along / n), H.h - 0.55, 0.012], [along / n, (along / n) / 2]);
  };
  band(hx, H.z1, 0, H.x1 - H.x0);
  band(hx, H.z0, Math.PI, H.x1 - H.x0);
  band(H.x0, hz, -Math.PI / 2, H.z1 - H.z0);
  band(H.x1, hz, Math.PI / 2, H.z1 - H.z0);
  // arched windows
  const win = (x: number, z: number, rot: number) => atlas(new Frame(b, [x, 0, z], rot), 'mosqueWindow', [0, 2.05, 0.014], [0.95, 1.9]);
  for (const x of [-93.2, -85.0]) win(x, H.z1, 0);
  for (const x of [-93, -89, -85]) win(x, H.z0, Math.PI);
  for (const z of [-26.5, -22.5, -18.5]) {
    win(H.x0, z, -Math.PI / 2);
    win(H.x1, z, Math.PI / 2);
  }
  // entrance portico on the south facade: three arches
  const pz0 = H.z1;
  const pz1 = H.z1 + 2.4;
  const px0 = hx - 4.2;
  const px1 = hx + 4.2;
  b.boxMinMax('wet', [px0 - 0.1, 3.4, pz0], [px1 + 0.1, 3.75, pz1 + 0.1], C.cream);
  b.boxMinMax('wet', [px0 - 0.15, 3.75, pz0], [px1 + 0.15, 3.87, pz1 + 0.15], C.creamDark);
  const archW = (px1 - px0) / 3;
  for (let i = 0; i <= 3; i++) {
    const x = px0 + archW * i;
    b.boxMinMax('wet', [x - 0.25, 0, pz1 - 0.5], [x + 0.25, 3.4, pz1], C.cream);
  }
  for (let i = 0; i < 3; i++) {
    const x = px0 + archW * (i + 0.5);
    // spandrel above each arch, then the arch curve cut-out look via a darker half-disc
    b.boxMinMax('wet', [x - archW / 2, 2.55, pz1 - 0.5], [x + archW / 2, 3.4, pz1], C.cream);
    b.add('solid', U.halfCyl, [x, 2.0, pz1 - 0.25], [archW - 0.5, archW - 0.5, 0.52], '#E9DDC5');
  }
  b.rect('flat', px0, px1, pz0, pz1, 0.36, '#D9CDB7');
  b.boxMinMax('wet', [px0, 0, pz0], [px1, 0.36, pz1], C.creamDark);
  atlas(b, 'mosqueDoor', [hx, 1.6 + 0.36, H.z1 + 0.015], [1.9, 2.85]);
  for (const x of [hx - 2.8, hx + 2.8]) atlas(b, 'mosqueWindow', [x, 2.0, H.z1 + 0.015], [0.8, 1.6]);
  // dome on a drum with a crescent finial
  const [dx, dy, dz] = M.dome;
  b.add('wet', U.cyl20, [dx, dy + 0.45, dz], [6.6, 0.9, 6.6], C.cream);
  b.add('wet', U.cyl20, [dx, dy + 0.95, dz], [6.9, 0.12, 6.9], C.creamDark);
  b.add('wet', U.hemi, [dx, dy + 1.0, dz], [6.3, 7.4, 6.3], C.green);
  b.add('solid', U.cyl8, [dx, dy + 4.9, dz], [0.12, 0.6, 0.12], C.gold);
  b.add('solid', U.sphereLo, [dx, dy + 5.25, dz], [0.3, 0.3, 0.3], C.gold);
  b.add('solid', new THREE.TorusGeometry(0.32, 0.07, 6, 14, Math.PI * 1.35), [dx, dy + 5.85, dz], [1, 1, 1], C.gold, { r: [0, 0, Math.PI * 0.82] });
  // small corner domes on the roof
  for (const [cx, cz] of [
    [H.x0 + 1.2, H.z0 + 1.2],
    [H.x1 - 1.2, H.z0 + 1.2],
  ]) {
    b.add('wet', U.cyl12, [cx, H.h + 0.35, cz], [1.4, 0.7, 1.4], C.cream);
    b.add('wet', U.hemi, [cx, H.h + 0.7, cz], [1.4, 1.4, 1.4], C.green);
  }

  // minaret at the south-east corner of the plot
  const [mx, mz] = M.minaret;
  b.boxMinMax('wet', [mx - 1.3, 0, mz - 1.3], [mx + 1.3, 4.2, mz + 1.3], C.cream);
  b.boxMinMax('wet', [mx - 1.4, 4.2, mz - 1.4], [mx + 1.4, 4.4, mz + 1.4], C.creamDark);
  for (const [x, z, rot] of [
    [mx, mz + 1.3, 0],
    [mx + 1.3, mz, Math.PI / 2],
    [mx - 1.3, mz, -Math.PI / 2],
  ] as const)
    atlas(new Frame(b, [x, 0, z], rot), 'mosqueStar', [0, 3.2, 0.014], [0.9, 0.9]);
  b.add('wet', U.cyl8, [mx, 8.4, mz], [2.0, 8.0, 2.0], C.cream);
  b.add('wet', U.cyl8, [mx, 9.6, mz], [2.06, 0.5, 2.06], C.green);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    atlas(new Frame(b, [mx + Math.sin(a) * 0.93, 0, mz + Math.cos(a) * 0.93], a), 'mosqueWindow', [0, 7.0, 0.01], [0.35, 0.7]);
  }
  // balcony
  b.add('wet', U.cyl8, [mx, 12.5, mz], [3.0, 0.3, 3.0], C.creamDark);
  b.add('solid', U.cyl8, [mx, 12.95, mz], [2.9, 0.6, 2.9], C.green);
  b.add('solid', U.cyl8, [mx, 13.27, mz], [3.0, 0.06, 3.0], C.cream);
  b.add('wet', U.cyl8, [mx, 14.6, mz], [1.5, 3.4, 1.5], C.cream);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    atlas(new Frame(b, [mx + Math.sin(a) * 0.7, 0, mz + Math.cos(a) * 0.7], a), 'mosqueWindow', [0, 14.6, 0.01], [0.38, 0.9]);
  }
  b.add('wet', U.cyl8, [mx, 16.4, mz], [1.8, 0.25, 1.8], C.creamDark);
  b.add('wet', U.cone8, [mx, 17.5, mz], [1.6, 2.0, 1.6], C.green);
  b.add('solid', U.sphereLo, [mx, 18.6, mz], [0.24, 0.24, 0.24], C.gold);
  b.add('solid', new THREE.TorusGeometry(0.24, 0.05, 6, 14, Math.PI * 1.35), [mx, 19.05, mz], [1, 1, 1], C.gold, { r: [0, 0, Math.PI * 0.82] });

  // palms in the courtyard
  palm(b, -96.4, -11.3, 51, 0, false);
  palm(b, -96.4, -30.3, 52, 0, false);
  palm(b, -80.0, -30.3, 53, 0, false);
  palm(b, -80.2, -17.0, 54, 0, false);
  // shoe rack + low bench under the portico
  b.add('wet', U.rbox, [hx + 3.2, 0.36 + 0.3, H.z1 + 0.5], [1.4, 0.6, 0.4], C.wood);
}

/** Build every static part of the street set. */
export function buildStreetStatic(b: Builder) {
  roads(b);
  sidewalks(b);
  markings(b);
  furniture(b);
  busStop(b);
  pickup(b);
  parking(b);
  mosque(b);
}
