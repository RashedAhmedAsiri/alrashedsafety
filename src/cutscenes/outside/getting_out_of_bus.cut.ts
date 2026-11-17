import { cutscene } from '../api';
import type { ActorHandle, CutsceneCtx } from '../api';
import type { Vec3 } from '../../core/types';
import { BL, BUS_POS, BUS_ROT, W, boy, bus, driverPos, fillSeats, fwd, seat, sitDown, standUp, wayOut } from './bus.shared';

// Getting off the bus at the stop. The bus is parked the whole time; Alrashed stays in the driver's seat.
// The bus is full: ten boys sit at the windows (they stay), five (S1..S5) sit on the aisle halves of the first
// rows. After: the door opens; S1..S5 get off one at a time in a short queue (aisle, steps holding the rail, a few
// straight steps along the sidewalk away from the curb). S2's pencil rolls toward the front wheel; Alrashed shakes
// his head (leave it) and points them along the sidewalk.
const ID = 'getting_out_of_bus';
const SPECS = {
  s1: boy('#E5484D', 'medium', { backpack: '#2F6FB5', skin: 1 }),
  s2: boy('#F5C518', 'small', { striped: true, backpack: '#3DBE6E', skin: 2 }),
  s3: boy('#7CC4FA', 'tall', { backpack: '#F5C518', skin: 3 }),
  s4: boy('#3DBE6E', 'medium', { backpack: '#E5484D', skin: 0, hair: 'brown' }),
  s5: boy('#9B6BF2', 'small', { backpack: '#FF8A3D', skin: 4 }),
};
type Sid = keyof typeof SPECS;
const QUEUE: Sid[] = ['s1', 's2', 's3', 's4', 's5'];
/** Aisle halves of the first benches (the queue order is front to back). */
const SEATS: Record<Sid, [number, -1 | 1]> = { s1: [0, 1], s2: [0, -1], s3: [1, 1], s4: [1, -1], s5: [2, 1] };
/** Boys who stay seated at the windows. */
const FILL: [number, -1 | 1][] = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1], [3, 1], [3, -1], [4, 1], [4, -1], [5, 1], [6, -1]];
/** Where each one ends on the sidewalk: behind the yellow line, a short line toward the school (west). */
const LINE = (c: CutsceneCtx, i: number): Vec3 => W(c, 25.0 - i * 0.7, -5.5); // the last one stays clear of the final camera

type Cam = { pos: Vec3; look: Vec3; fov: number };
/** Bus-local camera spots (x forward, y up, z right / door side). */
/** Inside by the windscreen on the door side, looking back down the aisle: Alrashed turned around at the wheel, the boys. */
const FRONT: Cam = { pos: [3.72, 2.2, 0.3], look: [1.0, 1.15, -0.8], fov: 62 };
/** On the sidewalk, looking into the open door: the steps, the rail, Alrashed at the wheel inside. */
const DOOR: Cam = { pos: [1.9, 1.45, 3.7], look: [3.45, 0.95, 1.0], fov: 52 };
const at = (c: CutsceneCtx, p: Vec3) => bus(c, p[0], p[1], p[2]);
const camBus = (c: CutsceneCtx, s: Cam, dur = 0) => c.cam({ pos: at(c, s.pos), look: at(c, s.look), fov: s.fov, dur });

/** One boy: up from his seat, along the aisle, down the steps (holding the rail), then straight to his spot.
 * With `stop`, he first steps to that spot by the curb and waits for `gate` before going on. */
async function getOff(c: CutsceneCtx, b: ActorHandle, row: number, i: number, stop?: { at: Vec3; arrived: () => void; gate: Promise<void> }) {
  standUp(b);
  b.flag('backpack', true); // bag on, from under the seat
  await b.walkTo([at(c, [BL.rowX[row], BL.floor, 0.0]), at(c, [2.75, BL.floor, 0.05])], { speed: 0.9 });
  const out = wayOut(c);
  await b.walkTo(out, { speed: 0.6, clip: 'climbSteps' });
  const o = out[out.length - 1];
  if (stop) {
    await b.walkTo(stop.at, { speed: 0.9 });
    stop.arrived();
    await stop.gate;
    await b.walkTo([W(c, stop.at[0], -5.5), LINE(c, i)], { speed: 1.0 });
  } else await b.walkTo([W(c, o[0], -5.5), LINE(c, i)], { speed: 1.0 });
  b.face(-Math.PI / 2);
}

export default [
  // Speaking setup: Alrashed in the driver's seat of the stopped bus, door closed, a full bus: S1..S5 in the
  // first rows (aisle halves), boys at every window around them.
  cutscene(ID, 'setup', async (c) => {
    c.setFlag('traffic', 'off');
    c.prop('bus', 'bus', { pos: BUS_POS, rotY: BUS_ROT, params: { door: 'closed', interior: true } });
    c.sfx('busEngine', { loop: true, volume: 0.25 });
    const r = c.robot;
    r.place(driverPos(c), fwd(BUS_ROT));
    r.flag('seated', true);
    r.flag('inBus', true);
    r.flag('seatHeight', 0.42);
    r.flag('turnToCamera', true);
    r.play('sitDrive');
    c.expr('smile');
    fillSeats(c, FILL, 'p');
    for (const id of QUEUE) {
      const [row, side] = SEATS[id];
      const p = seat(c, row, side, 1);
      const b = c.spawn(id, 'boy', { pos: p, rotY: fwd(BUS_ROT), spec: SPECS[id], clip: 'sit' });
      sitDown(b, p, fwd(BUS_ROT));
      b.flag('backpack', false);
      b.lookAt(at(c, [BL.driver[0], BL.floor + 1.1, BL.driver[1]]));
    }
    await camBus(c, FRONT);
  }),

  cutscene(ID, 'after', async (c) => {
    const r = c.robot;
    const bp = c.prop('bus', 'bus', { pos: BUS_POS, rotY: BUS_ROT, params: { door: 'closed', interior: true } });
    const kids = QUEUE.map((id) => c.actor(id));
    const [s1, s2] = kids;

    // After 1 (0-3.5): inside from the front: the bus is stopped, he presses the button, the door folds open;
    // S1 stands and walks up the aisle, the others wait for their turn.
    await camBus(c, FRONT);
    c.expr('happy');
    for (const b of kids) b.lookAt(null);
    await c.wait(0.5);
    bp.set({ params: { door: 'open' } });
    c.sfx('doorHiss');
    await c.wait(0.9);
    // the queue: one boy after the other, about 2.2 s apart (closer and they bunch up at the foot of the steps);
    // S2 stops by the curb (his pencil)
    let arrived!: () => void;
    const s2There = new Promise<void>((res) => (arrived = res));
    let release!: () => void;
    const gate = new Promise<void>((res) => (release = res));
    const s2Stop = W(c, 25.9, -4.3);
    const runs = kids.map(async (b, i) => {
      await c.wait(i * 2.2);
      await getOff(c, b, SEATS[QUEUE[i]][0], i, i === 1 ? { at: s2Stop, arrived, gate } : undefined);
    });
    await c.wait(3.0);

    // After 2 (3.5-9): on the sidewalk at the door: one at a time, holding the rail, one step at a time.
    c.sfx('footsteps', { volume: 0.45 });
    await camBus(c, DOOR);
    await s2There;
    await c.wait(0.4);

    // After 3 (9-11.5): S2 by the curb: his pencil drops and rolls under the bus toward the front wheel; he
    // looks down at it.
    const sp = s2.pos();
    const pencilEnd = at(c, [4.0, 0.02, 1.0]);
    s2.face(pencilEnd);
    await c.cam({ pos: W(c, 24.5, -5.3, 1.15), look: W(c, 26.0, -3.6, 0.5), fov: 50, dur: 0 });
    c.expr('surprised');
    c.sfx('click');
    const pencil = c.prop('pencil', 'pencil', { pos: W(c, sp[0], sp[2] + 0.15, 0.7), rotY: 0.3, scale: 1.6, params: { color: '#F5C518' } });
    await pencil.moveTo(W(c, sp[0], sp[2] + 0.35, 0.02), 0.35, 'in');
    c.sfx('bounce', { volume: 0.4 });
    void pencil.moveTo(pencilEnd, 1.8, 'out');
    s2.lookAt(pencilEnd);
    await c.wait(2.0);

    // After 4 (11.5-15.5): from the sidewalk ahead of the bus: Alrashed behind the windscreen shakes his head
    // (leave it, the driver cannot see you down there) and points along the sidewalk; S2 joins the line.
    await c.cam({ pos: at(c, [6.3, 2.3, 0.4]), look: at(c, [3.1, 1.95, -0.55]), fov: 38, dur: 0 });
    r.flag('turnToCamera', true);
    c.expr('warning');
    c.sfx('beep', { volume: 0.4 });
    await r.play('headShake', { dur: 1.2 });
    c.expr('smile');
    s2.lookAt(null);
    release();
    await r.play('point', { dur: 1.2 });
    await Promise.all(runs);
    c.sfx('birds', { volume: 0.4 });

    // After 5: the five boys in a short line on the sidewalk, away from the curb; the door closes behind them.
    await c.cam({ pos: W(c, 21.0, -7.1, 1.5), look: W(c, 24.0, -5.2, 0.95), fov: 52, dur: 0 });
    c.expr('hearts');
    await r.play('wave', { dur: 1.2 });
    bp.set({ params: { door: 'closed' } });
    c.sfx('doorHiss');
    await c.wait(0.8);
    pencil.remove();
    c.stopSfx('busEngine');
  }),
];
