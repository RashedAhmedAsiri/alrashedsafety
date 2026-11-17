/**
 * Signal intersection hardware (car signal heads, pedestrian heads, push buttons) and the flashing
 * beacons of the gate crossing. Housings and poles go into the static builder; every lamp face goes
 * into a per-group dynamic builder so the set can switch whole groups with one material change.
 */
import { Builder, Frame, U, type Cls } from './build';
import { cellUV } from './atlas';
import { SIGNAL, SIGNS, SW_H } from './layout';
import type { Vec3 } from '../../../core/types';

/** Dynamic lamp groups. main* = main-street car heads (flag carLight), cross* = north-south road heads. */
export type LampGroup =
  | 'mainR' | 'mainY' | 'mainG'
  | 'crossR' | 'crossY' | 'crossG'
  | 'pedRed' | 'pedGreen' | 'wait'
  | 'beaconA' | 'beaconB';

export const LAMP_GROUPS: LampGroup[] = ['mainR', 'mainY', 'mainG', 'crossR', 'crossY', 'crossG', 'pedRed', 'pedGreen', 'wait', 'beaconA', 'beaconB'];

/** Lamp colors when lit. */
export const LAMP_COLOR: Record<LampGroup, string> = {
  mainR: '#FF3B30', mainY: '#FFC21A', mainG: '#2BE36B',
  crossR: '#FF3B30', crossY: '#FFC21A', crossG: '#2BE36B',
  pedRed: '#FFFFFF', pedGreen: '#FFFFFF', wait: '#FFFFFF',
  beaconA: '#FFB300', beaconB: '#FFB300',
};
/** Groups painted from the atlas (lit = white tint over the picture). */
export const ATLAS_GROUPS = new Set<LampGroup>(['pedRed', 'pedGreen', 'wait']);

const DARK = '#2B3038';
const POLE = '#A7B0BA';
const BACKPLATE = '#F2C230';

type Dyn = (g: LampGroup) => Builder;

/** One car signal head (3 lenses) in frame f, facing local +Z. */
function carHead(f: Frame, dyn: Dyn, road: 'main' | 'cross', p: Vec3) {
  const h = f.child(p, 0);
  h.add('solid', U.rbox, [0, 0, -0.02], [0.52, 1.18, 0.05], BACKPLATE); // yellow backplate
  h.add('solid', U.rbox, [0, 0, 0.1], [0.36, 1.0, 0.26], DARK);
  const ys = [0.31, 0, -0.31];
  const groups: LampGroup[] = road === 'main' ? ['mainR', 'mainY', 'mainG'] : ['crossR', 'crossY', 'crossG'];
  ys.forEach((y, i) => {
    // visor hood (half tube) above each lens
    h.add('solid', U.box, [0, y + 0.135, 0.31], [0.3, 0.025, 0.16], DARK);
    h.add('solid', U.box, [-0.14, y + 0.06, 0.31], [0.02, 0.14, 0.16], DARK);
    h.add('solid', U.box, [0.14, y + 0.06, 0.31], [0.02, 0.14, 0.16], DARK);
    const g = dyn(groups[i]);
    const m = new Frame(g, [0, 0, 0], 0, undefined);
    m.m.copy(h.m);
    m.add('glow', U.cyl20, [0, y, 0.235], [0.22, 0.02, 0.22], '#FFFFFF', { r: [Math.PI / 2, 0, 0] });
  });
}

/** Pedestrian head: red standing man over green walking man, facing local +Z. */
function pedHead(f: Frame, dyn: Dyn, p: Vec3) {
  const h = f.child(p, 0);
  h.add('solid', U.rbox, [0, 0, 0], [0.42, 0.8, 0.24], DARK);
  for (const y of [0.19, -0.19]) h.add('solid', U.box, [0, y + 0.17, 0.17], [0.38, 0.03, 0.12], DARK);
  const put = (g: LampGroup, cell: 'redMan' | 'greenMan', y: number) => {
    const fr = new Frame(dyn(g), [0, 0, 0], 0);
    fr.m.copy(h.m);
    fr.add('atlas' as Cls, U.plane, [0, y, 0.123], [0.32, 0.32, 1], '#FFFFFF', { uv: cellUV(cell) });
  };
  put('pedRed', 'redMan', 0.19);
  put('pedGreen', 'greenMan', -0.19);
}

/** Push-button box on a pole, facing local +Z, centre of the button at p. */
function buttonBox(f: Frame, dyn: Dyn, p: Vec3) {
  const h = f.child(p, 0);
  h.add('solid', U.rbox, [0, 0.05, -0.05], [0.2, 0.42, 0.12], PAL_YELLOW);
  h.add('atlas', U.plane, [0, 0.05, 0.012], [0.17, 0.36, 1], '#FFFFFF', { uv: cellUV('buttonFace') });
  // the big round button (sits on the picture's ring at 60% height)
  h.add('solid', U.cyl20, [0, 0.01, 0.035], [0.075, 0.05, 0.075], '#E8EEF2', { r: [Math.PI / 2, 0, 0] });
  h.add('solid', U.cyl20, [0, 0.01, 0.06], [0.05, 0.02, 0.05], '#1E2A3B', { r: [Math.PI / 2, 0, 0] });
  // "wait" lamp on top
  const fr = new Frame(dyn('wait'), [0, 0, 0], 0);
  fr.m.copy(h.m);
  fr.add('atlas', U.plane, [0, 0.19, 0.013], [0.07, 0.07, 1], '#FFFFFF', { uv: cellUV('waitLamp') });
}
const PAL_YELLOW = '#F7C531';

/** Signal pole with an optional mast arm along local +X at 5.75 m. */
function mast(b: Builder, x: number, z: number, rotY: number, armLen: number, base = SW_H) {
  const f = new Frame(b, [x, base, z], rotY);
  f.add('solid', U.cyl12, [0, 0.12, 0], [0.32, 0.24, 0.32], DARK);
  f.add('solid', U.cyl12, [0, 3.0, 0], [0.18, 6.0, 0.18], POLE);
  if (armLen > 0) {
    f.add('solid', U.cyl8, [armLen / 2, 5.75, 0], [0.12, armLen, 0.12], POLE, { r: [0, 0, Math.PI / 2] });
    f.add('solid', U.box, [0.6, 5.35, 0], [0.06, 0.8, 0.06], POLE, { r: [0, 0, -0.85] });
  }
  return f;
}

export function buildSignals(b: Builder, dyn: Dyn) {
  const S = SIGNAL;
  // Main street westbound (from the east, stop line x = -61.5): pole on the north corner east of the
  // crosswalk, arm over the westbound lane, heads facing +X (towards oncoming cars).
  {
    // rotY -PI/2: local +X -> world +Z (over the road), local +Z -> world -X. Heads turned by PI face +X.
    const f = mast(b, S.poleNorth[0], S.poleNorth[1], -Math.PI / 2, 2.6);
    carHead(f.child([2.25, 5.2, 0], Math.PI), dyn, 'main', [0, 0, 0]);
    carHead(f.child([0, 3.15, -0.12], Math.PI), dyn, 'main', [0, 0, 0]);
    // pedestrian head facing south (world +Z = local +X) for people waiting on the south side,
    // and the push button facing the crosswalk (world -X = local +Z)
    pedHead(f.child([0.2, 2.15, 0], Math.PI / 2), dyn, [0, 0, 0]);
    buttonBox(f.child([0, 1.15, 0.11], 0), dyn, [0, 0, 0]);
  }
  // South corner of the same crossing: pedestrian head facing north + button.
  {
    const f = mast(b, S.poleSouth[0], S.poleSouth[1], -Math.PI / 2, 0);
    // pedestrian head facing north (world -Z = local -X) for people waiting on the school side
    pedHead(f.child([-0.2, 2.15, 0], -Math.PI / 2), dyn, [0, 0, 0]);
    buttonBox(f.child([0, 1.15, 0.11], 0), dyn, [0, 0, 0]);
  }
  // Main street eastbound (from the west, stop line x = -76.5): pole on the south-west corner.
  {
    const f = mast(b, -77.4, 3.95, Math.PI / 2, 2.6); // local +X -> world -Z (over the road)
    carHead(f.child([2.25, 5.2, 0], Math.PI), dyn, 'main', [0, 0, 0]);
    carHead(f.child([0, 3.15, -0.12], Math.PI), dyn, 'main', [0, 0, 0]);
  }
  // North-south road, southbound (from the north, stop line z = -8.5): pole on the north-west corner.
  {
    const f = mast(b, -76.3, -9.2, 0, 2.6, 0); // local +X -> world +X (over the road)
    carHead(f.child([2.4, 5.2, 0], Math.PI), dyn, 'cross', [0, 0, 0]);
    carHead(f.child([0, 3.15, -0.12], Math.PI), dyn, 'cross', [0, 0, 0]);
  }
  // Northbound (from the south, stop line z = 8.5): pole on the south-east corner.
  {
    const f = mast(b, -67.7, 9.2, Math.PI, 2.6, 0); // local +X -> world -X
    carHead(f.child([2.4, 5.2, 0], Math.PI), dyn, 'cross', [0, 0, 0]);
    carHead(f.child([0, 3.15, -0.12], Math.PI), dyn, 'cross', [0, 0, 0]);
  }

  // Flashing beacons on the gate crossing signs: two lamps per sign, both faces, alternating.
  for (const [sx, sz, rot] of [
    [SIGNS.pedNorth[0], SIGNS.pedNorth[1], Math.PI / 2 + 0.5],
    [SIGNS.pedSouth[0], SIGNS.pedSouth[1], -Math.PI / 2 + 0.5],
  ] as const) {
    ([-0.36, 0.36] as const).forEach((lx, i) => {
      const g = dyn(i === 0 ? 'beaconA' : 'beaconB');
      const f = new Frame(g, [sx, SW_H, sz], rot);
      f.add('glow', U.cyl20, [lx, 3.1, 0.045], [0.2, 0.012, 0.2], '#FFFFFF', { r: [Math.PI / 2, 0, 0] });
      f.add('glow', U.cyl20, [lx, 3.1, -0.165], [0.2, 0.012, 0.2], '#FFFFFF', { r: [Math.PI / 2, 0, 0] });
    });
  }
}
