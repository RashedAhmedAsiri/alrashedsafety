import { cutscene } from '../api';
import type { ActorHandle, CutsceneCtx } from '../api';
import { shots } from '../framing';
import type { Vec3 } from '../../core/types';
import { BL, BUS_POS, BUS_ROT, W, bounce, boy, bus, driverPos, fillSeats, fwd, seat, sitDown } from './bus.shared';

// Waiting at the bus stop. Alrashed + six boys queued on the footprints behind the yellow line (north sidewalk,
// line z -4.95, curb z -3.5). Before: S1 bounces a ball at the curb; Alrashed walks him back to his footprint.
// After: the bus pulls in once (one straight run, tinted glass, empty), stops; the driver and the boys already
// riding show at the windows; the door opens; the queue climbs one at a time holding the rail; they wave from
// their seats. The bus never moves with anyone in it.
const ID = 'bus_stop_waiting';
const SPECS = {
  s1: boy('#9B6BF2', 'medium', { backpack: '#F5C518', skin: 2 }), // purple shirt, the ball boy
  s2: boy('#3DBE6E', 'small', { striped: true, backpack: '#E5484D', skin: 3 }),
  q0: boy('#E5484D', 'tall', { backpack: '#2F6FB5', skin: 1 }),
  q1: boy('#F5C518', 'medium', { backpack: '#3DBE6E', skin: 4 }),
  q2: boy('#7CC4FA', 'small', { backpack: '#FF8A3D', skin: 0, hair: 'brown' }),
  q3: boy('#FFFFFF', 'medium', { striped: true, backpack: '#9B6BF2', skin: 2 }),
};
type Kid = keyof typeof SPECS;
/** Footprints behind the yellow line (z -5.45); the boarding order is nearest the door first. */
const SPOT: Record<Kid, number> = { s2: 26.0, s1: 27.2, q0: 24.8, q1: 28.4, q2: 23.6, q3: 29.6 };
const ORDER: Kid[] = ['s2', 's1', 'q0', 'q1', 'q2', 'q3'];
const LINE_Z = -5.45;
/** S1 at the curb (over the line) with the ball. */
const S1_CURB: Vec3 = [27.6, 0, -3.95];
/** Alrashed behind the queue. */
const ROBOT0: Vec3 = [29.0, 0, -6.35];
const BUS_FAR: Vec3 = [46, 0, -1.9];
/** Where each boy sits once aboard (row, side); S1 by a door-side window so he can wave. */
const SEATS: Record<Kid, [number, -1 | 1]> = { s1: [3, 1], s2: [3, -1], q0: [6, 1], q1: [6, -1], q2: [7, 1], q3: [7, -1] };
/** Boys already riding (window halves). */
const FILL: [number, -1 | 1][] = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1], [4, 1], [4, -1], [5, 1], [5, -1]];

const w = (c: CutsceneCtx, p: Vec3) => W(c, p[0], p[2]);
const spot = (c: CutsceneCtx, k: Kid) => W(c, SPOT[k], LINE_Z);

export default [
  // Starting arrangement: the queue on the footprints, S1 at the curb with his ball; Alrashed behind them; no bus yet.
  cutscene(ID, 'setup', async (c) => {
    c.setFlag('traffic', 'off');
    c.prop('bus', 'bus', { pos: BUS_FAR, rotY: BUS_ROT, params: { door: 'closed', interior: false } }).set({ visible: false });
    for (const k of ORDER) {
      if (k === 's1') c.spawn(k, 'boy', { pos: w(c, S1_CURB), rotY: Math.PI / 2, spec: SPECS.s1, clip: 'idle' });
      else c.spawn(k, 'boy', { pos: spot(c, k), rotY: k === 's2' ? 0.3 : 0, spec: SPECS[k], clip: 'idle' });
    }
    c.robot.place(w(c, ROBOT0), -0.5);
    c.robot.play('idle');
    c.expr('smile');
    await c.cam({ pos: W(c, 28.4, -1.5, 1.45), look: W(c, 27.6, -5.0, 0.95), fov: 54, dur: 0 });
  }),

  cutscene(ID, 'before', async (c) => {
    const r = c.robot;
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');
    // a plain football: the same ball he holds once he picks it up (hold 'ball' is the white football)
    const ball = c.prop('ball', 'ball', { pos: W(c, 27.9, -3.85, 0.4), params: { kind: 'football' } });

    // Before 1 (0-3): from the road side: S1 bounces his ball right at the curb and leans to look for the bus;
    // the others wait on their footprints.
    c.sfx('murmur', { volume: 0.15 });
    c.expr('surprised');
    const stopBounce = bounce(c, ball, 27.9, -3.85, 0.45);
    s1.face(W(c, 40, -3.5));
    await c.cam({ pos: W(c, 29.4, -1.9, 1.25), look: W(c, 27.4, -4.6, 0.85), fov: 50, dur: 0 });
    await s1.play('lookLRL', { dur: 2.2 });
    await c.wait(0.6);

    // Before 2 (3-6.5): Alrashed and S1 side by side: he steps over with an open palm; S1 picks up the ball and
    // walks straight back to his footprint behind the line.
    c.expr('warning');
    stopBounce();
    ball.remove();
    s1.hold('ball');
    await r.walkTo([W(c, 28.9, -5.4), W(c, 28.5, -4.5)], { speed: 1.3 });
    r.face(s1.pos());
    await shots.two(c, r, s1, { heading: 0, zoom: 0.75, dur: 0 });
    void r.play('stopHand', { dur: 1.6 });
    await c.wait(0.6);
    await s1.walkTo(spot(c, 's1'), { speed: 1.0 });
    s1.face(0);
    c.expr('smile');

    // Before 3: speech framing: Alrashed behind the queue, everyone behind the line facing the camera.
    await r.walkTo([W(c, 28.9, -5.4), w(c, ROBOT0)], { speed: 1.1 });
    r.face(0);
    s2.face(0);
    await c.cam({ pos: W(c, 27.6, -1.6, 1.45), look: W(c, 27.2, -5.6, 0.95), fov: 54, dur: 0.8 });
  }),

  cutscene(ID, 'after', async (c) => {
    const r = c.robot;
    const kids = ORDER.map((k) => c.actor(k));
    const s1 = c.actor('s1');
    const bp = c.prop('bus', 'bus', { pos: BUS_FAR, rotY: BUS_ROT, params: { door: 'closed', interior: false } });
    bp.set({ visible: true, pos: BUS_FAR });

    // After 1 (0-4): from the west end of the stop, looking east past the queue: the bus pulls in, in one
    // straight line, and stops completely. Everyone stays behind the line.
    c.expr('happy');
    r.face(W(c, 40, -3));
    for (const b of kids) b.face(Math.PI / 2);
    await c.cam({ pos: W(c, 22.4, -6.5, 1.6), look: W(c, 31, -3.2, 1.3), fov: 54, dur: 0 });
    c.sfx('busEngine', { volume: 0.3 });
    await bp.drive([BUS_FAR, BUS_POS], 7);
    c.sfx('screech', { volume: 0.1 });
    // stopped: a driver at the wheel and the boys already riding show through the clear glass; the door opens
    // and the stop arm swings out
    const drv = c.spawn('driver', 'parent', { pos: driverPos(c), rotY: fwd(BUS_ROT), clip: 'drive' });
    drv.flag('seated', true);
    drv.flag('inBus', true);
    const riders = fillSeats(c, FILL, 'p');
    bp.set({ params: { interior: true } });
    for (const b of kids) b.face(0);
    await c.wait(0.5);
    c.sfx('doorHiss');
    bp.set({ params: { door: 'open', stopArm: true } });
    await c.wait(0.9);

    // After 2 (4-15): at the door from the curb: one at a time, each walks straight from his footprint to the door
    // and climbs holding the rail; inside he takes his seat.
    c.expr('proud');
    s1.hold(null);
    c.sfx('click'); // the ball goes into the backpack
    r.face(W(c, 26.5, -3.3));
    await c.cam({ pos: W(c, 25.0, -6.6, 2.3), look: bus(c, 3.2, 1.0, 1.3), fov: 50, dur: 0 });
    const up = (): Vec3[] => [...[...BL.steps].reverse().map((s) => bus(c, s[0], s[2], s[1])), bus(c, BL.doorTop[0], BL.floor, BL.doorTop[1])];
    const front = bus(c, BL.doorTop[0], 0, 2.0);
    c.sfx('footsteps', { volume: 0.4 });
    const board = async (b: ActorHandle, k: Kid, i: number) => {
      await c.wait(i * 2.0);
      await b.walkTo(W(c, front[0], front[2]), { speed: 1.0 });
      await b.walkTo(up(), { speed: 0.6, clip: 'climbSteps' });
      b.show(false);
      sitDown(b, seat(c, SEATS[k][0], SEATS[k][1], -1), fwd(BUS_ROT));
      b.flag('backpack', false);
      b.show(true);
    };
    await Promise.all(kids.map((b, i) => board(b, ORDER[i], i)));

    // After 3 (15-18): from the sidewalk: Alrashed waves; S1 waves back from his window seat, the bus full of
    // boys; the door closes.
    await r.walkTo(W(c, 28.9, -5.1), { speed: 1.0 });
    r.face(Math.PI);
    await c.cam({ pos: W(c, 26.8, -7.2, 1.5), look: W(c, 29.2, -3.4, 1.5), fov: 52, dur: 0 });
    c.expr('hearts');
    void s1.play('wave', { dur: 1.6 });
    void riders[2].play('wave', { dur: 1.4 });
    await r.play('wave', { dur: 1.8 });
    bp.set({ params: { door: 'closed', stopArm: false } });
    c.sfx('doorHiss');
    await c.wait(0.8);
  }),
];
