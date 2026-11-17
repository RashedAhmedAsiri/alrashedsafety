// OWNER: props worker. Cartoon cars (sedan / SUV / pickup by seed). Origin at ground level under the
// centre of the car, facing +X, +Z is the right side, the driver sits on the LEFT (-Z).
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { StaticPerson } from '../characters/Human';
import { mat } from '../world/kit';
import { weatherBlend } from '../weather';
import { GeoBuilder, LGEO, basic, cached, trs, vcMat } from './geo';
import { blobShadowTexture, plateTexture, softDotTexture } from './textures';
import { CAR_SPECS, carType, type CarType } from './points';

export interface CarProps {
  color?: string;
  lights?: 'off' | 'head' | 'reverse' | 'brake';
  wipers?: boolean;
  driver?: boolean;
  seed?: number;
  /** Force a body style instead of choosing by seed. */
  body?: CarType;
  /** Door openness 0..1 by door: fl/rl on the left (street) side, fr/rr on the right. Giving this prop makes the doors real. */
  doors?: Partial<Record<'fl' | 'fr' | 'rl' | 'rr', number>>;
}

export const CAR_COLORS = ['#F4F4F0', '#2F5E8E', '#8E2E2E', '#C8B89A', '#5B6470', '#2F4AA8', '#E5484D', '#1F2A36', '#3E7D5A', '#C9D6E2'];

const TRIM = '#23272E';
const CHROME = '#C9D1DA';
const SEAT = '#4B525E';
const WHITE = '#FFFFFF';

type V2 = [number, number];
type DoorKey = 'fl' | 'fr' | 'rl' | 'rr';

/** One door's closed panel: the body skin, its handle and its window (hidden while the door leaf swings open). */
interface DoorPanel {
  paint: THREE.BufferGeometry;
  trim: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
}

interface CarGeo {
  /** body with every door panel merged in (cars without door control) */
  paint: THREE.BufferGeometry;
  trim: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  /** the same without the door panels (door-capable cars draw `panels` separately) */
  paintFixed: THREE.BufferGeometry;
  trimFixed: THREE.BufferGeometry;
  glassFixed: THREE.BufferGeometry;
  panels: Partial<Record<DoorKey, DoorPanel>>;
  wheel: THREE.BufferGeometry; // one axle pair (z = +-)
  headGlow: THREE.BufferGeometry;
  tailGlow: THREE.BufferGeometry;
  revGlow: THREE.BufferGeometry;
  leafPaint: THREE.BufferGeometry; // door leaf (right side, hinge at origin, extends -x)
  leafGlass: THREE.BufferGeometry;
  leafTrim: THREE.BufferGeometry;
}

/** Clip a polygon to the half-plane a*x + b*y <= c (Sutherland-Hodgman). */
function clipHalf(pts: V2[], a: number, b: number, c: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const dp = a * p[0] + b * p[1] - c;
    const dq = a * q[0] + b * q[1] - c;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
/** The part of a side profile inside x0..x1 (and y0..y1). */
const clipBox = (pts: V2[], x0: number, x1: number, y0 = -1e9, y1 = 1e9) =>
  clipHalf(clipHalf(clipHalf(clipHalf(pts, -1, 0, -x0), 1, 0, x1), 0, -1, -y0), 0, 1, y1);
const area = (pts: V2[]) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

/** The driver's seat sits this much lower than the others (a grown-up's head must clear the sedan's roof). */
const DRIVER_DROP: Record<CarType, number> = { sedan: 0.1, suv: 0, pickup: 0.04 };

function buildCar(type: CarType): CarGeo {
  const S = CAR_SPECS[type];
  const { L, W, wheelR, wheelX, lower, cabin, roofY, pillarZ, beltY } = S;
  const hw = W / 2;
  const P = new GeoBuilder();
  const T = new GeoBuilder();
  const G = new GeoBuilder();
  const H = new GeoBuilder();
  const R = new GeoBuilder();
  const E = new GeoBuilder();

  const cab = cabin; // [front base, front top, rear top, rear base]
  const cx0 = cab[3][0]; // the cabin (open, hollow) runs from the rear window base ...
  const cx1 = cab[0][0]; // ... to the windscreen base
  const doorKeys: DoorKey[] = type === 'pickup' ? ['fl', 'fr'] : ['fl', 'fr', 'rl', 'rr'];
  const doorRange = (k: DoorKey): [number, number] => {
    const h = k[0] === 'f' ? S.doorHinge[0] : S.doorHinge[1];
    return [h - S.doorLen, h];
  };
  const DOOR_Y = 0.42; // bottom of the door opening (the sill stays)
  const panelB: Record<string, { P: GeoBuilder; T: GeoBuilder; G: GeoBuilder }> = {};
  for (const k of doorKeys) panelB[k] = { P: new GeoBuilder(), T: new GeoBuilder(), G: new GeoBuilder() };
  const doorAt = (x: number, s: number) => doorKeys.find((k) => (k[1] === 'r' ? 1 : -1) === s && x > doorRange(k)[0] && x < doorRange(k)[1]);

  // ---- paint: hood and tail as solid blocks, the cabin as a hollow tub (two side walls + a floor),
  // so the seats, the dashboard and the people in them show through the windows.
  const solid = (pts: V2[]) => {
    if (pts.length >= 3 && area(pts) > 0.005) P.profile(pts, W - 0.06, WHITE, 0, 0.03);
  };
  solid(clipBox(lower, cx1, 1e9));
  solid(clipBox(lower, -1e9, cx0));
  const WT = 0.08; // side wall thickness
  for (const s of [-1, 1]) {
    const zc = s * (hw - 0.03 - WT / 2);
    const wall = (b: GeoBuilder, pts: V2[]) => {
      if (pts.length >= 3 && area(pts) > 0.002) b.profile(pts, WT, WHITE, zc, 0.03);
    };
    const mine = doorKeys.filter((k) => (k[1] === 'r' ? 1 : -1) === s).map((k) => ({ k, r: doorRange(k) })).sort((a, b) => a.r[0] - b.r[0]);
    let x = cx0;
    for (const d of mine) {
      const d0 = Math.max(cx0, d.r[0]);
      const d1 = Math.min(cx1, d.r[1]);
      if (d0 > x) wall(P, clipBox(lower, x, d0));
      wall(P, clipBox(lower, d0, d1, -1e9, DOOR_Y)); // sill under the door
      wall(panelB[d.k].P, clipBox(lower, d0, d1, DOOR_Y, 1e9));
      x = d1;
    }
    if (cx1 > x) wall(P, clipBox(lower, x, cx1));
  }
  // cabin back wall (behind the rear seat; the pickup bed starts behind it)
  P.box([cx0 + 0.05, (0.36 + beltY) / 2, 0], [0.1, beltY - 0.36, W - 0.14], WHITE);
  const roofX0 = cab[2][0];
  const roofX1 = cab[1][0];
  P.rbox([(roofX0 + roofX1) / 2, roofY + 0.04, 0], [roofX1 - roofX0 + 0.14, 0.1, W - 0.2], WHITE, undefined, true);
  for (const s of [-1, 1]) {
    P.beam([cab[0][0], cab[0][1], s * pillarZ], [cab[1][0], roofY, s * pillarZ], 0.07, WHITE);
    P.beam([cab[3][0], cab[3][1], s * pillarZ], [cab[2][0], roofY, s * pillarZ], 0.08, WHITE);
    const bx = (cab[1][0] + cab[2][0]) / 2 + S.bPillarOff;
    P.box([bx, (beltY + roofY) / 2, s * pillarZ], [0.08, roofY - beltY, 0.07], WHITE);
    // mirror
    P.rbox([cab[0][0] - 0.08, beltY + 0.12, s * (hw + 0.1)], [0.1, 0.12, 0.16], WHITE, undefined, true);
  }
  // bed walls for the pickup
  if (S.bed) {
    const b = S.bed;
    const bl = b.x1 - b.x0;
    P.box([b.x0 + bl / 2, b.floorY, 0], [bl, 0.08, W - 0.1], WHITE);
    for (const s of [-1, 1]) P.rbox([b.x0 + bl / 2, b.floorY + b.wall / 2, s * (hw - 0.04)], [bl, b.wall, 0.08], WHITE, undefined, true);
    P.rbox([b.x0 - 0.0, b.floorY + b.wall / 2, 0], [0.08, b.wall, W - 0.1], WHITE, undefined, true);
    P.rbox([b.x1 + 0.0, b.floorY + b.wall / 2, 0], [0.08, b.wall, W - 0.1], WHITE, undefined, true);
    T.box([b.x0 + bl / 2, b.floorY + 0.045, 0], [bl - 0.12, 0.02, W - 0.18], '#3A3E46');
  }

  // ---- glass: thin panes (windscreen, rear window, side windows; door windows go with their door)
  const gl: V2[] = [
    [cab[0][0] - 0.05, cab[0][1] + 0.03],
    [cab[1][0] + 0.01, roofY - 0.05],
    [cab[2][0] - 0.01, roofY - 0.05],
    [cab[3][0] + 0.06, cab[3][1] + 0.03],
  ];
  const pz = pillarZ - 0.01;
  G.poly([[gl[0][0], gl[0][1], -pz], [gl[0][0], gl[0][1], pz], [gl[1][0], gl[1][1], pz], [gl[1][0], gl[1][1], -pz]], WHITE, 0.012);
  G.poly([[gl[3][0], gl[3][1], pz], [gl[3][0], gl[3][1], -pz], [gl[2][0], gl[2][1], -pz], [gl[2][0], gl[2][1], pz]], WHITE, 0.012);
  for (const s of [-1, 1]) {
    const pane = (b: GeoBuilder, pts: V2[]) => {
      if (pts.length >= 3 && area(pts) > 0.002) b.profile(pts, 0.014, WHITE, s * pz, 0);
    };
    const mine = doorKeys.filter((k) => (k[1] === 'r' ? 1 : -1) === s).map((k) => ({ k, r: doorRange(k) })).sort((a, b) => a.r[0] - b.r[0]);
    let x = -1e9;
    for (const d of mine) {
      if (d.r[0] > x) pane(G, clipBox(gl, x, d.r[0]));
      pane(panelB[d.k].G, clipBox(gl, d.r[0], d.r[1]));
      x = d.r[1];
    }
    pane(G, clipBox(gl, x, 1e9));
  }

  // ---- trim: bumpers, grille, lamps (off), sills, door seams, wheel arches, plates mounts
  const fx = L / 2;
  T.rbox([fx - 0.02, 0.42, 0], [0.16, 0.2, W - 0.02], TRIM, undefined, true);
  T.rbox([-fx + 0.02, 0.42, 0], [0.16, 0.2, W - 0.02], TRIM, undefined, true);
  T.box([fx - 0.0, 0.64, 0], [0.04, 0.16, 0.72], '#17191E'); // grille
  T.box([0, 0.34, 0], [L - 0.5, 0.05, W - 0.04], TRIM); // sill / underbody
  for (const [wx] of [[wheelX[0]], [wheelX[1]]]) {
    for (const s of [-1, 1]) T.cyl([wx, wheelR, s * (hw - 0.025)], [wheelR * 2 + 0.14, 0.03, wheelR * 2 + 0.14], '#15171B', [Math.PI / 2, 0, 0]);
  }
  // door seams (thin dark lines) on both sides
  const seams = S.seams;
  for (const s of [-1, 1])
    for (const sx of seams) T.box([sx, (0.42 + beltY) / 2 + 0.02, s * (hw - 0.015)], [0.025, beltY - 0.4, 0.02], '#14161A');
  // door handles (on the door panel they belong to)
  for (const s of [-1, 1])
    for (const hx of S.handles) {
      const k = doorAt(hx, s);
      (k ? panelB[k].T : T).rbox([hx, beltY - 0.07, s * (hw + 0.005)], [0.16, 0.03, 0.03], CHROME, undefined, true);
    }
  // lamps (dark, when off) and tail lamps
  for (const s of [-1, 1]) {
    T.rbox([fx + 0.005, S.lampY, s * (hw - 0.3)], [0.05, 0.13, 0.3], '#E9EEF3', undefined, true);
    T.rbox([-fx - 0.005, S.lampY, s * (hw - 0.26)], [0.05, 0.13, 0.26], '#6E1F26', undefined, true);
  }
  // plates
  T.rbox([fx + 0.01, 0.45, 0], [0.03, 0.15, 0.5], '#17191E');
  T.rbox([-fx - 0.01, 0.45, 0], [0.03, 0.15, 0.5], '#17191E');

  // ---- interior: carpet floor, wheel wells, seats, dashboard, console, steering wheel
  const fsx = S.seatX[0];
  const rsx = S.seatX[1];
  const inZ = hw - 0.03 - WT; // inner face of the side walls
  E.box([(cx1 + cx0) / 2, 0.36, 0], [cx1 - cx0, 0.1, 2 * inZ + 0.02], '#3A3F49'); // floor (top 0.41)
  for (const wx of wheelX) {
    const a = Math.max(cx0, wx - wheelR - 0.07);
    const b = Math.min(cx1, wx + wheelR + 0.07);
    if (b - a < 0.05) continue;
    for (const s of [-1, 1]) E.rbox([(a + b) / 2, (0.41 + wheelR * 2 + 0.06) / 2, s * (inZ - 0.09)], [b - a, wheelR * 2 + 0.06 - 0.41, 0.2], '#30343C', undefined, true);
  }
  const sy = S.floorY + 0.28; // cushion centre
  const seatRow = (x: number, z: number, w: number, dy = 0) => {
    const y = sy - dy;
    E.rbox([x, y, z], [0.5, 0.12, w], SEAT, undefined, true);
    E.box([x, (0.41 + y) / 2, z], [0.42, y - 0.41, w - 0.08], '#30343C'); // seat base down to the floor
    E.rbox([x - 0.22, y + 0.3, z], [0.1, 0.6, w], SEAT, [0, 0, -0.12], true);
    E.rbox([x - 0.22, y + 0.66, z], [0.07, 0.14, w * 0.6], '#3C424C', undefined, true);
  };
  seatRow(fsx, -0.4, 0.5, DRIVER_DROP[type]);
  seatRow(fsx, 0.4, 0.5);
  seatRow(rsx, 0, Math.min(1.4, 2 * inZ - 0.04));
  // parcel shelf behind the rear bench (sedan: under the rear window)
  if (type === 'sedan') E.box([(cx0 + rsx - 0.26) / 2, beltY - 0.02, 0], [rsx - 0.26 - cx0, 0.04, 2 * inZ], '#2C3038');
  // centre console + gear lever between the front seats
  E.rbox([fsx + 0.12, S.floorY + 0.22, 0], [0.62, 0.3, 0.22], '#2C3038', undefined, true);
  E.beam([fsx + 0.32, S.floorY + 0.36, 0], [fsx + 0.3, S.floorY + 0.48, 0], 0.025, '#14161A', true);
  E.sphere([fsx + 0.3, S.floorY + 0.5, 0], [0.06, 0.06, 0.06], '#14161A', undefined, true);
  // dashboard: from the windscreen base back over the knees, an instrument hood in front of the driver
  const dx0 = fsx + 0.68;
  E.rbox([(dx0 + cx1 + 0.04) / 2, (0.5 + beltY + 0.04) / 2, 0], [cx1 + 0.04 - dx0, beltY + 0.04 - 0.5, 2 * inZ], '#2C3038', undefined, true);
  E.box([(dx0 + cx1) / 2 + 0.02, beltY + 0.035, 0], [cx1 - dx0 - 0.06, 0.02, 2 * inZ - 0.02], '#23262D'); // dash top
  E.rbox([dx0 + 0.08, beltY + 0.07, -0.4], [0.16, 0.08, 0.36], '#1E2127', undefined, true); // instrument hood
  E.rbox([dx0 - 0.03, (S.floorY + 0.5 + 0.5) / 2 - 0.02, 0], [0.08, 0.18, 2 * inZ - 0.06], '#30343C', undefined, true); // knee panel
  E.box([dx0 - 0.005, beltY - 0.12, 0.05], [0.02, 0.1, 0.18], '#4C5A6A'); // centre screen
  // steering wheel, facing the driver and tilted back, on its column
  const swc = new THREE.Vector3(fsx + 0.57, S.floorY + 0.72 - DRIVER_DROP[type] * 0.6, -0.4);
  const swAxis = new THREE.Vector3(0.88, -0.47, 0).normalize();
  E.add(LGEO.torus, '#14161A', new THREE.Matrix4().compose(swc, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), swAxis), new THREE.Vector3(0.36, 0.36, 0.36)));
  E.beam([swc.x, swc.y, swc.z], [swc.x + swAxis.x * 0.28, swc.y + swAxis.y * 0.28, swc.z], 0.05, '#14161A', true);

  // ---- wheels (an axle pair around origin; caller positions the group)
  const Wb = new GeoBuilder();
  for (const s of [-1, 1]) {
    const z = s * (hw - 0.1);
    Wb.cyl([0, 0, z], [wheelR * 2, 0.24, wheelR * 2], '#1B1D22', [Math.PI / 2, 0, 0]);
    Wb.cyl([0, 0, z + s * 0.125], [wheelR * 1.15, 0.02, wheelR * 1.15], '#C3CAD3', [Math.PI / 2, 0, 0]);
    Wb.cyl([0, 0, z + s * 0.14], [wheelR * 0.4, 0.02, wheelR * 0.4], '#7C8591', [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      Wb.box([Math.cos(a) * wheelR * 0.38, Math.sin(a) * wheelR * 0.38, z + s * 0.135], [0.05, 0.05, 0.02], '#3A3F49');
    }
  }

  // ---- glow shapes
  for (const s of [-1, 1]) {
    H.rbox([fx + 0.03, S.lampY, s * (hw - 0.3)], [0.05, 0.12, 0.28], WHITE, undefined, true);
    R.rbox([-fx - 0.035, S.lampY, s * (hw - 0.26)], [0.05, 0.12, 0.24], WHITE, undefined, true);
  }
  const V = new GeoBuilder();
  for (const s of [-1, 1]) V.rbox([-fx - 0.04, S.lampY - 0.1, s * (hw - 0.52)], [0.04, 0.07, 0.1], WHITE, undefined, true);

  // ---- door leaf: hinge at origin (x=0,z=0 plane), swings about Y; extends toward -x, y absolute
  const lw = S.doorLen;
  const LP = new GeoBuilder();
  const LG = new GeoBuilder();
  const LT = new GeoBuilder();
  LP.rbox([-lw / 2, (0.42 + beltY) / 2, 0.035], [lw, beltY - 0.42, 0.07], WHITE, undefined, true);
  LP.box([-lw / 2, roofY - 0.04, 0.0], [lw, 0.07, 0.05], WHITE); // top frame
  LP.box([-lw + 0.03, (beltY + roofY) / 2, 0], [0.06, roofY - beltY, 0.05], WHITE);
  LP.box([-0.03, (beltY + roofY) / 2, 0], [0.06, roofY - beltY, 0.05], WHITE);
  LG.box([-lw / 2, (beltY + roofY - 0.06) / 2, 0.0], [lw - 0.1, roofY - beltY - 0.1, 0.012], WHITE);
  LT.box([-lw / 2, (0.48 + beltY - 0.04) / 2, -0.004], [lw - 0.12, beltY - 0.52, 0.012], '#4B525E'); // inner door card
  LT.rbox([-lw / 2 - 0.05, beltY - 0.2, -0.03], [0.4, 0.05, 0.06], '#3A3F49', undefined, true); // armrest
  LT.rbox([-lw + 0.12, beltY - 0.07, 0.075], [0.16, 0.03, 0.03], CHROME, undefined, true); // outer handle

  const paintFixed = P.build();
  const trimFixed = mergeGeometries([T.build(), E.build()], false)!;
  const glassFixed = G.build();
  const panels: Partial<Record<DoorKey, DoorPanel>> = {};
  for (const k of doorKeys) panels[k] = { paint: panelB[k].P.build(), trim: panelB[k].T.build(), glass: panelB[k].G.build() };
  const all = (base: THREE.BufferGeometry, pick: (p: DoorPanel) => THREE.BufferGeometry) =>
    mergeGeometries([base, ...doorKeys.map((k) => pick(panels[k]!)).filter((g) => g.attributes.position.count > 0)], false)!;

  return {
    paint: all(paintFixed, (p) => p.paint),
    trim: all(trimFixed, (p) => p.trim),
    glass: all(glassFixed, (p) => p.glass),
    paintFixed,
    trimFixed,
    glassFixed,
    panels,
    wheel: Wb.build(),
    headGlow: H.build(),
    tailGlow: R.build(),
    revGlow: V.build(),
    leafPaint: LP.build(),
    leafGlass: LG.build(),
    leafTrim: LT.build(),
  };
}

const geoFor = (type: CarType) => cached(`car:${type}`, () => buildCar(type));

const glassMat = new THREE.MeshStandardMaterial({ color: '#7FB6D6', roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.32, depthWrite: false });
const headLit = basic('#FFF4C2');
const tailLit = basic('#FF2B2B');
const tailDim = basic('#B3202A', { opacity: 0.85 });
const revLit = basic('#FFFFFF');
const wiperMat = mat('#16181C');
const hoodGeo = new THREE.BoxGeometry(1, 1, 1);

/** Spins wheel groups from the car's actual movement (works for driven and scripted cars). */
function useWheelSpin(root: React.RefObject<THREE.Group | null>, wheels: React.RefObject<THREE.Group | null>[], radius: number) {
  const last = useRef(new THREE.Vector3());
  const has = useRef(false);
  const ang = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const g = root.current;
    if (!g) return;
    g.getWorldPosition(tmp);
    if (has.current) {
      const dx = tmp.x - last.current.x;
      const dz = tmp.z - last.current.z;
      g.getWorldDirection(fwd); // +Z of the group; our forward is +X
      const fx = fwd.z; // local +X in world = (cos, 0, -sin); getWorldDirection gives local +Z -> (sin,0,cos)
      const fz = -fwd.x;
      const d = dx * fx + dz * fz;
      if (Math.abs(d) < 3) ang.current -= d / radius;
    }
    last.current.copy(tmp);
    has.current = true;
    for (const w of wheels) if (w.current) w.current.rotation.z = ang.current;
  });
}

/** Body pitch (nose dips braking, squats pulling away), a little road roll and idle engine shake, from the real movement. */
function useSuspension(root: React.RefObject<THREE.Group | null>, sus: React.RefObject<THREE.Group | null>, pivotY: number) {
  const last = useRef(new THREE.Vector3());
  const has = useRef(false);
  const spd = useRef(0);
  const acc = useRef(0);
  const pitch = useRef(0);
  const roll = useRef(0);
  const phase = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((st, dt) => {
    const g = root.current;
    const b = sus.current;
    if (!g || !b || dt <= 0 || dt > 0.2) return;
    g.getWorldPosition(tmp);
    if (!has.current) last.current.copy(tmp);
    has.current = true;
    const v = Math.min(30, Math.hypot(tmp.x - last.current.x, tmp.z - last.current.z) / dt);
    last.current.copy(tmp);
    const a = (v - spd.current) / dt;
    spd.current += (v - spd.current) * Math.min(1, dt * 8);
    acc.current += (Math.max(-9, Math.min(9, a)) - acc.current) * Math.min(1, dt * 3);
    const moving = Math.min(1, spd.current / 1.5);
    phase.current += dt * (7 + spd.current * 1.8);
    const pT = Math.max(-0.05, Math.min(0.035, acc.current * 0.009)) + moving * 0.004 * Math.sin(phase.current);
    const rT = moving * 0.006 * Math.sin(phase.current * 0.7 + 1);
    pitch.current += (pT - pitch.current) * Math.min(1, dt * 8);
    roll.current += (rT - roll.current) * Math.min(1, dt * 8);
    b.rotation.z = pitch.current;
    b.rotation.x = roll.current;
    b.position.y = pivotY + 0.0018 * Math.sin(st.clock.elapsedTime * 42) + moving * 0.005 * Math.sin(phase.current * 1.9);
  });
}

export function CarModel({ color, lights = 'off', wipers = false, driver = false, seed = 0, body, doors }: CarProps) {
  const type = body ?? carType(seed);
  const S = CAR_SPECS[type];
  const g = geoFor(type);
  const col = color ?? CAR_COLORS[Math.abs(seed) % CAR_COLORS.length];
  const root = useRef<THREE.Group>(null);
  const wf = useRef<THREE.Group>(null);
  const wr = useRef<THREE.Group>(null);
  const sus = useRef<THREE.Group>(null);
  useWheelSpin(root, [wf, wr], S.wheelR);
  useSuspension(root, sus, 0.35);
  const paintMat = useMemo(() => mat(col, { rough: 0.35, metal: 0.12 }), [col]);
  const plate = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: plateTexture(seed), roughness: 0.6 });
    return m;
  }, [seed]);
  useEffect(() => () => plate.dispose(), [plate]);
  const doorCapable = !!doors;
  const wiperL = useRef<THREE.Group>(null);
  const wiperR = useRef<THREE.Group>(null);
  const leaf = useRef<Record<string, THREE.Group | null>>({});
  const panels = useRef<Record<string, THREE.Group | null>>({});
  const doorState = useRef<Record<string, number>>({ fl: 0, fr: 0, rl: 0, rr: 0 });
  const doorsRef = useRef(doors);
  doorsRef.current = doors;
  const wipersRef = useRef(wipers);
  wipersRef.current = wipers;
  const hw = S.W / 2;

  useFrame((st, dt) => {
    // wipers: on when asked, or while it rains hard
    const on = wipersRef.current;
    const k = on ? 0.5 + 0.5 * Math.sin(st.clock.elapsedTime * 5.5) : 0;
    if (wiperL.current) wiperL.current.rotation.y = -(k * 1.2 - 0.1);
    if (wiperR.current) wiperR.current.rotation.y = -(k * 1.2 - 0.1);
    if (doorsRef.current) {
      for (const key of ['fl', 'fr', 'rl', 'rr'] as const) {
        const target = doorsRef.current[key] ?? 0;
        const cur = doorState.current[key];
        const nx = cur + (target - cur) * Math.min(1, dt * 6);
        doorState.current[key] = nx;
        const lf = leaf.current[key];
        const side = key[1] === 'r' ? 1 : -1;
        if (lf) {
          lf.visible = nx > 0.015;
          lf.rotation.y = side * nx * 1.15;
        }
        const pn = panels.current[key];
        if (pn) pn.visible = nx <= 0.015;
      }
    }
  });

  const hingeX = (key: string) => (key[0] === 'f' ? S.doorHinge[0] : S.doorHinge[1]);

  return (
    <group ref={root}>
      {/* contact shadow */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} scale={[S.L * 1.18, S.W * 1.3, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={blobShadowTexture()} transparent depthWrite={false} opacity={0.75} />
      </mesh>
      <group ref={wf} position={[S.wheelX[0], S.wheelR, 0]}>
        <mesh geometry={g.wheel} material={vcMat(0.8)} castShadow />
      </group>
      <group ref={wr} position={[S.wheelX[1], S.wheelR, 0]}>
        <mesh geometry={g.wheel} material={vcMat(0.8)} castShadow />
      </group>
      <group ref={sus} position={[0, 0.35, 0]}>
        <group position={[0, -0.35, 0]}>
      <mesh geometry={doorCapable ? g.paintFixed : g.paint} material={paintMat} castShadow />
      <mesh geometry={doorCapable ? g.trimFixed : g.trim} material={vcMat(0.7, 0.05)} castShadow />
      <mesh geometry={doorCapable ? g.glassFixed : g.glass} material={glassMat} renderOrder={2} />
      {/* plates */}
      <mesh position={[S.L / 2 + 0.03, 0.45, 0]} rotation-y={Math.PI / 2} material={plate} geometry={LGEO.box} scale={[0.5, 0.15, 0.01]} />
      <mesh position={[-S.L / 2 - 0.03, 0.45, 0]} rotation-y={-Math.PI / 2} material={plate} geometry={LGEO.box} scale={[0.5, 0.15, 0.01]} />
      {/* lights */}
      {lights === 'head' && (
        <>
          <mesh geometry={g.headGlow} material={headLit} />
          <mesh geometry={g.tailGlow} material={tailDim} />
          <BeamGlow x={S.L / 2} y={S.lampY} hw={hw} />
        </>
      )}
      {lights === 'brake' && <mesh geometry={g.tailGlow} material={tailLit} />}
      {lights === 'reverse' && (
        <>
          <mesh geometry={g.tailGlow} material={tailDim} />
          <mesh geometry={g.revGlow} material={revLit} />
        </>
      )}
      {/* wipers */}
      {wipers && (
        <>
          <group position={[S.wiperX, S.wiperY, -0.5]} rotation-z={S.wiperTilt}>
            <group ref={wiperL}>
              <mesh geometry={hoodGeo} material={wiperMat} position={[0.02, 0.02, 0.3]} scale={[0.03, 0.02, 0.6]} />
            </group>
          </group>
          <group position={[S.wiperX, S.wiperY, 0.0]} rotation-z={S.wiperTilt}>
            <group ref={wiperR}>
              <mesh geometry={hoodGeo} material={wiperMat} position={[0.02, 0.02, 0.3]} scale={[0.03, 0.02, 0.6]} />
            </group>
          </group>
        </>
      )}
      {/* doors (only when the cutscene asked for door control) */}
      {doorCapable &&
        (['fl', 'fr', 'rl', 'rr'] as const).filter((k) => type !== 'pickup' || k[0] === 'f').map((key) => {
          const side = key[1] === 'r' ? 1 : -1;
          return (
            <group key={key}>
              {/* the closed door as part of the body; hidden while the leaf swings open so the opening is a real hole */}
              <group
                ref={(m) => {
                  panels.current[key] = m;
                }}
              >
                <mesh geometry={g.panels[key]!.paint} material={paintMat} castShadow />
                <mesh geometry={g.panels[key]!.trim} material={vcMat(0.7, 0.05)} />
                <mesh geometry={g.panels[key]!.glass} material={glassMat} renderOrder={2} />
              </group>
              <group
                ref={(m) => {
                  leaf.current[key] = m;
                }}
                visible={false}
                position={[hingeX(key), 0, side * (hw + 0.01)]}
                scale={[1, 1, side]}
              >
                <mesh geometry={g.leafPaint} material={paintMat} castShadow />
                <mesh geometry={g.leafTrim} material={vcMat(0.7, 0.05)} />
                <mesh geometry={g.leafGlass} material={glassMat} renderOrder={2} />
              </group>
            </group>
          );
        })}
      {driver && <StaticPerson kind="parent" seed={11 + seed} position={[S.driverPos[0], S.driverPos[1] - DRIVER_DROP[type], S.driverPos[2]]} rotY={Math.PI / 2} clip="drive" />}
        </group>
      </group>
    </group>
  );
}

const beamTex = () => softDotTexture();
function BeamGlow({ x, y, hw }: { x: number; y: number; hw: number }) {
  const m = useMemo(() => new THREE.MeshBasicMaterial({ map: beamTex(), color: '#FFF1B0', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), []);
  useEffect(() => () => m.dispose(), [m]);
  return (
    <>
      {[-1, 1].map((s) => (
        <mesh key={s} rotation-x={-Math.PI / 2} position={[x + 1.8, 0.03, s * (hw - 0.3)]} scale={[4.2, 0.9, 1]} material={m}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
      <mesh position={[x + 0.05, y, 0]} visible={false} />
    </>
  );
}
