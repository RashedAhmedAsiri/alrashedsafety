import { cutscene } from '../api';
import { headingTo, shots } from '../framing';
import type { BoySpec } from '../../core/types';

// biology_lab, local coordinates. The hero bench (east front) is at (3.1, -0.3), x 1.5..4.7, z -0.9..0.3, top 0.86;
// boys stand on its south side facing north. Camera rule: always from the east end, a little south, looking west, so the
// boys are in profile and Alrashed (at the west end of the bench, facing east) faces the camera.
const N = Math.PI;
const S1_SPEC: Partial<BoySpec> = { shirt: '#FFFFFF', striped: false, height: 'medium', skin: 1 };
const S2_SPEC: Partial<BoySpec> = { shirt: '#3DBE6E', striped: false, height: 'tall', skin: 3 };
const BENCH_BEAKER = [2.85, -0.05, 0.86] as const;

export default [
  cutscene('biology_lab', 'setup', async (c) => {
    c.setFlag('glass', 'none');
    c.setFlag('water', false);
    const s1 = c.spawn('s1', 'boy', { pos: c.at(2.7, 0.62), rotY: N, spec: S1_SPEC });
    const s2 = c.spawn('s2', 'boy', { pos: c.at(3.7, 0.62), rotY: N, spec: S2_SPEC });
    c.prop('beaker', 'beaker', { pos: c.at(BENCH_BEAKER[0], BENCH_BEAKER[1], BENCH_BEAKER[2]), params: { color: '#3DDC84' }, scale: 1 });
    c.robot.place(c.at(1.0, 0.9), Math.PI / 2);
    c.expr('smile');
    await shots.two(c, c.robot, [s1, s2], { heading: headingTo(c.at(5.2, 3.8), c.at(2.4, 0.4)), zoom: 1.0, height: 1.6, dur: 0 });
  }),

  cutscene('biology_lab', 'before', async (c) => {
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');
    const H = headingTo(c.at(5.2, 3.8), c.at(2.4, 0.4));
    const beaker = c.prop('beaker', 'beaker', { pos: c.at(BENCH_BEAKER[0], BENCH_BEAKER[1], BENCH_BEAKER[2]), params: { color: '#3DDC84' } });
    // 1: S1 lifts the green beaker to his nose; S2 knocks a test tube, it breaks.
    c.expr('surprised');
    c.sfx('drips', { loop: true, volume: 0.12 });
    // his right hand brings the beaker up under his nose (drink pose, slowed so the hand stays up until he puts it down)
    void beaker.moveTo(c.at(2.77, 0.44, 1.03), 1.9); // in front of his right hand (+x while he faces north)
    s1.play('drink', { dur: 7.5 });
    await c.wait(1.7);
    s2.play('stopStepBack', { dur: 1.2 });
    c.sfx('click');
    await c.wait(0.4);
    c.setFlag('glass', 'broken');
    c.sfx('thud');
    await c.wait(0.9);
    // 2: Alrashed steps in: palm up, S1 puts the beaker down; S2 leaves the broken glass alone.
    c.sfx('beep');
    c.expr('warning');
    await c.robot.walkTo(c.at(1.9, 1.1), { speed: 1.3 });
    c.robot.face(s1.pos());
    await shots.two(c, c.robot, s1, { heading: H, zoom: 0.8, height: 1.5, dur: 0 });
    await c.robot.play('stopHand', { dur: 1.2 });
    s1.play('idle');
    await beaker.moveTo(c.at(BENCH_BEAKER[0], BENCH_BEAKER[1], BENCH_BEAKER[2]), 0.4);
    c.robot.face(s2.pos());
    await c.robot.play('stopHand', { dur: 1.2 });
    // 3 (speech): Alrashed at the bench end facing the boys and the camera.
    c.robot.place(c.at(1.95, 1.0), Math.PI / 2 + 0.2);
    await shots.two(c, c.robot, [s1, s2], { heading: H, zoom: 0.95, height: 1.5, dur: 0.9 });
  }),

  cutscene('biology_lab', 'during', async (c) => {
    // Pointing at the goggles, the broken glass and the sink. Fish tank bubbling.
    c.sfx('drips', { loop: true, volume: 0.12 });
    const spots = [c.at(-3.3, -4.88, 1.6), c.at(3.75, 1.25, 0.05), c.at(1.95, -0.3, 0.9)];
    for (let i = 0; ; i++) {
      c.robot.face(spots[i % 3]);
      c.expr(i % 3 === 1 ? 'warning' : 'explaining');
      await c.robot.play('point', { dur: 1.8 });
      c.robot.face(c.at(5, 3));
      await c.robot.play(i % 2 ? 'explain2' : 'explain1', { dur: 2.2 });
    }
  }),

  cutscene('biology_lab', 'after', async (c) => {
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');
    const H = headingTo(c.at(5.2, 3.8), c.at(2.4, 0.4));
    c.stopSfx('drips');
    // 1: both boys put on goggles (pop) then gloves (snap).
    c.expr('smile');
    c.robot.face(c.at(3.2, 0.62));
    await shots.two(c, s1, s2, { heading: H, zoom: 0.7, height: 1.45, dur: 0 });
    await c.wait(0.4);
    s1.flag('goggles', true);
    s2.flag('goggles', true);
    c.sfx('pop');
    await c.wait(0.7);
    s1.flag('gloves', true);
    s2.flag('gloves', true);
    c.sfx('click');
    await c.wait(0.7);
    // 2: Alrashed sweeps the broken glass into the bin (kneels, sweeps, glass gone).
    c.expr('explaining');
    s2.place(c.at(4.3, 0.75), N);
    c.robot.place(c.at(3.2, 1.6), Math.PI / 2 + 0.5);
    await shots.two(c, c.robot, s2, { heading: H, zoom: 0.8, height: 1.4, dur: 0 });
    c.robot.play('kneel', { dur: 2 });
    await c.wait(1.0);
    c.robot.play('bandage');
    c.sfx('slide', { volume: 0.5 });
    await c.wait(1.2);
    c.setFlag('glass', 'swept');
    c.sfx('click');
    c.robot.play('idle');
    await c.wait(0.4);
    // 3: the boys look at the leaf under the microscope, then wash their hands at the bench sink.
    c.expr('happy');
    c.robot.place(c.at(1.2, 1.5), Math.PI / 2);
    s2.place(c.at(3.7, 0.62), N);
    s1.place(c.at(3.2, 0.6), N);
    await shots.two(c, s1, s2, { heading: H, zoom: 0.75, height: 1.45, dur: 0 });
    s1.flag('lookDown', true);
    s1.lookAt(c.at(3.35, -0.55, 0.9));
    s2.lookAt(c.at(3.35, -0.55, 0.9));
    await c.wait(2.0);
    c.expr('proud');
    s1.flag('lookDown', false);
    s1.lookAt(null);
    s2.lookAt(null);
    c.setFlag('water', true);
    c.sfx('tap', { loop: true, volume: 0.4 });
    // S1 at the front of the sink, S2 at the aisle end of the bench (both within reach of the basin at x 1.95).
    s1.place(c.at(1.95, 0.45), N);
    s2.place(c.at(1.22, -0.3), Math.PI / 2);
    s1.play('washHands');
    s2.play('washHands');
    await shots.two(c, c.robot, [s1, s2], { heading: H, zoom: 0.85, height: 1.45, dur: 0 });
    await c.wait(2.6);
    c.stopSfx('tap');
    c.setFlag('water', false);
    s1.play('idle');
    s2.play('idle');
    await c.robot.play('thumbsUp', { dur: 1.8 });
  }),
];
