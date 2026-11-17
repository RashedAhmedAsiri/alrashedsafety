import { cutscene, type CutsceneCtx } from '../api';
import type { BoySpec, Vec3 } from '../../core/types';
import { shots, headingTo } from '../framing';
import { fwd, ride, sitDown } from './bus.shared';

// dismissal: speak at the gate waiting area (S1 on the bench), then "after" in the pick-up lane.
// Look of each boy (same in setup and after): S1 orange + backpack, S2 light-blue tall, S3 yellow striped small.
const S1_SPEC: Partial<BoySpec> = { shirt: '#FF8A3D', striped: false, height: 'medium', backpack: '#2B6CB0', pants: 'blue', hair: 'black', skin: 2 };
const S2_SPEC: Partial<BoySpec> = { shirt: '#7CC4FA', striped: false, height: 'tall', backpack: '#3DBE6E', pants: 'black', hair: 'brown', skin: 1 };
const S3_SPEC: Partial<BoySpec> = { shirt: '#F5C518', striped: true, height: 'small', backpack: '#E5484D', pants: 'blue', hair: 'black', skin: 3 };

const SPOT3 = { x: -32, z: -6.35 }; // pick-up spot 3, car stops facing -X (rotY PI)
const CAR_ROT = Math.PI;
const REAR_RIGHT: Vec3 = [-0.95, 0.34, 0.42]; // sedan rear seat on the sidewalk side (car local)
const CARP = { color: '#F4F4F0', driver: true, seed: 3, lights: 'off' };
/** Entry from the west-bound lane of the main street into the lay-by. */
const ENTRY: [number, number][] = [[-6, -1.75], [-15, -2.4], [-21, -5.4], [-26, -6.35], [SPOT3.x, SPOT3.z]];
// Pick-up lane camera: from the curb edge of the sidewalk east of them, looking west along the curb.
const LANE_H = headingTo([-26.6, 0, -7.8], [-31.3, 0, -8.4]);

/** World point (x, z) as an offset from the CURRENT location, on the ground surface (+dy). */
const W = (c: CutsceneCtx, x: number, z: number, dy = 0): Vec3 => c.at(x - c.loc.origin[0], z - c.loc.origin[2], dy);

export default [
  cutscene('dismissal', 'setup', async (c) => {
    // S1 sits on the bench beside the guard room, other boys wait calmly
    // bags off while they sit (a bag on the back would poke through the bench back); back on when they stand
    const b1 = c.spawn('s1', 'boy', { pos: W(c, -10.05, -10.55), rotY: 0, spec: S1_SPEC, clip: 'sit' });
    b1.flag('seatH', 0.42); // bench seat height
    b1.flag('backpack', false);
    const b2 = c.spawn('s2', 'boy', { pos: W(c, -14.6, -10.55), rotY: 0, spec: S2_SPEC, clip: 'sit' });
    b2.flag('seatH', 0.42);
    b2.flag('backpack', false);
    c.spawn('s3', 'boy', { pos: W(c, -15.4, -9.2), rotY: 0.5, spec: S3_SPEC, clip: 'idle' });
    c.robot.place(W(c, -10.4, -9.3), Math.PI);
    c.robot.lookAt(W(c, -10.05, -10.4, 1.0));
    c.expr('smile');
    // the two of them along the strip in front of the benches (camera at its west end)
    await shots.two(c, c.robot, c.actor('s1'), { heading: Math.PI / 2 + 0.25, zoom: 0.9, dur: 0 });
  }),

  cutscene('dismissal', 'after', async (c) => {
    // ---- After 1 (0-3 s): in the pick-up lane; the family car pulls into spot 3 and stops ----
    c.setFlag('traffic', 'off');
    const car = c.prop('car', 'car', { pos: W(c, ENTRY[0][0], ENTRY[0][1]), rotY: Math.PI, params: CARP });
    c.prop('car_a', 'car', { pos: W(c, -44, SPOT3.z), rotY: CAR_ROT, params: { color: '#2F4AA8', driver: true, seed: 1 } });
    await c.go('pickup_lane');
    c.stopSfx('footsteps');
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');
    s1.flag('seated', false);
    s1.flag('backpack', true);
    s1.play('idle');
    s1.lookAt(null);
    s2.flag('seated', false);
    s2.flag('backpack', true);
    s2.play('idle');
    c.robot.lookAt(null);
    // they wait on the sidewalk east of spot 3; the other boys wait further along
    s1.place(W(c, -30.2, -8.3), Math.PI);
    c.robot.place(W(c, -29.6, -9.1), Math.PI);
    s2.place(W(c, -36.5, -9.3), 0);
    c.actor('s3').place(W(c, -37.3, -9.0), 0);
    c.robot.flag('holdHand', 'r');
    s1.flag('holdHand', 'left');
    c.expr('happy');
    await shots.wide(c, W(c, -31.3, -8.4), LANE_H, { dur: 0, zoom: 0.68, height: 1.6 });
    c.sfx('carPass', { volume: 0.5 });
    const arrive = car.drive(ENTRY.map(([x, z]) => W(c, x, z)), 5.5);
    await c.wait(1.6);
    c.sfx('beep', { volume: 0.5 });
    s1.face(W(c, -32, -6.5));
    await s1.play('point', { dur: 1.2 });
    await arrive;
    s1.face(Math.PI);
    await c.robot.play('nod', { dur: 1.2 });
    c.sfx('click');

    // ---- After 2 (3-6 s): only now, hand in hand to the rear door on the sidewalk side; the door opens ----
    c.status('walking');
    c.sfx('footsteps', { volume: 0.6 });
    const doorX = SPOT3.x + 0.7; // rear right door of a car facing -X (right side = north = sidewalk)
    const walk = Promise.all([
      c.robot.walkTo(W(c, doorX + 0.6, -8.7), { speed: 1.0, clip: 'holdHandWalk' }),
      s1.walkTo(W(c, doorX, -8.1), { speed: 1.0, clip: 'holdHands' }),
    ]);
    await shots.follow(c, c.robot, walk, { heading: LANE_H, with: [s1], zoom: 0.8 });
    c.stopSfx('footsteps');
    c.status('explaining');
    c.robot.flag('holdHand', false);
    s1.flag('holdHand', false);
    c.sfx('doorHiss');
    car.set({ params: { doors: { rr: 1 } } });
    c.robot.face(W(c, doorX, -7.3));
    await c.robot.play('point', { dur: 1.2 });
    const base = W(c, SPOT3.x, SPOT3.z, 0);
    const L = (x: number, y: number, z: number) => c.offset(base, CAR_ROT, [x, y, z]);
    const seatPos = L(REAR_RIGHT[0], REAR_RIGHT[1], REAR_RIGHT[2]);
    await s1.walkTo([L(-0.6, 0, 1.55), L(-0.6, 0.2, 0.9)], { speed: 0.9 });
    sitDown(s1, seatPos, fwd(CAR_ROT));
    s1.flag('seatH', 0.3);
    s1.flag('backpack', false);

    // ---- After 3 (6-9 s): inside the car from the other rear seat (placed camera): seatbelt buckled ----
    await c.cam({ pos: L(-0.35, 1.34, -0.5), look: L(-0.95, 1.1, 0.42), fov: 60, dur: 0 });
    c.expr('proud');
    c.sfx('seatbelt');
    await s1.play('buckle', { dur: 2.0 });
    s1.flag('seatbelt', true);
    c.sfx('click');
    s1.play('sit');
    await c.wait(0.4);

    // ---- After 4 (9-13 s): back on the sidewalk; door closed, wave, the car pulls away ----
    c.sfx('thud');
    car.set({ params: { doors: { rr: 0 } } });
    c.robot.place(W(c, doorX + 0.9, -8.8), -Math.PI / 2);
    c.robot.face(W(c, SPOT3.x - 6, -6.35));
    c.expr('hearts');
    await shots.wide(c, W(c, -31.3, -8.4), LANE_H, { dur: 0, zoom: 0.68, height: 1.6 });
    c.status('waving');
    void c.robot.play('wave', { dur: 2.2 });
    await c.wait(0.8);
    c.sfx('carPass', { volume: 0.6 });
    // S1 rides along in the rear seat (carried with the car every frame); the car pulls away smoothly
    const route: [number, number][] = [[-36, -5.7], [-39.5, -4.3], [-48, -4.2], [-52, -2.4], [-75, -1.8]]; // around the car waiting in spot 1
    const path: Vec3[] = [[SPOT3.x, SPOT3.z] as [number, number], ...route].map(([x, z]) => W(c, x, z));
    void ride(c, car, [{ a: s1, at: REAR_RIGHT, clip: 'sit' }], path, 3.2, CAR_ROT, false, 1.6);
    await c.wait(3.4);
    c.robot.play('idle');
  }),
];
