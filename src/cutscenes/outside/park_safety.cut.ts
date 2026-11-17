import { cutscene, type CutsceneCtx } from '../api';
import { shots } from '../framing';
import type { BoySpec, Vec3 } from '../../core/types';

// park_safety (location park). Fenced playground x -55..-33, z 18.5..34. Swings: beam y 2.4 at z 22.6, swings x -47.3 / -45.3
// (swing along Z). Slide tower (-39.6, 27.2), deck y 1.7, ladder foot x -40.85 (west), chute runs +X to x -35.3.
// Seesaw (-42.5, 29.3) along X; benches face north along z 33.2 under the shade.
const S1_SPEC: Partial<BoySpec> = { shirt: '#3DBE6E', striped: false, height: 'medium', backpack: null, pants: 'blue', hair: 'black', skin: 2 };
const S2_SPEC: Partial<BoySpec> = { shirt: '#FF8A3D', striped: false, height: 'small', backpack: null, pants: 'black', hair: 'brown', skin: 3 };
const S3_SPEC: Partial<BoySpec> = { shirt: '#9B6BF2', striped: true, height: 'tall', backpack: null, pants: 'blue', hair: 'black', skin: 1 };

const W = (c: CutsceneCtx, x: number, z: number, dy = 0): Vec3 => c.at(x - c.loc.origin[0], z - c.loc.origin[2], dy);
const SWING = { x: -47.3, z: 22.6 };
const SLIDE = { x: -39.6, z: 27.2, top: 1.7 };
const BENCH = { x: -43, z: 33.0 };
/** Up the ladder (west side: foot x -40.85 on the ground, top at the deck edge x -40.3, y 1.7): the climber's body
 * stays just west of the rungs, between the handrails, then steps onto the deck. */
const ladderUp = (c: CutsceneCtx): Vec3[] => [W(c, -41.1, 27.2), W(c, -40.62, 27.2, 1.45), W(c, -40.25, 27.2, SLIDE.top), W(c, SLIDE.x, SLIDE.z, SLIDE.top)];
/** Swings are filmed side-on from the west (looking east) so the swing arc reads. */
const EAST = Math.PI / 2;
/** Slide part: from the north-east (WEST - 0.9), looking across the chute toward the tower. */
const WEST = -Math.PI / 2;

export default [
  cutscene('park_safety', 'setup', async (c) => {
    c.setFlag('swingAmp', 0);
    c.robot.place(W(c, -50.4, 27.8), 1.2); // in the opening wide, west of the stepping dots
    c.expr('idle');
    await shots.wide(c, W(c, -47.5, 25.5), EAST, { zoom: 0.95, dur: 0 });
  }),

  cutscene('park_safety', 'before', async (c) => {
    // ---- Before 1 (0-3 s): wide of the playground; S1 swings high, S2 runs across the swing's path ----
    c.sfx('birds', { loop: true, volume: 0.3 });
    // the boy's swing clip brings its own seat and chains (pivot 2.2 m above him = the 2.4 m beam)
    c.setFlag('swingRider', true);
    c.spawn('s1', 'boy', { pos: W(c, SWING.x, SWING.z, 0.2), rotY: 0, spec: S1_SPEC, clip: 'swing' });
    c.actor('s1').flag('amp', 0.75);
    c.spawn('s2', 'boy', { pos: W(c, -53.6, 23.7), rotY: Math.PI / 2, spec: S2_SPEC, clip: 'idle' });
    c.spawn('s3', 'boy', { pos: W(c, -41.2, 27.3), rotY: Math.PI / 2, spec: S3_SPEC, clip: 'idle' });
    c.spawn('dad', 'parent', { pos: W(c, BENCH.x, BENCH.z), rotY: Math.PI, clip: 'sit' });
    c.sfx('laugh', { volume: 0.3 });
    await shots.wide(c, W(c, -47.5, 25.5), EAST, { zoom: 0.95, dur: 0 });
    await c.wait(1.0);
    c.expr('surprised');
    c.sfx('footsteps', { volume: 0.5 });
    const run = c.actor('s2').walkTo([W(c, -48.2, 24.4)], { speed: 3.2, clip: 'run' });
    await c.wait(0.8);
    // ---- Before 2 (3-4.5 s): Alrashed steps in, catches the chain and slows the swing, stops S2 ----
    c.expr('warning');
    c.status('walking');
    const jog = c.robot.walkTo(W(c, -48.2, 25.3), { speed: 3.2, clip: 'jog' });
    await shots.follow(c, c.robot, Promise.all([run, jog]), { heading: EAST, with: [c.actor('s2')], dur: 0.5 });
    c.status('explaining');
    c.actor('s2').face(W(c, -47.3, 24));
    c.actor('s2').play('stopStepBack', { dur: 1.2 });
    c.robot.face(W(c, -47.4, 24.4));
    c.robot.flag('reach', 'r');
    c.robot.flag('handOnShoulder', 'l');
    c.robot.play('catch', { dur: 1.6 });
    c.sfx('click');
    c.actor('s1').flag('amp', 0.12);
    await c.wait(1.5);
    // Speech: medium by the swings, a family on a bench in the background
    c.actor('s1').flag('amp', 0.08);
    await shots.two(c, c.robot, [c.actor('s1'), c.actor('s2')], { heading: EAST, dur: 1.0 });
  }),

  cutscene('park_safety', 'during', async (c) => {
    // point at the swing path, the hot slide and the park gate while explaining
    c.robot.flag('reach', false);
    c.robot.flag('handOnShoulder', false);
    c.robot.face(W(c, -47.3, 23));
    await c.robot.play('point', { dur: 1.8 });
    c.robot.face(W(c, -39.6, 27.2));
    await c.robot.play('point', { dur: 1.8 });
    c.robot.face(W(c, -28.5, 8));
    await c.robot.play('point', { dur: 1.8 });
  }),

  cutscene('park_safety', 'after', async (c) => {
    const s2 = c.actor('s2');
    const s3 = c.actor('s3');
    // ---- After 1 (0-3 s): S2 waits behind S3 at the ladder, then tests the slide with the back of his hand ----
    c.robot.flag('reach', false);
    c.robot.flag('handOnShoulder', false);
    c.expr('smile');
    s2.place(W(c, -42.3, 27.3), Math.PI / 2);
    s3.place(W(c, -41.0, 27.3), Math.PI / 2);
    await shots.two(c, s2, s3, { heading: WEST - 0.9, zoom: 1.2, dur: 0 }); // from the north-east, clear of the chute
    c.sfx('footsteps', { volume: 0.5 });
    c.robot.walkTo(W(c, -44.6, 26.2), { speed: 1.2 });
    s3.play('climbSteps');
    await s3.walkTo(ladderUp(c), { speed: 0.9, clip: 'climbSteps' });
    s3.face(W(c, -36, 27.2));
    s2.walkTo(W(c, -41.6, 27.3), { speed: 1.0 }); // waits his turn at the foot of the ladder
    // S3 goes down first
    s3.place(W(c, -38.95, 27.2, SLIDE.top + 0.02), Math.PI / 2);
    s3.flag('slope', -0.42);
    s3.walkTo([W(c, -35.8, 27.2, 0.3)], { speed: 2.2, clip: 'slide' });
    await c.wait(1.3);
    await s2.walkTo(ladderUp(c), { speed: 0.9, clip: 'climbSteps' });
    s2.face(W(c, -36, 27.2));
    await s2.play('point', { dur: 1.4 }); // tests the metal with the back of his hand
    // ---- After 2 (3-6 s): side of the slide, sits and slides down feet first onto the soft rubber ----
    await shots.two(c, W(c, -39.0, 27.2), W(c, -35.6, 27.2), { heading: WEST - 0.9, zoom: 1.1, dur: 0 });
    c.expr('happy');
    s3.show(false);
    s2.place(W(c, -38.95, 27.2, SLIDE.top + 0.02), Math.PI / 2);
    s2.flag('slope', -0.42);
    s2.play('slide');
    c.sfx('slide');
    await s2.walkTo([W(c, -35.8, 27.2, 0.3)], { speed: 1.9, clip: 'slide' });
    s2.flag('slope', 0);
    s2.place(W(c, -35.2, 27.2), Math.PI / 2);
    c.sfx('thud', { volume: 0.4 });
    await s2.play('jump', { dur: 0.9 });
    // ---- After 3 (6-9 s): wide, S2 runs back to his father (in view the whole time); Alrashed waves ----
    await shots.wide(c, W(c, -41.0, 29.0), WEST - 0.9, { zoom: 0.85, dur: 0 });
    c.status('waving');
    c.expr('hearts');
    c.robot.face(W(c, -36, 27));
    c.robot.play('wave');
    c.sfx('birds', { volume: 0.3 });
    // first away from the end of the run-out (its side walls), then round to the benches
    await s2.walkTo([W(c, -34.7, 27.9), W(c, -37.5, 31.6), W(c, -42.1, 32.1)], { speed: 2.6, clip: 'run' });
    s2.face(W(c, BENCH.x, BENCH.z));
    s2.play('wave');
    await c.wait(1.6);
  }),
];
