import { cutscene } from '../api';
import type { CutsceneCtx } from '../api';
import type { Vec3 } from '../../core/types';
import { BL, BUS_POS, BUS_ROT, W, boy, bus, driverPos, fillSeats, fwd, sitDown, standUp } from './bus.shared';
import { busSeat } from '../../props/points';

// Inside the school bus, parked at the stop with the engine idling, about to leave. Alrashed is the driver; the
// bus is full (twelve boys seated at the windows, belted); two speaking boys: S1 leans out of the open door-side
// window, S2 stands in the aisle. After: S1 pulls in and the window
// closes, S2 sits, both buckle up with the bag on their knees; Alrashed gives a thumbs up. The bus never moves.
const ID = 'inside_bus';
const SPECS = {
  s1: boy('#7CC4FA', 'medium', { backpack: '#E5484D', skin: 1 }), // blue shirt: the window boy
  s2: boy('#FF8A3D', 'tall', { striped: true, backpack: '#E5484D', skin: 3, hair: 'brown' }), // the standing boy (red bag: the held bag model is red)
};
const ROW = 1;
const WINDOW = { openWindow: [ROW, 1] };
/** Bus-local spots: S1 at the window half of the door-side bench (the leanOut clip leans to his right), S2's seat
 * across the aisle, S2 standing in the aisle. */
const S1_SEAT: Vec3 = busSeat(ROW, 1, -1);
/** S1 up on his knees: a little nearer the window (still on the cushion), so his face is at the glass. */
const S1_KNEEL: Vec3 = [S1_SEAT[0], S1_SEAT[1], S1_SEAT[2] + 0.07];
const S2_SEAT: Vec3 = busSeat(ROW, -1, 1);
const S2_AISLE: Vec3 = [BL.rowX[ROW] - 0.3, BL.floor, -0.05];
/** The other boys, at the window halves (S2 sits beside the one at row 1 left). */
const FILL: [number, -1 | 1][] = [[0, -1], [1, -1], [2, 1], [2, -1], [3, 1], [3, -1], [4, 1], [4, -1], [5, 1], [5, -1], [6, 1], [6, -1]];

type Cam = { pos: Vec3; look: Vec3; fov: number };
/** Bus-local camera spots (x forward, y up, z right / door side). */
const CAM: Record<string, Cam> = {
  /** by the windscreen on the door side, looking back: Alrashed (turned) at the wheel and the full bus behind him */
  front: { pos: [3.72, 2.2, 0.3], look: [1.0, 1.15, -0.8], fov: 62 },
  /** from the aisle in front of the first row, close on the two boys */
  boys: { pos: [2.75, 2.3, -0.7], look: [1.3, 1.5, 0.5], fov: 58 },
};
const at = (c: CutsceneCtx, p: Vec3) => bus(c, p[0], p[1], p[2]);
const camBus = (c: CutsceneCtx, s: Cam, dur = 0) => c.cam({ pos: at(c, s.pos), look: at(c, s.look), fov: s.fov, dur });
/** From the sidewalk, at the door side of the bus, looking up at S1's window. */
const camRoad = (c: CutsceneCtx) => c.cam({ pos: W(c, 27.0, -6.6, 1.7), look: at(c, [BL.rowX[ROW] + 0.2, 1.9, 1.25]), fov: 46, dur: 0 });

export default [
  cutscene(ID, 'setup', async (c) => {
    c.setFlag('traffic', 'off');
    c.prop('bus', 'bus', { pos: BUS_POS, rotY: BUS_ROT, params: { door: 'closed', interior: true, ...WINDOW } });
    c.sfx('busEngine', { loop: true, volume: 0.25 });
    const r = c.robot;
    r.place(driverPos(c), fwd(BUS_ROT));
    r.flag('seated', true);
    r.flag('inBus', true);
    r.flag('seatHeight', 0.42);
    r.play('sitDrive');
    c.expr('smile');
    fillSeats(c, FILL, 'p');
    const s1 = c.spawn('s1', 'boy', { pos: at(c, S1_SEAT), rotY: fwd(BUS_ROT), spec: SPECS.s1, clip: 'sit' });
    sitDown(s1, at(c, S1_SEAT), fwd(BUS_ROT));
    s1.flag('backpack', false);
    const s2 = c.spawn('s2', 'boy', { pos: at(c, S2_AISLE), rotY: fwd(BUS_ROT), spec: SPECS.s2, clip: 'idle' });
    standUp(s2);
    s2.place(at(c, S2_AISLE), fwd(BUS_ROT) + 0.6);
    await camBus(c, CAM.front);
  }),

  cutscene(ID, 'before', async (c) => {
    const r = c.robot;
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');

    // Before 1 (0-2.5): from the sidewalk: S1 leans his head and arm out of the open window.
    c.expr('smile');
    s1.flag('kneelSeat', true); // up on his knees on the cushion, to reach the open top half of the window
    s1.place(at(c, S1_KNEEL), fwd(BUS_ROT));
    s1.play('leanOut');
    c.sfx('wind', { volume: 0.2 });
    await camRoad(c);
    await c.wait(2.5);

    // Before 2 (2.5-4.5): inside, close on the boys: S1 still leaning out, S2 standing in the aisle chatting.
    await camBus(c, CAM.boys);
    s2.lookAt(at(c, [S1_SEAT[0], 1.5, S1_SEAT[2]]));
    await c.wait(2.0);

    // Before 3: from the front of the aisle: Alrashed sees them, turns around to talk (speech framing).
    await camBus(c, CAM.front);
    r.flag('turnToCamera', true);
    c.expr('warning');
    c.sfx('beep', { volume: 0.5 });
    await c.wait(0.6);
  }),

  cutscene(ID, 'after', async (c) => {
    const r = c.robot;
    const bp = c.prop('bus', 'bus', { pos: BUS_POS, rotY: BUS_ROT, params: { door: 'closed', interior: true, ...WINDOW } });
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');

    // After 1 (0-3): close on the boys: S1 pulls in and slides the window shut; S2 steps to his seat and sits.
    r.flag('turnToCamera', false);
    c.expr('smile');
    await camBus(c, CAM.boys);
    s2.lookAt(null);
    s1.flag('kneelSeat', false);
    s1.place(at(c, S1_SEAT), fwd(BUS_ROT));
    s1.play('sit');
    await c.wait(0.4);
    c.sfx('slide', { volume: 0.5 });
    bp.set({ params: { openWindow: undefined } });
    await s2.walkTo(at(c, [S2_SEAT[0] + 0.15, BL.floor, -0.2]), { speed: 0.8 });
    sitDown(s2, at(c, S2_SEAT), fwd(BUS_ROT));
    s2.flag('backpack', false); // off his back as he sits (worn, it would go through the seat back)
    await c.wait(0.6);

    // After 2 (3-5): same spot, tighter: both buckle up, S2 with his bag on his knees.
    c.expr('proud');
    await camBus(c, { ...CAM.boys, fov: 44 }, 0.6);
    for (const b of [s1, s2]) {
      void b.play('buckle', { dur: 1.4 }).then(() => b.play('sit'));
    }
    c.sfx('seatbelt', { volume: 0.5 });
    await c.wait(1.2);
    for (const b of [s1, s2]) b.flag('seatbelt', true);
    c.sfx('click');
    await c.wait(0.3);
    // belted (the buckle clip is over), S2 lifts his bag from beside him and holds it standing on his knees
    s2.hold('backpack');
    s2.flag('lapBag', true);
    await c.wait(0.6);

    // After 3 (5-7): from the front of the aisle: Alrashed turns around with a thumbs up.
    await camBus(c, CAM.front);
    r.flag('turnToCamera', true);
    c.expr('happy');
    await r.play('thumbsUp', { dur: 1.5 });
    r.flag('turnToCamera', false);

    // After 4 (7-8.5): from the sidewalk again: the window is shut and S1 sits belted; the engine revs, ready to go.
    await camRoad(c);
    c.sfx('busEngine', { volume: 0.4 });
    await c.wait(1.5);
  }),
];
