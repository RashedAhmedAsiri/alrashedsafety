import { cutscene, type CutsceneCtx } from '../api';
import type { Vec3 } from '../../core/types';
import { shots, headingTo } from '../framing';
import { W, boy, fwd, loc, ride, sitDown, type Rider } from './bus.shared';

/**
 * family_car: pick-up lay-by (lane z -7.5..-3.5, sidewalk and canopy behind it z -10.5..-7.5).
 * The family sedan stops in spot 3 facing -X, so its RIGHT side (both right doors) faces the sidewalk.
 * S1 first heads for the front door; Alrashed stops him and sends him to the rear door on the sidewalk side.
 * Camera rule: always from the curb edge of the sidewalk, east of the boys, looking west along the curb.
 */
const ID = 'family_car';
const S1 = boy('#FFFFFF', 'small', { backpack: '#E5484D', skin: 2, hair: 'black' }); // white shirt
const CAR_ROT = Math.PI; // nose to -X in the lay-by
const SPOT: Vec3 = [-32, 0, -6.35]; // waiting spot 3
/** Entry from the west-bound lane of the main street into the lay-by. */
const ENTRY: Vec3[] = [[-6, 0, -1.75], [-15, 0, -2.4], [-21, 0, -5.4], [-26, 0, -6.35], SPOT];
/** rear seat, sidewalk side (car local: +X nose, +Z right = sidewalk side) */
const REAR_RIGHT = { x: -0.95, y: 0.34, z: 0.42 }; // carPoints(sedan).rear[2]
const S1_WAIT = { x: -31.0, z: -8.3 };
const R_WAIT = { x: -30.4, z: -9.25 };
const CAM_FROM: Vec3 = [-26.6, 0, -7.8];
const CARP = { color: '#F2F2F2', lights: 'off', driver: true, seed: 3 };

const H = headingTo(CAM_FROM, [-31.3, 0, -8.4]);
const wide = (c: CutsceneCtx, dur = 0) => shots.wide(c, W(c, -31.3, -8.4), H, { dur, zoom: 0.68, height: 1.6 });

export default [
  cutscene(ID, 'setup', async (c) => {
    c.setFlag('traffic', 'off');
    c.prop('car', 'car', { pos: ENTRY[0], rotY: CAR_ROT, params: CARP });
    c.spawn('s1', 'boy', { pos: W(c, S1_WAIT.x, S1_WAIT.z), rotY: 0, spec: S1, clip: 'idle' });
    c.robot.place(W(c, R_WAIT.x, R_WAIT.z), 0);
    c.robot.play('idle');
    c.expr('smile');
    await wide(c);
  }),

  cutscene(ID, 'before', async (c) => {
    const r = c.robot;
    const s1 = c.actor('s1');
    const car = c.prop('car', 'car', { pos: ENTRY[0], rotY: CAR_ROT, params: CARP });

    // 1 (0-3): the sedan pulls into spot 3 and stops; only then S1 walks toward the FRONT door.
    c.sfx('carPass', { volume: 0.25 });
    await wide(c);
    await car.drive(ENTRY, 5.5);
    c.sfx('busEngine', { loop: true, volume: 0.12 });
    c.expr('surprised');
    c.sfx('footsteps', { volume: 0.5 });
    await s1.walkTo(W(c, -32.6, -8.05), { speed: 1.3 });
    c.stopSfx('footsteps');

    // 2 (3-5): Alrashed: not the front seat. S1 steps back; he points at the rear door.
    await shots.two(c, r, s1, { heading: H, zoom: 0.8, dur: 0 });
    c.expr('warning');
    c.sfx('beep', { volume: 0.4 });
    r.face(s1.pos());
    await Promise.all([r.play('headShake', { dur: 1.4 }), s1.play('stopStepBack', { dur: 1.2 })]);
    await s1.walkTo(W(c, -31.3, -8.2), { speed: 1.0 });
    s1.face(r.pos());
    c.expr('smile');
    r.face(W(c, -31.4, -7.3));
    await r.play('point', { dur: 1.8 });
    r.face(s1.pos());
  }),

  cutscene(ID, 'after', async (c) => {
    const r = c.robot;
    const s1 = c.actor('s1');
    const car = c.prop('car', 'car', { pos: SPOT, rotY: CAR_ROT, params: CARP });
    const L = (x: number, y: number, z: number) => loc(c, SPOT, CAR_ROT, x, y, z);
    const seatPos = L(REAR_RIGHT.x, REAR_RIGHT.y, REAR_RIGHT.z);
    s1.place(W(c, -31.3, -8.2), Math.PI);
    r.place(W(c, R_WAIT.x, R_WAIT.z), -Math.PI / 2);

    // 1 (0-3): from the sidewalk; the rear door opens and S1 climbs in from the sidewalk side.
    c.expr('smile');
    await shots.two(c, s1, r, { heading: H, zoom: 0.75, dur: 0 });
    c.sfx('click', { volume: 0.5 });
    car.set({ params: { doors: { rr: 1 } } });
    await c.wait(0.4);
    await s1.walkTo([L(-0.6, 0, 1.55), L(-0.6, 0.2, 0.9)], { speed: 0.9 });
    sitDown(s1, seatPos, fwd(CAR_ROT));
    s1.flag('seatH', 0.3);
    s1.flag('backpack', false);
    c.sfx('thud', { volume: 0.3 });
    await c.wait(0.5);

    // 2 (3-5): inside the car from the other rear seat (placed camera): he pulls the belt over the shoulder and buckles.
    c.expr('proud');
    await c.cam({ pos: L(-0.35, 1.34, -0.5), look: L(-0.95, 1.1, 0.42), fov: 60, dur: 0 });
    await s1.play('buckle', { dur: 1.6 });
    s1.play('sit');
    s1.flag('seatbelt', true);
    c.sfx('seatbelt', { volume: 0.5 });
    c.sfx('click');
    await c.wait(0.6);

    // 3 (5-9): back on the sidewalk; Alrashed closes the door, thumbs up; the car signals and leaves slowly.
    await wide(c);
    await r.walkTo(W(c, -31.0, -8.1), { speed: 1.0 });
    r.face(W(c, -31.4, -7.3));
    c.sfx('thud', { volume: 0.4 });
    car.set({ params: { doors: { rr: 0 } } });
    await c.wait(0.3);
    await r.walkTo(W(c, -30.6, -8.9), { speed: 0.8 });
    r.face(W(c, -33.5, -6.0));
    c.expr('hearts');
    await r.play('thumbsUp', { dur: 1.8 });
    car.set({ params: { lights: 'brake' } });
    await c.wait(0.4);
    car.set({ params: { lights: 'off' } });
    c.sfx('busEngine', { volume: 0.25 });
    const riders: Rider[] = [{ a: s1, at: [REAR_RIGHT.x, REAR_RIGHT.y, REAR_RIGHT.z], clip: 'sit' }];
    void ride(c, car, riders, [SPOT, [-47, 0, -6.35], [-52, 0, -3.2], [-75, 0, -1.8]], 3.0, CAR_ROT, false, 1.8).catch(() => undefined);
    await c.wait(2.6);
  }),
];
