import { cutscene, type CutsceneCtx } from '../api';
import type { BoySpec, Vec3 } from '../../core/types';
import { shots } from '../framing';

// stranger_at_gate (location gate). S1 light-blue shirt. The man is calm and ordinary.
// Layout (school/layout.ts): gate opening x -4..4 at z -7.5 with the gate canopy over x -4.9..4.9, z -10.1..-7.0;
// guard room x -8..-4.85, z -11.3..-7.85 (window on its north face at (-5.9, -12), door at (-7.25, -11.9)).
// S1 waits under the gate canopy, the man stands on the sidewalk in the open gate, the other boys sit on the
// waiting benches. Camera rule: from inside the school (north) looking south toward the gate and the street.
const S1_SPEC: Partial<BoySpec> = { shirt: '#7CC4FA', striped: false, height: 'medium', backpack: '#E5484D', pants: 'blue', hair: 'black', skin: 2 };
const S2_SPEC: Partial<BoySpec> = { shirt: '#F5C518', striped: true, height: 'small', backpack: null, pants: 'black', hair: 'brown', skin: 3 };
const S3_SPEC: Partial<BoySpec> = { shirt: '#3DBE6E', striped: false, height: 'tall', backpack: '#9B6BF2', pants: 'blue', hair: 'black', skin: 1 };

const W = (c: CutsceneCtx, x: number, z: number, dy = 0): Vec3 => c.at(x - c.loc.origin[0], z - c.loc.origin[2], dy);
const S1_WAIT = { x: -1.6, z: -9.4 }; // under the gate canopy
const S1_STEP = { x: -1.3, z: -8.6 }; // one step toward the man
const ROBOT_AT = { x: -2.3, z: -9.0 }; // beside S1, on his right
const MAN = { x: -0.6, z: -6.5 }; // on the sidewalk in the open gate
const WINDOW = { x: -5.9, z: -12.6 }; // in front of the guard room window
const H = Math.PI + 0.3; // camera heading: looking south (a little west)
/** Wide from inside the school: S1 under the canopy, the open gate with the man, the street behind. */
const wideGate = (c: CutsceneCtx, dur = 0) => shots.wide(c, W(c, -1.6, -8.4), H, { dur, zoom: 1.0, height: 2.2 });

export default [
  cutscene('stranger_at_gate', 'setup', async (c) => {
    c.setFlag('gateOpen', true);
    c.setFlag('schoolPeople', false);
    c.spawn('s1', 'boy', { pos: W(c, S1_WAIT.x, S1_WAIT.z), rotY: 0, spec: S1_SPEC, clip: 'idle' });
    c.spawn('s2', 'boy', { pos: W(c, -10.05, -10.55), rotY: 0, spec: S2_SPEC, clip: 'sit' }).flag('seatH', 0.42);
    const b3 = c.spawn('s3', 'boy', { pos: W(c, -12.3, -10.55), rotY: 0, spec: S3_SPEC, clip: 'sit' });
    b3.flag('seatH', 0.42);
    b3.flag('backpack', false); // a bag would poke through the bench back
    // the guard sits in the guard room
    c.spawn('guard', 'guard', { pos: W(c, -6.4, -9.6), rotY: 0, clip: 'sit' });
    // the unknown man stands on the sidewalk in the open gate, a juice can in his hand
    const man = c.spawn('man', 'stranger', { pos: W(c, MAN.x, MAN.z), rotY: Math.PI, clip: 'idle' });
    man.hold('sodaCan', 'left');
    c.robot.place(W(c, -4.0, -16), 0);
    c.expr('idle');
    await wideGate(c);
  }),

  cutscene('stranger_at_gate', 'before', async (c) => {
    const s1 = c.actor('s1');
    const man = c.actor('man');
    // 1 (0-3 s): wide; the man smiles, holds out the juice and beckons S1.
    c.sfx('carPass', { volume: 0.25 });
    man.hold('sodaCan', 'left');
    man.face(s1.pos());
    await wideGate(c);
    await man.play('wave', { dur: 2.2 });

    // 2 (3-5 s): S1 and the man in one frame: S1 is unsure and takes one step toward him.
    s1.lookAt(W(c, MAN.x, MAN.z, 1.6));
    await shots.two(c, s1, man, { heading: H + 0.25, zoom: 0.85, dur: 0 });
    c.sfx('footsteps', { volume: 0.5 });
    c.status('walking');
    c.robot.place(W(c, -3.4, -14.5), 0);
    const walk = c.robot.walkTo(W(c, ROBOT_AT.x, ROBOT_AT.z), { speed: 1.9, clip: 'jog' });
    await s1.walkTo(W(c, S1_STEP.x, S1_STEP.z), { speed: 0.6 });

    // 3 (5-7 s): Alrashed arrives beside him, hand on his shoulder, stop palm toward the man.
    await shots.two(c, c.robot, s1, { heading: H + 0.25, zoom: 0.9, dur: 0 });
    await walk;
    c.stopSfx('footsteps');
    c.status('explaining');
    c.robot.face(W(c, MAN.x, MAN.z));
    s1.face(W(c, MAN.x, MAN.z));
    c.robot.flag('handOnShoulder', 'l');
    c.expr('warning');
    await c.robot.play('stopHand', { dur: 1.6 });
    s1.lookAt(null);
    // he keeps his hand on the boy's shoulder and his feet toward the stranger, but turns his head and
    // chest to the student for the explanation (the camera is behind them)
    c.robot.flag('turnToCamera', true);
  }),

  cutscene('stranger_at_gate', 'after', async (c) => {
    const s1 = c.actor('s1');
    const man = c.actor('man');
    const guard = c.actor('guard');
    c.robot.flag('handOnShoulder', false);
    c.robot.flag('turnToCamera', false);
    s1.place(W(c, S1_STEP.x, S1_STEP.z), 0);
    c.robot.place(W(c, ROBOT_AT.x, ROBOT_AT.z), 0.3);

    // 1 (0-2 s): S1 says no with a clear gesture and steps back.
    await shots.two(c, c.robot, s1, { heading: H + 0.25, zoom: 0.75, dur: 0 });
    s1.face(W(c, MAN.x, MAN.z));
    await s1.play('headShake', { dur: 1.4 });
    await s1.play('stopStepBack', { dur: 1.2 });
    c.expr('proud');

    // 2 (2-5 s): together to the guard room window; the guard comes out of his door.
    c.status('walking');
    c.expr('smile');
    c.sfx('footsteps', { volume: 0.5 });
    const both = Promise.all([
      c.robot.walkTo([W(c, -3.0, -11.0), W(c, -4.2, -12.3), W(c, WINDOW.x - 0.5, WINDOW.z - 0.2)], { speed: 1.2 }), // round the guard room corner
      s1.walkTo([W(c, -2.2, -10.9), W(c, WINDOW.x + 0.4, WINDOW.z)], { speed: 1.2 }),
    ]);
    // held shot framed on where they arrive (a tracking shot here runs into the yard palms)
    await shots.two(c, W(c, WINDOW.x - 0.5, WINDOW.z - 0.2), W(c, -2.6, -10.4), { heading: Math.PI + 0.8, zoom: 0.8, dur: 0 });
    await both;
    c.stopSfx('footsteps');
    guard.flag('seated', false);
    guard.place(W(c, -7.25, -11.5), Math.PI);
    guard.play('idle');
    c.sfx('doorHiss', { volume: 0.5 });
    c.robot.face(W(c, -7.3, -12.6));
    s1.face(W(c, -7.3, -12.6));
    await shots.two(c, c.robot, W(c, -7.3, -12.6), { heading: Math.PI + 0.5, zoom: 1.0, dur: 0 });
    await guard.walkTo(W(c, -7.3, -12.6), { speed: 0.9 });
    guard.face(c.robot.pos());
    c.status('explaining');
    await c.robot.play('point', { dur: 1.8 });

    // 3 (5-8 s): wide; the guard walks to the gate and the man walks away; S1 and Alrashed wait inside.
    await wideGate(c);
    // the guard goes round the north side of the two (clear of the guard room's north-east corner and the palm planter north of it)
    const gwalk = guard.walkTo([W(c, -6.4, -13.4), W(c, -4.2, -13.2), W(c, -2.0, -11.4), W(c, -1.4, -8.4)], { speed: 1.4 });
    await c.wait(1.6); // let the guard get ahead before the two follow
    const back = Promise.all([
      c.robot.walkTo([W(c, -4.1, -12.2), W(c, -3.4, -10.2)], { speed: 1.1 }),
      s1.walkTo(W(c, -2.6, -10.0), { speed: 1.1 }),
    ]);
    await c.wait(0.2);
    man.face(W(c, 10, -6.4));
    const mleave = man.walkTo(W(c, 10, -6.2), { speed: 1.4 });
    await Promise.all([gwalk, back]);
    s1.face(W(c, -1.0, -4));
    guard.face(W(c, 4, -6.5));
    await mleave;
    man.remove();

    // 4 (8-11 s): S1's father arrives on the street; Alrashed waves to him.
    c.expr('hearts');
    c.sfx('carPass', { volume: 0.6 });
    const car = c.prop('dad_car', 'car', { pos: W(c, 16, -1.75), rotY: Math.PI, params: { color: '#2F4AA8', driver: true } });
    await car.drive([W(c, 16, -1.75), W(c, -1.0, -1.75)], 6);
    c.robot.face(W(c, -1.0, -4));
    await c.robot.play('wave', { dur: 2.2 });
  }),
];
